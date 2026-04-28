# 故障排查指南

本文档记录在开发、部署和运行 `helpcenter-rag` 项目过程中遇到的常见问题及解决方案。

---

## 后端启动问题

### 问题：DriverPackageNotInstalledError: SQLite package has not been found installed

**现象**

启动 NestJS 后端时出现以下错误：

```
[Nest] 24683  - 04/27/2026, 7:43:42 AM   ERROR [TypeOrmModule] Unable to connect to the database. Retrying (2)...
DriverPackageNotInstalledError: SQLite package has not been found installed. Please run "npm install sqlite3".
```

**原因**

虽然 `sqlite3` 包已安装在 `node_modules` 中，但它的核心是一个 **C++ 原生模块**，需要编译后的 `.node` 二进制文件才能运行。该文件缺失通常是因为：

1. 使用了 pnpm 作为包管理器，预编译二进制下载失败
2. Node 版本太新（如 v24.x），sqlite3 没有对应预编译版本
3. `prebuild-install` 未能成功下载对应平台的二进制文件

**验证**

运行以下命令验证：

```bash
cd backend
node -e "require('sqlite3')"
```

如果出现 `Could not locate the bindings file` 错误，说明原生绑定缺失。

**解决方案**

**方案 1：重新构建原生模块（推荐）**

```bash
cd backend
npm rebuild sqlite3 --build-from-source
```

这会使用本地 C++ 编译器重新编译 sqlite3。

**方案 2：删除后重新安装**

```bash
cd backend
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

**方案 3：降级 Node 版本（最稳定）**

Node v24 目前还不是 LTS 版本，建议使用 Node v20 LTS：

```bash
# 使用 nvm 切换
nvm install 20
nvm use 20
rm -rf node_modules
pnpm install
```

**方案 4：改用 better-sqlite3（可选）**

如果持续遇到编译问题，可改用 `better-sqlite3`：

```bash
cd backend
pnpm remove sqlite3
pnpm add better-sqlite3
```

然后修改 `backend/src/app.module.ts`：

```typescript
TypeOrmModule.forRoot({
  type: 'better-sqlite3',  // 从 'sqlite' 改为 'better-sqlite3'
  database: 'data/chat.db',
  entities: [__dirname + '/**/*.entity{.ts,.js}'],
  synchronize: true,
}),
```

**参考**

- TypeORM SQLite 驱动文档: https://typeorm.io/data-source-options#sqlite-data-source-options
- sqlite3 原生模块问题: https://github.com/TryGhost/node-sqlite3/issues

---

---

## RAG 检索与回答质量问题

### 问题：用户查询"如何创建海山 PG"返回"根据现有资料，暂时无法回答该问题"

**现象**

输入"如何创建海山 PG"或"如何创建海山PG实例"时，系统返回固定回复：

```
根据现有资料，暂时无法回答该问题
```

但 Milvus 中已索引相关文档（如"实例订购"、"如何购买"等）。

**原因分析**

这是一个多环节问题，涉及检索参数、reranker、查询语义和 LLM 判断：

1. **相似度度量不适合**：Milvus 使用 `L2`（欧氏距离），对语义相似度的区分度不如 `COSINE`，且没有相似度阈值过滤，低质量结果也会被送入 LLM。

2. **召回数量不足**：`topK = 5` 太小，Query Rewriter 生成多个查询变体后，去重后可用文档更少。

3. **无有效 Reranker**：使用 `NoOpReranker`，检索结果未经精排直接交给 LLM。

4. **Reranker 输入错误**：`chat.service.ts` 调用 `reranker.rerank(userMessage, candidates)` 时传入的是**原始用户查询**，而非 Query Rewriter 改写后的查询。导致 cross-encoder 用"如何创建海山PG"去匹配文档，而文档内容中写的是"云原生数据库 PostgreSQL 版"，cross-encoder 判定不相关，给出负分。

5. **LLM 不了解产品别名**：即使检索到了"云原生数据库 PostgreSQL 版"的文档，LLM 看到用户问的是"海山PG"，参考资料里全是另一个名字，判断为"资料不足以回答"。

6. **ONNX 模型下载失败**：`@xenova/transformers` 默认从 HuggingFace 下载模型，国内网络环境下会超时失败，导致 reranker fallback 到 COSINE 排序。

**解决方案**

**1. 切换相似度度量并增加阈值**

修改 `content-processor/src/indexer.ts` 和 `backend/src/milvus/milvus.service.ts`：

```typescript
// indexer.ts - 创建 collection 时
metric_type: 'COSINE'  // 从 'L2' 改为 'COSINE'

