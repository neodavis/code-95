import { inject, Injectable, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

export type Lang = 'uk' | 'en';

const STORAGE_KEY = 'app_lang';

@Injectable({ providedIn: 'root' })
export class TranslationService {
  private readonly ngxTranslate = inject(TranslateService);

  private readonly _lang = signal<Lang>(this.loadInitialLang());
  readonly lang = this._lang.asReadonly();

  constructor() {
    this.ngxTranslate.use(this._lang());
  }

  setLanguage(lang: Lang): void {
    this._lang.set(lang);
    localStorage.setItem(STORAGE_KEY, lang);
    this.ngxTranslate.use(lang);
  }

  translate(key: string): string {
    return this.ngxTranslate.instant(key);
  }

  private loadInitialLang(): Lang {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'en' ? 'en' : 'uk';
  }
}
