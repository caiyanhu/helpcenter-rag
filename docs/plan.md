# `helpcenter-rag` — 最终实施计划

## 一、项目结构

```
helpcenter-rag/
├── docker-compose.yml              # docker-compose -p helpcenter-rag up -d
│
├── content-processor/              # 文档处理流水线
│   ├── data/
│   │   └── raw/                    # 原始文档缓存（按实际目录层级）
│   │       └── category-{id}/
│   │           ├── category.json
│   │           ├── outline.json
│   │           └── {dir1}/
│   │               └── {dir2}/
│   │                   └── {article_title}.json   # 叶子节点
│   ├── src/
│   │   ├── fetcher.ts              # ecloud API 调用
│   │   ├── cache.ts                # 本地缓存读写（层级目录）
│   │   ├── parser.ts               # HTML → Document（含层级 metadata）
│   │   ├── chunker.ts              # RecursiveCharacterTextSplitter
│   │   ├── indexer.ts              # OllamaEmbeddings + Milvus VectorStore
│   │   └── cli.ts                  # CLI 入口
│   └── package.json
│
├── backend/                        # NestJS RAG 后端
│   ├── data/
│   │   └── chat.db                 # SQLite 对话历史
│   ├── src/
│   │   ├── chat/
│   │   │   ├── chat.controller.ts  # POST /api/chat (SSE)
│   │   │   └── chat.service.ts     # RAG 流程：改写→检索→LLM
│   │   ├── session/
│   │   │   ├── session.service.ts  # 会话/消息 CRUD
│   │   │   └── session.entity.ts   # TypeORM 实体
│   │   ├── milvus/
│   │   │   └── milvus.service.ts   # Top-K 检索 + MMR
│   │   ├── llm/
│   │   │   ├── llm.interface.ts    # 统一接口
│   │   │   ├── deepseek.adapter.ts # Deepseek API
│   │   │   └── query-rewriter.ts   # 短查询意图澄清
│   │   ├── reranker/               # Phase 1：预留，provider=none
│   │   │   ├── reranker.interface.ts
│   │   │   └── no-op.adapter.ts
│   │   └── config/
│   │       └── config.yaml         # 适配器配置
│   └── package.json
│
└── frontend/                       # Vue 3 + Tailwind CSS
    ├── src/
    │   ├── views/
    │   │   └── ChatView.vue
    │   ├── components/
    │   │   ├── SessionSidebar.vue
    │   │   ├── ChatMessages.vue
    │   │   ├── ChatInput.vue
    │   │   ├── TypingEffect.vue
    │   │   └── SourcePanel.vue
    │   └── stores/
    │       └── chat.store.ts       # Pinia
    └── package.json
```

## 二、技术选型总览

| 层级 | 选型 | 备注 |
|------|------|------|
| **文档获取** | Node.js + axios + cheerio | 调用 ecloud 4 个 API |
| **文本切分** | LangChain `RecursiveCharacterTextSplitter` | chunk 300-500 字，重叠 50 字 |
| **Embedding** | `bge-base-zh-v1.5` via Ollama | 768 维，配置化可切换 |
| **向量数据库** | Milvus (已有 Docker) | Collection: `helpcenter_chunks` |
| **Rerank** | Phase 1: 无 | 预留接口，配置切换 |
| **Query 改写** | Deepseek LLM | 仅短查询（< 10 字）做意图澄清 |
| **LLM** | Deepseek API (`deepseek-chat`) | OpenAI 兼容格式 |
| **后端框架** | NestJS + TypeORM | 会话管理、配置管理 |
| **前端框架** | Vue 3 + Vite + Tailwind CSS + Pinia | 流式 SSE、引用来源 |
| **对话历史** | SQLite (`backend/data/chat.db`) | 文件级，gitignore |

## 三、核心数据流

### 3.1 文档索引流程（content-processor）

```bash
npx tsx cli.ts index --category 1448
```

```
1. 检查本地缓存 data/raw/category-1448/
   ├── 存在且完整 → 进入步骤 3（--offline 模式）
   └── 不存在/不完整 → 步骤 2

2. 调用 ecloud API 抓取
   ├── GET /category/info/1448
   ├── GET /outline/tree?outlineId=...
   └── 递归遍历 → 对每个 article_id：
       ├── GET /article/info/{id}
       └── GET /article/content/{hash}
   └── 按实际目录层级保存到 data/raw/category-1448/...

3. 读取缓存 → parse HTML → 去除 script/style/img
   └── 生成 LangChain Document（metadata 含 category_path, article_title）

4. RecursiveCharacterTextSplitter 切分
   └── chunk_size=400, chunk_overlap=50

5. OllamaEmbeddings (bge-base-zh) 批量向量化
   └── batch_size=32, concurrent_batches=2

6. Milvus VectorStore.upsert
   └── 自动去重（基于 article_id + chunk_index）
```

### 3.2 RAG 问答流程（backend）

