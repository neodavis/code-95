import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { Input_ } from './input';

describe('Input_', () => {
  let component: Input_;
  let fixture: ComponentFixture<Input_>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Input_],
    }).compileComponents();

    fixture = TestBed.createComponent(Input_);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('writeValue sets internal value', () => {
    component.writeValue('hello');
    expect(component.value).toBe('hello');
  });

  it('writeValue handles null', () => {
    component.writeValue(null as unknown as string);
    expect(component.value).toBe('');
  });

  it('registerOnChange stores callback', () => {
    const fn = jest.fn();
    component.registerOnChange(fn);
    component.onInput({ target: { value: 'test' } } as unknown as Event);
    expect(fn).toHaveBeenCalledWith('test');
  });

  it('registerOnTouched stores callback', () => {
    const fn = jest.fn();
    component.registerOnTouched(fn);
    component.onTouched();
    expect(fn).toHaveBeenCalled();
  });
});
