import {
  Component,
  inject,
  type OnInit,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
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
  CourseType,
  type CarryTypeItem,
  type CreateStudyGroupPayload,
} from '../../../../core/services/cabinet-api.service';

@Component({
  selector: 'app-study-group-form',
  imports: [
    Button,
    FieldErrorPipe,
    PageHeader,
    ReactiveFormsModule,
    RouterLink,
    TranslatePipe,
  ],
  templateUrl: './study-group-form.component.html',
  styleUrl: './study-group-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudyGroupFormComponent implements OnInit {
  private readonly cabinetApi = inject(CabinetApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly carryTypes = signal<CarryTypeItem[]>([]);
  readonly CourseType = CourseType;
  isEdit = false;
  private groupId: string | null = null;

  readonly form = this.fb.group({
    name: ['', Validators.required],
    carryTypeId: [null as number | null, Validators.required],
    dateStart: [
      null as string | null,
      [Validators.required, dateRangeValidator()],
    ],
    dateFinish: [
      null as string | null,
      [Validators.required, dateRangeValidator()],
    ],
    courseType: [null as CourseType | null, Validators.required],
  });

  ngOnInit(): void {
    this.cabinetApi.getCarryTypes().subscribe({
      next: (data) => this.carryTypes.set(data),
    });

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit = true;
      this.groupId = id;
      this.cabinetApi.getStudyGroup(this.groupId).subscribe({
        next: (g) => {
          this.form.patchValue({
            name: g.name,
            carryTypeId: g.carryTypeId,
            dateStart: g.dateStart,
            dateFinish: g.dateFinish,
            courseType: g.courseType,
          });
          this.form.controls.courseType.disable();
        },
      });
    }
  }

  submit(): void {
    if (this.form.invalid) return;
    this.saving.set(true);
    this.error.set(null);

    const payload: CreateStudyGroupPayload = {
      name: this.form.value.name ?? '',
      carryTypeId: this.form.value.carryTypeId ?? null,
      dateStart: this.form.value.dateStart ?? null,
      dateFinish: this.form.value.dateFinish ?? null,
    };
    if (!this.isEdit) {
      payload.courseType = this.form.value.courseType ?? null;
    }

    const request$ =
      this.isEdit && this.groupId
        ? this.cabinetApi.updateStudyGroup(this.groupId, payload)
        : this.cabinetApi.createStudyGroup(payload);

    request$.subscribe({
      next: (group) => {
        this.router.navigate(['/cabinet/study-groups', group.id]);
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
