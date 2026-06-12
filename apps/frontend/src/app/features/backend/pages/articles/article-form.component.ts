import {
  Component,
  inject,
  type OnInit,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Button, FieldErrorPipe, PageHeader, TranslatePipe } from '@code95/ui';
import { type ArticleCategory, type ArticleTag } from '@code95/shared-types';
import { QuillEditorComponent } from 'ngx-quill';
import { ArticlesApiService } from '../../../../core/services/articles-api.service';
import { ArticleCategoriesApiService } from '../../../../core/services/article-categories-api.service';
import { ArticleTagsApiService } from '../../../../core/services/article-tags-api.service';

@Component({
  selector: 'app-article-form',
  imports: [
    PageHeader,
    Button,
    RouterLink,
    ReactiveFormsModule,
    TranslatePipe,
    FieldErrorPipe,
    QuillEditorComponent,
  ],
  templateUrl: './article-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArticleFormComponent implements OnInit {
  private readonly articlesApi = inject(ArticlesApiService);
  private readonly categoriesApi = inject(ArticleCategoriesApiService);
  private readonly tagsApi = inject(ArticleTagsApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  isEdit = false;
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly categories = signal<ArticleCategory[]>([]);
  readonly tags = signal<ArticleTag[]>([]);
  readonly selectedCategoryIds = signal<string[]>([]);
  readonly selectedTagIds = signal<string[]>([]);
  private articleId: string | null = null;

  readonly form = new FormGroup({
    title: new FormControl('', [
      Validators.required,
      Validators.maxLength(255),
    ]),
    author: new FormControl('', [
      Validators.required,
      Validators.maxLength(255),
    ]),
    shortly: new FormControl('', [
      Validators.required,
      Validators.maxLength(255),
    ]),
    description: new FormControl(''),
    isPublished: new FormControl(false),
    pubDate: new FormControl(''),
    titleImg: new FormControl('', Validators.maxLength(100)),
  });

  ngOnInit(): void {
    this.categoriesApi
      .getAll(1, 1000)
      .subscribe({ next: (res) => this.categories.set(res.results) });
    this.tagsApi
      .getAll(1, 1000)
      .subscribe({ next: (res) => this.tags.set(res.results) });

    const id = this.route.snapshot.paramMap.get('id');
    this.isEdit = !!id;
    if (this.isEdit) {
      this.articleId = id;
      this.articlesApi.getOne(id!).subscribe({
        next: (article) => {
          this.form.patchValue({
            title: article.title,
            author: article.author,
            shortly: article.shortly,
            description: article.description,
            isPublished: article.isPublished,
            pubDate: article.pubDate ? article.pubDate.slice(0, 16) : '',
            titleImg: article.titleImg,
          });
          this.selectedCategoryIds.set(article.categories.map((c) => c.id));
          this.selectedTagIds.set(article.tags.map((t) => t.id));
        },
      });
    }
  }

  isCategorySelected(id: string): boolean {
    return this.selectedCategoryIds().includes(id);
  }

  isTagSelected(id: string): boolean {
    return this.selectedTagIds().includes(id);
  }

  toggleCategory(id: string): void {
    this.selectedCategoryIds.update((ids) =>
      ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id],
    );
  }

  toggleTag(id: string): void {
    this.selectedTagIds.update((ids) =>
      ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id],
    );
  }

  onSubmit(): void {
    if (this.form.invalid || this.saving()) return;
    this.saving.set(true);
    this.error.set(null);
    const val = this.form.getRawValue();

    const payload = {
      title: val.title ?? '',
      author: val.author ?? '',
      shortly: val.shortly ?? '',
      description: val.description ?? '',
      isPublished: val.isPublished ?? false,
      pubDate: val.pubDate || undefined,
      titleImg: val.titleImg || undefined,
      categoryIds: this.selectedCategoryIds(),
      tagIds: this.selectedTagIds(),
    };

    if (this.isEdit && this.articleId !== null) {
      this.articlesApi.update(this.articleId, payload).subscribe({
        next: () => this.router.navigate(['/backend/articles']),
        error: (err) => {
          const body = err?.error;
          if (body?.fields) {
            for (const [field, msgs] of Object.entries(body.fields)) {
              const ctrl = this.form.get(field);
              if (ctrl) ctrl.setErrors({ serverError: (msgs as string[])[0] });
            }
          } else {
            this.error.set(body?.message ?? 'Error saving article');
          }
          this.saving.set(false);
        },
      });
    } else {
      this.articlesApi.create(payload).subscribe({
        next: () => this.router.navigate(['/backend/articles']),
        error: (err) => {
          const body = err?.error;
          if (body?.fields) {
            for (const [field, msgs] of Object.entries(body.fields)) {
              const ctrl = this.form.get(field);
              if (ctrl) ctrl.setErrors({ serverError: (msgs as string[])[0] });
            }
          } else {
            this.error.set(body?.message ?? 'Error creating article');
          }
          this.saving.set(false);
        },
      });
    }
  }
}
