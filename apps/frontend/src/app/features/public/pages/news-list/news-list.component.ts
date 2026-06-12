import {
  Component,
  inject,
  type OnInit,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { PageHeader, Pagination, TranslatePipe } from '@code95/ui';
import { type Article } from '@code95/shared-types';
import { ArticlesApiService } from '../../../../core/services/articles-api.service';

@Component({
  selector: 'app-news-list',
  imports: [PageHeader, Pagination, RouterLink, TranslatePipe],
  templateUrl: './news-list.component.html',
  styleUrl: './news-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewsListComponent implements OnInit {
  private readonly articlesApi = inject(ArticlesApiService);

  readonly articles = signal<Article[]>([]);
  readonly loading = signal(true);
  readonly currentPage = signal(1);
  readonly totalPages = signal(1);

  ngOnInit(): void {
    this.loadPage(1);
  }

  loadPage(page: number): void {
    this.loading.set(true);
    this.articlesApi.getAllPublished(page).subscribe({
      next: (res) => {
        this.articles.set(res.results);
        this.currentPage.set(res.page);
        this.totalPages.set(res.totalPages);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
