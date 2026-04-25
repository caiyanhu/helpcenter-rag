# AGENTS.md

> 本文件面向 AI 编码助手，包含项目背景、架构、技术栈和编码规范。

## 项目背景

`helpcenter-rag` 是一个基于 RAG（检索增强生成）的帮助中心问答系统。目标是将 ecloud.10086.cn 帮助中心的技术文档索引到 Milvus 向量数据库中，然后通过 LLM（Deepseek）结合检索到的内容回答用户问题。

## 项目结构

```
helpcenter-rag/
├── docker-compose.yml              # Docker Compose 编排，使用 -p helpcenter-rag 隔离
├── content-processor/              # 文档处理流水线（Node.js/TS）
│   ├── src/                        # TypeScript 源码
│   ├── data/raw/                   # 原始文档缓存（按目录层级存放）
│   └── package.json
├── backend/                        # NestJS RAG 问答后端
│   ├── src/
│   ├── data/                       # SQLite 文件存储位置
│   └── package.json
├── frontend/                       # Vue 3 + Tailwind CSS 前端
│   ├── src/
│   └── package.json
└── docs/                           # 项目文档
```

## 技术栈

| 层级       | 技术                                                          |
| ---------- | ------------------------------------------------------------- |
| 文档处理   | Node.js + TypeScript + LangChain + Cheerio + OllamaEmbeddings |
| 后端       | NestJS + TypeScript + TypeORM + SQLite + LangChain            |
| 前端       | Vue 3 + Vite + Tailwind CSS + Pinia                           |
| 向量数据库 | Milvus (Docker)                                               |
| Embedding  | bge-m3 (Ollama)                                               |
| LLM        | Deepseek API (OpenAI 兼容)                                    |

## 编码规范

### 通用

- 使用 TypeScript，严格类型检查
- 优先使用 `async/await`，避免回调地狱
- 错误处理：使用 try-catch，错误日志需包含上下文
- 配置外置：所有可配置项（URL、模型名、密钥等）放在配置文件或环境变量中

### content-processor

- CLI 入口：`cli.ts`，使用 `commander` 或原生 `process.argv`
- 所有模块纯函数优先，便于测试
- 缓存目录操作需处理特殊字符（文件名清理）
- 批量操作时添加进度输出（`console.log` 或 `cli-progress`）

### backend

- NestJS 标准结构：`module` → `controller` → `service`
- 使用依赖注入，避免手动实例化
- DTO 使用 `class-validator` 校验
- SSE 流式输出需正确设置 `Content-Type: text/event-stream`
- SQLite 实体使用 TypeORM 装饰器

### frontend

- Vue 3 Composition API + `<script setup>` 语法
- Tailwind CSS 优先，避免自定义 CSS
- Pinia Store 按功能模块拆分
- 组件命名：PascalCase，文件名与组件名一致
- API 调用封装在 `services/` 目录，不直接在组件中调用

## 构建步骤

### 1. 启动基础设施

```bash
cd helpcenter-rag
docker-compose -p helpcenter-rag up -d
```

确保 Milvus 运行在预期地址（默认 `localhost:19530`）。

### 2. 运行 content-processor 索引文档

```bash
cd content-processor
npm install
npx tsx src/cli.ts index --category 1448
```

### 3. 启动后端

```bash
cd backend
npm install
# 配置 .env 或 config.yaml
npm run start:dev
```

### 4. 启动前端

```bash
cd frontend
npm install
npm run dev
```

## 测试

- content-processor：编写单元测试覆盖 fetcher、parser、chunker
- backend：使用 NestJS 测试工具，覆盖 controller 和 service
- frontend：使用 Vitest 进行组件测试

## 注意事项

1. **模型切换**：Embedding、LLM、Reranker 均通过适配器模式实现，修改 `config.yaml` 即可切换实现
2. **文档缓存**：`content-processor/data/raw/` 是本地缓存，不提交到 git（已添加 `.gitignore`）
3. **SQLite**：`backend/data/chat.db` 同样不提交到 git
4. **Milvus Collection**：首次运行会自动创建，维度由当前 embedding 模型决定（bge-m3 为 1024）
5. **Ollama**：确保服务已启动且模型已拉取（`ollama pull bge-m3`）
6. **Deepseek API Key**：通过环境变量 `DEEPSEEK_API_KEY` 传入，不要硬编码

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

## 扩展指南

### 添加新的 LLM 提供商

1. 在 `backend/src/llm/` 下新建适配器（如 `openai.adapter.ts`）
2. 实现 `LLMAdapter` 接口
3. 在配置文件中增加 provider 选项
4. 在工厂方法中注册新的 provider

### 添加 Reranker

1. 在 `backend/src/reranker/` 下实现新的适配器
2. 修改 `config.yaml` 中 `reranker.provider`
3. `chat.service.ts` 中自动根据配置注入对应实现

## 相关文档

- [实施计划](docs/plan.md)
- ecloud API 规范：`/Users/caiyanhu/.config/opencode/skills/ecloud-crawler/references/api-spec.md`
