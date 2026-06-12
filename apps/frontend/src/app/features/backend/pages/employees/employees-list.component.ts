import {
  Component,
  DestroyRef,
  inject,
  type OnInit,
  ChangeDetectionStrategy,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { type Observable } from 'rxjs';
import {
  AbstractListComponent,
  DataTable,
  DataTableColumn,
  type DataTablePage,
  PageHeader,
  TranslatePipe,
  TranslationService,
} from '@code95/ui';
import { type EmployeeListItem, type SortOrder } from '@code95/shared-types';
import { EmployeesApiService } from '../../../../core/services/employees-api.service';

@Component({
  selector: 'app-employees-list',
  imports: [PageHeader, DataTable, DataTableColumn, RouterLink, TranslatePipe],
  templateUrl: './employees-list.component.html',
  styleUrl: './employees-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmployeesListComponent
  extends AbstractListComponent<EmployeeListItem>
  implements OnInit
{
  private readonly employeesApi = inject(EmployeesApiService);
  private readonly t = inject(TranslationService);
  protected readonly destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    this.initList();
  }

  protected fetchData(
    page: number,
    pageSize: number,
    sort?: string,
    order?: SortOrder,
    search?: string,
  ): Observable<DataTablePage<EmployeeListItem>> {
    return this.employeesApi.getAll(page, pageSize, sort, order, search);
  }

  delete(item: EmployeeListItem): void {
    if (!confirm(this.t.translate('confirm.delete_employee'))) return;
    this.employeesApi.delete(item.id).subscribe({
      next: () => this.reload(),
    });
  }
}
