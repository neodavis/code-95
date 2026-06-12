import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslatePipe } from '../i18n/translate.pipe';

export interface NavItem {
  label: string;
  route: string;
  icon?: string;
}

@Component({
  selector: 'lib-navigation',
  imports: [RouterLink, RouterLinkActive, TranslatePipe],
  templateUrl: './navigation.html',
  styleUrl: './navigation.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Navigation {
  @Input() items: NavItem[] = [];
}
