import {
  type FindManyOptions,
  type FindOptionsWhere,
  ILike,
  Raw,
  type Repository,
} from 'typeorm';

export type SortOrder = 'asc' | 'desc';

export interface SortParam {
  column: string;
  order: 'ASC' | 'DESC';
}

export interface FilterParams {
  [column: string]: string;
}

export interface PaginatedResult<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
  page: number;
  totalPages: number;
}

export function parsePage(raw?: string): number {
  const n = parseInt(raw ?? '', 10);
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

export function parsePageSize(raw?: string, fallback = 10): number {
  const n = parseInt(raw ?? '', 10);
  return Number.isFinite(n) && n >= 1 && n <= 100 ? n : fallback;
}

export function buildResult<T>(
  results: T[],
  count: number,
  page: number,
  pageSize: number,
): PaginatedResult<T> {
  const totalPages = Math.max(1, Math.ceil(count / pageSize));
  return {
    results,
    count,
    page,
    totalPages,
    next: page < totalPages ? `?page=${page + 1}&pageSize=${pageSize}` : null,
    previous: page > 1 ? `?page=${page - 1}&pageSize=${pageSize}` : null,
  };
}

export async function paginate<T>(
  repo: Repository<T>,
  options: FindManyOptions<T>,
  page: number,
  pageSize: number,
): Promise<PaginatedResult<T>> {
  const [results, count] = await repo.findAndCount({
    ...options,
    skip: (page - 1) * pageSize,
    take: pageSize,
  });
  return buildResult(results, count, page, pageSize);
}

// ── Filter & Sort helpers ────────────────────────────────────────────────

export function parseSort(
  sortRaw: string | undefined,
  orderRaw: string | undefined,
  allowedColumns: readonly string[],
): SortParam | null {
  if (!sortRaw || !allowedColumns.includes(sortRaw)) return null;
  const order = orderRaw?.toLowerCase() === 'desc' ? 'DESC' : 'ASC';
  return { column: sortRaw, order };
}

export function parseFilters(
  query: Record<string, unknown>,
  allowedColumns: readonly string[],
): FilterParams {
  const filters: FilterParams = {};
  for (const key of Object.keys(query)) {
    const filterPattern = /^filter\[(\w+)]$/;
    const match = filterPattern.exec(key);
    if (!match) continue;
    const col = match[1];
    const val = query[key];
    if (typeof val === 'string' && val.trim() && allowedColumns.includes(col)) {
      filters[col] = val.trim();
    }
  }
  return filters;
}

export function parseSearch(raw: string | undefined): string {
  return (raw ?? '').trim();
}

export function buildTypeOrmWhere<T>(
  filters: FilterParams,
): FindOptionsWhere<T> | undefined {
  const keys = Object.keys(filters);
  if (keys.length === 0) return undefined;
  const where: Record<string, unknown> = {};
  for (const col of keys) {
    where[col] = ILike(`%${filters[col]}%`);
  }
  return where as FindOptionsWhere<T>;
}

/** Builds an array of OR conditions for a single search term across all allowed columns.
 *  Uses CAST(... AS TEXT) so non-text columns (boolean, date) are safely compared via ILIKE. */
export function buildTypeOrmSearchWhere<T>(
  search: string,
  allowedColumns: readonly string[],
): FindOptionsWhere<T>[] | undefined {
  if (!search) return undefined;
  return allowedColumns.map(
    (col) =>
      ({
        [col]: Raw((alias) => `CAST(${alias} AS TEXT) ILIKE :search`, {
          search: `%${search}%`,
        }),
      }) as FindOptionsWhere<T>,
  );
}

export async function paginateWithFilterSort<T>(
  repo: Repository<T>,
  baseOptions: FindManyOptions<T>,
  page: number,
  pageSize: number,
  sort: SortParam | null,
  filters: FilterParams,
): Promise<PaginatedResult<T>> {
  const options: FindManyOptions<T> = { ...baseOptions };

  // Apply filters (merge with existing where)
  const filterWhere = buildTypeOrmWhere<T>(filters);
  if (filterWhere) {
    options.where = options.where
      ? ({
          ...(options.where as Record<string, unknown>),
          ...filterWhere,
        } as FindOptionsWhere<T>)
      : filterWhere;
  }

  // Apply sort (override default order)
  if (sort) {
    options.order = {
      [sort.column]: sort.order,
    } as FindManyOptions<T>['order'];
  }

  return paginate(repo, options, page, pageSize);
}

/** Paginate with a single search term that matches ANY column (OR logic). */
export async function paginateWithSearch<T>(
  repo: Repository<T>,
  baseOptions: FindManyOptions<T>,
  page: number,
  pageSize: number,
  sort: SortParam | null,
  search: string,
  allowedColumns: readonly string[],
): Promise<PaginatedResult<T>> {
  const options: FindManyOptions<T> = { ...baseOptions };

  const searchWhere = buildTypeOrmSearchWhere<T>(search, allowedColumns);
  if (searchWhere) {
    const baseWhere = options.where as FindOptionsWhere<T> | undefined;
    if (baseWhere) {
      // Merge: each OR branch gets the base conditions too
      options.where = searchWhere.map(
        (w) =>
          ({
            ...(baseWhere as Record<string, unknown>),
            ...w,
          }) as FindOptionsWhere<T>,
      );
    } else {
      options.where = searchWhere;
    }
  }

  if (sort) {
    options.order = {
      [sort.column]: sort.order,
    } as FindManyOptions<T>['order'];
  }

  return paginate(repo, options, page, pageSize);
}
