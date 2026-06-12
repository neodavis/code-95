import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
  type OnInit,
} from '@angular/core';
import { type Observable } from 'rxjs';
import { FormsModule } from '@angular/forms';
import {
  AbstractListComponent,
  DataTable,
  DataTableColumn,
  type DataTablePage,
  PageHeader,
  TranslatePipe,
} from '@code95/ui';
import {
  type AuditAction,
  type AuditLogItem,
  type SortOrder,
} from '@code95/shared-types';
import { AuditLogsApiService } from '../../../../core/services/audit-logs-api.service';
import { DatePipe, JsonPipe } from '@angular/common';

const AUDIT_ACTIONS = [
  'login',
  'password_change',
  'user_create',
  'user_update',
  'group_create',
  'group_update',
  'group_status_change',
  'group_split',
  'student_add',
  'student_remove',
  'driver_create',
  'driver_update',
  'spk_create',
  'ecard_create',
] as readonly AuditAction[];

@Component({
  selector: 'app-audit-logs-list',
  imports: [
    FormsModule,
    PageHeader,
    DataTable,
    DataTableColumn,
    TranslatePipe,
    DatePipe,
    JsonPipe,
  ],
  templateUrl: './audit-logs-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuditLogsListComponent
  extends AbstractListComponent<AuditLogItem>
  implements OnInit
{
  private readonly auditApi = inject(AuditLogsApiService);
  protected readonly destroyRef = inject(DestroyRef);

  readonly auditActions = AUDIT_ACTIONS;
  readonly actionFilter = signal<AuditAction | ''>('');
  readonly userFilter = signal('');
  readonly entityFilter = signal('');
  readonly dateFromFilter = signal('');
  readonly dateToFilter = signal('');

  ngOnInit(): void {
    this.initList();
  }

  protected fetchData(
    page: number,
    pageSize: number,
    sort?: string,
    order?: SortOrder,
    _search?: string,
  ): Observable<DataTablePage<AuditLogItem>> {
    return this.auditApi.getAll({
      page,
      pageSize,
      sort,
      order,
      action: this.actionFilter() || undefined,
      userId: this.userFilter().trim() || undefined,
      entity: this.entityFilter().trim() || undefined,
      dateFrom: this.dateFromFilter() || undefined,
      dateTo: this.dateToFilter() || undefined,
    });
  }

  applyFilters(): void {
    this.currentPage.set(1);
    this.reload();
  }

  resetFilters(): void {
    this.actionFilter.set('');
    this.userFilter.set('');
    this.entityFilter.set('');
    this.dateFromFilter.set('');
    this.dateToFilter.set('');
    this.currentPage.set(1);
    this.reload();
  }
}
