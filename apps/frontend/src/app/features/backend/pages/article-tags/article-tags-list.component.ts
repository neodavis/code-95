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
import { type ArticleTag, type SortOrder } from '@code95/shared-types';
import { ArticleTagsApiService } from '../../../../core/services/article-tags-api.service';

@Component({
  selector: 'app-article-tags-list',
  imports: [PageHeader, DataTable, DataTableColumn, RouterLink, TranslatePipe],
  templateUrl: './article-tags-list.component.html',
  styleUrl: './article-tags-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArticleTagsListComponent
  extends AbstractListComponent<ArticleTag>
  implements OnInit
{
  private readonly tagsApi = inject(ArticleTagsApiService);
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
  ): Observable<DataTablePage<ArticleTag>> {
    return this.tagsApi.getAll(page, pageSize, sort, order, search);
  }

  delete(item: ArticleTag): void {
    if (!confirm(this.t.translate('confirm.delete_tag'))) return;
    this.tagsApi.delete(item.id).subscribe({
      next: () => this.reload(),
    });
  }
}
