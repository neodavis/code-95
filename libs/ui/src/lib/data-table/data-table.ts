import {
  ChangeDetectionStrategy,
  Component,
  ContentChildren,
  EventEmitter,
  Input,
  Output,
  type QueryList,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { Pagination } from '../pagination/pagination';
import { TranslatePipe } from '../i18n/translate.pipe';
import { EllipsisDirective } from '../ellipsis/ellipsis';
import { DataTableColumn } from './data-table-column';

@Component({
  selector: 'lib-data-table',
  imports: [NgTemplateOutlet, Pagination, TranslatePipe, EllipsisDirective],
  templateUrl: './data-table.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataTable {
  @ContentChildren(DataTableColumn) columns!: QueryList<DataTableColumn>;

  @Input() items: unknown[] = [];
  @Input() loading = false;
  @Input() currentPage = 1;
  @Input() totalPages = 1;
  @Input() sortColumn?: string;
  @Input() sortOrder?: string;

  @Output() sortChange = new EventEmitter<string>();
  @Output() searchChange = new EventEmitter<string>();
  @Output() pageChange = new EventEmitter<number>();

  getSortClass(column: string): string {
    if (this.sortColumn !== column) return 'sortable';
    return this.sortOrder === 'asc'
      ? 'sortable sort-asc'
      : 'sortable sort-desc';
  }

  onSearch(event: Event): void {
    this.searchChange.emit((event.target as HTMLInputElement).value);
  }
}
