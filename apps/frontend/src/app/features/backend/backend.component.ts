import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LayoutComponent } from '../../shared/layout/layout.component';
import { type NavItem } from '@code95/ui';

@Component({
  selector: 'app-backend',
  imports: [LayoutComponent, RouterOutlet],
  templateUrl: './backend.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BackendComponent {
  readonly navItems: NavItem[] = [
    { label: 'nav.training_centers', route: '/training-centers' },
    { label: 'nav.news', route: '/news' },
    { label: 'nav.faq', route: '/faq' },
    { label: 'nav.backoffice', route: '/backend' },
  ];

  readonly secondaryNavItems: NavItem[] = [
    { label: 'nav.articles', route: '/backend/articles' },
    { label: 'nav.article_categories', route: '/backend/article-categories' },
    { label: 'nav.article_tags', route: '/backend/article-tags' },
    { label: 'nav.faq', route: '/backend/faq' },
    { label: 'nav.training_centers', route: '/backend/training-centers' },
    { label: 'nav.employees', route: '/backend/employees' },
    { label: 'nav.carry_types', route: '/backend/carry-types' },
    { label: 'nav.users', route: '/backend/users' },
    { label: 'nav.audit_logs', route: '/backend/audit-logs' },
  ];

  readonly footerNavItems: NavItem[] = [
    { label: 'nav.training_centers', route: '/training-centers' },
    { label: 'nav.news', route: '/news' },
    { label: 'nav.faq', route: '/faq' },
  ];
}
