import 'reflect-metadata';
import { paginate, resolvePaging } from './paginated';

describe('resolvePaging', () => {
  it('defaults to the first page', () => {
    expect(resolvePaging({})).toEqual({
      page: 1,
      perPage: 20,
      skip: 0,
      take: 20,
    });
  });

  it('computes the offset from the page number', () => {
    expect(resolvePaging({ page: 3, perPage: 25 })).toMatchObject({
      skip: 50,
      take: 25,
    });
  });
});

describe('paginate', () => {
  it('reports the number of pages', () => {
    expect(paginate([], 45, 1, 20).totalPages).toBe(3);
  });

  it('rounds a partial last page up', () => {
    expect(paginate([], 21, 1, 20).totalPages).toBe(2);
  });

  it('reports one page when the table is empty', () => {
    // "Page 1 of 0" reads as broken; an empty table is still one page.
    expect(paginate([], 0, 1, 20).totalPages).toBe(1);
  });

  it('carries the row payload through untouched', () => {
    expect(paginate([{ id: 1 }], 1, 1, 20)).toEqual({
      data: [{ id: 1 }],
      total: 1,
      page: 1,
      perPage: 20,
      totalPages: 1,
    });
  });
});
