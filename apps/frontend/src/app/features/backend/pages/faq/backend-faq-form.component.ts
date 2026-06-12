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
import { FaqApiService } from '../../../../core/services/faq-api.service';

@Component({
  selector: 'app-backend-faq-form',
  imports: [
    PageHeader,
    Button,
    RouterLink,
    ReactiveFormsModule,
    TranslatePipe,
    FieldErrorPipe,
    QuillEditorComponent,
  ],
  templateUrl: './backend-faq-form.component.html',
  styleUrl: './backend-faq-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BackendFaqFormComponent implements OnInit {
  private readonly faqApi = inject(FaqApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  isEdit = false;
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  private faqId: string | null = null;

  readonly form = new FormGroup({
    question: new FormControl('', [
      Validators.required,
      Validators.maxLength(255),
    ]),
    answer: new FormControl('', Validators.required),
    isPublished: new FormControl(true),
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.isEdit = !!id;
    if (this.isEdit) {
      this.faqId = id;
      this.faqApi.getOne(id!).subscribe({
        next: (faq) =>
          this.form.patchValue({
            question: faq.question,
            answer: faq.answer,
            isPublished: faq.isPublished,
          }),
      });
    }
  }

  onSubmit(): void {
    if (this.form.invalid || this.saving()) return;
    this.saving.set(true);
    this.error.set(null);
    const val = this.form.getRawValue();

    if (this.isEdit && this.faqId !== null) {
      this.faqApi
        .update(this.faqId, {
          question: val.question ?? '',
          answer: val.answer ?? '',
          isPublished: val.isPublished ?? true,
        })
        .subscribe({
          next: () => this.router.navigate(['/backend/faq']),
          error: (err) => {
            const body = err?.error;
            if (body?.fields) {
              for (const [field, msgs] of Object.entries(body.fields)) {
                const ctrl = this.form.get(field);
                if (ctrl)
                  ctrl.setErrors({ serverError: (msgs as string[])[0] });
              }
            } else {
              this.error.set(body?.message ?? 'Error saving question');
            }
            this.saving.set(false);
          },
        });
    } else {
      this.faqApi
        .create({
          question: val.question ?? '',
          answer: val.answer ?? '',
          isPublished: val.isPublished ?? true,
        })
        .subscribe({
          next: () => this.router.navigate(['/backend/faq']),
          error: (err) => {
            const body = err?.error;
            if (body?.fields) {
              for (const [field, msgs] of Object.entries(body.fields)) {
                const ctrl = this.form.get(field);
                if (ctrl)
                  ctrl.setErrors({ serverError: (msgs as string[])[0] });
              }
            } else {
              this.error.set(body?.message ?? 'Error creating question');
            }
            this.saving.set(false);
          },
        });
    }
  }
}
