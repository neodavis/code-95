import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { Dropdown } from './dropdown';

describe('Dropdown', () => {
  let component: Dropdown;
  let fixture: ComponentFixture<Dropdown>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Dropdown],
    }).compileComponents();

    fixture = TestBed.createComponent(Dropdown);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  describe('writeValue', () => {
    it('sets value', () => {
      component.writeValue('option-1');
      expect(component.value).toBe('option-1');
    });

    it('sets numeric value', () => {
      component.writeValue(42);
      expect(component.value).toBe(42);
    });

    it('handles null by defaulting to empty string', () => {
      component.writeValue(null as unknown as string);
      expect(component.value).toBe('');
    });
  });

  describe('onSelect', () => {
    it('updates value and calls onChange', () => {
      const fn = jest.fn();
      component.registerOnChange(fn);

      component.onSelect({
        target: { value: 'selected' },
      } as unknown as Event);

      expect(component.value).toBe('selected');
      expect(fn).toHaveBeenCalledWith('selected');
    });
  });

  describe('registerOnTouched', () => {
    it('stores the callback', () => {
      const fn = jest.fn();
      component.registerOnTouched(fn);
      component.onTouched();
      expect(fn).toHaveBeenCalled();
    });
  });
});
