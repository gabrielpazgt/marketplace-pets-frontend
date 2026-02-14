import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import {
  PetDraft,
  SPECIES_LABEL,
  SIZE_LABEL,
  SEX_LABEL,
  LIFESTAGE_LABEL,
  ACTIVITY_LABEL,
  DIET_LABEL,
  DietPref,
} from '../../models/pet.models';

@Component({
  selector: 'mp-pet-preview',
  templateUrl: './pet-preview.component.html',
  styleUrls: ['./pet-preview.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PetPreviewComponent {
  @Input() draft!: Partial<PetDraft>;

  speciesLabel = SPECIES_LABEL;
  sizeLabel = SIZE_LABEL;
  sexLabel = SEX_LABEL;
  lifeLabel = LIFESTAGE_LABEL;
  actLabel = ACTIVITY_LABEL;
  dietLabel = DIET_LABEL;

  /** Imagen por especie (assets/images/pets/*) */
  get speciesImg(): string {
    const m: Record<string, string> = {
      dog: 'assets/images/pets/dog.png',
      cat: 'assets/images/pets/cat.png',
      bird: 'assets/images/pets/bird.png',
      hamster: 'assets/images/pets/hamster.png',
      turtle: 'assets/images/pets/tortuga.png',
      other: 'assets/images/pets/other_pet.png',
    };
    const key = this.draft?.species ?? 'dog';
    return m[key] ?? m['other'];
  }

  get displayColor(): string {
    return this.draft?.avatarHex || '#ffd9a6';
  }
  get species(): string {
    return this.draft?.species || 'dog';
  }

  /** Helpers para evitar lógica compleja en el template */
  get allergiesDisplay(): string {
    return (this.draft?.allergies ?? []).join(', ');
  }
  get dietDisplay(): string {
    const list = (this.draft?.diet ?? []) as DietPref[];
    return list.map((d) => this.dietLabel[d] ?? d).join(', ');
  }
}
