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
import { type CarryType, type SortOrder } from '@code95/shared-types';
import { CarryTypesApiService } from '../../../../core/services/carry-types-api.service';

@Component({
  selector: 'app-carry-types-list',
  imports: [PageHeader, DataTable, DataTableColumn, RouterLink, TranslatePipe],
  templateUrl: './carry-types-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CarryTypesListComponent
  extends AbstractListComponent<CarryType>
  implements OnInit
{
  private readonly carryTypesApi = inject(CarryTypesApiService);
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
  ): Observable<DataTablePage<CarryType>> {
    return this.carryTypesApi.getAll(page, pageSize, sort, order, search);
  }

  delete(item: CarryType): void {
    if (!confirm(this.t.translate('confirm.delete_carry_type'))) return;
    this.carryTypesApi.delete(item.id).subscribe({
      next: () => this.reload(),
    });
  }
}
