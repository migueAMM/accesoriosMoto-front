import { Routes } from '@angular/router';
import { Inicio } from './componentes/inicio/inicio';
import { Catalogo } from './componentes/catalogo/catalogo';
import { Login } from './componentes/login/login';

export const routes: Routes = [
  { path: '', component: Inicio },
  { path: 'inicio', component: Inicio },
  { path: 'catalogo', component: Catalogo },
  { path: 'login', component: Login },
  { path: '**', redirectTo: '' },
];
