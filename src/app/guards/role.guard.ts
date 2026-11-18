import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../servicios/auth';
import { AvisosService } from '../servicios/avisos';

/**
 * Guard por rol (Sección 3 de la rúbrica - Extra 3 puntos):
 * Restringe rutas exclusivas para roles específicos (por ejemplo ADMINISTRADOR).
 * Si el usuario no tiene el rol correspondiente, se le deniega el acceso y se avisa.
 */
export const roleGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const avisosService = inject(AvisosService);

  const rolesPermitidos = (route.data?.['roles'] as string[]) || [];

  if (!authService.estaAutenticado()) {
    avisosService.advertencia('Inicia sesión para acceder a esta sección.');
    return router.createUrlTree(['/login']);
  }

  const sesion = authService.sesion();
  const rolUsuario = sesion?.rol || '';

  if (rolesPermitidos.length > 0 && !rolesPermitidos.includes(rolUsuario)) {
    avisosService.error('Acceso denegado: esta sección es exclusiva para Administradores.');
    return router.createUrlTree(['/catalogo']);
  }

  return true;
};
