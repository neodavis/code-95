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
import { ArticleTagsApiService } from '../../../../core/services/article-tags-api.service';

@Component({
  selector: 'app-article-tag-form',
  imports: [
    PageHeader,
    Button,
    RouterLink,
    ReactiveFormsModule,
    TranslatePipe,
    FieldErrorPipe,
  ],
  templateUrl: './article-tag-form.component.html',
  styleUrl: './article-tag-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArticleTagFormComponent implements OnInit {
  private readonly tagsApi = inject(ArticleTagsApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  isEdit = false;
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  private tagId: string | null = null;

  readonly form = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.maxLength(255)]),
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.isEdit = !!id;
    if (this.isEdit) {
      this.tagId = id;
      this.tagsApi.getOne(id!).subscribe({
        next: (tag) => this.form.patchValue({ name: tag.name }),
      });
    }
  }

  onSubmit(): void {
    if (this.form.invalid || this.saving()) return;
    this.saving.set(true);
    this.error.set(null);
    const val = this.form.getRawValue();

    if (this.isEdit && this.tagId !== null) {
      this.tagsApi.update(this.tagId, { name: val.name ?? '' }).subscribe({
        next: () => this.router.navigate(['/backend/article-tags']),
        error: (err) => {
          const body = err?.error;
          if (body?.fields) {
            for (const [field, msgs] of Object.entries(body.fields)) {
              const ctrl = this.form.get(field);
              if (ctrl) ctrl.setErrors({ serverError: (msgs as string[])[0] });
            }
          } else {
            this.error.set(body?.message ?? 'Error saving tag');
          }
          this.saving.set(false);
        },
      });
    } else {
      this.tagsApi.create({ name: val.name ?? '' }).subscribe({
        next: () => this.router.navigate(['/backend/article-tags']),
        error: (err) => {
          const body = err?.error;
          if (body?.fields) {
            for (const [field, msgs] of Object.entries(body.fields)) {
              const ctrl = this.form.get(field);
              if (ctrl) ctrl.setErrors({ serverError: (msgs as string[])[0] });
            }
          } else {
            this.error.set(body?.message ?? 'Error creating tag');
          }
          this.saving.set(false);
        },
      });
    }
  }
}
