# helpcenter-rag RAG 流程优化分析

## 一、当前 RAG 流程诊断

### 1.1 现有流程

```
用户问题 → Query Rewriter(规则+LLM改写) → Milvus纯语义检索 → 去重 → Cross-Encoder重排 → Top5上下文 → LLM生成
```

**核心文件**：`backend/src/chat/chat.service.ts`

### 1.2 已具备的能力

- **Query Rewriter**：产品别名映射 + 同义词扩展 + LLM生成2-3个查询变体
- **向量检索**：Milvus COSINE 语义检索，topK=20，阈值 0.6
- **Cross-Encoder 重排序**：bge-reranker-base
- **SSE 流式输出**

### 1.3 已发现但未使用的资产

- `milvus.service.ts` 中已实现 **MMR（最大边际相关）算法**（`searchWithMMR` 方法），但 `chat.service.ts` 完全未调用

### 1.4 数据规模

- 当前 Collection：`helpcenter_chunks`，约 677 chunks
- 未来预期：约 4000 chunks（6倍增长）
- Milvus 服务端版本：`v2.6.15`（Standalone 模式）
- Node.js SDK 版本：`v2.6.13`

---

## 二、5 个痛点分析

### 痛点 1：所有问题都走检索，简单常识问题浪费资源

**现状**：`streamChat` 是纯线性流程，没有任何分支判断。用户问"你好"、"什么是云计算"也会完整执行 Milvus 查询。

**根因**：无问题路由（Query Routing）机制。

### 痛点 2：无纠错和评估机制，无法判断检索内容是否准确/足够

**现状**：检索完成后零质量评估。System Prompt 让 LLM 自己判断"资料是否足够"，但 LLM 没有检索质量指标。

**根因**：无检索结果评估（Retrieval Evaluation）步骤。

### 痛点 3：处理不了需要多步检索的复杂问题

**现状**：所有查询变体是并行单次检索，没有迭代。无法处理"创建后如何配置白名单"这种依赖型问题。

**根因**：无多步检索（Multi-Step RAG）能力。

### 痛点 4：纯语义检索，专业术语/精确实体匹配不准

**现状**：`milvus.service.ts` 中只有纯 COSINE 向量检索，没有关键词检索。

**根因**：无混合检索（Hybrid Search）能力。

### 痛点 5：本地知识库没有的内容，不会主动网络搜索补充

**现状**：代码中没有任何网络搜索集成。本地检索失败时只能回答"无法回答"。

**根因**：无 Web Search Fallback 机制。

---

## 三、方案对比

### 方案 A：Milvus Hybrid Search（Dense + BM25）

**原理**：在同一个 Collection 中同时支持 Dense Vector（语义检索）和 Sparse Vector（BM25 关键词检索），通过 RRF 融合排序。

**优势**：
- 零新增基础设施（当前 Milvus v2.6.15 已支持）
- 代码改动小（`indexer.ts` Schema + `milvus.service.ts` 检索逻辑）
- 解决精确术语召回问题

**劣势**：
- Milvus BM25 不如 ES 成熟（无同义词词典、无高亮、无 boost）
- 需要重建 Collection 和重新索引数据

**验证状态**：**未在真实数据上验证**。之前编写的测试脚本使用模拟数据或客户端简单字符串匹配，不能代表真实 BM25 效果。

### 方案 B：Elasticsearch 关键词检索

**原理**：将原始数据同步到 ES，利用 ES 的 BM25 做关键词检索，与 Milvus Dense 结果融合。

**优势**：
- BM25 全文检索成熟（ik_max_word 中文分词、同义词、高亮、boost）
- 业界标杆，生态丰富

**劣势**：
- 新增 1 个容器 + 2-4GB JVM 内存
- 需要维护数据同步链路
- 向量检索性能比 Milvus 差 3-5 倍
- `dense_vector` 维度上限 1024d
- **4000 文档对 ES 来说太小**，边际收益有限

### 方案 C：Agentic RAG

**原理**：让 LLM 深度参与检索流程决策：问题路由、检索结果评估、多步检索、查询重写等。

**优势**：
- 理论上能自适应不同查询复杂度
- 能自我评估和纠错

**劣势**：
- 每次对话 LLM 调用从 2 次增加到 4-6 次，成本增加 2-3 倍
- 延迟增加 1-3 秒
- 实现复杂度高（需要重构 chat.service.ts 为状态机/循环）
- **业界共识**：语料库 < 1000 文档时，Agentic RAG 增加开销但质量提升有限。4000 文档仍属"小到中等"规模。

---

## 四、验证测试反思

### 4.1 测试 1：模拟数据（10 条）

- 数据量太小，不具代表性
- RRF 融合逻辑有 bug，Hybrid 结果完全错误
- 单路结果展示了 Dense 和 Sparse 的不同特点

### 4.2 测试 2：现有 677 chunks

- 使用**客户端简单字符串匹配**模拟 Sparse，不是真实 BM25
- 真实 BM25 有 IDF 加权、文档长度归一化、倒排索引——客户端模拟做不到
- **Hybrid 效果差不能说明真实 BM25 会差**

### 4.3 关键结论

**目前没有在任何真实数据上验证过真实 BM25 的效果。** 所有关于 Hybrid Search 有效的断言，都来自：
- 业界论文和其他项目的案例
- Milvus 官方文档
- 理论分析

**这不是严谨的工程验证。**

---

## 五、建议

### 5.1 如果要验证 Hybrid Search 是否有效

正确顺序：
1. 改造 `indexer.ts`，创建新的 Collection（带 `sparse` 字段 + `BM25` function）
2. 用 `content-processor` 重新索引真实数据
3. 改造 `milvus.service.ts`，用真实的 `hybridSearch` API 查询
4. 用真实查询对比 Dense vs Hybrid 的结果
5. 人工判断或统计命中率

**只有完成上述验证后，才能判断 Hybrid Search 是否值得引入。**

### 5.2 如果暂时不做 Hybrid Search

以下优化项已经被证明有效，改动量小，风险低：

| 优化项 | 改动量 | 预期效果 |
|--------|--------|---------|
| 优化 Query Rewriter | 小 | 提升别名映射、同义词覆盖 |
| 启用 MMR（已有但未使用） | 极小 | 提升结果多样性 |
| 调整 similarityThreshold | 极小 | 过滤低质量结果 |
| 优化 System Prompt | 小 | 减少幻觉、提升回答质量 |

### 5.3 最终结论

**在没有完成真实数据验证之前，不应断言任何方案（Hybrid Search / ES / Agentic RAG）一定有效。**

最稳妥的路径：
1. **先做真实数据验证**（如果决定尝试 Hybrid Search）
2. **或先优化现有流程**（Query Rewriter、MMR、Prompt）
3. 根据验证结果，再决定是否引入更复杂的方案

---

*分析日期：2025-04-29*
