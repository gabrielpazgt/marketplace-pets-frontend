import { NgModule }            from '@angular/core';
import { CommonModule }        from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

import { AuthRoutingModule }   from './auth-routing.module';
import { LoginComponent }      from './login/login.component';
import { RegisterComponent }   from './register/register.component';
import { MatIconModule } from '@angular/material/icon';

@NgModule({
  declarations: [
    LoginComponent,
    RegisterComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    AuthRoutingModule,
    MatIconModule,
  ]
})
export class AuthModule { }
