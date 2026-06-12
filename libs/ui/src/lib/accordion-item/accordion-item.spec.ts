import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { AccordionItem } from './accordion-item';

describe('AccordionItem', () => {
  let component: AccordionItem;
  let fixture: ComponentFixture<AccordionItem>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AccordionItem],
    }).compileComponents();

    fixture = TestBed.createComponent(AccordionItem);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('starts collapsed', () => {
    expect(component.expanded).toBe(false);
  });

  it('toggle() expands when collapsed', () => {
    component.toggle();
    expect(component.expanded).toBe(true);
  });

  it('toggle() collapses when expanded', () => {
    component.expanded = true;
    component.toggle();
    expect(component.expanded).toBe(false);
  });

  it('double toggle returns to original state', () => {
    component.toggle();
    component.toggle();
    expect(component.expanded).toBe(false);
  });

  it('sets aria-expanded host attribute via HostBinding', () => {
    // HostBinding('attr.aria-expanded') reflects the expanded property
    expect(component.expanded).toBe(false);
    component.toggle();
    expect(component.expanded).toBe(true);
    // The HostBinding will sync this to the DOM on next CD cycle
  });
});
