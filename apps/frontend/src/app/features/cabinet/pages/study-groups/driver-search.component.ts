import {
  Component,
  computed,
  inject,
  type OnInit,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { Button, PageHeader, TranslatePipe } from '@code95/ui';
import {
  type AvailableDriver,
  CabinetApiService,
} from '../../../../core/services/cabinet-api.service';

@Component({
  selector: 'app-driver-search',
  imports: [FormsModule, Button, PageHeader, RouterLink, TranslatePipe],
  templateUrl: './driver-search.component.html',
  styleUrl: './driver-search.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DriverSearchComponent implements OnInit {
  private readonly cabinetApi = inject(CabinetApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  groupId = '';
  query = '';
  readonly results = signal<AvailableDriver[]>([]);
  readonly searched = signal(false);
  readonly saving = signal(false);
  readonly selectedIds = signal<Set<number>>(new Set());
  readonly allSelected = computed(
    () =>
      this.results().length > 0 &&
      this.selectedIds().size === this.results().length,
  );

  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    this.groupId = this.route.snapshot.paramMap.get('id') ?? '';
    this.loadDrivers();
  }

  onSearch(): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.loadDrivers(), 300);
  }

  private loadDrivers(): void {
    this.cabinetApi.searchAvailableDrivers(this.groupId, this.query).subscribe({
      next: (data) => {
        this.results.set(data);
        this.searched.set(true);
        this.selectedIds.set(new Set());
      },
    });
  }

  toggleSelection(id: number): void {
    const next = new Set(this.selectedIds());
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    this.selectedIds.set(next);
  }

  toggleAll(): void {
    if (this.allSelected()) {
      this.selectedIds.set(new Set());
    } else {
      this.selectedIds.set(new Set(this.results().map((d) => d.id)));
    }
  }

  submitSelected(): void {
    const ids = Array.from(this.selectedIds());
    if (ids.length === 0 || this.saving()) return;
    this.saving.set(true);

    const requests = ids.map((id) =>
      this.cabinetApi.addStudent(this.groupId, id),
    );

    forkJoin(requests).subscribe({
      next: () => this.router.navigate(['/cabinet/study-groups', this.groupId]),
      error: () => this.saving.set(false),
    });
  }
}
