export type Species = 'dog' | 'cat' | 'bird' | 'fish' | 'reptile' | 'small-pet' | 'other';
export type Size = 'small' | 'medium' | 'large';
export type Sex = 'male' | 'female';

export type LifeStage = 'puppy' | 'adult' | 'senior';
export type ActivityLevel = 'low' | 'medium' | 'high';
export type DietPref =
  | 'grain_free'
  | 'high_protein'
  | 'low_calorie'
  | 'urinary'
  | 'renal'
  | 'hypoallergenic';

export interface Pet {
  id: string;
  userId: string;
  name: string;
  species: Species;
  breed?: string;
  color?: string;
  size?: Size;
  weightKg?: number;
  ageYears?: number;
  sex?: Sex;
  notes?: string;
  avatarHex?: string;
  createdAt: string;
  updatedAt: string;

  lifeStage?: LifeStage;
  sterilized?: boolean;
  activity?: ActivityLevel;
  allergies?: string[];
  diet?: DietPref[];
}

export interface PetDraft {
  name: string;
  species: Species;
  breed?: string;
  color?: string;
  size?: Size;
  weightKg?: number;
  ageYears?: number;
  sex?: Sex;
  notes?: string;
  avatarHex?: string;

  lifeStage?: LifeStage;
  sterilized?: boolean;
  activity?: ActivityLevel;
  allergies?: string[];
  diet?: DietPref[];
}

export const SPECIES_LABEL: Record<Species, string> = {
  dog: 'Perro',
  cat: 'Gato',
  bird: 'Ave',
  fish: 'Pez y acuario',
  reptile: 'Reptil',
  'small-pet': 'Pequena mascota',
  other: 'Otra',
};

export const SIZE_LABEL: Record<Size, string> = {
  small: 'Pequeno',
  medium: 'Mediano',
  large: 'Grande',
};

export const SEX_LABEL: Record<Sex, string> = {
  male: 'Macho',
  female: 'Hembra',
};

export const LIFESTAGE_LABEL: Record<LifeStage, string> = {
  puppy: 'Cachorro',
  adult: 'Adulto',
  senior: 'Senior',
};

export const ACTIVITY_LABEL: Record<ActivityLevel, string> = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
};

export const DIET_LABEL: Record<DietPref, string> = {
  grain_free: 'Libre de granos',
  high_protein: 'Alta proteina',
  low_calorie: 'Bajas calorias',
  urinary: 'Salud urinaria',
  renal: 'Soporte renal',
  hypoallergenic: 'Hipoalergenico',
};
