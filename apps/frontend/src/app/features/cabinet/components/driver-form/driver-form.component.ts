import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  signal,
  type OnDestroy,
  type OnInit,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { debounceTime, map, startWith, switchMap } from 'rxjs/operators';
import { forkJoin, merge, of, Subject, type Observable } from 'rxjs';
import {
  Button,
  Checkbox,
  dateRangeValidator,
  FieldErrorPipe,
  FilePicker,
  PhoneInput,
  TranslatePipe,
} from '@code95/ui';
import { NgxMaskDirective } from 'ngx-mask';
import {
  CabinetApiService,
  type CountryItem,
  type DriverStatusCode,
  type UpdateDriverPayload,
  type UpdateDriverLicensePayload,
  CourseType,
  DriverLicenseCategory,
  DRIVER_LICENSE_CATEGORIES,
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

export type DriverFormMode = 'create' | 'edit' | 'addToGroup';

/**
 * Shared driver form used by drivers/create, drivers/:id/edit and
 * study-groups/:id/add-driver. Single source of truth for the field set,
 * layout, validation, eligibility checks and the mandatory photo + signature.
 */
@Component({
  selector: 'app-driver-form',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    Button,
    Checkbox,
    DatePipe,
    FieldErrorPipe,
    FilePicker,
    NgxMaskDirective,
    PhoneInput,
    TranslatePipe,
  ],
  templateUrl: './driver-form.component.html',
  styleUrl: './driver-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DriverFormComponent implements OnInit, OnDestroy {
  private readonly cabinetApi = inject(CabinetApiService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly mode = input.required<DriverFormMode>();
  readonly driverId = input<number | null>(null);
  readonly groupId = input<string | null>(null);

  private timerInterval: ReturnType<typeof setInterval> | null = null;

  readonly CourseType = CourseType;
  readonly cpcCategories = CPC_CATEGORIES;
  readonly driverLicenseCategoryOptions = DRIVER_LICENSE_CATEGORIES;

  readonly saving = signal(false);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly submitted = signal(false);
  readonly courseType = signal<CourseType | null>(null);
  readonly selectedCategories = signal(new Set<string>());
  readonly selectedDriverLicenseCategories = signal(
    new Set<DriverLicenseCategory>(),
  );
  readonly eligibility = signal<{
    canEnrollInitial: boolean;
    canEnrollShortened: boolean;
    canEnrollPeriodic: boolean;
    reasons: { initial?: string; shortened?: string; periodic?: string };
  } | null>(null);
  private readonly eligibilityTrigger$ = new Subject<void>();

  readonly photoFile = signal<File | null>(null);
  readonly signFile = signal<File | null>(null);
  readonly photoUrl = signal<string | null>(null);
  readonly signUrl = signal<string | null>(null);
  readonly hasPhoto = computed(() => !!this.photoFile() || !!this.photoUrl());
  readonly hasSignature = computed(() => !!this.signFile() || !!this.signUrl());

  readonly nameSecondsLeft = signal<number | null>(null);
  readonly licenseUpdatedAt = signal<string | null>(null);
  readonly statusCode = signal<DriverStatusCode | null>(null);
  private readonly countries = signal<CountryItem[]>([]);

  get isEdit(): boolean {
    return this.mode() === 'edit';
  }

  get canEditName(): boolean {
    if (!this.isEdit) return true;
    const s = this.nameSecondsLeft();
    return s !== null && s > 0;
  }

  readonly form = new FormGroup({
    surname: new FormControl('', Validators.required),
    firstName: new FormControl('', Validators.required),
    middleName: new FormControl(''),
    surnameTranslit: new FormControl(''),
    firstNameTranslit: new FormControl(''),
    taxNumber: new FormControl('', [
      Validators.required,
      Validators.pattern(/^\d{10}$/),
    ]),
    dateOfBirth: new FormControl('', [
      Validators.required,
      dateRangeValidator(),
    ]),
    countryOfBirthName: new FormControl(''),
    phone: new FormControl('', Validators.required),
    email: new FormControl('', [Validators.required, Validators.email]),
    addrTown: new FormControl(''),
    addrStreet: new FormControl(''),
    addrHouse: new FormControl(''),
    addrFlat: new FormControl(''),
    postCode: new FormControl(''),
    driverLicenseNo: new FormControl(''),
    driverLicenseIssueDate: new FormControl('', dateRangeValidator()),
    driverLicenseExpiryDate: new FormControl('', dateRangeValidator()),
    cCategoryIssueDate: new FormControl('', dateRangeValidator()),
    dCategoryIssueDate: new FormControl('', dateRangeValidator()),
    intendsUrbanSuburbanRoute: new FormControl(false),
  });

  ngOnInit(): void {
    const mode = this.mode();

    if (mode === 'addToGroup') {
      const gid = this.groupId() ?? '';
      if (gid) {
        this.cabinetApi.getStudyGroup(gid).subscribe({
          next: (g) => this.courseType.set(g.courseType ?? null),
        });
      }
    }

    if (mode === 'edit') {
      this.configureForEdit();
      this.loadDriver();
    }

    merge(this.form.valueChanges, this.eligibilityTrigger$)
      .pipe(
        startWith(null),
        debounceTime(200),
        switchMap(() => {
          const v = this.form.getRawValue();
          const cats = Array.from(this.selectedDriverLicenseCategories());
          if (!cats.length && !v.driverLicenseIssueDate) {
            this.eligibility.set(null);
            return of(null);
          }
          return this.cabinetApi.checkEligibility({
            driverLicenseCategories: cats,
            driverLicenseIssueDate: v.driverLicenseIssueDate || null,
            driverLicenseExpiryDate: v.driverLicenseExpiryDate || null,
            cCategoryIssueDate: v.cCategoryIssueDate || null,
            dCategoryIssueDate: v.dCategoryIssueDate || null,
            intendsUrbanSuburbanRoute: v.intendsUrbanSuburbanRoute ?? false,
          });
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res) => this.eligibility.set(res));
  }

  ngOnDestroy(): void {
    if (this.timerInterval) clearInterval(this.timerInterval);
  }

  private configureForEdit(): void {
    const c = this.form.controls;
    c.taxNumber.clearValidators();
    c.taxNumber.disable();
    // Drop `required` in edit mode but keep the calendar-range guard.
    c.dateOfBirth.setValidators(dateRangeValidator());
    c.phone.clearValidators();
    c.email.setValidators(Validators.email);
    c.dateOfBirth.updateValueAndValidity({ emitEvent: false });
    c.phone.updateValueAndValidity({ emitEvent: false });
    c.email.updateValueAndValidity({ emitEvent: false });
    // Name fields stay locked until the 48h window is confirmed open.
    c.surname.disable();
    c.firstName.disable();
    c.middleName.disable();
    c.surnameTranslit.disable();
    c.firstNameTranslit.disable();
  }

  private loadDriver(): void {
    const id = this.driverId();
    if (!id) return;
    this.loading.set(true);

    forkJoin({
      countries: this.cabinetApi.getCountries(),
      data: this.cabinetApi.getDriver(id),
    }).subscribe({
      next: ({ countries, data }) => {
        this.countries.set(countries);
        this.loading.set(false);
        this.photoUrl.set(data.photoImg ?? null);
        this.signUrl.set(data.signImg ?? null);
        this.licenseUpdatedAt.set(data.driverLicenseUpdatedAt ?? null);
        this.statusCode.set(data.statusCode ?? 'not_certified');

        const countryName =
          this.countries().find((cn) => cn.id === data.countryOfBirthId)
            ?.nameUkr ?? '';

        this.form.patchValue({
          surname: data.surname,
          firstName: data.firstName,
          middleName: data.middleName,
          surnameTranslit: data.surnameTranslit ?? '',
          firstNameTranslit: data.firstNameTranslit ?? '',
          dateOfBirth: data.dateOfBirth?.substring(0, 10) ?? '',
          countryOfBirthName: countryName,
          taxNumber: data.taxNumber,
          phone: data.phone ?? '',
          email: data.email ?? '',
          addrTown: data.addrTown ?? '',
          addrStreet: data.addrStreet ?? '',
          addrHouse: data.addrHouse ?? '',
          addrFlat: data.addrFlat ?? '',
          postCode: data.postCode ?? '',
          driverLicenseNo: data.driverLicenseNo ?? '',
          driverLicenseIssueDate: data.driverLicenseIssueDate ?? '',
          driverLicenseExpiryDate: data.driverLicenseExpiryDate ?? '',
          cCategoryIssueDate: data.cCategoryIssueDate ?? '',
          dCategoryIssueDate: data.dCategoryIssueDate ?? '',
          intendsUrbanSuburbanRoute: data.intendsUrbanSuburbanRoute ?? false,
        });

        if (data.categoriesList) {
          this.selectedCategories.set(
            new Set(
              data.categoriesList
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean),
            ),
          );
        }
        if (data.driverLicenseCategories) {
          this.selectedDriverLicenseCategories.set(
            new Set(
              data.driverLicenseCategories
                .split(',')
                .map((s) => s.trim())
                .filter((s): s is DriverLicenseCategory =>
                  (DRIVER_LICENSE_CATEGORIES as readonly string[]).includes(s),
                ),
            ),
          );
        }

        this.startNameTimer(data.lastEcardCreatedAt);
      },
      error: () => this.loading.set(false),
    });
  }

  onPhotoChange(file: File | null): void {
    this.photoFile.set(file);
  }

  onSignatureChange(file: File | null): void {
    this.signFile.set(file);
  }

  toggleCategory(cat: string): void {
    const next = new Set(this.selectedCategories());
    if (next.has(cat)) next.delete(cat);
    else next.add(cat);
    this.selectedCategories.set(next);
  }

  toggleDriverLicenseCategory(cat: DriverLicenseCategory): void {
    const next = new Set(this.selectedDriverLicenseCategories());
    if (next.has(cat)) next.delete(cat);
    else next.add(cat);
    this.selectedDriverLicenseCategories.set(next);
    if (!this.hasDGroupSelected()) {
      this.form.controls.intendsUrbanSuburbanRoute.setValue(false);
    }
    this.eligibilityTrigger$.next();
  }

  requiresHeavyLicenseCategory(): boolean {
    const ct = this.courseType();
    return ct === CourseType.PERIODIC || ct === CourseType.INITIAL_SHORTENED;
  }

  hasHeavyLicenseCategory(): boolean {
    return this.selectedDriverLicenseCategories().size > 0;
  }

  hasCGroupSelected(): boolean {
    const cats = this.selectedDriverLicenseCategories();
    return (
      cats.has(DriverLicenseCategory.C) ||
      cats.has(DriverLicenseCategory.CE) ||
      cats.has(DriverLicenseCategory.C1) ||
      cats.has(DriverLicenseCategory.C1E)
    );
  }

  hasDGroupSelected(): boolean {
    const cats = this.selectedDriverLicenseCategories();
    return (
      cats.has(DriverLicenseCategory.D) ||
      cats.has(DriverLicenseCategory.DE) ||
      cats.has(DriverLicenseCategory.D1) ||
      cats.has(DriverLicenseCategory.D1E)
    );
  }

  formatTimer(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  private startNameTimer(lastEcardCreatedAt: string | null): void {
    if (!lastEcardCreatedAt) return;
    const deadline =
      new Date(lastEcardCreatedAt).getTime() + 48 * 60 * 60 * 1000;

    const tick = () => {
      const remaining = Math.floor((deadline - Date.now()) / 1000);
      const secs = remaining > 0 ? remaining : 0;
      this.nameSecondsLeft.set(secs);
      const c = this.form.controls;
      if (secs > 0) {
        c.surname.enable();
        c.firstName.enable();
        c.middleName.enable();
        c.surnameTranslit.enable();
        c.firstNameTranslit.enable();
      } else {
        c.surname.disable();
        c.firstName.disable();
        c.middleName.disable();
        c.surnameTranslit.disable();
        c.firstNameTranslit.disable();
        if (this.timerInterval) {
          clearInterval(this.timerInterval);
          this.timerInterval = null;
        }
      }
    };

    tick();
    if ((this.nameSecondsLeft() ?? 0) > 0) {
      this.timerInterval = setInterval(tick, 1000);
    }
  }

  submit(): void {
    if (this.saving()) return;
    this.submitted.set(true);
    this.form.markAllAsTouched();
    this.error.set(null);

    if (!this.hasPhoto() || !this.hasSignature()) {
      return;
    }
    if (this.form.invalid) return;
    if (!this.runCourseValidations()) return;

    this.saving.set(true);
    switch (this.mode()) {
      case 'edit':
        this.saveEdit();
        break;
      case 'addToGroup':
        this.saveAddToGroup();
        break;
      default:
        this.saveCreate();
    }
  }

  /** Course-specific eligibility guards (Наказ 789 п.11). Active only when a
   *  course type is known (study-group enrolment). Returns false to block. */
  private runCourseValidations(): boolean {
    const ct = this.courseType();
    if (!ct) return true;

    if (
      this.requiresHeavyLicenseCategory() &&
      !this.hasHeavyLicenseCategory()
    ) {
      this.error.set(
        'Для періодичних/скорочених курсів необхідна категорія посвідчення C, CE, C1, C1E, D, DE, D1 або D1E (Наказ 789 п.11).',
      );
      return false;
    }

    const val = this.form.getRawValue();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (val.driverLicenseExpiryDate) {
      const exp = new Date(val.driverLicenseExpiryDate);
      if (!Number.isNaN(exp.getTime()) && exp.getTime() < today.getTime()) {
        this.error.set('Посвідчення водія прострочене.');
        return false;
      }
    }

    if (ct === CourseType.PERIODIC) {
      if (!val.driverLicenseIssueDate) {
        this.error.set(
          'Періодичні курси: вкажіть дату видачі посвідчення (потрібна для перевірки Наказу 789 п.11.3).',
        );
        return false;
      }
      const issued = new Date(val.driverLicenseIssueDate);
      const cutoff = new Date('2020-11-18');
      if (
        !Number.isNaN(issued.getTime()) &&
        issued.getTime() >= cutoff.getTime()
      ) {
        this.error.set(
          'Періодичні курси: посвідчення видане після 2020-11-18. Водій повинен спочатку пройти початкові або початково-скорочені курси (Наказ 789 п.11.3).',
        );
        return false;
      }
    }

    if (ct === CourseType.INITIAL_SHORTENED) {
      const cats = this.selectedDriverLicenseCategories();
      const hasC1 =
        cats.has(DriverLicenseCategory.C1) ||
        cats.has(DriverLicenseCategory.C1E);
      const hasD1 =
        cats.has(DriverLicenseCategory.D1) ||
        cats.has(DriverLicenseCategory.D1E);
      const hasC =
        cats.has(DriverLicenseCategory.C) || cats.has(DriverLicenseCategory.CE);
      const hasD =
        cats.has(DriverLicenseCategory.D) || cats.has(DriverLicenseCategory.DE);

      if (!hasC1 && !hasD1) {
        if (hasC) {
          const issue = val.cCategoryIssueDate || val.driverLicenseIssueDate;
          if (!issue) {
            this.error.set(
              'Для C/CE на скорочених курсах потрібна дата відкриття категорії або дата видачі посвідчення.',
            );
            return false;
          }
          const years =
            (today.getTime() - new Date(issue).getTime()) /
            (365.25 * 24 * 60 * 60 * 1000);
          if (years < 3) {
            this.error.set(
              `Для C/CE на скорочених курсах потрібен стаж ≥3 років (поточний: ${years.toFixed(1)}).`,
            );
            return false;
          }
        } else if (hasD && !val.intendsUrbanSuburbanRoute) {
          const issue = val.dCategoryIssueDate || val.driverLicenseIssueDate;
          if (!issue) {
            this.error.set(
              'Для D/DE без наміру міського/приміського маршруту потрібна дата відкриття категорії або дата видачі посвідчення.',
            );
            return false;
          }
          const years =
            (today.getTime() - new Date(issue).getTime()) /
            (365.25 * 24 * 60 * 60 * 1000);
          if (years < 3) {
            this.error.set(
              `Для D/DE на скорочених курсах потрібен стаж ≥3 років або намір міського/приміського маршруту (поточний: ${years.toFixed(1)}).`,
            );
            return false;
          }
        }
      }
    }

    return true;
  }

  /** Upload only the freshly picked files; existing URLs are left untouched. */
  private uploadImages(id: number): Observable<unknown> {
    const ops: Observable<unknown>[] = [];
    const photo = this.photoFile();
    const sign = this.signFile();
    if (photo) ops.push(this.cabinetApi.uploadDriverFile(id, 'photo', photo));
    if (sign) ops.push(this.cabinetApi.uploadDriverFile(id, 'signature', sign));
    return ops.length ? forkJoin(ops) : of(null);
  }

  private buildCreatePayload() {
    const val = this.form.getRawValue();
    return {
      surname: val.surname ?? '',
      firstName: val.firstName ?? '',
      middleName: val.middleName ?? '',
      taxNumber: val.taxNumber ?? '',
      dateOfBirth: val.dateOfBirth || null,
      phone: val.phone || null,
      email: val.email || null,
      surnameTranslit: val.surnameTranslit || null,
      firstNameTranslit: val.firstNameTranslit || null,
      countryOfBirthName: val.countryOfBirthName || null,
      addrTown: val.addrTown || null,
      addrStreet: val.addrStreet || null,
      addrHouse: val.addrHouse || null,
      addrFlat: val.addrFlat || null,
      postCode: val.postCode || null,
      categoriesList: Array.from(this.selectedCategories()),
      driverLicenseNo: val.driverLicenseNo || null,
      driverLicenseCategories: Array.from(
        this.selectedDriverLicenseCategories(),
      ),
      driverLicenseIssueDate: val.driverLicenseIssueDate || null,
      driverLicenseExpiryDate: val.driverLicenseExpiryDate || null,
      cCategoryIssueDate: val.cCategoryIssueDate || null,
      dCategoryIssueDate: val.dCategoryIssueDate || null,
      intendsUrbanSuburbanRoute: val.intendsUrbanSuburbanRoute ?? false,
    };
  }

  private saveCreate(): void {
    this.cabinetApi
      .createDriver(this.buildCreatePayload())
      .pipe(switchMap((d) => this.uploadImages(d.id).pipe(map(() => d.id))))
      .subscribe({
        next: (id) => this.router.navigate(['/cabinet/drivers', id]),
        error: (err) => this.handleError(err),
      });
  }

  private saveAddToGroup(): void {
    const gid = this.groupId() ?? '';
    this.cabinetApi
      .createAndAddDriver(gid, this.buildCreatePayload())
      .pipe(switchMap((d) => this.uploadImages(d.id)))
      .subscribe({
        next: () => this.router.navigate(['/cabinet/study-groups', gid]),
        error: (err) => this.handleError(err),
      });
  }

  private saveEdit(): void {
    const id = this.driverId();
    if (!id) {
      this.saving.set(false);
      return;
    }
    const v = this.form.getRawValue();
    const cats = Array.from(this.selectedCategories());

    const personal: UpdateDriverPayload = {
      dateOfBirth: v.dateOfBirth || null,
      countryOfBirthName: v.countryOfBirthName || null,
      phone: v.phone || null,
      email: v.email || null,
      categoriesList: cats.length ? cats.join(', ') : null,
      addrTown: v.addrTown || null,
      addrStreet: v.addrStreet || null,
      addrHouse: v.addrHouse || null,
      addrFlat: v.addrFlat || null,
      postCode: v.postCode || null,
    };
    if (this.canEditName) {
      personal.surname = v.surname ?? '';
      personal.firstName = v.firstName ?? '';
      personal.middleName = v.middleName ?? '';
      personal.surnameTranslit = v.surnameTranslit ?? '';
      personal.firstNameTranslit = v.firstNameTranslit ?? '';
    }

    const license: UpdateDriverLicensePayload = {
      driverLicenseNo: v.driverLicenseNo || null,
      driverLicenseCategories: Array.from(
        this.selectedDriverLicenseCategories(),
      ),
      driverLicenseIssueDate: v.driverLicenseIssueDate || null,
      driverLicenseExpiryDate: v.driverLicenseExpiryDate || null,
      cCategoryIssueDate: v.cCategoryIssueDate || null,
      dCategoryIssueDate: v.dCategoryIssueDate || null,
      intendsUrbanSuburbanRoute: !!v.intendsUrbanSuburbanRoute,
    };

    this.uploadImages(id)
      .pipe(
        switchMap(() => this.cabinetApi.updateDriver(id, personal)),
        switchMap(() => this.cabinetApi.updateDriverLicense(id, license)),
      )
      .subscribe({
        next: () => this.router.navigate(['/cabinet/drivers', id]),
        error: (err) => this.handleError(err),
      });
  }

  private handleError(err: {
    error?: { fields?: Record<string, string[]>; message?: string };
  }): void {
    const body = err?.error;
    if (body?.fields) {
      for (const [field, msgs] of Object.entries(body.fields)) {
        const ctrl = this.form.get(field);
        if (ctrl) ctrl.setErrors({ serverError: msgs[0] });
      }
    } else {
      this.error.set(body?.message ?? 'common.save_error');
    }
    this.saving.set(false);
  }
}
