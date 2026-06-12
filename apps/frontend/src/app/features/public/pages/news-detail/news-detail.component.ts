import {
  Component,
  inject,
  type OnInit,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PageHeader, TranslatePipe } from '@code95/ui';
import { ArticlesApiService } from '../../../../core/services/articles-api.service';

@Component({
  selector: 'app-news-detail',
  imports: [PageHeader, RouterLink, TranslatePipe],
  templateUrl: './news-detail.component.html',
  styleUrl: './news-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewsDetailComponent implements OnInit {
  private readonly articlesApi = inject(ArticlesApiService);
  private readonly route = inject(ActivatedRoute);

  readonly title = signal('');
  readonly body = signal('');
  readonly notFound = signal(false);

  ngOnInit(): void {
    const slug = this.route.snapshot.paramMap.get('slug') ?? '';
    this.articlesApi.getPublishedBySlug(slug).subscribe({
      next: (article) => {
        if (!article) {
          this.notFound.set(true);
          return;
        }
        this.title.set(article.title);
        this.body.set(article.description);
      },
      error: () => this.notFound.set(true),
    });
  }
}
