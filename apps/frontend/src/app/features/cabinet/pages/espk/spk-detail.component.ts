import {
  Component,
  inject,
  type OnInit,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PageHeader, TranslatePipe } from '@code95/ui';
import {
  CabinetApiService,
  type SpkDetail,
} from '../../../../core/services/cabinet-api.service';

@Component({
  selector: 'app-spk-detail',
  imports: [DatePipe, PageHeader, TranslatePipe, RouterLink],
  templateUrl: './spk-detail.component.html',
  styleUrl: './spk-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpkDetailComponent implements OnInit {
  private readonly cabinetApi = inject(CabinetApiService);
  private readonly route = inject(ActivatedRoute);

  readonly spk = signal<SpkDetail | null>(null);
  readonly loading = signal(true);
  readonly downloading = signal(false);

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.cabinetApi.getSpk(id).subscribe({
      next: (data) => {
        this.spk.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  downloadPdf(): void {
    const id = this.spk()?.id;
    if (!id) return;
    this.downloading.set(true);
    this.cabinetApi.downloadSpkPdf(id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        this.downloading.set(false);
      },
      error: () => this.downloading.set(false),
    });
  }
}
