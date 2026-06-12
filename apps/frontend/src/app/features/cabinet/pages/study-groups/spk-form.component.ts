import {
  Component,
  computed,
  DestroyRef,
  inject,
  type OnInit,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  Button,
  dateRangeValidator,
  FieldErrorPipe,
  PageHeader,
  TranslatePipe,
} from '@code95/ui';
import { SPK_VALIDITY_YEARS } from '@code95/shared-types';
import {
  CabinetApiService,
  type CabinetStudyGroupDetail,
  type CarryTypeItem,
  type MinistryConstants,
  type SpkBulkResult,
  type SpkDataItem,
} from '../../../../core/services/cabinet-api.service';

@Component({
  selector: 'app-spk-form',
  imports: [
    DatePipe,
    ReactiveFormsModule,
    Button,
    FieldErrorPipe,
    PageHeader,
    RouterLink,
    TranslatePipe,
  ],
  templateUrl: './spk-form.component.html',
  styleUrl: './spk-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpkFormComponent implements OnInit {
  private readonly cabinetApi = inject(CabinetApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  groupId = '';
  singleDriverId: number | null = null;
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly spkData = signal<SpkDataItem[]>([]);
  readonly carryTypes = signal<CarryTypeItem[]>([]);
  readonly group = signal<CabinetStudyGroupDetail | null>(null);
  readonly constants = signal<MinistryConstants | null>(null);
  readonly results = signal<SpkBulkResult[]>([]);

  readonly pending = computed(() => this.spkData().filter((d) => !d.spkId));

  readonly displayedDrivers = computed(() => {
    if (this.singleDriverId) {
      return this.spkData().filter((d) => d.driverId === this.singleDriverId);
    }
    return this.spkData();
  });

  readonly displayedPending = computed(() => {
    if (this.singleDriverId) {
      return this.pending().filter((d) => d.driverId === this.singleDriverId);
    }
    return this.pending();
  });

  readonly form = new FormGroup({
    carryTypeId: new FormControl<number | null>(null, Validators.required),
    dateOfTest: new FormControl('', [
      Validators.required,
      dateRangeValidator(),
    ]),
    dateOfTestProtocol: new FormControl('', [
      Validators.required,
      dateRangeValidator(),
    ]),
    testProtocolNo: new FormControl('', [
      Validators.required,
      Validators.maxLength(20),
    ]),
    // Derived (dateOfTest + 5y, Наказ 789 п.27) — read-only; the server
    // re-derives it and ignores client-supplied values.
    dateOfExpiry: new FormControl('', Validators.required),
    position: new FormControl('Директор', Validators.required),
    chiefPip: new FormControl('', [
      Validators.required,
      Validators.maxLength(50),
    ]),
  });

  ngOnInit(): void {
    this.groupId = this.route.snapshot.paramMap.get('id') ?? '';
    const driverIdParam = this.route.snapshot.queryParamMap.get('driverId');
    if (driverIdParam) {
      this.singleDriverId = Number(driverIdParam);
    }

    // Keep the read-only expiry in sync with the test date, and mirror the
    // test date into the protocol date (Django parity: spk_create.html JS sets
    // date_of_test_protocol = date_of_test; the operator can still adjust it).
    this.form.controls.dateOfTest.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((d) => {
        this.form.controls.dateOfExpiry.setValue(
          d ? this.addYears(d, SPK_VALIDITY_YEARS) : '',
          { emitEvent: false },
        );
        this.form.controls.dateOfTestProtocol.setValue(d ?? '', {
          emitEvent: false,
        });
      });

    let loaded = 0;
    const done = () => {
      loaded++;
      if (loaded === 4) this.loading.set(false);
    };

    this.cabinetApi.getStudyGroupSpkData(this.groupId).subscribe({
      next: (data) => {
        this.spkData.set(data);
        done();
      },
      error: () => done(),
    });
    this.cabinetApi.getCarryTypes().subscribe({
      next: (data) => {
        this.carryTypes.set(data);
        done();
      },
      error: () => done(),
    });
    this.cabinetApi.getStudyGroup(this.groupId).subscribe({
      next: (data) => {
        this.group.set(data);
        // Pre-fill from the group: the carry type is fixed by the study group
        // (Django parity: SPKForm initial + readonly carry_type_txt).
        this.form.patchValue({
          chiefPip: data.tcChiefPip ?? '',
          carryTypeId: data.carryTypeId ?? null,
        });
        done();
      },
      error: () => done(),
    });
    this.cabinetApi.getConstants().subscribe({
      next: (data) => {
        this.constants.set(data);
        done();
      },
      error: () => done(),
    });
  }

  private addYears(iso: string, years: number): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    d.setFullYear(d.getFullYear() + years);
    return d.toISOString().substring(0, 10);
  }

  submit(): void {
    if (this.displayedPending().length === 0) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.saving()) return;
    this.saving.set(true);
    this.error.set(null);
    const val = this.form.getRawValue();
    this.cabinetApi
      .createSpkBulk(this.groupId, {
        driverIds: this.displayedPending().map((d) => d.driverId),
        carryTypeId: val.carryTypeId,
        dateOfTest: val.dateOfTest ?? '',
        dateOfTestProtocol: val.dateOfTestProtocol ?? '',
        testProtocolNo: val.testProtocolNo ?? '',
        dateOfExpiry: val.dateOfExpiry ?? '',
        position: val.position ?? '',
        chiefPip: val.chiefPip ?? '',
      })
      .subscribe({
        next: (results) => {
          this.saving.set(false);
          const failed = results.filter((r) => r.error);
          if (failed.length === 0) {
            // Success: jump straight to where the result is visible —
            // single SPK → its detail page, bulk → the group table.
            if (results.length === 1) {
              this.router.navigate(['/cabinet/espk', results[0].spkId]);
            } else {
              this.router.navigate(['/cabinet/study-groups', this.groupId]);
            }
            return;
          }
          // Partial failure: stay on the form so errors remain visible.
          this.results.set(results);
          this.cabinetApi.getStudyGroupSpkData(this.groupId).subscribe({
            next: (data) => this.spkData.set(data),
          });
        },
        error: (err) => {
          const body = err?.error;
          if (body?.fields) {
            for (const [field, msgs] of Object.entries(body.fields)) {
              const ctrl = this.form.get(field);
              if (ctrl) ctrl.setErrors({ serverError: (msgs as string[])[0] });
            }
          } else {
            this.error.set(body?.message ?? 'Error');
          }
          this.saving.set(false);
        },
      });
  }
}
