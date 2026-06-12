import { TestBed } from '@angular/core/testing';
import { Router, type UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { type User } from '@code95/shared-types';
import {
  authGuard,
  superuserGuard,
  employeeGuard,
  guestGuard,
} from './auth.guard';

describe('Auth Guards', () => {
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;

  const mockRoute = {} as unknown;
  const mockState = {} as unknown;

  function runGuard(
    guard: (route: unknown, state: unknown) => boolean | UrlTree,
  ): boolean | UrlTree {
    return TestBed.runInInjectionContext(() => guard(mockRoute, mockState));
  }

  beforeEach(() => {
    authService = {
      isAuthenticated: jest.fn(),
      user: jest.fn(),
      getAccessToken: jest.fn(),
      getRefreshToken: jest.fn(),
    } as unknown as jasmine.SpyObj<AuthService>;

    router = {
      createUrlTree: jest.fn().mockImplementation((commands: string[]) => {
        return { toString: () => commands.join('/') } as unknown as UrlTree;
      }),
    } as unknown as jasmine.SpyObj<Router>;

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router },
      ],
    });
  });

  describe('authGuard', () => {
    it('returns true when user is authenticated', () => {
      authService.isAuthenticated.mockReturnValue(true);
      expect(runGuard(authGuard)).toBe(true);
    });

    it('redirects to /auth when not authenticated', () => {
      authService.isAuthenticated.mockReturnValue(false);
      runGuard(authGuard);
      expect(router.createUrlTree).toHaveBeenCalledWith(['/auth']);
    });
  });

  describe('superuserGuard', () => {
    it('returns true when user is superuser', () => {
      authService.user.mockReturnValue({
        isSuperuser: true,
      } as unknown as User);
      expect(runGuard(superuserGuard)).toBe(true);
    });

    it('redirects to /auth when no user', () => {
      authService.user.mockReturnValue(null);
      runGuard(superuserGuard);
      expect(router.createUrlTree).toHaveBeenCalledWith(['/auth']);
    });

    it('redirects employee to /cabinet', () => {
      authService.user.mockReturnValue({
        isSuperuser: false,
        isEmployee: true,
      } as unknown as User);
      runGuard(superuserGuard);
      expect(router.createUrlTree).toHaveBeenCalledWith(['/cabinet']);
    });

    it('redirects non-superuser non-employee to /', () => {
      authService.user.mockReturnValue({
        isSuperuser: false,
        isEmployee: false,
      } as unknown as User);
      runGuard(superuserGuard);
      expect(router.createUrlTree).toHaveBeenCalledWith(['/']);
    });
  });

  describe('employeeGuard', () => {
    it('returns true when user is employee', () => {
      authService.user.mockReturnValue({ isEmployee: true } as unknown as User);
      expect(runGuard(employeeGuard)).toBe(true);
    });

    it('redirects to /auth when no user', () => {
      authService.user.mockReturnValue(null);
      runGuard(employeeGuard);
      expect(router.createUrlTree).toHaveBeenCalledWith(['/auth']);
    });

    it('redirects superuser to /backend', () => {
      authService.user.mockReturnValue({
        isEmployee: false,
        isSuperuser: true,
      } as unknown as User);
      runGuard(employeeGuard);
      expect(router.createUrlTree).toHaveBeenCalledWith(['/backend']);
    });
  });

  describe('guestGuard', () => {
    it('returns true when user is not authenticated', () => {
      authService.isAuthenticated.mockReturnValue(false);
      expect(runGuard(guestGuard)).toBe(true);
    });

    it('redirects superuser to /backend', () => {
      authService.isAuthenticated.mockReturnValue(true);
      authService.user.mockReturnValue({
        isSuperuser: true,
      } as unknown as User);
      runGuard(guestGuard);
      expect(router.createUrlTree).toHaveBeenCalledWith(['/backend']);
    });

    it('redirects employee to /cabinet', () => {
      authService.isAuthenticated.mockReturnValue(true);
      authService.user.mockReturnValue({
        isSuperuser: false,
        isEmployee: true,
      } as unknown as User);
      runGuard(guestGuard);
      expect(router.createUrlTree).toHaveBeenCalledWith(['/cabinet']);
    });

    it('redirects other authenticated users to /', () => {
      authService.isAuthenticated.mockReturnValue(true);
      authService.user.mockReturnValue({
        isSuperuser: false,
        isEmployee: false,
      } as unknown as User);
      runGuard(guestGuard);
      expect(router.createUrlTree).toHaveBeenCalledWith(['/']);
    });
  });
});
