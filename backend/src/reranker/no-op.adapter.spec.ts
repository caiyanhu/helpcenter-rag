import { NoOpReranker } from './no-op.adapter';

describe('NoOpReranker', () => {
  it('rerank should return candidates unchanged', async () => {
    const reranker = new NoOpReranker();
    const candidates = [{ id: '1' }, { id: '2' }] as any;
    const out = await reranker.rerank('query', candidates);
    expect(out).toEqual(candidates);
  });
});
