import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../servicios/auth';
import { catchError, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  let modifiedReq = req;

  // Solo adjuntar si el token es válido y no ha expirado
  if (token && authService.esTokenValido(token)) {
    modifiedReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  return next(modifiedReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        // Token expirado o rechazado por el backend
        authService.logout();

        // Si fue una petición GET pública al catálogo, reintentar limpia sin cabecera de autenticación
        if (req.method === 'GET' && req.url.includes('/api/productos')) {
          const publicReq = req.clone({
            headers: req.headers.delete('Authorization'),
          });
          return next(publicReq);
        }
      }
      return throwError(() => error);
    })
  );
};
