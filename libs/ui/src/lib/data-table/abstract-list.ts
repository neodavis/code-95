import { type DestroyRef, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { type Observable, Subject, debounceTime } from 'rxjs';
import { type SortOrder } from '@code95/shared-types';

export interface DataTablePage<T> {
  results: T[];
  page: number;
  totalPages: number;
}

export abstract class AbstractListComponent<T> {
  protected abstract readonly destroyRef: DestroyRef;

  readonly items = signal<T[]>([]);
  readonly loading = signal(true);
  readonly currentPage = signal(1);
  readonly totalPages = signal(1);
  readonly sortColumn = signal<string | undefined>(undefined);
  readonly sortOrder = signal<SortOrder | undefined>(undefined);
  readonly search = signal('');

  protected readonly pageSize = 10;
  private readonly searchInput$ = new Subject<void>();

  protected abstract fetchData(
    page: number,
    pageSize: number,
    sort?: string,
    order?: SortOrder,
    search?: string,
  ): Observable<DataTablePage<T>>;

  protected initList(): void {
    this.searchInput$
      .pipe(debounceTime(300), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.currentPage.set(1);
        this.reload();
      });
    this.loadPage(1);
  }

  loadPage(page: number): void {
    this.currentPage.set(page);
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.fetchData(
      this.currentPage(),
      this.pageSize,
      this.sortColumn(),
      this.sortOrder(),
      this.search(),
    ).subscribe({
      next: (res) => {
        this.items.set(res.results);
        this.currentPage.set(res.page);
        this.totalPages.set(res.totalPages);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  toggleSort(column: string): void {
    if (this.sortColumn() !== column) {
      this.sortColumn.set(column);
      this.sortOrder.set('asc');
    } else if (this.sortOrder() === 'asc') {
      this.sortOrder.set('desc');
    } else {
      this.sortColumn.set(undefined);
      this.sortOrder.set(undefined);
    }
    this.reload();
  }

  sortClass(column: string): string {
    if (this.sortColumn() !== column) return 'sortable';
    return this.sortOrder() === 'asc'
      ? 'sortable sort-asc'
      : 'sortable sort-desc';
  }

  onSearchInput(value: string): void {
    this.search.set(value);
    this.searchInput$.next();
  }
}
