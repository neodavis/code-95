import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { Checkbox } from './checkbox';

describe('Checkbox', () => {
  let component: Checkbox;
  let fixture: ComponentFixture<Checkbox>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Checkbox],
    }).compileComponents();

    fixture = TestBed.createComponent(Checkbox);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  describe('writeValue', () => {
    it('sets checked to true', () => {
      component.writeValue(true);
      expect(component.checked).toBe(true);
    });

    it('sets checked to false', () => {
      component.writeValue(false);
      expect(component.checked).toBe(false);
    });

    it('coerces falsy values to false', () => {
      component.writeValue(null as unknown as boolean);
      expect(component.checked).toBe(false);

      component.writeValue(undefined as unknown as boolean);
      expect(component.checked).toBe(false);
    });
  });

  describe('toggle', () => {
    it('flips checked from false to true', () => {
      component.checked = false;
      component.toggle();
      expect(component.checked).toBe(true);
    });

    it('flips checked from true to false', () => {
      component.checked = true;
      component.toggle();
      expect(component.checked).toBe(false);
    });

    it('calls onChange with new value', () => {
      const fn = jest.fn();
      component.registerOnChange(fn);

      component.toggle();
      expect(fn).toHaveBeenCalledWith(true);

      component.toggle();
      expect(fn).toHaveBeenCalledWith(false);
    });

    it('calls onTouched', () => {
      const fn = jest.fn();
      component.registerOnTouched(fn);

      component.toggle();
      expect(fn).toHaveBeenCalled();
    });
  });
});
