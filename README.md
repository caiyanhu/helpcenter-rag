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

### Docker 部署（生产环境）

```bash
# 一键部署所有服务（含 Milvus、后端、前端）
docker-compose -f docker-compose.prod.yml up -d
```

前端访问 http://localhost，后端 API http://localhost:3000，API 文档 http://localhost:3000/api/docs

## 项目结构

```
helpcenter-rag/
├── docker-compose.yml              # 开发环境 Milvus 编排
├── docker-compose.prod.yml         # 生产环境完整编排
├── content-processor/              # 文档处理流水线
│   ├── src/                        # TypeScript 源码
│   ├── data/raw/                   # 原始文档缓存
│   └── package.json
├── backend/                        # NestJS RAG 问答后端
│   ├── src/
│   ├── Dockerfile                  # 生产镜像
│   ├── data/                       # SQLite 文件存储位置
│   └── package.json
├── frontend/                       # Vue 3 + Tailwind CSS 前端
│   ├── src/
│   ├── e2e/                        # Playwright E2E 测试
│   ├── Dockerfile                  # 生产镜像（nginx）
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
| Deploy         | push main      | Docker 镜像构建                                              |

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
