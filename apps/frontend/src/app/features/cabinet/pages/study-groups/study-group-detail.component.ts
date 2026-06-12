import {
  Component,
  computed,
  inject,
  type OnInit,
  signal,
  type WritableSignal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { type Observable } from 'rxjs';
import { DatePipe, NgClass } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  EllipsisDirective,
  PageHeader,
  TranslatePipe,
  TranslationService,
} from '@code95/ui';
import { MAX_GROUP_SIZE, StudyGroupStatus } from '@code95/shared-types';
import {
  CabinetApiService,
  type CabinetStudyGroupDetail,
  type CabinetStudyGroupStudent,
  type ExcelImportResult,
} from '../../../../core/services/cabinet-api.service';

const STATUS_LABELS: Record<number, string> = {
  [StudyGroupStatus.ENROLLMENT_START]: 'status.enrollment_start',
  [StudyGroupStatus.ENROLLMENT_FINISH]: 'status.enrollment_finish',
  [StudyGroupStatus.IN_PROGRESS]: 'status.in_progress',
  [StudyGroupStatus.COMPLETED]: 'status.completed',
  [StudyGroupStatus.CANCELLED]: 'status.cancelled',
};

const STATUS_BADGE_CLASSES: Record<number, string> = {
  [StudyGroupStatus.ENROLLMENT_START]: 'badge badge-secondary',
  [StudyGroupStatus.ENROLLMENT_FINISH]: 'badge badge-warning',
  [StudyGroupStatus.IN_PROGRESS]: 'badge badge-primary',
  [StudyGroupStatus.COMPLETED]: 'badge badge-success',
  [StudyGroupStatus.CANCELLED]: 'badge badge-danger',
};

export interface ImportLogEntry {
  timestamp: string;
  imported: number;
  skipped: number;
  errors: string[];
}

