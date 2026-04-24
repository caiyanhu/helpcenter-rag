import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as cache from './cache';
import type { Category, OutlineNode, Article } from './types';
import fsPromises from 'fs/promises';

vi.mock('fs/promises', () => {
  const store = {
    dirs: new Set<string>(),
    files: new Map<string, string>(),
  };

  const calls = {
    mkdir: [] as Array<{ dir: string; options?: any }>,
    writeFile: [] as Array<{ path: string; data: string }>,
    readFile: [] as Array<{ path: string; encoding?: string }>,
    access: [] as Array<string>,
    readdir: [] as Array<{ dir: string; opts?: any }>,
    rm: [] as Array<{ dir: string; opts?: any }>,
  };

  function reset() {
    store.dirs.clear();
    store.files.clear();
    calls.mkdir = [];
    calls.writeFile = [];
    calls.readFile = [];
    calls.access = [];
    calls.readdir = [];
    calls.rm = [];
  }

  const mockFs = {
    mkdir: async (dir: string, options?: any) => {
      store.dirs.add(dir);
      calls.mkdir.push({ dir, options });
    },
    writeFile: async (file: string, data: string) => {
      store.files.set(file, data);
      calls.writeFile.push({ path: file, data });
    },
    readFile: async (file: string, encoding?: string) => {
      calls.readFile.push({ path: file, encoding });
      const data = store.files.get(file);
      if (data === undefined) throw new Error('ENOENT');
      return data;
    },
    access: async (dir: string) => {
      calls.access.push(dir);
      if (!store.dirs.has(dir)) throw new Error('ENOENT');
    },
    readdir: async (dir: string, options?: any) => {
      calls.readdir.push({ dir, opts: options });
      const prefix = dir.endsWith('/') ? dir : dir + '/';
      const seen = new Set<string>();
      for (const d of Array.from(store.dirs)) {
        if (d.startsWith(prefix)) {
          const rest = d.slice(prefix.length);
          const first = rest.split('/')[0];
          if (first) seen.add(first);
        }
      }
      for (const f of Array.from(store.files.keys())) {
        if (f.startsWith(prefix)) {
          const rest = f.slice(prefix.length);
          const first = rest.split('/')[0];
          if (first) seen.add(first);
        }
      }
      return Array.from(seen).map((name) => {
        const fullPath = prefix + name;
        const isDir = store.dirs.has(fullPath) || Array.from(store.dirs).some((d) => d.startsWith(fullPath + '/'));
        return { name, isDirectory: () => isDir, isFile: () => !isDir } as any;
      });
    },
    rm: async (dir: string, options?: any) => {
      calls.rm.push({ dir, opts: options });
      for (const d of Array.from(store.dirs)) {
        if (d === dir || d.startsWith(dir + '/')) store.dirs.delete(d);
      }
      for (const f of Array.from(store.files.keys())) {
        if (f.startsWith(dir)) store.files.delete(f);
      }
    },
    __store: store,
    __calls: calls,
    __reset: reset,
  };

  reset();

  return {
    default: mockFs,
    ...mockFs,
  };
});

const fsAny = () => fsPromises as any;

