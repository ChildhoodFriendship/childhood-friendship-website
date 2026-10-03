import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';

const SKIP = ['/auth/login', '/auth/refresh', '/auth/me', '/auth/invite', '/auth/csrf', '/public/'];

/** Su 401 prova un refresh silenzioso e ripete la richiesta una volta. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const request = req.clone({ withCredentials: true });
  return next(request).pipe(
    catchError((err: unknown) => {
      if (!(err instanceof HttpErrorResponse) || err.status !== 401 || SKIP.some((s) => req.url.includes(s))) {
        return throwError(() => err);
      }
      return from(auth.refresh()).pipe(
        switchMap((ok) => {
          if (!ok) {
            auth.sessionExpired();
            return throwError(() => err);
          }
          return next(request);
        })
      );
    })
  );
};
