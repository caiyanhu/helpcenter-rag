# HelpCenter RAG

[![CI](https://github.com/caiyanhu/helpcenter-rag/actions/workflows/ci.yml/badge.svg)](https://github.com/caiyanhu/helpcenter-rag/actions/workflows/ci.yml)

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

| 层级 | 技术 |
|------|------|
| 前端 | Vue 3 + Vite + Tailwind CSS + Pinia |
| 后端 | NestJS + TypeScript + TypeORM + SQLite |
| 文档处理 | Node.js + TypeScript + LangChain + Cheerio |
| 向量数据库 | Milvus (Docker) |
| Embedding | bge-m3 (Ollama) |
| LLM | Deepseek API (OpenAI 兼容) |

## 快速开始

### 1. 启动基础设施

```bash
docker-compose -p helpcenter-rag up -d
```

确保 Milvus 运行在 `localhost:19530`。

### 2. 准备 Embedding 模型

```bash
ollama pull bge-m3
```

### 3. 索引文档

```bash
cd content-processor
npm install
npx tsx src/cli.ts index --category 1448
```

### 4. 启动后端

```bash
cd backend
npm install
# 配置 .env 或 config.yaml
npm run start:dev
```

### 5. 启动前端

```bash
cd frontend
npm install
npm run dev
```

## 项目结构

```
helpcenter-rag/
├── docker-compose.yml              # Docker Compose 编排
├── content-processor/              # 文档处理流水线
│   ├── src/                        # TypeScript 源码
│   ├── data/raw/                   # 原始文档缓存
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

## 测试

| 模块 | 框架 | 命令 | 覆盖率 |
|------|------|------|--------|
| Frontend | Vitest | `cd frontend && npm test` | 51 tests |
| Backend | Jest | `cd backend && npm test` | 32 tests |
| Content-Processor | Vitest | `cd content-processor && npm test` | 28 tests |

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

每次 push 到 `main` 分支或提交 PR 时，GitHub Actions 会自动运行：
- 前端测试与类型检查
- 后端测试与构建
- 文档处理器测试与类型检查

## 贡献

提交代码前请确保：
1. 所有测试通过
2. 代码格式化符合项目规范
3. CI 检查通过

## License

MIT
