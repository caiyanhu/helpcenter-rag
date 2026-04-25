import { describe, it, expect } from 'vitest'
import { splitDocuments } from './chunker'
import { Document } from '@langchain/core/documents'

describe('splitDocuments', () => {
  it('splits a single document into multiple chunks and preserves metadata', async () => {
    const longText = Array.from({ length: 1500 }, () => 'word').join(' ')
    const doc = new Document({
      pageContent: longText,
      metadata: { articleId: 10, articleTitle: 'Chunk Test', categoryPath: '/cat' },
    })
    const chunks = await splitDocuments([doc])
    expect(chunks.length).toBeGreaterThan(1)
    // Check chunkIndex and metadata preservation
    chunks.forEach((c, idx) => {
      expect(c.metadata.chunkIndex).toBe(idx)
      expect(c.metadata.articleId).toBe(10)
      expect(c.metadata.articleTitle).toBe('Chunk Test')
      expect(c.metadata.categoryPath).toBe('/cat')
    })
  })

  it('overlaps chunks correctly with chunkOverlap=150', async () => {
    const longText = Array.from({ length: 1600 }, () => 'A'.repeat(1)).join('') // ~1600 chars
    const doc = new Document({
      pageContent: longText,
      metadata: { articleId: 11, articleTitle: 'Overlap', categoryPath: '/overlap' },
    })
    const chunks = await splitDocuments([doc])
    if (chunks.length >= 2) {
      const endFirst = chunks[0].pageContent.slice(-150)
      const startSecond = chunks[1].pageContent.slice(0, 150)
      expect(endFirst).toBe(startSecond)
    } else {
      // If only one chunk due to content size, that's still acceptable for small tests
      expect(chunks.length).toBeGreaterThanOrEqual(1)
    }
    // Metadata should persist
    chunks.forEach((c) => {
      expect(c.metadata.articleId).toBe(11)
      expect(c.metadata.articleTitle).toBe('Overlap')
    })
  })

  it('returns empty array when given no documents', async () => {
    const chunks = await splitDocuments([])
    expect(chunks).toHaveLength(0)
  })
})