describe('cache.ts', () => {
  beforeEach(() => {
    fsAny().__reset?.();
  });

  it('ensureCategoryDir creates directory recursively', async () => {
    const dir = await cache.ensureCategoryDir(12);
    expect(dir).toMatch(/category-12/);
    expect(fsAny().__calls.mkdir.length).toBeGreaterThanOrEqual(1);
    const last = fsAny().__calls.mkdir[fsAny().__calls.mkdir.length - 1];
    expect(last.dir).toContain('category-12');
    expect(last.options?.recursive).toBe(true);
  });

  it('saveCategoryInfo writes category.json', async () => {
    const category: Category = { id: 12, name: 'Cat', outlineId: 5 };
    await cache.saveCategoryInfo(category, 12);
    const writeCalls = fsAny().__calls.writeFile;
    expect(writeCalls.length).toBeGreaterThan(0);
    const last = writeCalls[writeCalls.length - 1];
    expect(last.path).toMatch(/category-12\/category\.json/);
    const parsed = JSON.parse(last.data);
    expect(parsed.name).toBe('Cat');
  });

  it('saveOutlineTree writes outline.json', async () => {
    const outline: OutlineNode = { id: 1, name: 'Root', children: [] } as any;
    await cache.saveOutlineTree(outline, 12);
    const writeCalls = fsAny().__calls.writeFile;
    const last = writeCalls[writeCalls.length - 1];
    expect(last.path).toMatch(/category-12\/outline\.json/);
  });

  it('buildCategoryPath finds path to target', () => {
    const tree: OutlineNode = {
      id: 1,
      name: 'Root',
      articleId: undefined,
      children: [
        {
          id: 2,
          name: 'Section',
          articleId: undefined,
          children: [{ id: 3, name: 'Article', articleId: 7 }],
        },
      ],
    };
    const path = cache.buildCategoryPath(tree, 3);
    expect(path).toEqual(['Root', 'Section', 'Article']);
  });

  it('findNodePath finds path by articleId', () => {
    const tree: OutlineNode = {
      id: 1,
      name: 'Root',
      articleId: undefined,
      children: [
        { id: 2, name: 'Sec', articleId: undefined, children: [{ id: 3, name: 'Art', articleId: 5 }] },
      ],
    };
    const path = cache.findNodePath(tree, 5);
    expect(path).toEqual(['Root', 'Sec', 'Art']);
  });

  it('saveArticle writes cached article json', async () => {
    const article: Article = { articleId: 7, title: 'My Article', content: '<p/>' };
    await cache.saveArticle(article, ['Root', 'Section', 'Sub'], 12);
    const writeCalls = fsAny().__calls.writeFile;
    expect(writeCalls.length).toBeGreaterThan(0);
    const last = writeCalls[writeCalls.length - 1];
    expect(last.path).toContain('/Section/Sub/My Article.json');
  });

  it('loadCachedArticles returns articles', async () => {
    const article: Article = { articleId: 1, title: 'A', content: '<b/>' };
    await cache.saveArticle(article, ['Root'], 12);
    const articles = await cache.loadCachedArticles(12);
    expect(articles.length).toBeGreaterThanOrEqual(1);
  });

  it('loadCachedArticles empty returns []', async () => {
    const articles = await cache.loadCachedArticles(999);
    expect(Array.isArray(articles)).toBe(true);
    expect(articles.length).toBe(0);
  });

  it('loadCategoryInfo reads category.json', async () => {
    const category: Category = { id: 99, name: 'Cat', outlineId: 1 };
    await cache.saveCategoryInfo(category, 99);
    const data = await cache.loadCategoryInfo(99);
    expect(data).toEqual(category);
  });

  it('loadOutlineTree reads outline.json', async () => {
    const outline: OutlineNode = { id: 2, name: 'Root', children: [] } as any;
    await cache.saveOutlineTree(outline, 99);
    const tree = await cache.loadOutlineTree(99);
    expect(tree).toEqual(outline);
  });

  it('getCacheStatus returns counts', async () => {
    const category: Category = { id: 303, name: 'C', outlineId: 1 };
    await cache.saveCategoryInfo(category, 303);
    await cache.saveArticle({ articleId: 1, title: 'A1', content: 'x' }, ['Root'], 303);
    await cache.saveArticle({ articleId: 2, title: 'A2', content: 'x' }, ['Root'], 303);
    const status = await cache.getCacheStatus(303);
    expect(status).toBeTruthy();
    expect(status?.category.id).toBe(303);
    expect(status?.totalArticles).toBe(2);
  });

  it('clearCache removes cache directory', async () => {
    await cache.clearCache(12);
    expect(fsAny().__calls.rm.length).toBeGreaterThanOrEqual(1);
  });
});
