import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { Pet } from '../../models/pet.models';
import { PetsStateService } from '../../services/pet-state.service';
import { AuthService } from '../../../../auth/services/auth.service';

@Component({
  selector: 'mp-pets-list-component',
  templateUrl: './pets-list.component.html',
  styleUrls: ['./pets-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PetsListComponent {
  userId = this.auth.userId ?? 'dev-user';
  pets = this.petsStore.listByUser(this.userId);


  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private petsStore: PetsStateService,
    private auth: AuthService
  ) {}

  goNew() {
    this.router.navigate(['new'], { relativeTo: this.route });
  }

  onEdit(p: Pet) {
    this.router.navigate([p.id, 'edit'], { relativeTo: this.route });
  }

  onRemove(p: Pet) {
    if (confirm(`¿Eliminar a ${p.name}?`)) {
      this.petsStore.remove(p.id);
      this.pets = this.petsStore.listByUser(this.userId);
    }
  }
}
