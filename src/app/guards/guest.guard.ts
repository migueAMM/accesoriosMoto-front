import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../servicios/auth';

/**
 * Guard de invitados (Sección 2.4 de la rúbrica):
 * Impide que un usuario que ya tiene sesión activa acceda a la pantalla /login.
 * Si ya inició sesión, es redirigido automáticamente al catálogo.
 */
export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.estaAutenticado()) {
    return router.createUrlTree(['/catalogo']);
  }

  return true;
};
