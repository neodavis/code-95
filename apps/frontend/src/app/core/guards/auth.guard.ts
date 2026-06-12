import { inject } from '@angular/core';
import { type CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) return true;

  return router.createUrlTree(['/auth']);
};

export const superuserGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const user = auth.user();

  if (user?.isSuperuser) return true;

  if (!user) return router.createUrlTree(['/auth']);
  return router.createUrlTree(user.isEmployee ? ['/cabinet'] : ['/']);
};

export const employeeGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const user = auth.user();

  if (user?.isEmployee) return true;

  if (!user) return router.createUrlTree(['/auth']);
  return router.createUrlTree(user.isSuperuser ? ['/backend'] : ['/']);
};

export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) return true;

  const user = auth.user();
  if (user?.isSuperuser) return router.createUrlTree(['/backend']);
  if (user?.isEmployee) return router.createUrlTree(['/cabinet']);
  return router.createUrlTree(['/']);
};
