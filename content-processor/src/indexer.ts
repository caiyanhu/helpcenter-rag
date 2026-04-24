import { MilvusClient } from '@zilliz/milvus2-sdk-node';
import { Document } from 'langchain/document';
import { OllamaEmbeddings } from '@langchain/community/embeddings/ollama';

const COLLECTION_NAME = 'helpcenter_chunks';
const VECTOR_DIM = 768; // bge-base-zh-v1.5 dimension

let milvusClient: MilvusClient | null = null;

function getMilvusClient(): MilvusClient {
  if (!milvusClient) {
    const address = process.env.MILVUS_ADDRESS || 'localhost:19530';
    milvusClient = new MilvusClient({ address });
  }
  return milvusClient;
}

export async function ensureCollection(): Promise<void> {
  const client = getMilvusClient();

  const collections = await client.listCollections();
  const exists = collections.data.some(c => c.name === COLLECTION_NAME);

  if (exists) {
    console.log(`Collection ${COLLECTION_NAME} already exists`);
    return;
  }

  console.log(`Creating collection ${COLLECTION_NAME}...`);

  await client.createCollection({
    collection_name: COLLECTION_NAME,
    fields: [
      { name: 'id', data_type: 5, is_primary_key: true, autoID: true }, // INT64
      { name: 'vector', data_type: 101, dim: VECTOR_DIM }, // FLOAT_VECTOR
      { name: 'content', data_type: 21, max_length: 8192 }, // VARCHAR
      { name: 'article_id', data_type: 5 }, // INT64
      { name: 'article_title', data_type: 21, max_length: 512 }, // VARCHAR
      { name: 'category_path', data_type: 21, max_length: 1024 }, // VARCHAR
      { name: 'chunk_index', data_type: 5 }, // INT64
    ],
  });

  await client.createIndex({
    collection_name: COLLECTION_NAME,
    field_name: 'vector',
    index_type: 'IVF_FLAT',
    metric_type: 'L2',
    params: { nlist: 128 },
  });

  await client.loadCollectionSync({ collection_name: COLLECTION_NAME });

  console.log(`Collection ${COLLECTION_NAME} created and loaded`);
}

export async function deleteByArticleId(articleId: number): Promise<void> {
  const client = getMilvusClient();

  await client.delete({
    collection_name: COLLECTION_NAME,
    expr: `article_id == ${articleId}`,
  });

  console.log(`Deleted existing chunks for article ${articleId}`);
}

export async function indexChunks(chunks: Document[]): Promise<void> {
  const client = getMilvusClient();

  await ensureCollection();

  const embeddings = new OllamaEmbeddings({
    model: 'bge-base-zh-v1.5',
    baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
  });

  // Group chunks by article_id for batch processing
  const chunksByArticle = new Map<number, Document[]>();
  for (const chunk of chunks) {
    const articleId = chunk.metadata.articleId as number;
    if (!chunksByArticle.has(articleId)) {
      chunksByArticle.set(articleId, []);
    }
    chunksByArticle.get(articleId)!.push(chunk);
  }

  let totalIndexed = 0;

  for (const [articleId, articleChunks] of chunksByArticle) {
    // Delete existing chunks for this article
    await deleteByArticleId(articleId);

    // Embed in batches
    const batchSize = 32;
    for (let i = 0; i < articleChunks.length; i += batchSize) {
      const batch = articleChunks.slice(i, i + batchSize);
      const texts = batch.map(c => c.pageContent);

      console.log(`Embedding batch ${Math.floor(i / batchSize) + 1} for article ${articleId} (${batch.length} chunks)...`);
      const vectors = await embeddings.embedDocuments(texts);

      // Insert into Milvus
      const insertData = batch.map((chunk, idx) => ({
        vector: vectors[idx],
        content: chunk.pageContent,
        article_id: chunk.metadata.articleId,
        article_title: chunk.metadata.articleTitle,
        category_path: chunk.metadata.categoryPath,
        chunk_index: chunk.metadata.chunkIndex,
      }));

      await client.insert({
        collection_name: COLLECTION_NAME,
        data: insertData,
      });

      totalIndexed += batch.length;
    }
  }

  console.log(`Indexed ${totalIndexed} chunks into Milvus`);
}

export async function resetCollection(): Promise<void> {
  const client = getMilvusClient();

  const collections = await client.listCollections();
  const exists = collections.data.some(c => c.name === COLLECTION_NAME);

  if (exists) {
    await client.dropCollection({ collection_name: COLLECTION_NAME });
    console.log(`Dropped collection ${COLLECTION_NAME}`);
  }

  await ensureCollection();
}

export async function getCollectionStats(): Promise<{ totalChunks: number }> {
  const client = getMilvusClient();

  await ensureCollection();

  const stats = await client.getCollectionStatistics({ collection_name: COLLECTION_NAME });
  return {
    totalChunks: parseInt(stats.data.row_count || '0'),
  };
}
