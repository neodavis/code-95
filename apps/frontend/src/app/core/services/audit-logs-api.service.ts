import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { type Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  type AuditAction,
  type AuditLogItem,
  type PaginatedResponse,
  type SortOrder,
} from '@code95/shared-types';
import { buildListParams } from './list-params.util';

export interface AuditLogsFilter {
  page?: number;
  pageSize?: number;
  sort?: string;
  order?: SortOrder;
  action?: AuditAction;
  dateFrom?: string;
  dateTo?: string;
  userId?: string;
  entity?: string;
}

@Injectable({ providedIn: 'root' })
export class AuditLogsApiService {
  private readonly api = `${environment.apiUrl}/audit-logs`;
  private readonly http = inject(HttpClient);

  getAll(
    filter: AuditLogsFilter = {},
  ): Observable<PaginatedResponse<AuditLogItem>> {
    let params = buildListParams({
      page: filter.page,
      pageSize: filter.pageSize,
      sort: filter.sort,
      order: filter.order,
    });
    if (filter.action) params = params.set('action', filter.action);
    if (filter.dateFrom) params = params.set('dateFrom', filter.dateFrom);
    if (filter.dateTo) params = params.set('dateTo', filter.dateTo);
    if (filter.userId) params = params.set('userId', filter.userId);
    if (filter.entity) params = params.set('entity', filter.entity);
    return this.http.get<PaginatedResponse<AuditLogItem>>(this.api, { params });
  }
}
