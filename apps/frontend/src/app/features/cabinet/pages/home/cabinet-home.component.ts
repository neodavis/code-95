import {
  Component,
  inject,
  type OnInit,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { BorderedCard, TranslatePipe } from '@code95/ui';
import { StudyGroupStatus } from '@code95/shared-types';
import {
  CabinetApiService,
  type CabinetDashboard,
} from '../../../../core/services/cabinet-api.service';

const STATUS_LABELS: Record<number, string> = {
  [StudyGroupStatus.ENROLLMENT_START]: 'status.enrollment_start',
  [StudyGroupStatus.ENROLLMENT_FINISH]: 'status.enrollment_finish',
  [StudyGroupStatus.IN_PROGRESS]: 'status.in_progress',
  [StudyGroupStatus.COMPLETED]: 'status.completed',
  [StudyGroupStatus.CANCELLED]: 'status.cancelled',
};

const STATUS_CLASSES: Record<number, string> = {
  [StudyGroupStatus.ENROLLMENT_START]: 'badge badge-secondary',
  [StudyGroupStatus.ENROLLMENT_FINISH]: 'badge badge-warning',
  [StudyGroupStatus.IN_PROGRESS]: 'badge badge-primary',
  [StudyGroupStatus.COMPLETED]: 'badge badge-success',
  [StudyGroupStatus.CANCELLED]: 'badge badge-danger',
};

@Component({
  selector: 'app-cabinet-home',
  imports: [BorderedCard, DatePipe, RouterLink, TranslatePipe],
  templateUrl: './cabinet-home.component.html',
  styleUrl: './cabinet-home.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CabinetHomeComponent implements OnInit {
  private readonly cabinetApi = inject(CabinetApiService);

  readonly dashboard = signal<CabinetDashboard | null>(null);
  readonly statusLabels = STATUS_LABELS;
  readonly statusClasses = STATUS_CLASSES;

  ngOnInit(): void {
    this.cabinetApi.getDashboard().subscribe({
      next: (data) => this.dashboard.set(data),
    });
  }
}
