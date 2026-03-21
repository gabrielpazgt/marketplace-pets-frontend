// src/app/shared/shared.module.ts
import { NgModule }             from '@angular/core';
import { CommonModule }         from '@angular/common';
import { FormsModule }          from '@angular/forms';
import { RouterModule }         from '@angular/router';         
import { MatIconModule }        from '@angular/material/icon';
import { MatSelectModule }      from '@angular/material/select';
import { MatFormFieldModule }   from '@angular/material/form-field';
import { HeaderComponent }      from './header/header.component';
import { FooterComponent }      from './footer/footer.component';
import { GlobalLoaderComponent } from './global-loader/global-loader.component';

@NgModule({
  declarations: [
    HeaderComponent,
    FooterComponent,
    GlobalLoaderComponent
  ],
  imports: [
    CommonModule,
    FormsModule,    
    RouterModule,   
    MatIconModule,
    MatFormFieldModule,   // ← para <mat-form-field>
    MatSelectModule   
  ],
  exports: [
    HeaderComponent,
    FooterComponent,
    GlobalLoaderComponent
  ]
})
export class SharedModule { }
