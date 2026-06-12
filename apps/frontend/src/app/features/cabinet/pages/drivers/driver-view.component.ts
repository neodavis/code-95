import {
  ChangeDetectionStrategy,
  Component,
  inject,
  type OnInit,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PageHeader, TranslatePipe } from '@code95/ui';
import {
  CabinetApiService,
  type CabinetDriverDetail,
  type CountryItem,
  type DriverHistoryResult,
} from '../../../../core/services/cabinet-api.service';

@Component({
  selector: 'app-driver-view',
  imports: [DatePipe, PageHeader, RouterLink, TranslatePipe],
  templateUrl: './driver-view.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DriverViewComponent implements OnInit {
  private readonly cabinetApi = inject(CabinetApiService);
  private readonly route = inject(ActivatedRoute);

  driverId = 0;
  readonly driver = signal<CabinetDriverDetail | null>(null);
  readonly history = signal<DriverHistoryResult | null>(null);
  readonly countries = signal<CountryItem[]>([]);
  readonly loading = signal(true);

  ngOnInit(): void {
    this.driverId = Number(this.route.snapshot.paramMap.get('id'));
    this.cabinetApi.getCountries().subscribe({
      next: (list) => this.countries.set(list),
    });
    this.cabinetApi.getDriver(this.driverId).subscribe({
      next: (data) => {
        this.driver.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
    this.cabinetApi.getDriverHistory(this.driverId).subscribe({
      next: (h) => this.history.set(h),
    });
  }

  countryName(id: number | null): string {
    if (id === null) return '—';
    return this.countries().find((c) => c.id === id)?.nameUkr ?? '—';
  }

  fullAddress(d: CabinetDriverDetail): string {
    const parts = [
      d.addrTown,
      d.addrStreet,
      d.addrHouse,
      d.addrFlat,
      d.postCode,
    ].filter((p): p is string => !!p && p.trim().length > 0);
    return parts.length ? parts.join(', ') : '—';
  }
}
