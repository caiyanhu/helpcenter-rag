import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('axios', () => {
  const get = vi.fn();
  (globalThis as any).__mockAxiosGet = get;
  return {
    default: {
      create: vi.fn(() => ({ get })),
    },
  };
});

import {
  fetchCategoryInfo,
  fetchOutlineTree,
  fetchArticleInfo,
  fetchArticleContent,
  fetchArticle,
  crawlCategory,
} from './fetcher';

const mockGet = () => (globalThis as any).__mockAxiosGet;

describe('fetcher.ts', () => {
  beforeEach(() => {
    mockGet().mockReset();
  });

  it('fetchCategoryInfo returns Category', async () => {
    mockGet().mockResolvedValue({ data: { code: 0, data: { name: 'Cat', outlineId: 5 } } });
    const res = await fetchCategoryInfo(11);
    expect(res).toEqual({ id: 11, name: 'Cat', outlineId: 5 });
  });

  it('fetchCategoryInfo throws on error code', async () => {
    mockGet().mockResolvedValue({ data: { code: 1, message: 'err' } });
    await expect(fetchCategoryInfo(11)).rejects.toThrow();
  });

  it('fetchOutlineTree returns parsed tree', async () => {
    mockGet().mockResolvedValue({
      data: {
        code: 0,
        data: { id: 1, name: 'Root', articleId: undefined, children: [{ id: 2, name: 'Child', articleId: 3 }] },
      },
    });
    const outline = await fetchOutlineTree(10);
    expect(outline).toBeTruthy();
    expect(outline.id).toBe(1);
    expect(outline.children?.[0].name).toBe('Child');
  });

  it('fetchArticleInfo returns article metadata', async () => {
    mockGet().mockResolvedValue({ data: { code: 0, data: { id: 9, title: 'Title', content: 'hash' } } });
    const info = await fetchArticleInfo(9);
    expect(info).toEqual({ id: 9, title: 'Title', contentHash: 'hash' });
  });

  it('fetchArticleContent returns HTML string', async () => {
    mockGet().mockResolvedValue({ data: '<p>HTML</p>' });
    const html = await fetchArticleContent('hash');
    expect(html).toBe('<p>HTML</p>');
  });

  it('fetchArticle combines info + content', async () => {
    const calls = [
      { data: { code: 0, data: { id: 7, title: 'A', content: 'hash' } } },
      { data: '<div>ok</div>' },
    ];
    mockGet().mockImplementation(() => Promise.resolve(calls.shift()));
    const article = await fetchArticle(7);
    expect(article).toEqual({ articleId: 7, title: 'A', content: '<div>ok</div>' });
  });

  it('fetchArticle returns null on error', async () => {
    mockGet().mockRejectedValue(new Error('network'));
    const article = await fetchArticle(1);
    expect(article).toBeNull();
  });

  it('crawlCategory orchestrates full crawl flow', async () => {
    mockGet()
      .mockResolvedValueOnce({ data: { code: 0, data: { id: 11, name: 'Cat', outlineId: 12 } } })
      .mockResolvedValueOnce({ data: { code: 0, data: { id: 1, name: 'Root', articleId: undefined, children: [{ id: 2, name: 'A', articleId: 7 }] } } })
      .mockResolvedValueOnce({ data: { code: 0, data: { id: 7, title: 'A7', content: 'hash7' } } })
      .mockResolvedValueOnce({ data: '<div>content</div>' });

    const doc = await crawlCategory(11);
    expect(doc).toBeTruthy();
    expect(doc.category.id).toBe(11);
    expect(doc.articles.length).toBe(1);
    expect(doc.articles[0].articleId).toBe(7);
  });
});
