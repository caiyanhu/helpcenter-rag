import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters'
import { Document } from '@langchain/core/documents'

export async function splitDocuments(documents: Document[]): Promise<Document[]> {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 150,
    separators: ['\n\n', '\n', '。', '！', '？', '.', '!', '?', ' ', ''],
  })

  const chunks = await splitter.splitDocuments(documents)

  // Add chunk index to metadata
  const chunksWithIndex = chunks.map((chunk, index) => {
    return new Document({
      pageContent: chunk.pageContent,
      metadata: {
        ...chunk.metadata,
        chunkIndex: index,
      },
    })
  })

  console.log(`Split ${documents.length} documents into ${chunksWithIndex.length} chunks`)
  return chunksWithIndex
}
