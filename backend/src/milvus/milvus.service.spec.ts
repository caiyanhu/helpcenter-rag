import { MilvusClient } from '@zilliz/milvus2-sdk-node'
import { MilvusService } from './milvus.service'

jest.mock('@zilliz/milvus2-sdk-node', () => {
  return {
    MilvusClient: jest.fn(),
  }
})

describe('MilvusService', () => {
  let service: MilvusService
  let mockClient: any

  beforeEach(() => {
    mockClient = {
      search: jest.fn().mockResolvedValue({
        results: [
          {
            id: 'doc1',
            score: 0.92,
            content: 'c1',
            article_id: 1,
            article_title: 'T1',
            category_path: 'cat/1',
          },
          {
            id: 'doc2',
            score: 0.85,
            content: 'c2',
            article_id: 2,
            article_title: 'T2',
            category_path: 'cat/2',
          },
        ],
      }),
    }
    ;(MilvusClient as jest.MockedClass<typeof MilvusClient>).mockImplementation(
      () => mockClient as any
    )
    ;(globalThis as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ embeddings: [Array(1024).fill(0.1)] }),
    })

    const configMock = {
      embedding: { model: 'bge-m3', baseUrl: 'http://localhost:11434' },
    } as any

    service = new MilvusService(configMock)
  })

  it('search should return mapped results from Milvus client', async () => {
    const res = await service.search('hello world', 2)
    expect(Array.isArray(res)).toBe(true)
    expect(res.length).toBe(2)
    expect(res[0]).toHaveProperty('id', 'doc1')
    expect(res[0]).toHaveProperty('score', 0.92)
    expect(res[0]).toHaveProperty('content', 'c1')
    expect(res[0]).toHaveProperty('articleId', 1)
    expect(res[0]).toHaveProperty('articleTitle', 'T1')
    expect(res[0]).toHaveProperty('categoryPath', 'cat/1')
  })

  it('searchWithMMR should return top 5 results', async () => {
    mockClient.search = jest.fn().mockResolvedValue({
      results: [
        {
          id: 'a',
          score: 0.1,
          content: 'a content',
          article_id: 1,
          article_title: 'A',
          category_path: 'cat/a',
        },
        {
          id: 'b',
          score: 0.2,
          content: 'b content',
          article_id: 2,
          article_title: 'B',
          category_path: 'cat/b',
        },
        {
          id: 'c',
          score: 0.3,
          content: 'c content',
          article_id: 3,
          article_title: 'C',
          category_path: 'cat/c',
        },
        {
          id: 'd',
          score: 0.4,
          content: 'd content',
          article_id: 4,
          article_title: 'D',
          category_path: 'cat/d',
        },
        {
          id: 'e',
          score: 0.5,
          content: 'e content',
          article_id: 5,
          article_title: 'E',
          category_path: 'cat/e',
        },
        {
          id: 'f',
          score: 0.6,
          content: 'f content',
          article_id: 6,
          article_title: 'F',
          category_path: 'cat/f',
        },
      ],
    })

    const res = await service.searchWithMMR('query', 10, 0.5)
    expect(res).toBeInstanceOf(Array)
    expect(res.length).toBe(5)
  })

  it('contentSimilarity should compute Jaccard similarity', () => {
    const sim = (service as any).contentSimilarity('foo bar', 'bar baz')
    expect(sim).toBeCloseTo(1 / 3, 4)
  })
})
