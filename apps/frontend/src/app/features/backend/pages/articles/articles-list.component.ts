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
  TranslationService,
} from '@code95/ui';
import { type Article, type SortOrder } from '@code95/shared-types';
import { ArticlesApiService } from '../../../../core/services/articles-api.service';

@Component({
  selector: 'app-articles-list',
  imports: [
    PageHeader,
    DataTable,
    DataTableColumn,
    RouterLink,
    TranslatePipe,
    DatePipe,
  ],
  templateUrl: './articles-list.component.html',
  styleUrl: './articles-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArticlesListComponent
  extends AbstractListComponent<Article>
  implements OnInit
{
  private readonly articlesApi = inject(ArticlesApiService);
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
  ): Observable<DataTablePage<Article>> {
    return this.articlesApi.getAll(page, pageSize, sort, order, search);
  }

  delete(item: Article): void {
    if (!confirm(this.t.translate('confirm.delete_article'))) return;
    this.articlesApi.delete(item.id).subscribe({
      next: () => this.reload(),
    });
  }
}
