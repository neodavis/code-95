import {
  Directive,
  ElementRef,
  HostBinding,
  HostListener,
  inject,
  type OnDestroy,
  Renderer2,
} from '@angular/core';

@Directive({
  selector: '[libEllipsis]',
  standalone: true,
})
export class EllipsisDirective implements OnDestroy {
  private readonly el = inject(ElementRef<HTMLElement>);
  private readonly renderer = inject(Renderer2);
  private tooltipEl: HTMLElement | null = null;

  @HostBinding('class.cell-ellipsis') readonly ellipsis = true;

  @HostListener('mouseenter')
  onMouseEnter(): void {
    const el = this.el.nativeElement;
    if (el.scrollWidth <= el.clientWidth) return;

    const text = el.textContent?.trim() ?? '';
    if (!text) return;

    this.destroyTooltip();

    const tooltip = this.renderer.createElement('div') as HTMLElement;
    this.renderer.addClass(tooltip, 'lib-tooltip');
    tooltip.textContent = text;
    this.renderer.appendChild(document.body, tooltip);
    this.tooltipEl = tooltip;

    const rect = el.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();

    let top = rect.top - tooltipRect.height - 6;
    let left = rect.left + rect.width / 2 - tooltipRect.width / 2;

    // Flip below if no space above
    if (top < 4) {
      top = rect.bottom + 6;
      this.renderer.addClass(tooltip, 'lib-tooltip--bottom');
    }

    // Clamp horizontally
    left = Math.max(
      4,
      Math.min(left, window.innerWidth - tooltipRect.width - 4),
    );

    this.renderer.setStyle(tooltip, 'top', `${top}px`);
    this.renderer.setStyle(tooltip, 'left', `${left}px`);
    this.renderer.addClass(tooltip, 'lib-tooltip--visible');
  }

  @HostListener('mouseleave')
  onMouseLeave(): void {
    this.destroyTooltip();
  }

  ngOnDestroy(): void {
    this.destroyTooltip();
  }

  private destroyTooltip(): void {
    if (this.tooltipEl) {
      this.renderer.removeChild(document.body, this.tooltipEl);
      this.tooltipEl = null;
    }
  }
}
