import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { type Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  type CreateTrainingCenterPayload,
  type PaginatedResponse,
  type TrainingCenter,
  type UpdateTrainingCenterPayload,
} from '@code95/shared-types';
import { buildListParams } from './list-params.util';

@Injectable({ providedIn: 'root' })
export class TrainingCentersApiService {
  private readonly api = `${environment.apiUrl}/training-centers`;

  private readonly http = inject(HttpClient);

  getAll(
    page = 1,
    pageSize = 10,
    sort?: string,
    order?: string,
    search?: string,
  ): Observable<PaginatedResponse<TrainingCenter>> {
    return this.http.get<PaginatedResponse<TrainingCenter>>(this.api, {
      params: buildListParams({ page, pageSize, sort, order, search }),
    });
  }

  getOne(id: string): Observable<TrainingCenter> {
    return this.http.get<TrainingCenter>(`${this.api}/${id}`);
  }

  /** Admin-only: returns full TrainingCenter entity including internal fields. */
  adminGetAll(
    page = 1,
    pageSize = 10,
    sort?: string,
    order?: string,
    search?: string,
  ): Observable<PaginatedResponse<TrainingCenter>> {
    return this.http.get<PaginatedResponse<TrainingCenter>>(
      `${this.api}/admin/all`,
      {
        params: buildListParams({ page, pageSize, sort, order, search }),
      },
    );
  }

  /** Admin-only: returns full TrainingCenter entity including internal fields. */
  adminGetOne(id: string): Observable<TrainingCenter> {
    return this.http.get<TrainingCenter>(`${this.api}/admin/${id}`);
  }

  create(data: CreateTrainingCenterPayload): Observable<TrainingCenter> {
    return this.http.post<TrainingCenter>(this.api, data);
  }

  update(
    id: string,
    data: UpdateTrainingCenterPayload,
  ): Observable<TrainingCenter> {
    return this.http.patch<TrainingCenter>(`${this.api}/${id}`, data);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }
}
