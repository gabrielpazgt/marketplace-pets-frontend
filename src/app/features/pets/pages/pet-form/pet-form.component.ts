import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormControl, FormGroup, NonNullableFormBuilder, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { distinctUntilChanged, startWith, takeUntil } from 'rxjs/operators';

import {
  ActivityLevel,
  DietPref,
  LifeStage,
  Pet,
  PetDraft,
  Sex,
  Size,
  Species,
} from '../../models/pet.models';
import { PetsStateService } from '../../services/pet-state.service';
import { AuthService } from '../../../../auth/services/auth.service';

type PetForm = FormGroup<{
  name: FormControl<string>;
  species: FormControl<Species>;
  breed: FormControl<string>;
  color: FormControl<string>;
  avatarHex: FormControl<string>;
  size: FormControl<Size | undefined>;
  ageYears: FormControl<number>;
  sex: FormControl<Sex | undefined>;
  notes: FormControl<string>;
  lifeStage: FormControl<LifeStage | undefined>;
  sterilized: FormControl<boolean>;
  activity: FormControl<ActivityLevel | undefined>;
  allergies: FormControl<string>;
  diet: FormControl<DietPref[]>;
}>;

const PET_COLORS = [
  'Negro',
  'Blanco',
  'Cafe',
  'Gris',
  'Dorado',
  'Crema',
  'Naranja',
  'Atigrado',
  'Manchado',
  'Bicolor',
  'Moteado',
];

const BREEDS: Record<Species, string[]> = {
  dog: [
    'Labrador Retriever', 'Golden Retriever', 'Pastor Aleman', 'Pastor Belga', 'Rottweiler',
    'Doberman', 'Boxer', 'Bulldog Frances', 'Bulldog Ingles', 'Pug',
    'Chihuahua', 'Yorkshire Terrier', 'Shih Tzu', 'Schnauzer', 'Beagle',
    'Border Collie', 'Cocker Spaniel', 'Dachshund', 'Husky Siberiano', 'Malamute de Alaska',
    'Pitbull Terrier', 'American Bully', 'Poodle', 'Bichon Frise', 'Akita',
    'Samoyedo', 'Mastin Napolitano', 'Gran Danes', 'San Bernardo', 'Criollo'
  ],
  cat: [
    'Siames', 'Persa', 'Maine Coon', 'Bengala', 'British Shorthair',
    'Ragdoll', 'Sphynx', 'Azul Ruso', 'Bosque de Noruega', 'Abisinio',
    'Angora Turco', 'Himalayo', 'Scottish Fold', 'Birmano', 'Criollo'
  ],
  bird: [
    'Canario', 'Perico Australiano', 'Periquito', 'Cacatua', 'Agapornis',
    'Loro Amazonico', 'Ninfa', 'Guacamaya', 'Jilguero', 'Diamante Mandarin',
    'Cotorra', 'Calopsita', 'Otra ave'
  ],
  fish: [
    'Betta', 'Goldfish', 'Guppy', 'Tetra', 'Molly',
    'Platy', 'Corydora', 'Disco', 'Koi', 'Otro pez'
  ],
  reptile: [
    'Tortuga', 'Iguana', 'Gecko', 'Dragon Barbudo', 'Serpiente',
    'Camaleon', 'Tortuga de Orejas Rojas', 'Otro reptil'
  ],
  'small-pet': [
    'Hamster', 'Conejo', 'Cobayo', 'Chinchilla', 'Huron',
    'Erizo', 'Gerbo', 'Otra pequena mascota'
  ],
  other: [
    'Mascota exotica', 'Mascota de granja', 'Otra especie'
  ],
};

