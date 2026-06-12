import {
  Component,
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
import {
  CabinetApiService,
  type SpkDetail,
  type UpdateSpkPayload,
} from '../../../../core/services/cabinet-api.service';

const SPK_VALIDITY_YEARS = 5;

@Component({
  selector: 'app-spk-edit',
  imports: [
    DatePipe,
    ReactiveFormsModule,
    Button,
    FieldErrorPipe,
    PageHeader,
    RouterLink,
    TranslatePipe,
  ],
  templateUrl: './spk-edit.component.html',
  styleUrl: './spk-edit.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpkEditComponent implements OnInit {
  private readonly cabinetApi = inject(CabinetApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  spkId = 0;
  readonly spk = signal<SpkDetail | null>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  // Ministry fields, carry type and TC data are read-only after creation
  // (Django parity: SPKForm.readonly_fields) — shown from spk(), not edited.
  readonly form = new FormGroup({
    dateOfTest: new FormControl('', [
      Validators.required,
      dateRangeValidator(),
    ]),
    testProtocolNo: new FormControl('', Validators.required),
    dateOfTestProtocol: new FormControl('', [
      Validators.required,
      dateRangeValidator(),
    ]),
    // Derived (dateOfTest + 5y, Наказ 789 п.27) — read-only, never submitted.
    dateOfExpiry: new FormControl(''),
    position: new FormControl('', Validators.required),
    chiefPip: new FormControl('', Validators.required),
  });

  ngOnInit(): void {
    this.spkId = Number(this.route.snapshot.paramMap.get('id'));
    this.cabinetApi.getSpk(this.spkId).subscribe({
      next: (data) => {
        this.spk.set(data);
        this.loading.set(false);
        this.populateForm(data);
        // Keep the read-only expiry in sync when the test date is edited.
        this.form.controls.dateOfTest.valueChanges
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe((d) =>
            this.form.controls.dateOfExpiry.setValue(
              d ? this.addYears(d, SPK_VALIDITY_YEARS) : '',
              { emitEvent: false },
            ),
          );
      },
      error: () => this.loading.set(false),
    });
  }

  private toInputDate(val: string | null | undefined): string {
    if (!val) return '';
    return val.substring(0, 10);
  }

  private addYears(iso: string, years: number): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    d.setFullYear(d.getFullYear() + years);
    return d.toISOString().substring(0, 10);
  }

  private populateForm(s: SpkDetail): void {
    this.form.patchValue({
      dateOfTest: this.toInputDate(s.dateOfTest),
      testProtocolNo: s.testProtocolNo ?? '',
      dateOfTestProtocol: this.toInputDate(s.dateOfTestProtocol),
      dateOfExpiry: this.toInputDate(s.dateOfExpiry),
      position: s.position ?? '',
      chiefPip: s.chiefPip ?? '',
    });
  }

  submit(): void {
    if (this.saving()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();

    // dateOfExpiry is omitted on purpose — the server re-derives it from
    // dateOfTest + 5y; read-only fields (ministry, carry type) are never sent.
    const payload: UpdateSpkPayload = {
      dateOfTest: v.dateOfTest || null,
      testProtocolNo: v.testProtocolNo || null,
      dateOfTestProtocol: v.dateOfTestProtocol || null,
      position: v.position || null,
      chiefPip: v.chiefPip || null,
    };

    this.saving.set(true);
    this.error.set(null);
    this.cabinetApi.updateSpk(this.spkId, payload).subscribe({
      next: () => {
        this.router.navigate(['/cabinet/espk', this.spkId]);
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Error');
        this.saving.set(false);
      },
    });
  }
}
