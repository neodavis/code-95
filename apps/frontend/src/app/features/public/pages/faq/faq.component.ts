import {
  Component,
  inject,
  type OnInit,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import {
  Accordion,
  AccordionItem,
  PageHeader,
  TranslatePipe,
} from '@code95/ui';
import { type FAQ } from '@code95/shared-types';
import { FaqApiService } from '../../../../core/services/faq-api.service';

@Component({
  selector: 'app-faq',
  imports: [PageHeader, Accordion, AccordionItem, TranslatePipe],
  templateUrl: './faq.component.html',
  styleUrl: './faq.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FaqComponent implements OnInit {
  private readonly faqApi = inject(FaqApiService);

  readonly items = signal<FAQ[]>([]);
  readonly loading = signal(true);

  ngOnInit(): void {
    this.faqApi.getAllPublished(1, 100).subscribe({
      next: (res) => {
        this.items.set(res.results);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
