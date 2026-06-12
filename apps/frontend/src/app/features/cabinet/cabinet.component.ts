import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LayoutComponent } from '../../shared/layout/layout.component';
import { type NavItem } from '@code95/ui';

@Component({
  selector: 'app-cabinet',
  imports: [LayoutComponent, RouterOutlet],
  templateUrl: './cabinet.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CabinetComponent {
  navItems: NavItem[] = [
    { label: 'nav.training_centers', route: '/training-centers' },
    { label: 'nav.news', route: '/news' },
    { label: 'nav.faq', route: '/faq' },
    { label: 'nav.cabinet', route: '/cabinet' },
  ];

  secondaryNavItems: NavItem[] = [
    { label: 'nav.home', route: '/cabinet/home' },
    { label: 'nav.drivers', route: '/cabinet/drivers' },
    { label: 'nav.graduates', route: '/cabinet/graduates' },
    { label: 'nav.study_groups', route: '/cabinet/study-groups' },
  ];

  footerNavItems: NavItem[] = [
    { label: 'nav.training_centers', route: '/training-centers' },
    { label: 'nav.news', route: '/news' },
    { label: 'nav.faq', route: '/faq' },
    { label: 'nav.sign_in_admin', route: '/auth' },
  ];
}