@Component({
  selector: 'app-study-group-detail',
  imports: [
    DatePipe,
    NgClass,
    PageHeader,
    RouterLink,
    TranslatePipe,
    EllipsisDirective,
  ],
  templateUrl: './study-group-detail.component.html',
  styleUrl: './study-group-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudyGroupDetailComponent implements OnInit {
  readonly S = StudyGroupStatus;
  readonly statusLabels = STATUS_LABELS;
  readonly statusBadgeClasses = STATUS_BADGE_CLASSES;
  readonly MAX_GROUP_SIZE = MAX_GROUP_SIZE;

  private readonly cabinetApi = inject(CabinetApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly t = inject(TranslationService);

  readonly group = signal<CabinetStudyGroupDetail | null>(null);
  readonly loading = signal(true);
  readonly importResult = signal<ExcelImportResult | null>(null);
  readonly selectedIds = signal<Set<number>>(new Set());
  readonly importModalOpen = signal(false);
  readonly importLogs = signal<ImportLogEntry[]>([]);
  readonly changingStatus = signal(false);
  readonly downloadingSpk = signal(false);
  readonly downloadingPersonalization = signal(false);
  readonly importing = signal(false);
  readonly removingStudentId = signal<number | null>(null);
  readonly deleting = signal(false);

  readonly anySelected = computed(() => this.selectedIds().size > 0);
  readonly allSelected = computed(() => {
    const g = this.group();
    return (
      g !== null &&
      g.students.length > 0 &&
      g.students.every((s) => this.selectedIds().has(s.id))
    );
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.cabinetApi.getStudyGroup(id).subscribe({
      next: (data) => {
        this.group.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  toggleDriver(id: number): void {
    this.selectedIds.update((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  toggleAll(students: CabinetStudyGroupStudent[]): void {
    if (this.allSelected()) {
      this.selectedIds.set(new Set());
    } else {
      this.selectedIds.set(new Set(students.map((s) => s.id)));
    }
  }

  createSpkForSelected(g: CabinetStudyGroupDetail): void {
    const ids = [...this.selectedIds()];
    if (ids.length === 1) {
      this.router.navigate(['/cabinet/study-groups', g.id, 'spk'], {
        queryParams: { driverId: ids[0] },
      });
    } else {
      this.router.navigate(['/cabinet/study-groups', g.id, 'spk']);
    }
  }

  downloadSpkForSelected(g: CabinetStudyGroupDetail): void {
    this.downloadingSpk.set(true);
    this.downloadBlob(
      this.cabinetApi.downloadSpkArchive(g.id),
      `Пакет-СПК_${g.name.replace(/ /g, '_')}.zip`,
      this.downloadingSpk,
    );
  }

  downloadSpkArchive(groupId: string): void {
    this.downloadingSpk.set(true);
    const g = this.group();
    const name = g ? g.name.replace(/ /g, '_') : String(groupId);
    this.downloadBlob(
      this.cabinetApi.downloadSpkArchive(groupId),
      `Пакет-СПК_${name}.zip`,
      this.downloadingSpk,
    );
  }

  downloadPersonalizationArchive(groupId: string): void {
    this.downloadingPersonalization.set(true);
    const g = this.group();
    const name = g ? g.name.replace(/ /g, '_') : String(groupId);
    this.downloadBlob(
      this.cabinetApi.downloadPersonalizationArchive(groupId),
      `${name}_фото_та_дані.zip`,
      this.downloadingPersonalization,
    );
  }

  private downloadBlob(
    obs: Observable<Blob>,
    fallbackName: string,
    loadingSignal: WritableSignal<boolean>,
  ): void {
    obs.subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fallbackName;
        a.click();
        URL.revokeObjectURL(url);
        loadingSignal.set(false);
      },
      error: () => loadingSignal.set(false),
    });
  }

  changeStatus(groupId: string, status: number): void {
    this.changingStatus.set(true);
    this.cabinetApi.changeStudyGroupStatus(groupId, status).subscribe({
      next: () => {
        this.cabinetApi.getStudyGroup(groupId).subscribe({
          next: (data) => {
            this.group.set(data);
            this.changingStatus.set(false);
          },
          error: () => this.changingStatus.set(false),
        });
      },
      error: () => this.changingStatus.set(false),
    });
  }

  removeStudent(groupId: string, driverId: number): void {
    this.removingStudentId.set(driverId);
    this.cabinetApi.removeStudent(groupId, driverId).subscribe({
      next: () => {
        this.selectedIds.update((prev) => {
          const next = new Set(prev);
          next.delete(driverId);
          return next;
        });
        this.group.update((g) =>
          g
            ? { ...g, students: g.students.filter((s) => s.id !== driverId) }
            : g,
        );
        this.removingStudentId.set(null);
      },
      error: () => this.removingStudentId.set(null),
    });
  }

  openImportModal(): void {
    this.importModalOpen.set(true);
  }

  closeImportModal(): void {
    this.importModalOpen.set(false);
  }

  deleteGroup(groupId: string): void {
    if (!confirm(this.t.translate('confirm.delete_study_group'))) {
      return;
    }
    this.deleting.set(true);
    this.cabinetApi.deleteStudyGroup(groupId).subscribe({
      next: () => {
        this.deleting.set(false);
        this.router.navigate(['/cabinet/study-groups']);
      },
      error: () => this.deleting.set(false),
    });
  }

  onImportFile(event: Event, groupId: string): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.importing.set(true);
    this.cabinetApi.importDriversFromExcel(groupId, file).subscribe({
      next: (result) => {
        this.importResult.set(result);
        const entry: ImportLogEntry = {
          timestamp: new Date().toLocaleString(),
          imported: result.imported,
          skipped: result.skipped,
          errors: result.errors,
        };
        this.importLogs.update((prev) => [entry, ...prev]);
        this.cabinetApi.getStudyGroup(groupId).subscribe({
          next: (data) => {
            this.group.set(data);
            this.importing.set(false);
          },
          error: () => this.importing.set(false),
        });
        input.value = '';
      },
      error: () => {
        this.importing.set(false);
        input.value = '';
      },
    });
  }
}
