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
} from '@code95/ui';
import { type SortOrder } from '@code95/shared-types';
import {
  CabinetApiService,
  type CabinetGraduate,
} from '../../../../core/services/cabinet-api.service';

@Component({
  selector: 'app-graduates-list',
  imports: [PageHeader, DataTable, DataTableColumn, RouterLink, TranslatePipe],
  templateUrl: './graduates-list.component.html',
  styleUrl: './graduates-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GraduatesListComponent
  extends AbstractListComponent<CabinetGraduate>
  implements OnInit
{
  private readonly cabinetApi = inject(CabinetApiService);
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
  ): Observable<DataTablePage<CabinetGraduate>> {
    return this.cabinetApi.getGraduates(page, pageSize, sort, order, search);
  }
}
