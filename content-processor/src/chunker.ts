import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { Document } from 'langchain/document';

export async function splitDocuments(documents: Document[]): Promise<Document[]> {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 400,
    chunkOverlap: 50,
    separators: ['\n\n', '\n', '。', '！', '？', '.', '!', '?', ' ', ''],
  });

  const chunks = await splitter.splitDocuments(documents);

  // Add chunk index to metadata
  const chunksWithIndex = chunks.map((chunk, index) => {
    return new Document({
      pageContent: chunk.pageContent,
      metadata: {
        ...chunk.metadata,
        chunkIndex: index,
      },
    });
  });

  console.log(`Split ${documents.length} documents into ${chunksWithIndex.length} chunks`);
  return chunksWithIndex;
}
