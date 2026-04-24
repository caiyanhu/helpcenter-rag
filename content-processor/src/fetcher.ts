import axios from 'axios';
import { Category, OutlineNode, Article, CategoryDocument } from './types.js';

const BASE_URL = 'https://ecloud.10086.cn/op-help-center/request-api/service-api';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Accept': 'application/json',
  },
});

export async function fetchCategoryInfo(categoryId: number): Promise<Category> {
  const response = await api.get(`/category/info/${categoryId}`);
  const data = response.data;

  if (data.code !== 0 && data.code !== 200) {
    throw new Error(`Failed to fetch category info: ${data.message}`);
  }

  return {
    id: categoryId,
    name: data.data.name,
    outlineId: data.data.outlineId,
  };
}

export async function fetchOutlineTree(outlineId: number): Promise<OutlineNode> {
  const response = await api.get(`/outline/tree?outlineId=${outlineId}`);
  const data = response.data;

  if (data.code !== 0 && data.code !== 200) {
    throw new Error(`Failed to fetch outline tree: ${data.message}`);
  }

  return parseOutlineNode(data.data);
}

function parseOutlineNode(data: any): OutlineNode {
  const children = data.children && data.children.length > 0
    ? data.children.map(parseOutlineNode)
    : undefined;

  return {
    id: data.id,
    name: data.name,
    articleId: data.articleId ?? undefined,
    children,
  };
}

export async function fetchArticleInfo(articleId: number): Promise<{ id: number; title: string; contentHash: string }> {
  const response = await api.get(`/article/info/${articleId}`);
  const data = response.data;

  if (data.code !== 0 && data.code !== 200) {
    throw new Error(`Failed to fetch article info ${articleId}: ${data.message}`);
  }

  return {
    id: data.data.id,
    title: data.data.title,
    contentHash: data.data.content,
  };
}

export async function fetchArticleContent(contentHash: string): Promise<string> {
  const response = await api.get(`/article/content/${contentHash}`, {
    responseType: 'text',
  });
  return response.data;
}

export async function fetchArticle(articleId: number): Promise<Article | null> {
  try {
    const info = await fetchArticleInfo(articleId);
    const html = await fetchArticleContent(info.contentHash);
    return {
      articleId: info.id,
      title: info.title,
      content: html,
    };
  } catch (error) {
    console.warn(`Failed to fetch article ${articleId}:`, error);
    return null;
  }
}

export async function crawlCategory(categoryId: number): Promise<CategoryDocument> {
  console.log(`Fetching category info for ${categoryId}...`);
  const category = await fetchCategoryInfo(categoryId);
  console.log(`Category: ${category.name}, outlineId: ${category.outlineId}`);

  console.log(`Fetching outline tree...`);
  const outlineTree = await fetchOutlineTree(category.outlineId);

  console.log(`Collecting articles...`);
  const articles: Article[] = [];
  await traverseAndCollect(outlineTree, articles);

  console.log(`Total articles collected: ${articles.length}`);

  return {
    category,
    outlineTree,
    articles,
  };
}

async function traverseAndCollect(node: OutlineNode, articles: Article[]): Promise<void> {
  if (node.articleId !== undefined && node.articleId !== null) {
    const article = await fetchArticle(node.articleId);
    if (article) {
      articles.push(article);
    }
  } else if (node.children && node.children.length > 0) {
    for (const child of node.children) {
      await traverseAndCollect(child, articles);
    }
  }
}
