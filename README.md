# HelpCenter RAG

[![CI](https://github.com/caiyanhu/helpcenter-rag/actions/workflows/ci.yml/badge.svg)](https://github.com/caiyanhu/helpcenter-rag/actions/workflows/ci.yml)
[![Security Audit](https://github.com/caiyanhu/helpcenter-rag/actions/workflows/audit.yml/badge.svg)](https://github.com/caiyanhu/helpcenter-rag/actions/workflows/audit.yml)
[![Lighthouse](https://github.com/caiyanhu/helpcenter-rag/actions/workflows/lighthouse.yml/badge.svg)](https://github.com/caiyanhu/helpcenter-rag/actions/workflows/lighthouse.yml)

> 基于 RAG（检索增强生成）的帮助中心问答系统，将 ecloud.10086.cn 帮助中心的技术文档索引到 Milvus 向量数据库中，通过 Deepseek LLM 结合检索到的内容回答用户问题。

## 技术架构

```
┌─────────────┐     ┌─────────────┐     ┌─────────────────┐
│   Vue 3     │────▶│   NestJS    │────▶│   Milvus        │
│  Frontend   │◄────│   Backend   │◄────│   Vector DB     │
└─────────────┘     └─────────────┘     └─────────────────┘
                            │
                            ▼
                    ┌─────────────┐
                    │ Deepseek    │
                    │ LLM API     │
                    └─────────────┘
                            ▲
                            │
                    ┌─────────────┐
                    │ Content     │
                    │ Processor   │
                    └─────────────┘
```

| 层级       | 技术                                       |
| ---------- | ------------------------------------------ |
| 前端       | Vue 3 + Vite + Tailwind CSS + Pinia        |
| 后端       | NestJS + TypeScript + TypeORM + SQLite     |
| 文档处理   | Node.js + TypeScript + LangChain + Cheerio |
| 向量数据库 | Milvus (Docker)                            |
| Embedding  | bge-m3 (Ollama)                            |
| LLM        | Deepseek API (OpenAI 兼容)                 |

## 快速开始

### 开发模式

```bash
# 1. 启动基础设施（Milvus）
docker-compose -p helpcenter-rag up -d

# 2. 准备 Embedding 模型
ollama pull bge-m3

# 3. 索引文档
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

### 生产环境 Kubernetes 部署（开发中）

生产环境使用 Kubernetes + Helm 部署，相关配置正在完善中：

```bash
# 1. 部署 Milvus 基础设施（含 etcd + minio）
helm repo add zilliztech https://zilliztech.github.io/milvus-helm/
helm install milvus zilliztech/milvus -n milvus --create-namespace

# 2. 部署业务服务（backend + frontend + ollama）
# kubectl apply -f k8s/  # 待补充
```

> **注意**：`docker-compose.prod.yml` 已废弃，不再维护。生产环境请使用 Kubernetes 方案。

## 部署架构与配置文件说明

本项目支持两种部署场景，使用不同的配置文件组合：

### 场景一：本地开发（当前使用）

本地开发时，基础设施和业务服务**分离启动**：

| 服务 | 启动方式 | 配置文件/命令 |
|------|---------|--------------|
| **Milvus + etcd + MinIO** | Docker Compose | `docker-compose.yml` |
| **Ollama** | Ollama Desktop 客户端 | 手动启动客户端并 `ollama pull bge-m3` |
| **Backend** | Node.js 开发服务器 | `cd backend && npm run start:dev` |
| **Frontend** | Vite 开发服务器 | `cd frontend && npm run dev` |

**`docker-compose.yml` 的作用**：仅启动 Milvus 基础设施（etcd + minio + milvus），供本地开发时后端连接使用。

### 场景二：生产环境 Kubernetes（目标架构）

生产环境使用 Kubernetes + Helm 部署：

| 服务 | 部署方式 | 说明 |
|------|---------|------|
| **Milvus + etcd + MinIO** | Helm Chart | `helm install milvus zilliztech/milvus`，一键部署三个服务 |
| **Ollama** | K8s Deployment + PVC | 自定义 YAML，持久化模型文件 |
| **Backend** | K8s Deployment | 从镜像仓库拉取运行 |
| **Frontend** | K8s Deployment | 从镜像仓库拉取运行 |

**Dockerfile 的作用**：`backend/Dockerfile` 和 `frontend/Dockerfile` 用于构建容器镜像，由 CI 推送到镜像仓库（GHCR），供 K8s 拉取使用。

### 配置文件对照表

| 文件 | 使用场景 | 说明 |
|------|---------|------|
| `docker-compose.yml` | ✅ 本地开发 | 仅启动 Milvus 基础设施（etcd + minio + milvus） |
| `docker-compose.prod.yml` | ❌ 已废弃 | 原 Docker Compose 生产部署方案，已被 K8s 替代 |
| `backend/Dockerfile` | ✅ CI 构建 | 构建后端容器镜像，推送到 ghcr.io |
| `frontend/Dockerfile` | ✅ CI 构建 | 构建前端容器镜像，推送到 ghcr.io |
| `k8s/` 目录（待创建） | ✅ 生产部署 | Kubernetes 业务服务编排文件 |

---

## 项目结构

```
helpcenter-rag/
├── docker-compose.yml              # 开发环境：Milvus 基础设施编排
├── docker-compose.prod.yml         # 已废弃：原 Docker Compose 生产方案
├── scripts/
│   └── ollama-entrypoint.sh        # Ollama 容器启动脚本（自动拉取 bge-m3）
├── content-processor/              # 文档处理流水线（本地 CLI 工具）
│   ├── src/                        # TypeScript 源码
│   ├── data/raw/                   # 原始文档缓存
│   └── package.json
├── backend/                        # NestJS RAG 问答后端
│   ├── src/
│   ├── Dockerfile                  # 容器镜像构建（供 CI/K8s 使用）
│   ├── data/                       # SQLite 文件存储位置
│   └── package.json
├── frontend/                       # Vue 3 + Tailwind CSS 前端
│   ├── src/
│   ├── e2e/                        # Playwright E2E 测试
│   ├── Dockerfile                  # 容器镜像构建（供 CI/K8s 使用）
│   └── package.json
└── docs/                           # 项目文档
```

## 测试

### 单元测试

| 模块              | 框架   | 命令                               | 覆盖率   |
| ----------------- | ------ | ---------------------------------- | -------- |
| Frontend          | Vitest | `cd frontend && npm test`          | 51 tests |
| Backend           | Jest   | `cd backend && npm test`           | 32 tests |
| Content-Processor | Vitest | `cd content-processor && npm test` | 28 tests |

### 覆盖率报告

```bash
cd frontend && npm run test:coverage
cd backend && npm run test:coverage
cd content-processor && npm run test:coverage
```

### E2E 测试

```bash
cd frontend
npm run e2e       # 无头模式
npm run e2e:ui    # UI 模式
```

## 常用命令

```bash
# 索引文档（指定分类）
npx tsx src/cli.ts index --category 1448

# 强制重新抓取（忽略缓存）
npx tsx src/cli.ts index --category 1448 --force-fetch

# 离线模式（只用缓存）
npx tsx src/cli.ts index --category 1448 --offline

# 查看状态
npx tsx src/cli.ts status

# 清空 Milvus
npx tsx src/cli.ts reset
```

## CI/CD

| Workflow       | 触发条件       | 说明                                                         |
| -------------- | -------------- | ------------------------------------------------------------ |
| CI             | push/PR        | 单元测试、类型检查、构建、覆盖率、Playwright E2E             |
| Security Audit | push/PR + 每周 | `npm audit` 安全漏洞扫描                                     |
| Lighthouse     | push/PR        | 前端性能评分（Performance/Accessibility/Best Practices/SEO） |
| Deploy         | push main      | 构建并推送 backend/frontend 镜像到 GHCR（开发中）            |

## API 文档

启动后端后访问：http://localhost:3000/api/docs

基于 Swagger/OpenAPI 自动生成，包含所有接口的入参、出参和示例。

## 贡献

提交代码前请确保：

1. 所有测试通过（`npm test`）
2. 代码已格式化（提交时会自动运行 Prettier）
3. 类型检查通过（`npm run type-check`）
4. CI 检查通过

## License

MIT
