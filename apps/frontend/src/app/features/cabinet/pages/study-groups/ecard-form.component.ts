import {
  Component,
  computed,
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
import { NgxMaskDirective } from 'ngx-mask';
import {
  CabinetApiService,
  type DriverEcardPrefill,
} from '../../../../core/services/cabinet-api.service';

// Categories offered per SPK carry type (ТЗ, картка водія: фільтрація
// категорій — вантажні → C-сімейство, пасажирські → D-сімейство).
const CARGO_CATEGORIES = ['C1', 'C1E', 'C', 'CE'];
const PASSENGER_CATEGORIES = ['D1', 'D1E', 'D', 'DE'];
const CARRY_TYPE_CARGO = 1;
const CARRY_TYPE_PASSENGER = 3;

// CMU 2010 transliteration table (Ukrainian → Latin)
const TRANSLIT_MAP: Record<string, string> = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'h',
  ґ: 'g',
  д: 'd',
  е: 'e',
  є: 'ie',
  ж: 'zh',
  з: 'z',
  и: 'y',
  і: 'i',
  ї: 'i',
  й: 'i',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'kh',
  ц: 'ts',
  ч: 'ch',
  ш: 'sh',
  щ: 'shch',
  ь: '',
  ю: 'iu',
  я: 'ia',
  А: 'A',
  Б: 'B',
  В: 'V',
  Г: 'H',
  Ґ: 'G',
  Д: 'D',
  Е: 'E',
  Є: 'Ie',
  Ж: 'Zh',
  З: 'Z',
  И: 'Y',
  І: 'I',
  Ї: 'I',
  Й: 'I',
  К: 'K',
  Л: 'L',
  М: 'M',
  Н: 'N',
  О: 'O',
  П: 'P',
  Р: 'R',
  С: 'S',
  Т: 'T',
  У: 'U',
  Ф: 'F',
  Х: 'Kh',
  Ц: 'Ts',
  Ч: 'Ch',
  Ш: 'Sh',
  Щ: 'Shch',
  Ь: '',
  Ю: 'Iu',
  Я: 'Ia',
};

function transliterate(text: string): string {
  return text
    .split('')
    .map((ch) => (TRANSLIT_MAP[ch] !== undefined ? TRANSLIT_MAP[ch] : ch))
    .join('');
}

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

@Component({
  selector: 'app-ecard-form',
  imports: [
    DatePipe,
    FormsModule,
    ReactiveFormsModule,
    Button,
    Checkbox,
    FieldErrorPipe,
    FilePicker,
    NgxMaskDirective,
    PageHeader,
    RouterLink,
    TranslatePipe,
  ],
  templateUrl: './ecard-form.component.html',
  styleUrl: './ecard-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ECardFormComponent implements OnInit {
  private readonly cabinetApi = inject(CabinetApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  groupId = '';
  driverId = 0;
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly prefill = signal<DriverEcardPrefill | null>(null);
  readonly photoImg = signal<string | null>(null);
  readonly signImg = signal<string | null>(null);
  readonly uploading = signal<'photo' | 'signature' | null>(null);
  readonly uploadError = signal<string | null>(null);
  readonly selectedCategories = signal<Set<string>>(new Set());

  readonly availableCategories = computed(() => {
    const carryTypeId = this.prefill()?.spkCarryTypeId ?? null;
    if (carryTypeId === CARRY_TYPE_CARGO) return CARGO_CATEGORIES;
    if (carryTypeId === CARRY_TYPE_PASSENGER) return PASSENGER_CATEGORIES;
    return [...CARGO_CATEGORIES, ...PASSENGER_CATEGORIES];
  });

  readonly form = new FormGroup({
    surnameTranslit: new FormControl('', [
      Validators.required,
      Validators.pattern(/^[A-Za-z\s\-']+$/),
    ]),
    firstNameTranslit: new FormControl('', [
      Validators.required,
      Validators.pattern(/^[A-Za-z\s\-']+$/),
    ]),
    dateOfIssue: new FormControl(todayIso(), [
      Validators.required,
      dateRangeValidator(),
    ]),
    issuedBy: new FormControl({ value: '', disabled: false }),
    // Licence number is mandatory on the driver card (Django parity:
    // ECard.licence_no is a required model field).
    licenceNo: new FormControl('', [
      Validators.required,
      Validators.maxLength(20),
    ]),
    unionCode95: new FormControl('', Validators.required),
  });

  ngOnInit(): void {
    this.groupId = this.route.snapshot.paramMap.get('id') ?? '';
    this.driverId = Number(this.route.snapshot.paramMap.get('driverId'));
    this.cabinetApi.getDriverEcardPrefill(this.driverId).subscribe({
      next: (data) => {
        this.prefill.set(data);
        this.form.patchValue({
          surnameTranslit: transliterate(data.surname),
          firstNameTranslit: transliterate(data.firstName),
          // Issue date anchors on the SPK test-protocol date (ТЗ, картка водія).
          dateOfIssue: data.spkDateOfTestProtocol ?? todayIso(),
          issuedBy: data.issuedBy,
          unionCode95: data.unionCode95 ?? '',
          licenceNo: data.driverLicenseNo ?? '',
        });
        // Snapshot open categories + photo/signature from the driver profile,
        // keeping only categories allowed for the SPK carry type.
        if (data.driverLicenseCategories) {
          const allowed = new Set(this.availableCategories());
          this.selectedCategories.set(
            new Set(
              data.driverLicenseCategories
                .split(',')
                .map((s) => s.trim())
                .filter((c) => allowed.has(c)),
            ),
          );
        }
        this.photoImg.set(data.photoImg ?? null);
        this.signImg.set(data.signImg ?? null);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
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
    this.cabinetApi.uploadDriverFile(this.driverId, field, file).subscribe({
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
    if (!this.photoImg() || !this.signImg()) {
      this.uploadError.set('cabinet.ecard_photo_sign_required');
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    const val = this.form.getRawValue();
    // Keep the canonical category order (C-family before D-family) regardless
    // of the order the operator toggled the checkboxes in.
    const order = this.availableCategories();
    const cats = [...this.selectedCategories()].sort(
      (a, b) => order.indexOf(a) - order.indexOf(b),
    );
    this.cabinetApi
      .createECard(this.driverId, {
        surnameTranslit: val.surnameTranslit ?? '',
        firstNameTranslit: val.firstNameTranslit ?? '',
        licenceNo: val.licenceNo ?? '',
        dateOfIssue: val.dateOfIssue ?? '',
        issuedBy: val.issuedBy ?? '',
        unionCode95: val.unionCode95 || undefined,
        photoImg: this.photoImg() ?? undefined,
        signImg: this.signImg() ?? undefined,
        categoriesList: cats.length ? cats.join(', ') : undefined,
      })
      .subscribe({
        next: (res) => {
          this.saving.set(false);
          this.router.navigate(['/cabinet/ecards', res.id]);
        },
        error: (err) => {
          const body = err?.error;
          if (body?.fields) {
            for (const [field, msgs] of Object.entries(body.fields)) {
              const ctrl = this.form.get(field);
              if (ctrl) ctrl.setErrors({ serverError: (msgs as string[])[0] });
            }
          } else {
            this.error.set(body?.message ?? 'common.save_error');
          }
          this.saving.set(false);
        },
      });
  }
}
