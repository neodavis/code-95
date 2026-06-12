export interface ArticleCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
}

export interface ArticleTag {
  id: string;
  name: string;
  slug: string;
}

export interface Article {
  id: string;
  title: string;
  slug: string;
  titleImg: string;
  author: string;
  description: string;
  shortly: string;
  isPublished: boolean;
  pubDate: string;
  categories: ArticleCategory[];
  tags: ArticleTag[];
}

export interface CreateArticleCategoryPayload {
  name: string;
  description?: string;
}

export interface UpdateArticleCategoryPayload {
  name?: string;
  description?: string;
}

export interface CreateArticleTagPayload {
  name: string;
}

export interface UpdateArticleTagPayload {
  name?: string;
}

export interface CreateArticlePayload {
  title: string;
  author: string;
  shortly: string;
  description?: string;
  isPublished?: boolean;
  pubDate?: string;
  titleImg?: string;
  categoryIds?: string[];
  tagIds?: string[];
}

export interface UpdateArticlePayload {
  title?: string;
  author?: string;
  shortly?: string;
  description?: string;
  isPublished?: boolean;
  pubDate?: string;
  titleImg?: string;
  categoryIds?: string[];
  tagIds?: string[];
}