@Component({
  standalone: false,
  selector: 'mp-pet-form',
  templateUrl: './pet-form.component.html',
  styleUrls: ['./pet-form.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PetFormComponent implements OnInit, OnDestroy {
  private fb = inject(NonNullableFormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private pets = inject(PetsStateService);
  private auth = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);

  private readonly destroy$ = new Subject<void>();

  id: string | null = null;
  form!: PetForm;

  submitAttempted = false;
  submitError = '';
  saving = false;

  petColorOptions = PET_COLORS;
  breedOptions: string[] = BREEDS['dog'];
  filteredBreedOptions: string[] = [...BREEDS['dog']];

  speciesOptions: Array<{ v: Species; label: string }> = [
    { v: 'dog', label: 'Perro' },
    { v: 'cat', label: 'Gato' },
    { v: 'bird', label: 'Ave' },
    { v: 'fish', label: 'Pez y acuario' },
    { v: 'reptile', label: 'Reptil' },
    { v: 'small-pet', label: 'Pequena mascota' },
    { v: 'other', label: 'Otra' },
  ];

  sizeOptions: Array<{ v: Size; label: string }> = [
    { v: 'small', label: 'Pequeno' },
    { v: 'medium', label: 'Mediano' },
    { v: 'large', label: 'Grande' },
  ];

  sexOptions: Array<{ v: Sex; label: string }> = [
    { v: 'male', label: 'Macho' },
    { v: 'female', label: 'Hembra' },
  ];

  lifeStages: Array<{ v: LifeStage; label: string }> = [
    { v: 'puppy', label: 'Cachorro' },
    { v: 'adult', label: 'Adulto' },
    { v: 'senior', label: 'Senior' },
  ];

  activityLevels: Array<{ v: ActivityLevel; label: string }> = [
    { v: 'low', label: 'Baja' },
    { v: 'medium', label: 'Media' },
    { v: 'high', label: 'Alta' },
  ];

  dietOptions: Array<{ v: DietPref; label: string }> = [
    { v: 'grain_free', label: 'Libre de granos' },
    { v: 'high_protein', label: 'Alta proteina' },
    { v: 'low_calorie', label: 'Bajas calorias' },
    { v: 'urinary', label: 'Salud urinaria' },
    { v: 'renal', label: 'Soporte renal' },
    { v: 'hypoallergenic', label: 'Hipoalergenico' },
  ];

  get breedListId(): string {
    return `breed-options-${this.id || 'new'}`;
  }

  ngOnInit(): void {
    this.form = this.fb.group({
      name: this.fb.control('', { validators: [Validators.required, Validators.maxLength(40)] }),
      species: this.fb.control<Species>('dog', { validators: [Validators.required] }),
      breed: this.fb.control(''),
      color: this.fb.control('Negro'),
      avatarHex: this.fb.control('#7023a4'),
      size: this.fb.control<Size | undefined>('medium' as Size, { validators: [Validators.required] }),
      ageYears: this.fb.control(0, { validators: [Validators.required, Validators.min(0), Validators.max(30)] }),
      sex: this.fb.control<Sex | undefined>('female' as Sex, { validators: [Validators.required] }),
      notes: this.fb.control(''),
      lifeStage: this.fb.control<LifeStage | undefined>(undefined),
      sterilized: this.fb.control(false),
      activity: this.fb.control<ActivityLevel | undefined>(undefined),
      allergies: this.fb.control(''),
      diet: this.fb.control<DietPref[]>([]),
    });

    this.id = this.route.snapshot.paramMap.get('id');
    if (this.id) {
      this.patchFormFromPet(this.pets.getById(this.id));
      this.pets.pets$
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => {
          if (!this.id) return;
          this.patchFormFromPet(this.pets.getById(this.id));
        });
    }

    this.form.controls.species.valueChanges
      .pipe(startWith(this.form.controls.species.value), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((species) => {
        this.breedOptions = BREEDS[species] || [];
        this.filteredBreedOptions = this.filterBreeds(this.form.controls.breed.value || '');

        if (
          this.form.controls.breed.value &&
          this.breedOptions.length &&
          !this.breedOptions.includes(this.form.controls.breed.value)
        ) {
          this.form.controls.breed.setValue('');
          this.filteredBreedOptions = [...this.breedOptions];
        }

        this.cdr.markForCheck();
      });

    this.form.controls.ageYears.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((value) => {
        let next = Number(value);
        if (Number.isNaN(next)) next = 0;
        next = Math.max(0, Math.min(30, Math.round(next)));
        if (next !== value) {
          this.form.controls.ageYears.setValue(next, { emitEvent: false });
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get ageDisplay(): string {
    const age = this.form?.controls.ageYears.value ?? 0;
    return String(age).padStart(2, '0');
  }

  get draft(): PetDraft {
    const value = this.form.getRawValue();

    return {
      name: value.name,
      species: value.species,
      breed: value.breed || undefined,
      color: value.color || undefined,
      avatarHex: value.avatarHex || undefined,
      size: value.size,
      ageYears: value.ageYears,
      sex: value.sex,
      notes: value.notes || undefined,
      lifeStage: value.lifeStage,
      sterilized: value.sterilized,
      activity: value.activity,
      allergies: value.allergies
        ? value.allergies.split(',').map((item) => item.trim()).filter(Boolean)
        : undefined,
      diet: value.diet && value.diet.length ? value.diet : undefined,
    };
  }

  onBreedInput(event: Event): void {
    const value = String((event.target as HTMLInputElement).value || '');
    this.filteredBreedOptions = this.filterBreeds(value);
  }

  onBreedFocus(): void {
    this.filteredBreedOptions = this.filterBreeds(this.form.controls.breed.value || '');
  }

  onDietToggle(event: Event, value: DietPref) {
    const checked = (event.target as HTMLInputElement).checked;
    const current = this.form.controls.diet.value ?? [];

    if (checked) {
      if (!current.includes(value)) {
        this.form.controls.diet.setValue([...current, value]);
      }
    } else {
      this.form.controls.diet.setValue(current.filter((entry) => entry !== value));
    }

    this.form.controls.diet.markAsDirty();
  }

  save() {
    this.submitAttempted = true;
    this.submitError = '';

    if (this.form.invalid || this.saving) {
      this.form.markAllAsTouched();
      return;
    }

    const userId = this.auth.userId ?? 'dev_user';
    this.saving = true;
    this.cdr.markForCheck();

    const request$ = this.id
      ? this.pets.update(this.id, this.draft)
      : this.pets.add(userId, this.draft);

    request$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (pet) => {
          this.saving = false;
          if (!pet && this.auth.isLoggedIn) {
            this.submitError = 'No se pudo guardar la mascota.';
            this.cdr.markForCheck();
            return;
          }
          this.router.navigate(['/account/pets']);
        },
        error: () => {
          this.saving = false;
          this.submitError = 'No se pudo guardar la mascota.';
          this.cdr.markForCheck();
        },
      });
  }

  cancel() {
    this.router.navigate(['/account/pets']);
  }

  hasError(name: keyof PetForm['controls'], error: string) {
    const control = this.form.controls[name];
    return (control.touched || this.submitAttempted) && control.hasError(error);
  }

  private filterBreeds(query: string): string[] {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return [...this.breedOptions].slice(0, 40);

    return this.breedOptions
      .filter((breed) => breed.toLowerCase().includes(normalized))
      .slice(0, 40);
  }

  private patchFormFromPet(pet: Pet | null): void {
    if (!pet || !this.form) return;

    this.form.patchValue({
      name: pet.name,
      species: pet.species,
      breed: pet.breed || '',
      color: pet.color || 'Negro',
      avatarHex: pet.avatarHex || '#7023a4',
      size: pet.size,
      ageYears: pet.ageYears ?? 0,
      sex: pet.sex,
      notes: pet.notes || '',
      lifeStage: pet.lifeStage,
      sterilized: !!pet.sterilized,
      activity: pet.activity,
      allergies: (pet.allergies || []).join(', '),
      diet: pet.diet || [],
    });

    this.breedOptions = BREEDS[pet.species] || [];
    this.filteredBreedOptions = this.filterBreeds(pet.breed || '');
  }
}
