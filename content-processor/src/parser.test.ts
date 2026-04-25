import { describe, it, expect } from 'vitest'
import { parseHtmlToDocuments } from './parser'
import { Document } from '@langchain/core/documents'

type CachedArticle = {
  articleId: number
  title: string
  contentHash: string
  html: string
  categoryPath: string
  fetchedAt: string
  indexedAt?: string
}

describe('parseHtmlToDocuments', () => {
  it('parses valid HTML to Document with correct pageContent and metadata', () => {
    const art: CachedArticle = {
      articleId: 1,
      title: 'First Article',
      contentHash: 'hash1',
      html: `<html><body><div>Hello   World</div></body></html>`,
      categoryPath: '/category/one',
      fetchedAt: '2026-04-24',
    }
    const docs = parseHtmlToDocuments([art])
    expect(docs).toHaveLength(1)
    const d = docs[0]
    expect(d).toBeInstanceOf(Document)
    expect(d.pageContent).toContain('Hello World')
    expect(d.metadata.articleId).toBe(1)
    expect(d.metadata.articleTitle).toBe('First Article')
    expect(d.metadata.categoryPath).toBe('/category/one')
  })

  it('removes script/style/img/iframe/video/audio/noscript tags', () => {
    const art: CachedArticle = {
      articleId: 2,
      title: '2nd',
      contentHash: 'hash2',
      html: `
        <html><body>
          <script>var x=1;</script>
          <style>.a{color:red}</style>
          Visible text
          <img src="logo.png" alt="should be removed"/>
          <iframe src="https://example.com"></iframe>
          <noscript>no-js</noscript>
        </body></html>
      `,
      categoryPath: '/category/two',
      fetchedAt: '2026-04-24',
    }
    const docs = parseHtmlToDocuments([art])
    expect(docs).toHaveLength(1)
    const content = docs[0].pageContent
    expect(content).toContain('Visible text')
    expect(content).not.toContain('var x=1')
    expect(content).not.toContain('no-js')
  })

  it('handles multiple articles and returns multiple Documents', () => {
    const art1: CachedArticle = {
      articleId: 3,
      title: 'Three',
      contentHash: 'h3',
      html: `<html><body>First article text</body></html>`,
      categoryPath: '/cat',
      fetchedAt: '2026-04-24',
    }
    const art2: CachedArticle = {
      articleId: 4,
      title: 'Four',
      contentHash: 'h4',
      html: `<html><body>Second article text</body></html>`,
      categoryPath: '/cat2',
      fetchedAt: '2026-04-24',
    }
    const docs = parseHtmlToDocuments([art1, art2])
    expect(docs).toHaveLength(2)
    expect(docs[0].metadata.articleId).toBe(3)
    expect(docs[1].metadata.articleId).toBe(4)
  })

  it('skips empty articles with no text after cleanup', () => {
    const art: CachedArticle = {
      articleId: 5,
      title: 'Empty',
      contentHash: 'h5',
      html: `<html><body><script>1</script></body></html>`,
      categoryPath: '/cat',
      fetchedAt: '2026-04-24',
    }
    const docs = parseHtmlToDocuments([art])
    expect(docs).toHaveLength(0)
  })

  it('collapses whitespace in pageContent', () => {
    const art: CachedArticle = {
      articleId: 6,
      title: 'Whitespace',
      contentHash: 'h6',
      html: `<html><body>  Hello   World\nThis  is   a   test.  </body></html>`,
      categoryPath: '/ws',
      fetchedAt: '2026-04-24',
    }
    const docs = parseHtmlToDocuments([art])
    expect(docs).toHaveLength(1)
    expect(docs[0].pageContent).toBe('Hello World This is a test.')
  })
})
