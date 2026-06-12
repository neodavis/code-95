import { type Repository } from 'typeorm';

type MockRepository<T> = {
  [K in keyof Repository<T>]: jest.Mock;
};

export function createMockQueryBuilder(): Record<string, jest.Mock> {
  const qb: Record<string, jest.Mock> = {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    distinctOn: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    into: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    orIgnore: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue({}),
    getMany: jest.fn().mockResolvedValue([]),
    getOne: jest.fn().mockResolvedValue(null),
    getRawOne: jest.fn().mockResolvedValue(null),
    getRawMany: jest.fn().mockResolvedValue([]),
    getRawAndEntities: jest.fn().mockResolvedValue({ entities: [], raw: [] }),
  };
  return qb;
}

export function createMockRepository<T>(): MockRepository<T> {
  return {
    find: jest.fn(),
    findOne: jest.fn(),
    findOneOrFail: jest.fn(),
    findAndCount: jest.fn(),
    findBy: jest.fn(),
    count: jest.fn().mockResolvedValue(0),
    create: jest.fn((entity: T) => entity),
    save: jest.fn((entity: T) => Promise.resolve(entity)),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
    upsert: jest.fn().mockResolvedValue({
      identifiers: [{ id: 1 }],
      generatedMaps: [{}],
      raw: [],
    }),
    increment: jest.fn().mockResolvedValue({ affected: 1 }),
    query: jest.fn(),
    createQueryBuilder: jest.fn().mockReturnValue(createMockQueryBuilder()),
  } as unknown as MockRepository<T>;
}
