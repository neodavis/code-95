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
import { Button, PageHeader, TranslatePipe } from '@code95/ui';
import { type TrainingCenter, type UserListItem } from '@code95/shared-types';
import { EmployeesApiService } from '../../../../core/services/employees-api.service';
import { TrainingCentersApiService } from '../../../../core/services/training-centers-api.service';
import { UsersApiService } from '../../../../core/services/users-api.service';

@Component({
  selector: 'app-employee-form',
  imports: [PageHeader, Button, RouterLink, ReactiveFormsModule, TranslatePipe],
  templateUrl: './employee-form.component.html',
  styleUrl: './employee-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmployeeFormComponent implements OnInit {
  private readonly employeesApi = inject(EmployeesApiService);
  private readonly tcApi = inject(TrainingCentersApiService);
  private readonly usersApi = inject(UsersApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  isEdit = false;
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly users = signal<UserListItem[]>([]);
  readonly trainingCenters = signal<TrainingCenter[]>([]);
  readonly currentUserLabel = signal('');
  readonly currentTcLabel = signal('');
  private employeeId: string | null = null;

  readonly form = new FormGroup({
    userId: new FormControl<string | null>(null, Validators.required),
    trainingCenterId: new FormControl<string | null>(null, Validators.required),
    isActive: new FormControl(true),
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.isEdit = !!id;

    if (this.isEdit) {
      this.employeeId = id;
      this.employeesApi.getOne(id!).subscribe({
        next: (emp) => {
          this.form.patchValue({ isActive: emp.isActive });
          this.currentUserLabel.set(
            emp.userFullName
              ? `${emp.userUniqueCode} — ${emp.userFullName}`
              : emp.userUniqueCode,
          );
          this.currentTcLabel.set(emp.trainingCenterName);
          this.form.controls.userId.setValue(emp.userId);
          this.form.controls.trainingCenterId.setValue(emp.trainingCenterId);
        },
      });
    } else {
      this.usersApi
        .getAll(1, 1000)
        .subscribe({ next: (res) => this.users.set(res.results) });
      this.tcApi
        .getAll(1, 1000)
        .subscribe({ next: (res) => this.trainingCenters.set(res.results) });
    }
  }

  userLabel(u: UserListItem): string {
    const full = [u.lastName, u.firstName].filter(Boolean).join(' ');
    return full ? ` — ${full}` : '';
  }

  onSubmit(): void {
    if (this.form.invalid || this.saving()) return;
    this.saving.set(true);
    this.error.set(null);

    const val = this.form.getRawValue();

    if (this.isEdit && this.employeeId !== null) {
      this.employeesApi
        .update(this.employeeId, { isActive: val.isActive ?? true })
        .subscribe({
          next: () => this.router.navigate(['/backend/employees']),
          error: (err) => {
            const body = err?.error;
            if (body?.fields) {
              for (const [field, msgs] of Object.entries(body.fields)) {
                const ctrl = this.form.get(field);
                if (ctrl)
                  ctrl.setErrors({ serverError: (msgs as string[])[0] });
              }
            } else {
              this.error.set(body?.message ?? 'Error saving employee');
            }
            this.saving.set(false);
          },
        });
    } else {
      this.employeesApi
        .create({
          userId: val.userId ?? '',
          trainingCenterId: val.trainingCenterId ?? '',
          isActive: val.isActive ?? true,
        })
        .subscribe({
          next: () => this.router.navigate(['/backend/employees']),
          error: (err) => {
            const body = err?.error;
            if (body?.fields) {
              for (const [field, msgs] of Object.entries(body.fields)) {
                const ctrl = this.form.get(field);
                if (ctrl)
                  ctrl.setErrors({ serverError: (msgs as string[])[0] });
              }
            } else {
              this.error.set(body?.message ?? 'Error creating employee');
            }
            this.saving.set(false);
          },
        });
    }
  }
}
