import * as cheerio from 'cheerio'
import { Document } from '@langchain/core/documents'
import { CachedArticle } from './types.js'

export function parseHtmlToDocuments(articles: CachedArticle[]): Document[] {
  const documents: Document[] = []

  for (const article of articles) {
    const $ = cheerio.load(article.html)

    // Remove script, style, img tags
    $('script, style, img, iframe, video, audio, noscript').remove()

    // Extract text content
    const bodyText = $('body').text()
    const cleanText = bodyText.replace(/\s+/g, ' ').replace(/\n+/g, '\n').trim()

    if (cleanText.length === 0) {
      console.warn(`Article ${article.articleId} has no text content after parsing`)
      continue
    }

    documents.push(
      new Document({
        pageContent: cleanText,
        metadata: {
          articleId: article.articleId,
          articleTitle: article.title,
          categoryPath: article.categoryPath,
        },
      })
    )
  }

  console.log(`Parsed ${documents.length} documents from ${articles.length} articles`)
  return documents
}
