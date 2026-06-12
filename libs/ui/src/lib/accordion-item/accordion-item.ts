import {
  ChangeDetectionStrategy,
  Component,
  HostBinding,
  Input,
} from '@angular/core';

@Component({
  selector: 'lib-accordion-item',
  imports: [],
  templateUrl: './accordion-item.html',
  styleUrl: './accordion-item.scss',
  host: { class: 'accordion-item' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccordionItem {
  @Input() title = '';

  @HostBinding('attr.aria-expanded')
  expanded = false;

  toggle(): void {
    this.expanded = !this.expanded;
  }
}
