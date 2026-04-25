import fs from 'fs/promises'
import path from 'path'
import { Category, OutlineNode, Article, CachedArticle, CacheStatus } from './types.js'

const DATA_DIR = path.resolve(process.cwd(), 'data', 'raw')

function sanitizeFileName(name: string): string {
  return name.replace(/[<>:"/\\|?*]/g, '_').trim()
}

function getCategoryDir(categoryId: number): string {
  return path.join(DATA_DIR, `category-${categoryId}`)
}

export async function ensureCategoryDir(categoryId: number): Promise<string> {
  const dir = getCategoryDir(categoryId)
  await fs.mkdir(dir, { recursive: true })
  return dir
}

export async function saveCategoryInfo(category: Category, categoryId: number): Promise<void> {
  const dir = await ensureCategoryDir(categoryId)
  await fs.writeFile(path.join(dir, 'category.json'), JSON.stringify(category, null, 2))
}

export async function saveOutlineTree(outlineTree: OutlineNode, categoryId: number): Promise<void> {
  const dir = await ensureCategoryDir(categoryId)
  await fs.writeFile(path.join(dir, 'outline.json'), JSON.stringify(outlineTree, null, 2))
}

export function buildCategoryPath(
  node: OutlineNode,
  targetId: number,
  currentPath: string[] = []
): string[] | null {
  const newPath = [...currentPath, node.name]

  if (node.id === targetId) {
    return newPath
  }

  if (node.children) {
    for (const child of node.children) {
      const result = buildCategoryPath(child, targetId, newPath)
      if (result) return result
    }
  }

  return null
}

export function findNodePath(outlineTree: OutlineNode, articleId: number): string[] {
  function search(node: OutlineNode, path: string[]): string[] | null {
    const currentPath = [...path, node.name]

    if (node.articleId === articleId) {
      return currentPath
    }

    if (node.children) {
      for (const child of node.children) {
        const result = search(child, currentPath)
        if (result) return result
      }
    }

    return null
  }

  const result = search(outlineTree, [])
  return result || ['Unknown']
}

export async function saveArticle(
  article: Article,
  categoryPath: string[],
  categoryId: number
): Promise<void> {
  const baseDir = await ensureCategoryDir(categoryId)

  // Build directory structure from category path
  // Remove the root category name (first element) since it's already in category.json
  const relativePath = categoryPath.slice(1)

  let articleDir = baseDir
  for (const dirName of relativePath) {
    articleDir = path.join(articleDir, sanitizeFileName(dirName))
    await fs.mkdir(articleDir, { recursive: true })
  }

  const fileName = `${sanitizeFileName(article.title)}.json`
  const filePath = path.join(articleDir, fileName)

  const cachedArticle: CachedArticle = {
    articleId: article.articleId,
    title: article.title,
    contentHash: '', // Will be computed if needed
    html: article.content,
    categoryPath: categoryPath.join(' > '),
    fetchedAt: new Date().toISOString(),
  }

  await fs.writeFile(filePath, JSON.stringify(cachedArticle, null, 2))
}

export async function loadCachedArticles(categoryId: number): Promise<CachedArticle[]> {
  const baseDir = getCategoryDir(categoryId)

  try {
    await fs.access(baseDir)
  } catch {
    return []
  }

  const articles: CachedArticle[] = []

  async function walkDir(dir: string): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)

      if (entry.isDirectory()) {
        await walkDir(fullPath)
      } else if (
        entry.isFile() &&
        entry.name.endsWith('.json') &&
        entry.name !== 'category.json' &&
        entry.name !== 'outline.json'
      ) {
        try {
          const content = await fs.readFile(fullPath, 'utf-8')
          const article: CachedArticle = JSON.parse(content)
          articles.push(article)
        } catch (error) {
          console.warn(`Failed to load cached article ${fullPath}:`, error)
        }
      }
    }
  }

  await walkDir(baseDir)
  return articles
}

export async function loadCategoryInfo(categoryId: number): Promise<Category | null> {
  try {
    const content = await fs.readFile(
      path.join(getCategoryDir(categoryId), 'category.json'),
      'utf-8'
    )
    return JSON.parse(content)
  } catch {
    return null
  }
}

export async function loadOutlineTree(categoryId: number): Promise<OutlineNode | null> {
  try {
    const content = await fs.readFile(
      path.join(getCategoryDir(categoryId), 'outline.json'),
      'utf-8'
    )
    return JSON.parse(content)
  } catch {
    return null
  }
}

export async function getCacheStatus(categoryId: number): Promise<CacheStatus | null> {
  const category = await loadCategoryInfo(categoryId)
  if (!category) return null

  const articles = await loadCachedArticles(categoryId)
  const indexedArticles = articles.filter((a) => a.indexedAt).length

  const lastFetched =
    articles.length > 0
      ? articles
          .reduce((latest, a) => {
            const date = new Date(a.fetchedAt)
            return date > latest ? date : latest
          }, new Date(0))
          .toISOString()
      : null

  return {
    category,
    totalArticles: articles.length,
    indexedArticles,
    lastFetched,
  }
}

export async function clearCache(categoryId?: number): Promise<void> {
  if (categoryId) {
    const dir = getCategoryDir(categoryId)
    try {
      await fs.rm(dir, { recursive: true, force: true })
      console.log(`Cleared cache for category ${categoryId}`)
    } catch (error) {
      console.warn(`Failed to clear cache for category ${categoryId}:`, error)
    }
  } else {
    try {
      await fs.rm(DATA_DIR, { recursive: true, force: true })
      console.log('Cleared all cache')
    } catch (error) {
      console.warn('Failed to clear all cache:', error)
    }
  }
}
