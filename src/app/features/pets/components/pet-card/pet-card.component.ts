import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import {
  Pet,
  SPECIES_LABEL,
  SIZE_LABEL,
  SEX_LABEL,
  LIFESTAGE_LABEL,
  ACTIVITY_LABEL,
} from '../../models/pet.models';

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
  sizeLabel = SIZE_LABEL;
  sexLabel = SEX_LABEL;
  lifeLabel = LIFESTAGE_LABEL;
  actLabel = ACTIVITY_LABEL;

  emoji(species: Pet['species']): string {
    const map: Record<NonNullable<Pet['species']>, string> = {
      dog: 'DOG',
      cat: 'CAT',
      bird: 'BIRD',
      fish: 'FISH',
      reptile: 'REP',
      'small-pet': 'SMALL',
      other: 'PET',
    };
    return map[species];
  }

  ageText(age?: number): string | null {
    if (age === undefined) return null;
    if (age === 0) return 'Cachorro';
    if (age === 1) return '1 ano';
    return `${age} anos`;
  }

  computedColor(name: string): string {
    let h = 0;
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
    return `hsl(${h}deg 80% 60%)`;
  }
}
