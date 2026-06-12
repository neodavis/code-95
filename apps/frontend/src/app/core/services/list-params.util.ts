import { HttpParams } from '@angular/common/http';

export interface ListParams {
  page?: number;
  pageSize?: number;
  sort?: string;
  order?: string;
  search?: string;
}

export function buildListParams(opts: ListParams): HttpParams {
  let params = new HttpParams()
    .set('page', (opts.page ?? 1).toString())
    .set('pageSize', (opts.pageSize ?? 10).toString());

  if (opts.sort) {
    params = params.set('sort', opts.sort);
  }
  if (opts.order) {
    params = params.set('order', opts.order);
  }
  if (opts.search) {
    params = params.set('search', opts.search);
  }
  return params;
}
