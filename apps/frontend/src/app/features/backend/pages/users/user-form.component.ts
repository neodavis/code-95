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
  FieldErrorPipe,
  PageHeader,
  PhoneInput,
  TranslatePipe,
} from '@code95/ui';
import { UsersApiService } from '../../../../core/services/users-api.service';

@Component({
  selector: 'app-user-form',
  imports: [
    PageHeader,
    Button,
    RouterLink,
    ReactiveFormsModule,
    TranslatePipe,
    FieldErrorPipe,
    PhoneInput,
  ],
  templateUrl: './user-form.component.html',
  styleUrl: './user-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserFormComponent implements OnInit {
  private readonly usersApi = inject(UsersApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  isEdit = false;
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  private userId: string | null = null;

  readonly form = new FormGroup({
    uniqueCode: new FormControl('', Validators.maxLength(256)),
    password: new FormControl('', Validators.minLength(6)),
    lastName: new FormControl('', [
      Validators.required,
      Validators.maxLength(30),
    ]),
    firstName: new FormControl('', [
      Validators.required,
      Validators.maxLength(30),
    ]),
    middleName: new FormControl('', [
      Validators.required,
      Validators.maxLength(64),
    ]),
    email: new FormControl('', [Validators.email, Validators.maxLength(254)]),
    phone: new FormControl('', Validators.required),
    birthday: new FormControl<string | null>(null),
    passport: new FormControl('', Validators.maxLength(64)),
    identificationCode: new FormControl('', Validators.maxLength(100)),
    region: new FormControl('', Validators.maxLength(256)),
    isStaff: new FormControl(false),
    isSuperuser: new FormControl(false),
    isActive: new FormControl(true),
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.isEdit = !!id;

    if (this.isEdit) {
      this.userId = id;
      this.usersApi.getOne(id!).subscribe({
        next: (user) => {
          this.form.patchValue({
            firstName: user.firstName,
            lastName: user.lastName,
            middleName: user.middleName,
            email: user.email,
            phone: user.phone,
            birthday: user.birthday ?? null,
            passport: user.passport ?? '',
            identificationCode: user.identificationCode ?? '',
            region: user.region ?? '',
            isStaff: user.isStaff,
            isSuperuser: user.isSuperuser,
            isActive: user.isActive,
          });
        },
      });
    } else {
      this.form.controls.uniqueCode.addValidators(Validators.required);
      this.form.controls.password.addValidators([
        Validators.required,
        Validators.minLength(6),
      ]);
      this.form.controls.uniqueCode.updateValueAndValidity();
      this.form.controls.password.updateValueAndValidity();
    }
  }

  onSubmit(): void {
    if (this.form.invalid || this.saving()) return;
    this.saving.set(true);
    this.error.set(null);

    const val = this.form.getRawValue();

    if (this.isEdit && this.userId !== null) {
      const payload: Record<string, unknown> = {};
      if (val.password) payload['password'] = val.password;
      if (val.firstName !== null) payload['firstName'] = val.firstName;
      if (val.lastName !== null) payload['lastName'] = val.lastName;
      if (val.middleName !== null) payload['middleName'] = val.middleName;
      if (val.email !== null) payload['email'] = val.email;
      if (val.phone !== null) payload['phone'] = val.phone;
      payload['birthday'] = val.birthday || null;
      payload['passport'] = val.passport ?? '';
      payload['identificationCode'] = val.identificationCode ?? '';
      payload['region'] = val.region ?? '';
      payload['isStaff'] = val.isStaff;
      payload['isSuperuser'] = val.isSuperuser;
      payload['isActive'] = val.isActive;

      this.usersApi.update(this.userId, payload as never).subscribe({
        next: () => this.router.navigate(['/backend/users']),
        error: (err) => {
          const body = err?.error;
          if (body?.fields) {
            for (const [field, msgs] of Object.entries(body.fields)) {
              const ctrl = this.form.get(field);
              if (ctrl) ctrl.setErrors({ serverError: (msgs as string[])[0] });
            }
          } else {
            this.error.set(body?.message ?? 'Error saving user');
          }
          this.saving.set(false);
        },
      });
    } else {
      this.usersApi
        .create({
          uniqueCode: val.uniqueCode ?? '',
          password: val.password ?? '',
          firstName: val.firstName ?? '',
          lastName: val.lastName ?? '',
          middleName: val.middleName ?? '',
          phone: val.phone ?? '',
          email: val.email ?? undefined,
          birthday: val.birthday || null,
          passport: val.passport ?? undefined,
          identificationCode: val.identificationCode ?? undefined,
          region: val.region ?? undefined,
          isStaff: val.isStaff ?? false,
          isSuperuser: val.isSuperuser ?? false,
          isActive: val.isActive ?? true,
        })
        .subscribe({
          next: () => this.router.navigate(['/backend/users']),
          error: (err) => {
            const body = err?.error;
            if (body?.fields) {
              for (const [field, msgs] of Object.entries(body.fields)) {
                const ctrl = this.form.get(field);
                if (ctrl)
                  ctrl.setErrors({ serverError: (msgs as string[])[0] });
              }
            } else {
              this.error.set(body?.message ?? 'Error creating user');
            }
            this.saving.set(false);
          },
        });
    }
  }
}
