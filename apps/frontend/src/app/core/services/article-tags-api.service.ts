import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { type Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  type ArticleTag,
  type CreateArticleTagPayload,
  type PaginatedResponse,
  type UpdateArticleTagPayload,
} from '@code95/shared-types';
import { buildListParams } from './list-params.util';

@Injectable({ providedIn: 'root' })
export class ArticleTagsApiService {
  private readonly api = `${environment.apiUrl}/article-tags`;

  private readonly http = inject(HttpClient);

  getAll(
    page = 1,
    pageSize = 10,
    sort?: string,
    order?: string,
    search?: string,
  ): Observable<PaginatedResponse<ArticleTag>> {
    return this.http.get<PaginatedResponse<ArticleTag>>(this.api, {
      params: buildListParams({ page, pageSize, sort, order, search }),
    });
  }

  getOne(id: string): Observable<ArticleTag> {
    return this.http.get<ArticleTag>(`${this.api}/${id}`);
  }

  create(data: CreateArticleTagPayload): Observable<ArticleTag> {
    return this.http.post<ArticleTag>(this.api, data);
  }

  update(id: string, data: UpdateArticleTagPayload): Observable<ArticleTag> {
    return this.http.patch<ArticleTag>(`${this.api}/${id}`, data);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }
}
