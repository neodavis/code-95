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
import { type FAQ, type SortOrder } from '@code95/shared-types';
import { FaqApiService } from '../../../../core/services/faq-api.service';

@Component({
  selector: 'app-backend-faq-list',
  imports: [PageHeader, DataTable, DataTableColumn, RouterLink, TranslatePipe],
  templateUrl: './backend-faq-list.component.html',
  styleUrl: './backend-faq-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BackendFaqListComponent
  extends AbstractListComponent<FAQ>
  implements OnInit
{
  private readonly faqApi = inject(FaqApiService);
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
  ): Observable<DataTablePage<FAQ>> {
    return this.faqApi.getAll(page, pageSize, sort, order, search);
  }

  delete(item: FAQ): void {
    if (!confirm(this.t.translate('confirm.delete_faq'))) return;
    this.faqApi.delete(item.id).subscribe({
      next: () => this.reload(),
    });
  }
}