// milvus.service.ts - 检索时
metric_type: 'COSINE',
params: { nprobe: 16 }

// 过滤低质量结果（COSINE 越大越相似）
return mapped.filter((r) => r.score >= threshold)
```

配置项（`config.yaml`）：

```yaml
retrieval:
  topK: 20          # 从 5 增大到 20
  similarityThreshold: 0.6
  finalK: 5
```

**2. 实现 Cross-Encoder Reranker**

- 安装 `@xenova/transformers`
- 创建 `backend/src/reranker/cross-encoder.adapter.ts`
- 使用 `AutoTokenizer` + `AutoModelForSequenceClassification` 运行 ONNX 模型
- `reranker.module.ts` 使用工厂模式，根据 `config.reranker.provider` 注入 `CrossEncoderReranker` 或 `NoOpReranker`

**3. 本地 ONNX 模型加载（解决下载问题）**

```bash
mkdir -p backend/.cache/reranker/models/Xenova/bge-reranker-base/onnx

# 下载模型文件（可从 modelscope.cn 等国内镜像）
cd backend/.cache/reranker/models/Xenova/bge-reranker-base
wget https://modelscope.cn/models/Xenova/bge-reranker-base/resolve/master/onnx/model_quantized.onnx
wget https://modelscope.cn/models/Xenova/bge-reranker-base/resolve/master/tokenizer.json
wget https://modelscope.cn/models/Xenova/bge-reranker-base/resolve/master/config.json
wget https://modelscope.cn/models/Xenova/bge-reranker-base/resolve/master/tokenizer_config.json
```

代码中配置纯本地加载：

```typescript
const { env } = await import('@xenova/transformers')
env.cacheDir = path.join(process.cwd(), '.cache', 'reranker')
env.localModelPath = path.join(cacheDir, 'models')
env.allowRemoteModels = false
env.allowLocalModels = true
```

**4. 修复 Rerank 输入（关键修复）**

`backend/src/chat/chat.service.ts`：

```typescript
// 修复前
const reranked = await this.reranker.rerank(userMessage, candidates)

// 修复后 - 使用 rewrite 后的第一个查询
const rerankQuery = queries[0]
const reranked = await this.reranker.rerank(rerankQuery, candidates)
```

**5. 修复 LLM 别名认知（关键修复）**

`backend/src/chat/chat.service.ts` — 在 system prompt 中增加别名映射提示：

```typescript
const aliasNote = queries[0] !== userMessage
  ? `\n注意：用户查询中的产品名称可能使用了简称或别名，检索时已将"${userMessage}"中的产品别名映射为标准名称"${queries[0]}"进行检索。参考资料中的"云原生数据库 PostgreSQL 版"即用户所询问的产品。\n`
  : ''
```

**验证结果**

- "如何创建海山PG实例" → 返回完整 6 步创建流程 ✅
- "如何购买云原生数据库" → 返回购买步骤 ✅
- Cross-encoder rerank 分数：`如何购买 (10.26)`、`实例订购 (9.90)`

---

## 添加新的故障排查记录

如果你遇到新的问题并解决了它，请按照以下格式添加记录：

```markdown
### 问题：[简要描述]

**现象**

[错误信息或异常现象]

**原因**

[根本原因分析]

**解决方案**

[具体的解决步骤]

**参考**

[相关链接或文档]
```
