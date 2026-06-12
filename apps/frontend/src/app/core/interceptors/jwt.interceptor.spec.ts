import { TestBed } from '@angular/core/testing';
import {
  HttpClient,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { AuthService } from '../services/auth.service';
import { jwtInterceptor } from './jwt.interceptor';

describe('jwtInterceptor', () => {
  let http: HttpClient;
  let httpTesting: HttpTestingController;
  let authService: {
    getAccessToken: jest.Mock;
    getRefreshToken: jest.Mock;
    refresh: jest.Mock;
    logout: jest.Mock;
  };

  beforeEach(() => {
    authService = {
      getAccessToken: jest.fn().mockReturnValue('test-token'),
      getRefreshToken: jest.fn().mockReturnValue('refresh-token'),
      refresh: jest.fn(),
      logout: jest.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([jwtInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authService },
      ],
    });

    http = TestBed.inject(HttpClient);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('adds Authorization header for API requests', () => {
    http.get('http://localhost:3000/api/v1/users').subscribe();

    const req = httpTesting.expectOne('http://localhost:3000/api/v1/users');
    expect(req.request.headers.get('Authorization')).toBe('Bearer test-token');
    req.flush([]);
  });

  it('does not add header when no token', () => {
    authService.getAccessToken.mockReturnValue(null);

    http.get('http://localhost:3000/api/v1/users').subscribe();

    const req = httpTesting.expectOne('http://localhost:3000/api/v1/users');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush([]);
  });

  it('does not intercept non-API requests', () => {
    http.get('https://external-api.com/data').subscribe();

    const req = httpTesting.expectOne('https://external-api.com/data');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush([]);
  });
});
