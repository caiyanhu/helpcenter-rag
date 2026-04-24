export interface Category {
  id: number;
  name: string;
  outlineId: number;
}

export interface OutlineNode {
  id: number;
  name: string;
  articleId?: number;
  children?: OutlineNode[];
}

export interface Article {
  articleId: number;
  title: string;
  content: string; // HTML
}

export interface CategoryDocument {
  category: Category;
  outlineTree: OutlineNode;
  articles: Article[];
}

export interface CachedArticle {
  articleId: number;
  title: string;
  contentHash: string;
  html: string;
  categoryPath: string;
  fetchedAt: string;
  indexedAt?: string;
}

export interface CacheStatus {
  category: Category;
  totalArticles: number;
  indexedArticles: number;
  lastFetched: string | null;
}
