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
import { QuillEditorComponent } from 'ngx-quill';
import { ArticleCategoriesApiService } from '../../../../core/services/article-categories-api.service';

@Component({
  selector: 'app-article-category-form',
  imports: [
    PageHeader,
    Button,
    RouterLink,
    ReactiveFormsModule,
    TranslatePipe,
    FieldErrorPipe,
    QuillEditorComponent,
  ],
  templateUrl: './article-category-form.component.html',
  styleUrl: './article-category-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArticleCategoryFormComponent implements OnInit {
  private readonly categoriesApi = inject(ArticleCategoriesApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  isEdit = false;
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  private categoryId: string | null = null;

  readonly form = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.maxLength(255)]),
    description: new FormControl(''),
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.isEdit = !!id;
    if (this.isEdit) {
      this.categoryId = id;
      this.categoriesApi.getOne(id!).subscribe({
        next: (cat) =>
          this.form.patchValue({
            name: cat.name,
            description: cat.description,
          }),
      });
    }
  }

  onSubmit(): void {
    if (this.form.invalid || this.saving()) return;
    this.saving.set(true);
    this.error.set(null);
    const val = this.form.getRawValue();

    if (this.isEdit && this.categoryId !== null) {
      this.categoriesApi
        .update(this.categoryId, {
          name: val.name ?? '',
          description: val.description ?? '',
        })
        .subscribe({
          next: () => this.router.navigate(['/backend/article-categories']),
          error: (err) => {
            const body = err?.error;
            if (body?.fields) {
              for (const [field, msgs] of Object.entries(body.fields)) {
                const ctrl = this.form.get(field);
                if (ctrl)
                  ctrl.setErrors({ serverError: (msgs as string[])[0] });
              }
            } else {
              this.error.set(body?.message ?? 'Error saving category');
            }
            this.saving.set(false);
          },
        });
    } else {
      this.categoriesApi
        .create({ name: val.name ?? '', description: val.description ?? '' })
        .subscribe({
          next: () => this.router.navigate(['/backend/article-categories']),
          error: (err) => {
            const body = err?.error;
            if (body?.fields) {
              for (const [field, msgs] of Object.entries(body.fields)) {
                const ctrl = this.form.get(field);
                if (ctrl)
                  ctrl.setErrors({ serverError: (msgs as string[])[0] });
              }
            } else {
              this.error.set(body?.message ?? 'Error creating category');
            }
            this.saving.set(false);
          },
        });
    }
  }
}
