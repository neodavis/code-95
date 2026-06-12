import { type User } from '../app/users/entities/user.entity';
import { type Article } from '../app/articles/entities/article.entity';
import { type ArticleCategory } from '../app/articles/entities/article-category.entity';
import { type ArticleTag } from '../app/articles/entities/article-tag.entity';
import { type Faq } from '../app/faq/entities/faq.entity';
import { type TrainingCenter } from '../app/training-centers/entities/training-center.entity';
import { type StudyGroupType } from '../app/study-group-types/entities/study-group-type.entity';

export function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: '550e8400-e29b-41d4-a716-446655440001',
    uniqueCode: 'UC001',
    username: 'UC001',
    // eslint-disable-next-line sonarjs/no-hardcoded-passwords
    password: 'pbkdf2_sha256$600000$salt$hash',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    middleName: 'Smith',
    phone: '+380501234567',
    birthday: null,
    passport: '',
    identificationCode: '0',
    isStaff: true,
    isActive: true,
    isSuperuser: false,
    region: '',
    verificationType: '',
    dateJoined: new Date('2025-01-01'),
    lastLogin: null,
    ...overrides,
  } as User;
}

export function makeArticle(overrides: Partial<Article> = {}): Article {
  return {
    id: '550e8400-e29b-41d4-a716-446655440002',
    title: 'Test Article',
    slug: 'test-article',
    author: 'Author',
    shortly: 'Short description',
    description: 'Full description',
    isPublished: true,
    pubDate: new Date('2025-06-01'),
    titleImg: '',
    categories: [],
    tags: [],
    ...overrides,
  } as Article;
}

export function makeCategory(
  overrides: Partial<ArticleCategory> = {},
): ArticleCategory {
  return {
    id: '550e8400-e29b-41d4-a716-446655440003',
    name: 'Test Category',
    slug: 'test-category',
    description: '',
    ...overrides,
  } as ArticleCategory;
}

export function makeTag(overrides: Partial<ArticleTag> = {}): ArticleTag {
  return {
    id: '550e8400-e29b-41d4-a716-446655440004',
    name: 'Test Tag',
    slug: 'test-tag',
    ...overrides,
  } as ArticleTag;
}

export function makeFaq(overrides: Partial<Faq> = {}): Faq {
  return {
    id: '550e8400-e29b-41d4-a716-446655440005',
    question: 'Test question?',
    answer: 'Test answer.',
    isPublished: true,
    ...overrides,
  } as Faq;
}

export function makeTrainingCenter(
  overrides: Partial<TrainingCenter> = {},
): TrainingCenter {
  return {
    id: '550e8400-e29b-41d4-a716-446655440006',
    name: 'Test TC',
    edrpou: '12345678',
    nameShort: 'TC',
    chiefPip: '',
    atiCode: '',
    division: '',
    certNo: '',
    certDate: null,
    region: '',
    city: 'Kyiv',
    addrStreet: '',
    addrHouse: '',
    postCode: null,
    phone: null,
    email: null,
    website: null,
    isActive: true,
    fatherTc: '',
    ...overrides,
  } as TrainingCenter;
}

export function makeStudyGroupType(
  overrides: Partial<StudyGroupType> = {},
): StudyGroupType {
  return {
    id: '550e8400-e29b-41d4-a716-446655440007',
    name: 'Test Type',
    ...overrides,
  } as StudyGroupType;
}
