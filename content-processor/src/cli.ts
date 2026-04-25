import { Command } from 'commander'
import { crawlCategory, fetchArticle } from './fetcher.js'
import {
  saveCategoryInfo,
  saveOutlineTree,
  saveArticle,
  loadCachedArticles,
  loadCategoryInfo,
  loadOutlineTree,
  findNodePath,
  getCacheStatus,
  clearCache,
} from './cache.js'
import { parseHtmlToDocuments } from './parser.js'
import { splitDocuments } from './chunker.js'
import { indexChunks, resetCollection, getCollectionStats } from './indexer.js'
import { Article, OutlineNode } from './types.js'

const program = new Command()

program.name('content-processor').description('HelpCenter RAG Content Processor')

program
  .command('index')
  .description('Index documents from ecloud help center')
  .option('-c, --category <id>', 'Category ID to index', parseInt)
  .option('-f, --force-fetch', 'Force re-fetch from API (ignore cache)')
  .option('-o, --offline', 'Use cached data only (no API calls)')
  .action(async (options) => {
    try {
      const categoryId = options.category
      if (!categoryId) {
        console.error('Please specify a category ID with --category')
        process.exit(1)
      }

      console.log(`Indexing category ${categoryId}...`)

      // Step 1: Fetch or load from cache
      let category = await loadCategoryInfo(categoryId)
      let outlineTree = await loadOutlineTree(categoryId)
      let articles: Article[] = []

      if (options.offline) {
        console.log('Offline mode: using cached data only')
        const cachedArticles = await loadCachedArticles(categoryId)
        articles = cachedArticles.map((ca) => ({
          articleId: ca.articleId,
          title: ca.title,
          content: ca.html,
        }))
      } else if (options.forceFetch || !category || !outlineTree) {
        console.log('Fetching from API...')
        const doc = await crawlCategory(categoryId)
        category = doc.category
        outlineTree = doc.outlineTree
        articles = doc.articles

        // Save to cache
        await saveCategoryInfo(category, categoryId)
        await saveOutlineTree(outlineTree, categoryId)

        for (const article of articles) {
          const path = findNodePath(outlineTree, article.articleId)
          await saveArticle(article, path, categoryId)
        }
      } else {
        console.log('Using cached data...')
        const cachedArticles = await loadCachedArticles(categoryId)
        articles = cachedArticles.map((ca) => ({
          articleId: ca.articleId,
          title: ca.title,
          content: ca.html,
        }))
      }

      if (articles.length === 0) {
        console.log('No articles found')
        return
      }

      // Step 2: Parse HTML to documents
      const cachedArticles = await loadCachedArticles(categoryId)
      const documents = parseHtmlToDocuments(cachedArticles)

      // Step 3: Split into chunks
      const chunks = await splitDocuments(documents)

      // Step 4: Index into Milvus
      await indexChunks(chunks)

      const stats = await getCollectionStats()
      console.log(`\nIndexing complete! Total chunks in Milvus: ${stats.totalChunks}`)
    } catch (error) {
      console.error('Indexing failed:', error)
      process.exit(1)
    }
  })

program
  .command('reset')
  .description('Reset Milvus collection (delete all indexed data)')
  .action(async () => {
    try {
      console.log('Resetting Milvus collection...')
      await resetCollection()
      console.log('Reset complete')
    } catch (error) {
      console.error('Reset failed:', error)
      process.exit(1)
    }
  })

program
  .command('status')
  .description('Show indexing status')
  .option('-c, --category <id>', 'Category ID', parseInt)
  .action(async (options) => {
    try {
      if (options.category) {
        const status = await getCacheStatus(options.category)
        if (status) {
          console.log(`Category: ${status.category.name} (ID: ${status.category.id})`)
          console.log(`Cached articles: ${status.totalArticles}`)
          console.log(`Indexed articles: ${status.indexedArticles}`)
          console.log(`Last fetched: ${status.lastFetched || 'Never'}`)
        } else {
          console.log(`No cache found for category ${options.category}`)
        }
      }

      const stats = await getCollectionStats()
      console.log(`\nMilvus collection: ${stats.totalChunks} chunks`)
    } catch (error) {
      console.error('Status check failed:', error)
      process.exit(1)
    }
  })

program
  .command('clear-cache')
  .description('Clear local cache')
  .option('-c, --category <id>', 'Category ID (clear specific category)', parseInt)
  .action(async (options) => {
    await clearCache(options.category)
  })

program.parse()
