import { inject, Pipe, type PipeTransform } from '@angular/core';
import { type ValidationErrors } from '@angular/forms';
import { TranslationService } from '../i18n/translation.service';

@Pipe({ name: 'fieldError', pure: false, standalone: true })
export class FieldErrorPipe implements PipeTransform {
  private readonly t = inject(TranslationService);

  transform(errors: ValidationErrors | null): string {
    if (!errors) return '';
    if (errors['serverError']) return errors['serverError'];
    if (errors['required']) return this.t.translate('validation.required');
    if (errors['email']) return this.t.translate('validation.email');
    if (errors['minlength']) {
      return this.t
        .translate('validation.min_length')
        .replace('{{n}}', errors['minlength'].requiredLength);
    }
    if (errors['maxlength']) {
      return this.t
        .translate('validation.max_length')
        .replace('{{n}}', errors['maxlength'].requiredLength);
    }
    if (errors['pattern']) return this.t.translate('validation.pattern');
    if (errors['dateRange']) {
      return this.t
        .translate('validation.date_range')
        .replace('{{min}}', errors['dateRange'].min)
        .replace('{{max}}', errors['dateRange'].max);
    }
    if (errors['min']) {
      return this.t
        .translate('validation.min_value')
        .replace('{{n}}', errors['min'].min);
    }
    return this.t.translate('validation.invalid');
  }
}
