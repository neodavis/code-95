import {
  Component,
  computed,
  inject,
  ChangeDetectionStrategy,
} from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LayoutComponent } from '../../shared/layout/layout.component';
import { type NavItem } from '@code95/ui';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-public',
  imports: [LayoutComponent, RouterOutlet],
  templateUrl: './public.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PublicComponent {
  private readonly auth = inject(AuthService);

  readonly navItems = computed<NavItem[]>(() => {
    const user = this.auth.user();
    const items: NavItem[] = [
      { label: 'nav.training_centers', route: '/training-centers' },
      { label: 'nav.news', route: '/news' },
      { label: 'nav.faq', route: '/faq' },
    ];
    if (user?.isEmployee) {
      items.push({ label: 'nav.cabinet', route: '/cabinet' });
    }
    if (user?.isSuperuser) {
      items.push({ label: 'nav.backoffice', route: '/backend' });
    }
    return items;
  });

  readonly footerNavItems: NavItem[] = [
    { label: 'nav.training_centers', route: '/training-centers' },
    { label: 'nav.news', route: '/news' },
    { label: 'nav.faq', route: '/faq' },
    { label: 'nav.sign_in_admin', route: '/auth' },
  ];
}
