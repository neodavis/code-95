import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { type AuthResponse } from '@code95/shared-types';

describe('AuthService', () => {
  let service: AuthService;
  let httpTesting: HttpTestingController;
  let router: { navigate: jest.Mock };

  const mockAuthResponse: AuthResponse = {
    accessToken: 'access-123',
    refreshToken: 'refresh-456',
    user: {
      id: 1,
      uniqueCode: 'UC001',
      email: 'test@test.com',
      firstName: 'John',
      lastName: 'Doe',
      middleName: '',
      isStaff: true,
      isSuperuser: false,
      isActive: true,
      type: 'ADMIN',
      isEmployee: false,
    },
  };

  beforeEach(() => {
    localStorage.clear();

    router = { navigate: jest.fn() };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: router },
      ],
    });

    service = TestBed.inject(AuthService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
    localStorage.clear();
  });

  describe('login', () => {
    it('saves session on successful login', () => {
      service
        .login({ uniqueCode: 'UC001', password: 'pass' })
        .subscribe((res) => {
          expect(res.accessToken).toBe('access-123');
          expect(service.isAuthenticated()).toBe(true);
          expect(service.user()?.uniqueCode).toBe('UC001');
        });

      const req = httpTesting.expectOne(
        'http://localhost:3000/api/v1/auth/login',
      );
      expect(req.request.method).toBe('POST');
      req.flush(mockAuthResponse);
    });

    it('stores tokens in localStorage', () => {
      service.login({ uniqueCode: 'UC001', password: 'pass' }).subscribe(() => {
        expect(localStorage.getItem('access_token')).toBe('access-123');
        expect(localStorage.getItem('refresh_token')).toBe('refresh-456');
      });

      httpTesting
        .expectOne('http://localhost:3000/api/v1/auth/login')
        .flush(mockAuthResponse);
    });
  });

  describe('logout', () => {
    it('clears storage and user signal', () => {
      localStorage.setItem('access_token', 'token');
      localStorage.setItem('refresh_token', 'token');
      localStorage.setItem('auth_user', '{}');

      service.logout();

      expect(localStorage.getItem('access_token')).toBeNull();
      expect(localStorage.getItem('refresh_token')).toBeNull();
      expect(localStorage.getItem('auth_user')).toBeNull();
      expect(service.isAuthenticated()).toBe(false);
      expect(router.navigate).toHaveBeenCalledWith(['/auth']);
    });
  });

  describe('refresh', () => {
    it('updates tokens in localStorage', () => {
      localStorage.setItem('refresh_token', 'old-refresh');

      service.refresh().subscribe(() => {
        expect(localStorage.getItem('access_token')).toBe('new-access');
        expect(localStorage.getItem('refresh_token')).toBe('new-refresh');
      });

      const req = httpTesting.expectOne(
        'http://localhost:3000/api/v1/auth/refresh',
      );
      expect(req.request.headers.get('Authorization')).toBe(
        'Bearer old-refresh',
      );
      req.flush({ accessToken: 'new-access', refreshToken: 'new-refresh' });
    });
  });

  describe('getAccessToken / getRefreshToken', () => {
    it('reads from localStorage', () => {
      localStorage.setItem('access_token', 'my-access');
      localStorage.setItem('refresh_token', 'my-refresh');

      expect(service.getAccessToken()).toBe('my-access');
      expect(service.getRefreshToken()).toBe('my-refresh');
    });

    it('returns null when not set', () => {
      expect(service.getAccessToken()).toBeNull();
      expect(service.getRefreshToken()).toBeNull();
    });
  });

  describe('isAuthenticated', () => {
    it('returns false when no user in storage', () => {
      expect(service.isAuthenticated()).toBe(false);
    });
  });
});
