import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { type Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  type ArticleCategory,
  type CreateArticleCategoryPayload,
  type PaginatedResponse,
  type UpdateArticleCategoryPayload,
} from '@code95/shared-types';
import { buildListParams } from './list-params.util';

@Injectable({ providedIn: 'root' })
export class ArticleCategoriesApiService {
  private readonly api = `${environment.apiUrl}/article-categories`;

  private readonly http = inject(HttpClient);

  getAll(
    page = 1,
    pageSize = 10,
    sort?: string,
    order?: string,
    search?: string,
  ): Observable<PaginatedResponse<ArticleCategory>> {
    return this.http.get<PaginatedResponse<ArticleCategory>>(this.api, {
      params: buildListParams({ page, pageSize, sort, order, search }),
    });
  }

  getOne(id: string): Observable<ArticleCategory> {
    return this.http.get<ArticleCategory>(`${this.api}/${id}`);
  }

  create(data: CreateArticleCategoryPayload): Observable<ArticleCategory> {
    return this.http.post<ArticleCategory>(this.api, data);
  }

  update(
    id: string,
    data: UpdateArticleCategoryPayload,
  ): Observable<ArticleCategory> {
    return this.http.patch<ArticleCategory>(`${this.api}/${id}`, data);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }
}
