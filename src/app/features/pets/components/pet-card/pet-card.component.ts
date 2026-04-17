import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { Pet, SEX_LABEL, SPECIES_LABEL } from '../../models/pet.models';

@Component({
  standalone: false,
  selector: 'mp-pet-card',
  templateUrl: './pet-card.component.html',
  styleUrls: ['./pet-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PetCardComponent {
  @Input() pet!: Pet;
  @Output() edit = new EventEmitter<Pet>();
  @Output() remove = new EventEmitter<Pet>();

  speciesLabel = SPECIES_LABEL;
  sexLabel = SEX_LABEL;

  get coverImage(): string {
    if (this.pet?.avatarUrl) {
      return this.pet.avatarUrl;
    }

    const map: Record<string, string> = {
      dog: 'assets/images/pets/dog.png',
      cat: 'assets/images/pets/cat.png',
      bird: 'assets/images/pets/bird.png',
      fish: 'assets/images/pets/other_pet.png',
      reptile: 'assets/images/pets/tortuga.png',
      'small-pet': 'assets/images/pets/hamster.png',
      other: 'assets/images/pets/other_pet.png',
    };

    return map[this.pet?.species || 'other'] || map['other'];
  }

  get hasCustomPhoto(): boolean {
    return Boolean(this.pet?.avatarUrl);
  }

  get ageLabel(): string | null {
    const age = this.pet?.ageYears;
    if (age === undefined || age === null) return null;
    if (age <= 0) return 'Menos de 1 año';
    if (age === 1) return '1 año';
    return `${age} años`;
  }

  get subtitle(): string {
    const species = this.speciesLabel[this.pet.species];
    return this.pet.breed ? `${species} · ${this.pet.breed}` : species;
  }

  get weightLabel(): string | null {
    if (this.pet.weightKg === undefined || this.pet.weightKg === null || this.pet.weightKg === 0) {
      return null;
    }
    return `${this.pet.weightKg} kg`;
  }
}
