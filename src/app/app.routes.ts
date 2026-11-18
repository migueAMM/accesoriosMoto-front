import { Routes } from '@angular/router';
import { Inicio } from './componentes/inicio/inicio';
import { Catalogo } from './componentes/catalogo/catalogo';
import { Login } from './componentes/login/login';
import { MisPedidos } from './componentes/mis-pedidos/mis-pedidos';
import { authGuard } from './guards/auth.guard';
import { guestGuard } from './guards/guest.guard';
import { roleGuard } from './guards/role.guard';

export const routes: Routes = [
  { path: '', component: Inicio },
  { path: 'inicio', component: Inicio },
  { path: 'catalogo', component: Catalogo },
  // Guard de invitados: saca de /login a quien ya tiene sesión activa
  { path: 'login', component: Login, canActivate: [guestGuard] },
  // Guard de autenticación: protege rutas privadas del negocio
  { path: 'mis-pedidos', component: MisPedidos, canActivate: [authGuard] },
  // Guard por rol (Extra): protege rutas exclusivas de administrador
  {
    path: 'admin',
    component: Catalogo,
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ADMINISTRADOR'] },
  },
  { path: '**', redirectTo: '' },
];
