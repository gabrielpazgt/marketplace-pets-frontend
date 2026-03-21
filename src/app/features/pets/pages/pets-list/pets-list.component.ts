import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { Pet } from '../../models/pet.models';
import { PetsStateService } from '../../services/pet-state.service';
import { AuthService } from '../../../../auth/services/auth.service';

@Component({
  standalone: false,
  selector: 'mp-pets-list-component',
  templateUrl: './pets-list.component.html',
  styleUrls: ['./pets-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PetsListComponent implements OnDestroy {
  userId = this.auth.userId ?? 'dev-user';
  pets: Pet[] = [];

  private readonly destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private petsStore: PetsStateService,
    private auth: AuthService,
    private cdr: ChangeDetectorRef
  ) {
    this.petsStore.pets$
      .pipe(takeUntil(this.destroy$))
      .subscribe((pets) => {
        this.pets = pets;
        this.cdr.markForCheck();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  goNew() {
    this.router.navigate(['new'], { relativeTo: this.route });
  }

  onEdit(p: Pet) {
    this.router.navigate([p.id, 'edit'], { relativeTo: this.route });
  }

  onRemove(p: Pet) {
    if (confirm(`Eliminar a ${p.name}?`)) {
      this.petsStore.remove(p.id).pipe(takeUntil(this.destroy$)).subscribe();
    }
  }
}
