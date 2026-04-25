# 部署架构说明

本文档说明 helpcenter-rag 项目在不同场景下的部署方式，以及各配置文件的作用。

---

## 一、本地开发

### 使用场景

开发人员在本地编写和调试代码时使用。

### 启动方式

基础设施和业务服务**分离启动**：

| 服务                      | 启动方式              | 命令/文件                             |
| ------------------------- | --------------------- | ------------------------------------- |
| **Milvus + etcd + MinIO** | Docker Compose        | `docker-compose.yml`                  |
| **Ollama**                | Ollama Desktop 客户端 | 启动客户端后执行 `ollama pull bge-m3` |
| **Backend**               | Node.js 开发服务器    | `cd backend && npm run start:dev`     |
| **Frontend**              | Vite 开发服务器       | `cd frontend && npm run dev`          |

### 完整启动步骤

```bash
# 1. 启动 Milvus 基础设施（etcd + minio + milvus）
docker-compose -p helpcenter-rag up -d

# 2. 启动 Ollama Desktop 客户端，然后拉取模型
ollama pull bge-m3

# 3. 索引文档（如需要）
cd content-processor
npm install
npx tsx src/cli.ts index --category 1448

# 4. 启动后端
cd backend
npm install
npm run start:dev

# 5. 启动前端
cd frontend
npm install
npm run dev
```

### 相关配置文件

| 文件                 | 作用                                                                      |
| -------------------- | ------------------------------------------------------------------------- |
| `docker-compose.yml` | 仅启动 Milvus 基础设施（etcd + minio + milvus），供本地开发时后端连接使用 |

**为什么不把后端/前端也放进 docker-compose？**

本地开发需要热更新（HMR）和调试，Docker 容器不支持这些功能。因此后端和前端直接用 `npm run dev` 启动。

---

## 二、Docker Compose 生产部署

### 使用场景

在**单台服务器**上快速部署完整应用，适用于：

- 演示环境
- 小规模内部使用
- 没有 Kubernetes 集群的场景

### 启动方式

```bash
# 一键部署所有服务（含 Milvus、后端、前端）
docker-compose -f docker-compose.prod.yml up -d
```

访问地址：

- 前端：http://localhost
- 后端 API：http://localhost:3000
- API 文档：http://localhost:3000/api/docs

### 相关配置文件

| 文件                           | 作用                                                                            |
| ------------------------------ | ------------------------------------------------------------------------------- |
| `docker-compose.prod.yml`      | 生产环境完整编排，包含 6 个服务：etcd、minio、milvus、ollama、backend、frontend |
| `backend/Dockerfile`           | 构建后端容器镜像                                                                |
| `frontend/Dockerfile`          | 构建前端容器镜像                                                                |
| `scripts/ollama-entrypoint.sh` | Ollama 容器启动脚本，自动拉取 bge-m3 模型                                       |

### 部署的服务清单

```
docker-compose.prod.yml
├── etcd          # Milvus 元数据存储
├── minio         # Milvus 文件存储
├── milvus        # 向量数据库
├── ollama        # Embedding 模型服务（bge-m3）
├── backend       # NestJS 后端（从 Dockerfile 构建）
└── frontend      # Vue 前端（从 Dockerfile 构建）
```

### 局限性

- **单节点部署**：所有服务跑在一台机器上，无法横向扩展
- **无自动故障恢复**：服务挂了需要手动重启
- **无滚动更新**：更新代码会导致服务中断

因此，对于需要高可用的生产环境，建议使用 Kubernetes 部署。

---

## 三、Kubernetes + Helm 生产部署

### 使用场景

在 Kubernetes 集群中部署，适用于：

- 正式生产环境
- 需要高可用、自动扩缩容
- 多节点分布式部署

### 架构拆分

#### 基础设施层（Helm 管理）

| 服务                      | 部署方式   | 说明                                                      |
| ------------------------- | ---------- | --------------------------------------------------------- |
| **Milvus + etcd + MinIO** | Helm Chart | `helm install milvus zilliztech/milvus`，一键部署三个服务 |

