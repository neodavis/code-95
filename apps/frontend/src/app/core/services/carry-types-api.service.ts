import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { type Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  type CarryType,
  type CreateCarryTypePayload,
  type PaginatedResponse,
  type UpdateCarryTypePayload,
} from '@code95/shared-types';
import { buildListParams } from './list-params.util';

@Injectable({ providedIn: 'root' })
export class CarryTypesApiService {
  private readonly api = `${environment.apiUrl}/carry-types`;
  private readonly http = inject(HttpClient);

  getAll(
    page = 1,
    pageSize = 10,
    sort?: string,
    order?: string,
    search?: string,
  ): Observable<PaginatedResponse<CarryType>> {
    return this.http.get<PaginatedResponse<CarryType>>(this.api, {
      params: buildListParams({ page, pageSize, sort, order, search }),
    });
  }

  getOne(id: number): Observable<CarryType> {
    return this.http.get<CarryType>(`${this.api}/${id}`);
  }

  create(data: CreateCarryTypePayload): Observable<CarryType> {
    return this.http.post<CarryType>(this.api, data);
  }

  update(id: number, data: UpdateCarryTypePayload): Observable<CarryType> {
    return this.http.patch<CarryType>(`${this.api}/${id}`, data);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }
}
