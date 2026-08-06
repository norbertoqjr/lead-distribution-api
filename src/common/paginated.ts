import { DEFAULT_PER_PAGE } from './dto/pagination-query.dto';

export type Paginated<T> = {
  data: T[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
};

/** Normalizes paging input into a database offset and limit. */
export function resolvePaging(query: { page?: number; perPage?: number }): {
  page: number;
  perPage: number;
  skip: number;
  take: number;
} {
  const perPage = query.perPage ?? DEFAULT_PER_PAGE;
  const page = query.page ?? 1;

  return { page, perPage, skip: (page - 1) * perPage, take: perPage };
}

export function paginate<T>(
  data: T[],
  total: number,
  page: number,
  perPage: number,
): Paginated<T> {
  return {
    data,
    total,
    page,
    perPage,
    // At least 1, so an empty table reads as "page 1 of 1" rather than "of 0".
    totalPages: Math.max(1, Math.ceil(total / perPage)),
  };
}
