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
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  Button,
  Checkbox,
  dateRangeValidator,
  FieldErrorPipe,
  FilePicker,
  PageHeader,
  TranslatePipe,
} from '@code95/ui';
import {
  CabinetApiService,
  type ECardDetail,
  type UpdateECardPayload,
} from '../../../../core/services/cabinet-api.service';

const CPC_CATEGORIES = [
  'B',
  'BE',
  'C1',
  'C1E',
  'C',
  'CE',
  'D1',
  'D1E',
  'D',
  'DE',
  'T',
];

@Component({
  selector: 'app-ecard-edit',
  imports: [
    DatePipe,
    FormsModule,
    ReactiveFormsModule,
    Button,
    Checkbox,
    FieldErrorPipe,
    FilePicker,
    PageHeader,
    RouterLink,
    TranslatePipe,
  ],
  templateUrl: './ecard-edit.component.html',
  styleUrl: './ecard-edit.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ECardEditComponent implements OnInit {
  private readonly cabinetApi = inject(CabinetApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly cpcCategories = CPC_CATEGORIES;

  cardId = 0;
  readonly card = signal<ECardDetail | null>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly photoImg = signal<string | null>(null);
  readonly signImg = signal<string | null>(null);
  readonly uploading = signal<'photo' | 'signature' | null>(null);
  readonly uploadError = signal<string | null>(null);
  readonly selectedCategories = signal<Set<string>>(new Set());

  // serialNo, dateOfExpiry and issuedBy are read-only after creation (Django
  // parity: ECardForm disabled fields) — shown from card(), never submitted.
  readonly form = new FormGroup({
    surnameTranslit: new FormControl(''),
    firstNameTranslit: new FormControl(''),
    dateOfIssue: new FormControl('', dateRangeValidator()),
    licenceNo: new FormControl('', Validators.maxLength(50)),
    unionCode95: new FormControl('', Validators.maxLength(50)),
  });

  ngOnInit(): void {
    this.cardId = Number(this.route.snapshot.paramMap.get('id'));
    this.cabinetApi.getECard(this.cardId).subscribe({
      next: (data) => {
        this.card.set(data);
        this.loading.set(false);
        this.populateForm(data);
      },
      error: () => this.loading.set(false),
    });
  }

  private toInputDate(val: string | null | undefined): string {
    if (!val) return '';
    return val.substring(0, 10);
  }

  private populateForm(c: ECardDetail): void {
    this.form.patchValue({
      surnameTranslit: c.surnameTranslit ?? '',
      firstNameTranslit: c.firstNameTranslit ?? '',
      dateOfIssue: this.toInputDate(c.dateOfIssue),
      licenceNo: c.licenceNo ?? '',
      unionCode95: c.unionCode95 ?? '',
    });
    this.photoImg.set(c.photoImg ?? null);
    this.signImg.set(c.signImg ?? null);
    if (c.categoriesList) {
      const cats = new Set(
        c.categoriesList
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      );
      this.selectedCategories.set(cats);
    }
  }

  toggleCategory(cat: string): void {
    this.selectedCategories.update((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) {
        next.delete(cat);
      } else {
        next.add(cat);
      }
      return next;
    });
  }

  uploadFile(field: 'photo' | 'signature', file: File | null): void {
    if (!file || this.uploading()) return;
    this.uploading.set(field);
    this.uploadError.set(null);
    this.cabinetApi.uploadEcardFile(this.cardId, field, file).subscribe({
      next: (res) => {
        if (field === 'photo') {
          this.photoImg.set(res.url);
        } else {
          this.signImg.set(res.url);
        }
        this.uploading.set(null);
      },
      error: () => {
        this.uploadError.set('common.save_error');
        this.uploading.set(null);
      },
    });
  }

  submit(): void {
    if (this.saving()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const order = this.cpcCategories;
    const cats = [...this.selectedCategories()].sort(
      (a, b) => order.indexOf(a) - order.indexOf(b),
    );

    // Read-only fields (serialNo, dateOfExpiry, issuedBy) are never sent; the
    // translit names go only when edited — the server enforces the 48 h window.
    const payload: UpdateECardPayload = {
      dateOfIssue: v.dateOfIssue || null,
      licenceNo: v.licenceNo || null,
      unionCode95: v.unionCode95 || null,
      photoImg: this.photoImg(),
      signImg: this.signImg(),
      categoriesList: cats.length ? cats.join(', ') : null,
    };
    if (this.form.controls.surnameTranslit.dirty) {
      payload.surnameTranslit = v.surnameTranslit ?? '';
    }
    if (this.form.controls.firstNameTranslit.dirty) {
      payload.firstNameTranslit = v.firstNameTranslit ?? '';
    }

    this.saving.set(true);
    this.error.set(null);
    this.cabinetApi.updateECard(this.cardId, payload).subscribe({
      next: () => {
        this.router.navigate(['/cabinet/ecards', this.cardId]);
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Error');
        this.saving.set(false);
      },
    });
  }
}
