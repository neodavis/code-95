import {
  Component,
  inject,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { LayoutComponent } from '../../shared/layout/layout.component';
import {
  Button,
  FieldErrorPipe,
  type NavItem,
  TranslatePipe,
} from '@code95/ui';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-auth',
  imports: [
    LayoutComponent,
    ReactiveFormsModule,
    Button,
    TranslatePipe,
    FieldErrorPipe,
  ],
  templateUrl: './auth.component.html',
  styleUrl: './auth.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly navItems: NavItem[] = [
    { label: 'nav.training_centers', route: '/training-centers' },
    { label: 'nav.news', route: '/news' },
    { label: 'nav.faq', route: '/faq' },
  ];

  readonly footerNavItems: NavItem[] = [
    { label: 'nav.training_centers', route: '/training-centers' },
    { label: 'nav.news', route: '/news' },
    { label: 'nav.faq', route: '/faq' },
    { label: 'nav.sign_in_admin', route: '/auth' },
  ];

  readonly form = new FormGroup({
    uniqueCode: new FormControl('', Validators.required),
    password: new FormControl('', Validators.required),
  });

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  onSubmit(): void {
    if (this.form.invalid || this.loading()) return;

    const { uniqueCode, password } = this.form.getRawValue();
    this.loading.set(true);
    this.error.set(null);

    this.authService
      .login({ uniqueCode: uniqueCode ?? '', password: password ?? '' })
      .subscribe({
        next: (res) => {
          const user = res.user;
          this.router.navigate(
            user.isStaff || user.isSuperuser ? ['/backend'] : ['/cabinet'],
          );
        },
        error: (err) => {
          const body = err?.error;
          if (body?.fields) {
            for (const [field, msgs] of Object.entries(body.fields)) {
              const ctrl = this.form.get(field);
              if (ctrl) ctrl.setErrors({ serverError: (msgs as string[])[0] });
            }
          } else if (err?.status === 403) {
            this.error.set('auth.error_unauthorized');
          } else if (err?.status === 401) {
            this.error.set('auth.error_invalid_credentials');
          } else {
            this.error.set('auth.error_invalid');
          }
          this.loading.set(false);
        },
      });
  }
}
