import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { PetsRoutingModule } from './pets-routing.module';
import { PetsComponent } from './pets.component';
import { PetCardComponent } from './components/pet-card/pet-card.component';
import { PetPreviewComponent } from './components/pet-preview/pet-preview.component';
import { PetsListComponent } from './pages/pets-list/pets-list.component';
import { PetFormComponent } from './pages/pet-form/pet-form.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';


@NgModule({
  declarations: [
    PetsComponent,
    PetCardComponent,
    PetPreviewComponent,
    PetsListComponent,
    PetFormComponent
  ],
  imports: [
    CommonModule,
    PetsRoutingModule,
    ReactiveFormsModule,
    FormsModule,
  ]
})
export class PetsModule { }
