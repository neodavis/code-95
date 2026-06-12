import {
  parsePage,
  parsePageSize,
  parseSort,
  parseSearch,
  buildResult,
  buildTypeOrmWhere,
  buildTypeOrmSearchWhere,
} from './paginate';

describe('parsePage', () => {
  it('returns 1 for undefined', () => {
    expect(parsePage()).toBe(1);
  });

  it('returns 1 for non-numeric string', () => {
    expect(parsePage('abc')).toBe(1);
  });

  it('returns 1 for zero', () => {
    expect(parsePage('0')).toBe(1);
  });

  it('returns 1 for negative', () => {
    expect(parsePage('-5')).toBe(1);
  });

  it('parses valid page number', () => {
    expect(parsePage('3')).toBe(3);
  });
});

describe('parsePageSize', () => {
  it('returns fallback for undefined', () => {
    expect(parsePageSize()).toBe(10);
  });

  it('returns custom fallback', () => {
    expect(parsePageSize(undefined, 25)).toBe(25);
  });

  it('returns fallback for 0', () => {
    expect(parsePageSize('0')).toBe(10);
  });

  it('returns fallback for > 100', () => {
    expect(parsePageSize('200')).toBe(10);
  });

  it('parses valid page size', () => {
    expect(parsePageSize('50')).toBe(50);
  });

  it('allows boundary values 1 and 100', () => {
    expect(parsePageSize('1')).toBe(1);
    expect(parsePageSize('100')).toBe(100);
  });
});

describe('parseSort', () => {
  const allowed = ['name', 'email', 'createdAt'] as const;

  it('returns null when sortRaw is undefined', () => {
    expect(parseSort(undefined, 'asc', allowed)).toBeNull();
  });

  it('returns null when column is not in allowedColumns', () => {
    expect(parseSort('unknown', 'asc', allowed)).toBeNull();
  });

  it('returns ASC by default', () => {
    expect(parseSort('name', undefined, allowed)).toEqual({
      column: 'name',
      order: 'ASC',
    });
  });

  it('returns DESC when orderRaw is "desc"', () => {
    expect(parseSort('email', 'desc', allowed)).toEqual({
      column: 'email',
      order: 'DESC',
    });
  });

  it('is case-insensitive for order', () => {
    expect(parseSort('name', 'DESC', allowed)).toEqual({
      column: 'name',
      order: 'DESC',
    });
  });
});

describe('parseSearch', () => {
  it('returns empty string for undefined', () => {
    expect(parseSearch(undefined)).toBe('');
  });

  it('trims whitespace', () => {
    expect(parseSearch('  hello  ')).toBe('hello');
  });

  it('returns value as-is when trimmed', () => {
    expect(parseSearch('test')).toBe('test');
  });
});

describe('buildResult', () => {
  it('builds paginated result correctly', () => {
    const result = buildResult(['a', 'b'], 10, 2, 3);
    expect(result.results).toEqual(['a', 'b']);
    expect(result.count).toBe(10);
    expect(result.page).toBe(2);
    expect(result.totalPages).toBe(4);
    expect(result.next).toBe('?page=3&pageSize=3');
    expect(result.previous).toBe('?page=1&pageSize=3');
  });

  it('sets next to null on last page', () => {
    const result = buildResult(['a'], 3, 3, 1);
    expect(result.next).toBeNull();
    expect(result.previous).toBe('?page=2&pageSize=1');
  });

  it('sets previous to null on first page', () => {
    const result = buildResult(['a'], 5, 1, 3);
    expect(result.previous).toBeNull();
    expect(result.next).toBe('?page=2&pageSize=3');
  });

  it('returns totalPages=1 for empty results', () => {
    const result = buildResult([], 0, 1, 10);
    expect(result.totalPages).toBe(1);
    expect(result.next).toBeNull();
    expect(result.previous).toBeNull();
  });
});

describe('buildTypeOrmWhere', () => {
  it('returns undefined for empty filters', () => {
    expect(buildTypeOrmWhere({})).toBeUndefined();
  });

  it('builds ILIKE conditions for each filter', () => {
    const where = buildTypeOrmWhere({ name: 'test', email: 'ex' });
    expect(where).toBeDefined();
    expect(Object.keys(where)).toEqual(['name', 'email']);
  });
});

describe('buildTypeOrmSearchWhere', () => {
  it('returns undefined for empty search', () => {
    expect(buildTypeOrmSearchWhere('', ['name'])).toBeUndefined();
  });

  it('builds one OR condition per allowed column', () => {
    const where = buildTypeOrmSearchWhere('test', ['name', 'email']);
    expect(where).toBeDefined();
    expect(where.length).toBe(2);
  });
});
