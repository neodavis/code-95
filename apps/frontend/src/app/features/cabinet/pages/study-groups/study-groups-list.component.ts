import {
  Component,
  DestroyRef,
  inject,
  type OnInit,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { type Observable } from 'rxjs';
import {
  AbstractListComponent,
  DataTable,
  DataTableColumn,
  type DataTablePage,
  PageHeader,
  TranslatePipe,
  TranslationService,
} from '@code95/ui';
import { type SortOrder, StudyGroupStatus } from '@code95/shared-types';
import {
  CabinetApiService,
  type CabinetStudyGroup,
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
  selector: 'app-study-groups-list',
  imports: [
    PageHeader,
    DataTable,
    DataTableColumn,
    RouterLink,
    TranslatePipe,
    DatePipe,
  ],
  templateUrl: './study-groups-list.component.html',
  styleUrl: './study-groups-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudyGroupsListComponent
  extends AbstractListComponent<CabinetStudyGroup>
  implements OnInit
{
  private readonly cabinetApi = inject(CabinetApiService);
  private readonly t = inject(TranslationService);
  protected readonly destroyRef = inject(DestroyRef);

  readonly statusLabels = STATUS_LABELS;
  readonly statusClasses = STATUS_CLASSES;
  readonly ENROLLMENT_START = StudyGroupStatus.ENROLLMENT_START;
  readonly ENROLLMENT_FINISH = StudyGroupStatus.ENROLLMENT_FINISH;
  readonly deletingId = signal<string | null>(null);

  ngOnInit(): void {
    this.initList();
  }

  protected fetchData(
    page: number,
    pageSize: number,
    sort?: string,
    order?: SortOrder,
    search?: string,
  ): Observable<DataTablePage<CabinetStudyGroup>> {
    return this.cabinetApi.getStudyGroups(page, pageSize, sort, order, search);
  }

  deleteStudyGroup(id: string): void {
    if (!confirm(this.t.translate('confirm.delete_study_group'))) {
      return;
    }
    this.deletingId.set(id);
    this.cabinetApi.deleteStudyGroup(id).subscribe({
      next: () => {
        this.deletingId.set(null);
        this.reload();
      },
      error: () => this.deletingId.set(null),
    });
  }
}
