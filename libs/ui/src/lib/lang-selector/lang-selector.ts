import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslatePipe } from '../i18n/translate.pipe';
import { TranslationService, type Lang } from '../i18n/translation.service';

@Component({
  selector: 'lib-lang-selector',
  imports: [TranslatePipe],
  templateUrl: './lang-selector.html',
  styleUrl: './lang-selector.scss',
  host: { '(document:click)': 'onOutsideClick($event)' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LangSelector {
  private readonly t = inject(TranslationService);

  open = false;

  readonly options: { value: Lang; label: string }[] = [
    { value: 'uk', label: 'Українська (uk)' },
    { value: 'en', label: 'English (en)' },
  ];

  get lang(): Lang {
    return this.t.lang();
  }

  toggle(): void {
    this.open = !this.open;
  }

  select(lang: Lang): void {
    this.t.setLanguage(lang);
    this.open = false;
  }

  onOutsideClick(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.lang-selector')) {
      this.open = false;
    }
  }
}
