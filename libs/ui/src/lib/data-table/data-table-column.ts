import { Directive, inject, Input, TemplateRef } from '@angular/core';

@Directive({
  selector: 'ng-template[libColumn]',
})
export class DataTableColumn {
  @Input({ required: true, alias: 'libColumn' }) id!: string;
  @Input() header = '';
  @Input() sortable = false;
  @Input() tdClass = '';
  @Input() width = '';
  @Input() ellipsis = true;

  public readonly templateRef = inject(TemplateRef);
}
