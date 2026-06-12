import {
  Component,
  DestroyRef,
  inject,
  type OnInit,
  ChangeDetectionStrategy,
} from '@angular/core';
import { DatePipe } from '@angular/common';
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
  type CabinetDriver,
} from '../../../../core/services/cabinet-api.service';

@Component({
  selector: 'app-drivers-list',
  imports: [
    PageHeader,
    DataTable,
    DataTableColumn,
    TranslatePipe,
    DatePipe,
    RouterLink,
  ],
  templateUrl: './drivers-list.component.html',
  styleUrl: './drivers-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DriversListComponent
  extends AbstractListComponent<CabinetDriver>
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
  ): Observable<DataTablePage<CabinetDriver>> {
    return this.cabinetApi.getDrivers(page, pageSize, sort, order, search);
  }
}
