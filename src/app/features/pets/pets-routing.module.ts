// src/app/features/pets/pets-routing.module.ts
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PetsListComponent } from './pages/pets-list/pets-list.component';
import { PetFormComponent } from './pages/pet-form/pet-form.component';

const routes: Routes = [
  { path: '', component: PetsListComponent, title: 'Mis Mascotas' },
  { path: 'new', component: PetFormComponent, title: 'Nueva Mascota' },
  { path: ':id/edit', component: PetFormComponent, title: 'Editar Mascota' },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PetsRoutingModule {}
