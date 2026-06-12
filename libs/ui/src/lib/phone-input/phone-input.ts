import {
  type AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  type ElementRef,
  forwardRef,
  Input,
  type OnDestroy,
  ViewChild,
} from '@angular/core';
import { type ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import intlTelInput from 'intl-tel-input';

@Component({
  selector: 'lib-phone-input',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <input
      #phoneInput
      type="tel"
      class="e-form-group__input"
      [class.e-form-group__input--invalid]="invalid"
      [attr.placeholder]="placeholder"
    />
  `,
  styles: `
    :host {
      display: block;
    }
    :host ::ng-deep .iti {
      display: block;
      width: 100%;
    }
    :host ::ng-deep .iti__tel-input {
      display: block;
      width: 100%;
      padding: 8px 12px;
      font-size: 14px;
      font-family: var(--font-body);
      border: 1px solid #ced4da;
      border-radius: var(--radius-md);
      background-color: var(--color-white);
      transition: border-color 0.15s ease-in-out;
    }
    :host ::ng-deep .iti__tel-input:focus {
      outline: none;
      border-color: var(--color-black);
      box-shadow: 0 0 0 2px rgba(9, 9, 9, 0.15);
    }
    :host ::ng-deep .iti__tel-input.e-form-group__input--invalid,
    :host.invalid ::ng-deep .iti__tel-input {
      border-color: var(--color-danger);
    }
    :host.invalid ::ng-deep .iti__tel-input:focus {
      box-shadow: 0 0 0 2px rgba(220, 53, 69, 0.15);
    }
    :host ::ng-deep .iti__country-container {
      padding-left: 4px;
    }
    :host ::ng-deep .iti__selected-country {
      border-radius: var(--radius-md) 0 0 var(--radius-md);
    }
  `,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => PhoneInput),
      multi: true,
    },
  ],
})
export class PhoneInput
  implements ControlValueAccessor, AfterViewInit, OnDestroy
{
  @Input() placeholder = '';
  @Input() invalid = false;

  @ViewChild('phoneInput', { static: true })
  phoneInputRef!: ElementRef<HTMLInputElement>;

  private iti: ReturnType<typeof intlTelInput> | null = null;
  private onChange: (value: string) => void = () => {
    /* noop */
  };
  private onTouched: () => void = () => {
    /* noop */
  };
  private pendingValue: string | null = null;

  ngAfterViewInit(): void {
    this.iti = intlTelInput(this.phoneInputRef.nativeElement, {
      loadUtils: () => import('intl-tel-input/utils'),
      initialCountry: 'ua',
      preferredCountries: ['ua', 'pl', 'de', 'gb', 'us'],
      separateDialCode: true,
      nationalMode: true,
      strictMode: true,
      containerClass: 'iti',
    } as never);

    if (this.pendingValue) {
      this.iti.setNumber(this.pendingValue);
      this.pendingValue = null;
    }

    this.phoneInputRef.nativeElement.addEventListener(
      'input',
      this.handleInput,
    );
    this.phoneInputRef.nativeElement.addEventListener(
      'countrychange',
      this.handleInput,
    );
    this.phoneInputRef.nativeElement.addEventListener('blur', this.handleBlur);
  }

  ngOnDestroy(): void {
    this.phoneInputRef?.nativeElement.removeEventListener(
      'input',
      this.handleInput,
    );
    this.phoneInputRef?.nativeElement.removeEventListener(
      'countrychange',
      this.handleInput,
    );
    this.phoneInputRef?.nativeElement.removeEventListener(
      'blur',
      this.handleBlur,
    );
    this.iti?.destroy();
  }

  writeValue(value: string): void {
    if (this.iti) {
      this.iti.setNumber(value || '');
    } else {
      this.pendingValue = value || '';
    }
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  private readonly handleInput = (): void => {
    const number = this.iti?.getNumber() ?? '';
    this.onChange(number);
  };

  private readonly handleBlur = (): void => {
    this.onTouched();
  };
}
