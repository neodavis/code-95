import {
  Component,
  inject,
  type OnInit,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { PageHeader, TranslatePipe } from '@code95/ui';
import {
  CabinetApiService,
  type RegistryEntryDetail,
} from '../../../../core/services/cabinet-api.service';

@Component({
  selector: 'app-registry-detail',
  imports: [DatePipe, PageHeader, TranslatePipe],
  templateUrl: './registry-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegistryDetailComponent implements OnInit {
  private readonly cabinetApi = inject(CabinetApiService);
  private readonly route = inject(ActivatedRoute);

  readonly entry = signal<RegistryEntryDetail | null>(null);
  readonly loading = signal(true);
  readonly notFound = signal(false);

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.cabinetApi.getRegistryEntry(id).subscribe({
      next: (data) => {
        this.entry.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.notFound.set(true);
      },
    });
  }

  getCategories(categoriesList: string | null): string[] {
    if (!categoriesList) return [];
    return categoriesList
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);
  }
}
