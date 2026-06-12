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
import {
  Button,
  dateRangeValidator,
  FieldErrorPipe,
  PageHeader,
  PhoneInput,
  TranslatePipe,
} from '@code95/ui';
import { NgxMaskDirective } from 'ngx-mask';
import { TrainingCentersApiService } from '../../../../core/services/training-centers-api.service';

@Component({
  selector: 'app-backend-tc-form',
  imports: [
    PageHeader,
    Button,
    RouterLink,
    ReactiveFormsModule,
    TranslatePipe,
    FieldErrorPipe,
    NgxMaskDirective,
    PhoneInput,
  ],
  templateUrl: './backend-tc-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BackendTcFormComponent implements OnInit {
  private readonly tcApi = inject(TrainingCentersApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  isEdit = false;
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  private tcId: string | null = null;

  readonly form = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.maxLength(200)]),
    nameShort: new FormControl('', Validators.maxLength(60)),
    edrpou: new FormControl('', [
      Validators.required,
      Validators.pattern(/^\d{8}$/),
    ]),
    certNo: new FormControl('', Validators.maxLength(9)),
    certDate: new FormControl('', dateRangeValidator()),
    region: new FormControl('', Validators.maxLength(50)),
    city: new FormControl('', Validators.maxLength(50)),
    addrStreet: new FormControl('', Validators.maxLength(50)),
    addrHouse: new FormControl('', Validators.maxLength(7)),
    postCode: new FormControl('', Validators.pattern(/^\d{5}$/)),
    phone: new FormControl(''),
    email: new FormControl('', [Validators.email, Validators.maxLength(100)]),
    website: new FormControl('', Validators.maxLength(200)),
    chiefPip: new FormControl('', Validators.maxLength(50)),
    atiCode: new FormControl('', Validators.maxLength(4)),
    division: new FormControl('', Validators.maxLength(20)),
    isActive: new FormControl(true),
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.isEdit = !!id;

    if (this.isEdit) {
      this.tcId = id;
      this.tcApi.adminGetOne(id!).subscribe({
        next: (tc) => {
          this.form.patchValue({
            name: tc.name,
            nameShort: tc.nameShort,
            edrpou: tc.edrpou,
            certNo: tc.certNo,
            certDate: tc.certDate ?? '',
            region: tc.region ?? '',
            city: tc.city,
            addrStreet: tc.addrStreet,
            addrHouse: tc.addrHouse,
            postCode: tc.postCode ?? '',
            phone: tc.phone ?? '',
            email: tc.email ?? '',
            website: tc.website ?? '',
            chiefPip: tc.chiefPip,
            atiCode: tc.atiCode,
            division: tc.division,
            isActive: tc.isActive,
          });
        },
      });
    }
  }

  onSubmit(): void {
    if (this.form.invalid || this.saving()) return;
    this.saving.set(true);
    this.error.set(null);

    const val = this.form.getRawValue();
    const payload = {
      name: val.name ?? '',
      edrpou: val.edrpou ?? '',
      nameShort: val.nameShort ?? undefined,
      chiefPip: val.chiefPip ?? undefined,
      atiCode: val.atiCode ?? undefined,
      division: val.division ?? undefined,
      certNo: val.certNo ?? undefined,
      certDate: val.certDate || undefined,
      region: val.region ?? undefined,
      city: val.city ?? undefined,
      addrStreet: val.addrStreet ?? undefined,
      addrHouse: val.addrHouse ?? undefined,
      postCode: val.postCode ?? undefined,
      phone: val.phone ?? undefined,
      email: val.email ?? undefined,
      website: val.website ?? undefined,
      isActive: val.isActive ?? true,
    };

    const request$ =
      this.isEdit && this.tcId !== null
        ? this.tcApi.update(this.tcId, payload)
        : this.tcApi.create(payload);

    request$.subscribe({
      next: () => this.router.navigate(['/backend/training-centers']),
      error: (err) => {
        const body = err?.error;
        if (body?.fields) {
          for (const [field, msgs] of Object.entries(body.fields)) {
            const ctrl = this.form.get(field);
            if (ctrl) ctrl.setErrors({ serverError: (msgs as string[])[0] });
          }
        } else {
          this.error.set(body?.message ?? 'Error saving training center');
        }
        this.saving.set(false);
      },
    });
  }
}
