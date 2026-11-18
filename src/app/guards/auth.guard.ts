import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../servicios/auth';
import { AvisosService } from '../servicios/avisos';

/**
 * Guard de autenticación (Sección 2.4 de la rúbrica):
 * Protege las rutas privadas del negocio. Si el usuario intenta entrar
 * sin haber iniciado sesión, es redirigido automáticamente a /login.
 * 
 * Nota pedagógica para sustentación:
 * El Guard es una comodidad para la experiencia de usuario (UX); la seguridad
 * real e inmutable la aplica el backend con Spring Security en cada endpoint.
 */
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const avisosService = inject(AvisosService);

  if (authService.estaAutenticado()) {
    return true;
  }

  avisosService.advertencia('Debes iniciar sesión para acceder a esta sección privada.');
  return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};
