import {
  Component,
  DestroyRef,
  inject,
  type OnInit,
  ChangeDetectionStrategy,
} from '@angular/core';
import { type Observable } from 'rxjs';
import {
  AbstractListComponent,
  DataTable,
  DataTableColumn,
  type DataTablePage,
  PageHeader,
  TranslatePipe,
} from '@code95/ui';
import { type SortOrder, type TrainingCenter } from '@code95/shared-types';
import { TrainingCentersApiService } from '../../../../core/services/training-centers-api.service';

@Component({
  selector: 'app-training-centers',
  imports: [PageHeader, DataTable, DataTableColumn, TranslatePipe],
  templateUrl: './training-centers.component.html',
  styleUrl: './training-centers.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrainingCentersComponent
  extends AbstractListComponent<TrainingCenter>
  implements OnInit
{
  private readonly tcApi = inject(TrainingCentersApiService);
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
  ): Observable<DataTablePage<TrainingCenter>> {
    return this.tcApi.getAll(page, pageSize, sort, order, search);
  }
}
