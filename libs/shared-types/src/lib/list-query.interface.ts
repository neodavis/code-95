export type SortOrder = 'asc' | 'desc';

export interface ListQueryParams {
  page?: number;
  pageSize?: number;
  sort?: string;
  order?: SortOrder;
  search?: string;
}
