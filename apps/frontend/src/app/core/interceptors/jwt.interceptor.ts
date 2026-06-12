import {
  type HttpInterceptorFn,
  HttpErrorResponse,
  type HttpHandlerFn,
  type HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';

const isApiRequest = (url: string) => url.startsWith(environment.apiUrl);

const addBearer = (req: HttpRequest<unknown>, token: string) =>
  req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });

export const jwtInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
) => {
  if (!isApiRequest(req.url)) return next(req);

  const auth = inject(AuthService);
  const token = auth.getAccessToken();
  const withToken = token ? addBearer(req, token) : req;

  return next(withToken).pipe(
    catchError((err: unknown) => {
      if (
        err instanceof HttpErrorResponse &&
        err.status === 401 &&
        auth.getRefreshToken() &&
        !req.url.includes('/auth/refresh') &&
        !req.url.includes('/auth/login')
      ) {
        return auth.refresh().pipe(
          switchMap((tokens) => next(addBearer(req, tokens.accessToken))),
          catchError(() => {
            auth.logout();
            return throwError(() => err);
          }),
        );
      }
      return throwError(() => err);
    }),
  );
};
