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
import { type ArticleCategory, type SortOrder } from '@code95/shared-types';
import { ArticleCategoriesApiService } from '../../../../core/services/article-categories-api.service';

@Component({
  selector: 'app-article-categories-list',
  imports: [PageHeader, DataTable, DataTableColumn, RouterLink, TranslatePipe],
  templateUrl: './article-categories-list.component.html',
  styleUrl: './article-categories-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArticleCategoriesListComponent
  extends AbstractListComponent<ArticleCategory>
  implements OnInit
{
  private readonly categoriesApi = inject(ArticleCategoriesApiService);
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
  ): Observable<DataTablePage<ArticleCategory>> {
    return this.categoriesApi.getAll(page, pageSize, sort, order, search);
  }

  delete(item: ArticleCategory): void {
    if (!confirm(this.t.translate('confirm.delete_category'))) return;
    this.categoriesApi.delete(item.id).subscribe({
      next: () => this.reload(),
    });
  }
}