```
POST /api/chat (SSE)
├── 1. 接收 {session_id, message}
├── 2. 如果是新会话 → SQLite 创建 session
├── 3. 保存用户消息到 SQLite
├── 4. Query 改写（仅当消息长度 < 10 字）
│   └── LLM: "将用户问题改写为更精确的技术查询"
├── 5. Embedding 向量化（复用 bge-base-zh）
├── 6. Milvus 检索 Top-10
├── 7. MMR（最大边际相关性）去重 → Top-5
├── 8. 构建 Prompt（参考资料 + 历史对话 + 当前问题）
├── 9. Deepseek LLM 流式生成
│   └── SSE 推送: {type: "token", content: "..."}
├── 10. 解析引用标记 [^1], [^2] → 构建 sources 列表
├── 11. 最后一条 SSE: {type: "done", content: "...", sources: [...]}
└── 12. 保存 AI 消息到 SQLite
```

### 3.3 前端交互流程

```
ChatView.vue
├── SessionSidebar: 加载历史会话列表，新建/切换/删除
├── ChatMessages: 显示消息气泡
│   ├── 用户消息：右对齐
│   └── AI 消息：左对齐 + TypingEffect 流式显示
│       └── 下方：SourcePanel（可展开，显示引用来源）
├── ChatInput: 输入框
│   ├── Enter 发送
│   └── Shift+Enter 换行
└── Pinia Store: 管理 SSE 连接、消息状态、加载动画
```

## 四、关键设计细节

### 4.1 Query 改写（意图澄清）

```typescript
// 仅当用户输入长度 < 10 时触发
async function rewriteQuery(query: string): Promise<string> {
  if (query.length >= 10) return query;
  
  const prompt = `将以下用户问题改写为更精确、更具体的技术查询，以便在帮助中心文档中检索到相关内容。
原问题：${query}
改写后：`;
  
  // 调用 Deepseek，temperature=0.3
  return await llm.complete(prompt);
}

// 示例
"怎么重启" → "云主机实例重启的操作步骤和方法"
```

### 4.2 文档缓存结构

```
data/raw/category-1448/
├── category.json                  # {id: 1448, name: "...", outline_id: 965}
├── outline.json                   # 完整目录树
└── 产品发布记录/
│   └── 产品发布记录.json           # {article_id, title, content_hash, html, category_path, fetched_at}
└── 操作指南/
    └── 实例生命周期/
        └── 实例重启.json           # {article_id: 83610, ...}
```

**注意**：目录和文章名可以相同（如"产品发布记录"），因为一个是目录一个是 `.json` 文件，不会冲突。

### 4.3 Milvus Collection Schema

```yaml
Collection: helpcenter_chunks
Fields:
  - id: INT64 (auto_id)
  - vector: FLOAT_VECTOR (768 dim)
  - content: VARCHAR(8192)          # 原文 chunk
  - article_id: INT64
  - article_title: VARCHAR(512)
  - category_path: VARCHAR(1024)    # 如 "云主机 > 操作指南 > 实例生命周期"
  - chunk_index: INT32
  - created_at: TIMESTAMP
```

### 4.4 适配器配置（config.yaml）

```yaml
embedding:
  provider: ollama
  model: bge-base-zh-v1.5
  baseUrl: http://localhost:11434

llm:
  provider: deepseek
  model: deepseek-chat
  baseUrl: https://api.deepseek.com/v1
  apiKey: ${DEEPSEEK_API_KEY}

reranker:
  provider: none        # Phase 1: 不启用
  # provider: ollama    # Phase 2: 可切换
  # model: bge-reranker-base

queryRewrite:
  enabled: true
  minQueryLength: 10    # 少于 10 字才改写
```

## 五、实施阶段

| 阶段 | 内容 | 预估时间 |
|------|------|---------|
| **Phase 1** | 基础设施：项目初始化、Docker Compose、Milvus 连接测试 | 1h |
| **Phase 2** | content-processor：fetcher、cache、parser、chunker、indexer、CLI | 3-4h |
| **Phase 3** | backend：NestJS 初始化、配置模块、Milvus 服务、LLM 适配器、Query 改写、RAG Chat、Session 管理、SSE | 4-5h |
| **Phase 4** | frontend：Vue 3 初始化、Pinia、SessionSidebar、ChatMessages、ChatInput、TypingEffect、SourcePanel、SSE 对接 | 3-4h |
| **Phase 5** | 集成测试：端到端测试、Prompt 调优、chunk 策略调优 | 1-2h |

**总计：约 12-16 小时**

## 六、前置依赖

在开始编码前，请确保以下环境已准备：

1. **Node.js 18+** 和 **npm/pnpm/yarn**
2. **Ollama 已安装** 并拉取了模型：
   ```bash
   ollama pull bge-base-zh-v1.5
   ```
3. **Deepseek API Key**（用于 LLM 和 Query 改写）
4. **Milvus 容器已运行**（你提到已有镜像，只需确认连接地址）
5. **Docker Compose**（用于项目编排）
