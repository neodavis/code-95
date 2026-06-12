import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { type Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  type CreateUserPayload,
  type PaginatedResponse,
  type UpdateUserPayload,
  type UserListItem,
} from '@code95/shared-types';
import { buildListParams } from './list-params.util';

@Injectable({ providedIn: 'root' })
export class UsersApiService {
  private readonly api = `${environment.apiUrl}/users`;

  private readonly http = inject(HttpClient);

  getAll(
    page = 1,
    pageSize = 10,
    sort?: string,
    order?: string,
    search?: string,
  ): Observable<PaginatedResponse<UserListItem>> {
    return this.http.get<PaginatedResponse<UserListItem>>(this.api, {
      params: buildListParams({ page, pageSize, sort, order, search }),
    });
  }

  getOne(id: string): Observable<UserListItem> {
    return this.http.get<UserListItem>(`${this.api}/${id}`);
  }

  create(data: CreateUserPayload): Observable<UserListItem> {
    return this.http.post<UserListItem>(this.api, data);
  }

  update(id: string, data: UpdateUserPayload): Observable<UserListItem> {
    return this.http.patch<UserListItem>(`${this.api}/${id}`, data);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }
}
