import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'lib-accordion',
  imports: [],
  templateUrl: './accordion.html',
  styleUrl: './accordion.scss',
  host: { class: 'accordion' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Accordion {}
