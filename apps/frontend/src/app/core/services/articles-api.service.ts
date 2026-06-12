import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { type Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  type Article,
  type CreateArticlePayload,
  type PaginatedResponse,
  type UpdateArticlePayload,
} from '@code95/shared-types';
import { buildListParams } from './list-params.util';

@Injectable({ providedIn: 'root' })
export class ArticlesApiService {
  private readonly api = `${environment.apiUrl}/articles`;

  private readonly http = inject(HttpClient);

  getAll(
    page = 1,
    pageSize = 10,
    sort?: string,
    order?: string,
    search?: string,
  ): Observable<PaginatedResponse<Article>> {
    return this.http.get<PaginatedResponse<Article>>(this.api, {
      params: buildListParams({ page, pageSize, sort, order, search }),
    });
  }

  getAllPublished(
    page = 1,
    pageSize = 10,
    sort?: string,
    order?: string,
    search?: string,
  ): Observable<PaginatedResponse<Article>> {
    return this.http.get<PaginatedResponse<Article>>(`${this.api}/public`, {
      params: buildListParams({ page, pageSize, sort, order, search }),
    });
  }

  getPublishedBySlug(slug: string): Observable<Article | null> {
    return this.http.get<Article | null>(`${this.api}/public/${slug}`);
  }

  getOne(id: string): Observable<Article> {
    return this.http.get<Article>(`${this.api}/${id}`);
  }

  create(data: CreateArticlePayload): Observable<Article> {
    return this.http.post<Article>(this.api, data);
  }

  update(id: string, data: UpdateArticlePayload): Observable<Article> {
    return this.http.patch<Article>(`${this.api}/${id}`, data);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }
}