**为什么用 Helm？**

etcd、minio、milvus 是 Milvus 官方依赖的三个组件。官方 Helm Chart 已经把这些服务的配置、网络连接、持久化存储都打包好了。自己写 YAML 维护成本高，且容易遗漏生产级配置（如 PodDisruptionBudget、RBAC 等）。

#### 业务服务层（自定义 Helm Chart）

| 服务         | 部署方式   | 说明                                                          |
| ------------ | ---------- | ------------------------------------------------------------- |
| **Ollama**   | Helm Chart | `helm/helpcenter-rag/templates/ollama/`，持久化存储模型文件   |
| **Backend**  | Helm Chart | `helm/helpcenter-rag/templates/backend/`，从镜像仓库拉取运行  |
| **Frontend** | Helm Chart | `helm/helpcenter-rag/templates/frontend/`，从镜像仓库拉取运行 |

### 部署步骤

```bash
# 1. 部署 Milvus 基础设施
helm repo add zilliztech https://zilliztech.github.io/milvus-helm/
helm install milvus zilliztech/milvus -n milvus --create-namespace

# 2. 部署业务服务（backend + frontend + ollama）
helm install helpcenter-rag ./helm/helpcenter-rag \
  -n helpcenter-rag \
  --create-namespace \
  -f custom-values.yaml
```

**一键升级：**

```bash
helm upgrade helpcenter-rag ./helm/helpcenter-rag \
  -n helpcenter-rag \
  -f custom-values.yaml
```

**一键卸载：**

```bash
helm uninstall helpcenter-rag -n helpcenter-rag
```

### 相关配置文件

| 文件                           | 作用                                   |
| ------------------------------ | -------------------------------------- |
| `backend/Dockerfile`           | 构建后端容器镜像，由 CI 推送到镜像仓库 |
| `frontend/Dockerfile`          | 构建前端容器镜像，由 CI 推送到镜像仓库 |
| `scripts/ollama-entrypoint.sh` | Ollama 容器启动脚本（K8s 中复用）      |
| `helm/helpcenter-rag/`         | 自定义 Helm Chart，业务服务编排        |

### 镜像构建与推送

K8s 需要从镜像仓库拉取 backend 和 frontend 镜像。通过 GitHub Actions 自动构建并推送到 GHCR：

```
git push → GitHub Actions → docker build → ghcr.io/xxx/backend:latest
                                    → ghcr.io/xxx/frontend:latest
```

对应的 CI 配置文件：`.github/workflows/deploy.yml`

---

## 四、配置文件对照表

| 文件                           | 使用场景         | 说明                            |
| ------------------------------ | ---------------- | ------------------------------- |
| `docker-compose.yml`           | 本地开发         | 仅启动 Milvus 基础设施          |
| `docker-compose.prod.yml`      | 单服务器生产部署 | Docker Compose 完整编排         |
| `backend/Dockerfile`           | CI 构建 / K8s    | 构建后端容器镜像                |
| `frontend/Dockerfile`          | CI 构建 / K8s    | 构建前端容器镜像                |
| `scripts/ollama-entrypoint.sh` | Docker / K8s     | Ollama 自动拉取模型脚本         |
| `helm/helpcenter-rag/`         | K8s 生产部署     | 自定义 Helm Chart，业务服务编排 |
| `.github/workflows/deploy.yml` | CI 镜像构建      | 自动构建并推送镜像到 GHCR       |

---

## 五、如何选择部署方式？

| 需求                     | 推荐方案          | 配置文件                                   |
| ------------------------ | ----------------- | ------------------------------------------ |
| 本地写代码、调试         | 本地开发          | `docker-compose.yml` + `npm run dev`       |
| 给客户演示、小规模试用   | Docker Compose    | `docker-compose.prod.yml`                  |
| 正式生产、高可用、大规模 | Kubernetes + Helm | `helm/helpcenter-rag/` + Milvus Helm Chart |
