import { inject } from '@angular/core';
import { type CanMatchFn, Router } from '@angular/router';
import type { Role } from '@cf/shared/catalog';
import { AuthService } from './auth.service';

/** Consente l'area solo ai ruoli indicati; altrimenti login o home del proprio ruolo. */
export function roleGuard(...roles: Role[]): CanMatchFn {
  return async (_route, segments) => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const user = await auth.ensureLoaded();
    if (!user) return router.createUrlTree(['/login'], { queryParams: { next: '/' + segments.map((s) => s.path).join('/') } });
    return roles.includes(user.role) ? true : router.parseUrl(auth.homeFor(user));
  };
}

/** Pagine pubbliche di accesso: se già loggato vai alla tua area. */
export const guestGuard: CanMatchFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const user = await auth.ensureLoaded();
  return user ? router.parseUrl(auth.homeFor(user)) : true;
};
