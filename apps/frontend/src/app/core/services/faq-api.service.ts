import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { type Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  type CreateFaqPayload,
  type FAQ,
  type PaginatedResponse,
  type UpdateFaqPayload,
} from '@code95/shared-types';
import { buildListParams } from './list-params.util';

@Injectable({ providedIn: 'root' })
export class FaqApiService {
  private readonly api = `${environment.apiUrl}/faq`;

  private readonly http = inject(HttpClient);

  getAll(
    page = 1,
    pageSize = 10,
    sort?: string,
    order?: string,
    search?: string,
  ): Observable<PaginatedResponse<FAQ>> {
    return this.http.get<PaginatedResponse<FAQ>>(this.api, {
      params: buildListParams({ page, pageSize, sort, order, search }),
    });
  }

  getAllPublished(page = 1, pageSize = 10): Observable<PaginatedResponse<FAQ>> {
    return this.http.get<PaginatedResponse<FAQ>>(`${this.api}/public`, {
      params: { page: page.toString(), pageSize: pageSize.toString() },
    });
  }

  getOne(id: string): Observable<FAQ> {
    return this.http.get<FAQ>(`${this.api}/${id}`);
  }

  create(data: CreateFaqPayload): Observable<FAQ> {
    return this.http.post<FAQ>(this.api, data);
  }

  update(id: string, data: UpdateFaqPayload): Observable<FAQ> {
    return this.http.patch<FAQ>(`${this.api}/${id}`, data);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }
}
