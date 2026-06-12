import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { NgClass } from '@angular/common';

@Component({
  selector: 'lib-bordered-card',
  imports: [NgClass],
  templateUrl: './bordered-card.html',
  styleUrl: './bordered-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BorderedCard {
  @Input() label?: string;
  @Input() direction: 'horizontal' | 'vertical' = 'vertical';
}
