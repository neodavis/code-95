import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { Pagination } from './pagination';

describe('Pagination', () => {
  let component: Pagination;
  let fixture: ComponentFixture<Pagination>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Pagination],
    }).compileComponents();

    fixture = TestBed.createComponent(Pagination);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  describe('pages getter', () => {
    it('generates array [1] for totalPages=1', () => {
      component.totalPages = 1;
      expect(component.pages).toEqual([1]);
    });

    it('generates array [1,2,3,4,5] for totalPages=5', () => {
      component.totalPages = 5;
      expect(component.pages).toEqual([1, 2, 3, 4, 5]);
    });
  });

  describe('goTo', () => {
    beforeEach(() => {
      component.currentPage = 2;
      component.totalPages = 5;
    });

    it('emits pageChange for valid page', () => {
      const spy = jest.fn();
      component.pageChange.subscribe(spy);

      component.goTo(3);
      expect(spy).toHaveBeenCalledWith(3);
    });

    it('does not emit for page < 1', () => {
      const spy = jest.fn();
      component.pageChange.subscribe(spy);

      component.goTo(0);
      expect(spy).not.toHaveBeenCalled();
    });

    it('does not emit for page > totalPages', () => {
      const spy = jest.fn();
      component.pageChange.subscribe(spy);

      component.goTo(6);
      expect(spy).not.toHaveBeenCalled();
    });

    it('does not emit for current page (no-op)', () => {
      const spy = jest.fn();
      component.pageChange.subscribe(spy);

      component.goTo(2);
      expect(spy).not.toHaveBeenCalled();
    });

    it('emits for boundary page 1', () => {
      const spy = jest.fn();
      component.pageChange.subscribe(spy);

      component.goTo(1);
      expect(spy).toHaveBeenCalledWith(1);
    });

    it('emits for boundary page totalPages', () => {
      const spy = jest.fn();
      component.pageChange.subscribe(spy);

      component.goTo(5);
      expect(spy).toHaveBeenCalledWith(5);
    });
  });
});
