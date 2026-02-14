import { NgModule }             from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { LoginComponent }        from './login/login.component';
import { RegisterComponent }     from './register/register.component';

const routes: Routes = [
  // al navegar a /auth sin subruta, redirigimos a login
  { path: '', redirectTo: 'login', pathMatch: 'full' },

  // /auth/login
  { path: 'login', component: LoginComponent },

  // /auth/register
  { path: 'register', component: RegisterComponent },

  // opcional: /auth/logout si quieres una ruta dedicada
  // { path: 'logout', component: LogoutComponent },
];

@NgModule({
  imports: [ RouterModule.forChild(routes) ],
  exports: [ RouterModule ]
})
export class AuthRoutingModule { }
