import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { type Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  type CreateEmployeePayload,
  type EmployeeListItem,
  type PaginatedResponse,
  type UpdateEmployeePayload,
} from '@code95/shared-types';
import { buildListParams } from './list-params.util';

@Injectable({ providedIn: 'root' })
export class EmployeesApiService {
  private readonly api = `${environment.apiUrl}/employees`;

  private readonly http = inject(HttpClient);

  getAll(
    page = 1,
    pageSize = 10,
    sort?: string,
    order?: string,
    search?: string,
  ): Observable<PaginatedResponse<EmployeeListItem>> {
    return this.http.get<PaginatedResponse<EmployeeListItem>>(this.api, {
      params: buildListParams({ page, pageSize, sort, order, search }),
    });
  }

  getOne(id: string): Observable<EmployeeListItem> {
    return this.http.get<EmployeeListItem>(`${this.api}/${id}`);
  }

  create(data: CreateEmployeePayload): Observable<EmployeeListItem> {
    return this.http.post<EmployeeListItem>(this.api, data);
  }

  update(
    id: string,
    data: UpdateEmployeePayload,
  ): Observable<EmployeeListItem> {
    return this.http.patch<EmployeeListItem>(`${this.api}/${id}`, data);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }
}
