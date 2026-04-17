import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import {
  ACTIVITY_LABEL,
  DIET_LABEL,
  DietPref,
  PetDraft,
  SEX_LABEL,
  SPECIES_LABEL,
} from '../../models/pet.models';

@Component({
  standalone: false,
  selector: 'mp-pet-preview',
  templateUrl: './pet-preview.component.html',
  styleUrls: ['./pet-preview.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PetPreviewComponent {
  @Input() draft!: Partial<PetDraft>;

  speciesLabel = SPECIES_LABEL;
  sexLabel = SEX_LABEL;
  activityLabel = ACTIVITY_LABEL;
  dietLabel = DIET_LABEL;

  get speciesImg(): string {
    const map: Record<string, string> = {
      dog: 'assets/images/pets/dog.png',
      cat: 'assets/images/pets/cat.png',
      bird: 'assets/images/pets/bird.png',
      fish: 'assets/images/pets/other_pet.png',
      reptile: 'assets/images/pets/tortuga.png',
      'small-pet': 'assets/images/pets/hamster.png',
      other: 'assets/images/pets/other_pet.png',
    };
    const key = this.draft?.species ?? 'dog';
    return map[key] ?? map['other'];
  }

  get visualImage(): string {
    return this.draft?.avatarUrl || this.speciesImg;
  }

  get title(): string {
    return this.draft?.name || 'Tu mascota';
  }

  get subtitle(): string {
    const species = this.speciesLabel[this.draft?.species || 'dog'];
    return this.draft?.breed ? `${species} · ${this.draft.breed}` : species;
  }

  get ageText(): string {
    const age = this.draft?.ageYears;
    if (age === undefined || age === null) return 'Por definir';
    if (age <= 0) return 'Menos de 1 año';
    if (age === 1) return '1 año';
    return `${age} años`;
  }

  get weightText(): string {
    const weight = this.draft?.weightKg;
    if (weight === undefined || weight === null || weight === 0) return 'Por definir';
    return `${weight} kg`;
  }

  get sexText(): string {
    return this.draft?.sex ? this.sexLabel[this.draft.sex] : 'Por definir';
  }

  get sterilizedText(): string {
    if (this.draft?.sterilized === undefined) return 'Por definir';
    return this.draft.sterilized ? 'Sí' : 'No';
  }

  get activityText(): string | null {
    return this.draft?.activity ? this.activityLabel[this.draft.activity] : null;
  }

  get dietChips(): string[] {
    return ((this.draft?.diet || []) as DietPref[])
      .map((diet) => this.dietLabel[diet] || diet)
      .slice(0, 3);
  }

  get allergyChips(): string[] {
    return (this.draft?.allergies || []).slice(0, 3);
  }
}
