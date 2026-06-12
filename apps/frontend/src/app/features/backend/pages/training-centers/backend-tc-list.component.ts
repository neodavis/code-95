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
import { type SortOrder, type TrainingCenter } from '@code95/shared-types';
import { TrainingCentersApiService } from '../../../../core/services/training-centers-api.service';

@Component({
  selector: 'app-backend-tc-list',
  imports: [PageHeader, DataTable, DataTableColumn, RouterLink, TranslatePipe],
  templateUrl: './backend-tc-list.component.html',
  styleUrl: './backend-tc-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BackendTcListComponent
  extends AbstractListComponent<TrainingCenter>
  implements OnInit
{
  private readonly tcApi = inject(TrainingCentersApiService);
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
  ): Observable<DataTablePage<TrainingCenter>> {
    return this.tcApi.adminGetAll(page, pageSize, sort, order, search);
  }

  delete(item: TrainingCenter): void {
    if (!confirm(this.t.translate('confirm.delete_tc'))) return;
    this.tcApi.delete(item.id).subscribe({
      next: () => this.reload(),
    });
  }
}
