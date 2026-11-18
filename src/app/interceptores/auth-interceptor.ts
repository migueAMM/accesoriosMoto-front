import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../servicios/auth';
import { AvisosService } from '../servicios/avisos';
import { catchError, throwError } from 'rxjs';

/**
 * Interceptor HTTP (Sección 2.3 de la rúbrica):
 * 1. Agrega automáticamente 'Authorization: Bearer <token>' a todas las peticiones
 *    cuando existe un token válido en localStorage.
 * 2. Manejo de error 401 (token vencido o rechazado): cierra la sesión,
 *    avisa al usuario con notificación visible y redirige a la pantalla de login.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const avisosService = inject(AvisosService);
  const token = authService.getToken();

  let modifiedReq = req;

  // Adjuntar encabezado Bearer automáticamente una sola vez
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
        // Cierra la sesión
        authService.logout();

        // Si no estamos ya en login, avisa y manda al login (requisito 2.3)
        if (!router.url.includes('/login')) {
          avisosService.advertencia('Tu sesión ha expirado o el token es inválido. Por favor inicia sesión.');
          router.navigate(['/login']);
        }

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
