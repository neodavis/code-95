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
import { CarryTypesApiService } from '../../../../core/services/carry-types-api.service';

@Component({
  selector: 'app-carry-type-form',
  imports: [
    PageHeader,
    Button,
    RouterLink,
    ReactiveFormsModule,
    TranslatePipe,
    FieldErrorPipe,
  ],
  templateUrl: './carry-type-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CarryTypeFormComponent implements OnInit {
  private readonly carryTypesApi = inject(CarryTypesApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  isEdit = false;
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  private typeId: number | null = null;

  readonly form = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.maxLength(200)]),
    nameSpk: new FormControl('', Validators.maxLength(200)),
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.isEdit = !!id;
    if (this.isEdit) {
      this.typeId = Number(id);
      this.carryTypesApi.getOne(this.typeId).subscribe({
        next: (ct) =>
          this.form.patchValue({ name: ct.name, nameSpk: ct.nameSpk }),
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
      nameSpk: val.nameSpk ?? '',
    };

    const request$ =
      this.isEdit && this.typeId !== null
        ? this.carryTypesApi.update(this.typeId, payload)
        : this.carryTypesApi.create(payload);

    request$.subscribe({
      next: () => this.router.navigate(['/backend/carry-types']),
      error: (err) => {
        const body = err?.error;
        if (body?.fields) {
          for (const [field, msgs] of Object.entries(body.fields)) {
            const ctrl = this.form.get(field);
            if (ctrl) ctrl.setErrors({ serverError: (msgs as string[])[0] });
          }
        } else {
          this.error.set(body?.message ?? 'Error saving carry type');
        }
        this.saving.set(false);
      },
    });
  }
}
