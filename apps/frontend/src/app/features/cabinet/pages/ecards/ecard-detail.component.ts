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
  type ECardDetail,
} from '../../../../core/services/cabinet-api.service';

@Component({
  selector: 'app-ecard-detail',
  imports: [DatePipe, PageHeader, TranslatePipe, RouterLink],
  templateUrl: './ecard-detail.component.html',
  styleUrl: './ecard-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ECardDetailComponent implements OnInit {
  private readonly cabinetApi = inject(CabinetApiService);
  private readonly route = inject(ActivatedRoute);

  readonly card = signal<ECardDetail | null>(null);
  readonly loading = signal(true);

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.cabinetApi.getECard(id).subscribe({
      next: (data) => {
        this.card.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
