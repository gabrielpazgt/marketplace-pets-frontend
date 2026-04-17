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
import { StorefrontApiService } from '../../../../core/services/storefront-api.service';
import { StorefrontCatalogAnimalRef } from '../../../../core/models/storefront.models';

type PetStepKey = 'basic' | 'health' | 'review';

type PetForm = FormGroup<{
  name: FormControl<string>;
  species: FormControl<Species>;
  breed: FormControl<string>;
  color: FormControl<string>;
  avatarHex: FormControl<string>;
  size: FormControl<Size | undefined>;
  weightKg: FormControl<number | undefined>;
  birthMonth: FormControl<number>;
  birthYear: FormControl<number>;
  sex: FormControl<Sex | undefined>;
  notes: FormControl<string>;
  lifeStage: FormControl<LifeStage | undefined>;
  sterilized: FormControl<boolean>;
  activity: FormControl<ActivityLevel | undefined>;
  diet: FormControl<DietPref[]>;
}>;

type PetFormControlName = keyof PetForm['controls'];

interface PetStepDefinition {
  key: PetStepKey;
  label: string;
  description: string;
}

interface ChoiceOption<TValue extends string> {
  v: TValue;
  label: string;
  description?: string;
}

const BREEDS: Record<Species, string[]> = {
  dog: [
    'Labrador Retriever', 'Golden Retriever', 'Pastor Alemán', 'Pastor Belga', 'Rottweiler',
    'Doberman', 'Boxer', 'Bulldog Francés', 'Bulldog Inglés', 'Pug',
    'Chihuahua', 'Yorkshire Terrier', 'Shih Tzu', 'Schnauzer', 'Beagle',
    'Border Collie', 'Cocker Spaniel', 'Dachshund', 'Husky Siberiano', 'Malamute de Alaska',
    'Pitbull Terrier', 'American Bully', 'Poodle', 'Bichón Frisé', 'Akita',
    'Samoyedo', 'Mastín Napolitano', 'Gran Danés', 'San Bernardo', 'Criollo'
  ],
  cat: [
    'Siamés', 'Persa', 'Maine Coon', 'Bengala', 'British Shorthair',
    'Ragdoll', 'Sphynx', 'Azul Ruso', 'Bosque de Noruega', 'Abisinio',
    'Angora Turco', 'Himalayo', 'Scottish Fold', 'Birmano', 'Criollo'
  ],
  bird: [
    'Canario', 'Perico Australiano', 'Periquito', 'Cacatúa', 'Agapornis',
    'Loro Amazónico', 'Ninfa', 'Guacamaya', 'Jilguero', 'Diamante Mandarín',
    'Cotorra', 'Calopsita', 'Otra ave'
  ],
  fish: [
    'Betta', 'Goldfish', 'Guppy', 'Tetra', 'Molly',
    'Platy', 'Corydora', 'Disco', 'Koi', 'Otro pez'
  ],
  reptile: [
    'Tortuga', 'Iguana', 'Gecko', 'Dragón Barbudo', 'Serpiente',
    'Camaleón', 'Tortuga de Orejas Rojas', 'Otro reptil'
  ],
  'small-pet': [
    'Hamster', 'Conejo', 'Cobayo', 'Chinchilla', 'Hurón',
    'Erizo', 'Gerbo', 'Otra pequeña mascota'
  ],
  other: [
    'Mascota exótica', 'Mascota de granja', 'Otra especie'
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
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly pets = inject(PetsStateService);
  private readonly auth = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly storefrontApi = inject(StorefrontApiService);
  private readonly destroy$ = new Subject<void>();

  readonly currentYear = new Date().getFullYear();
  readonly currentMonth = new Date().getMonth();
  readonly steps: PetStepDefinition[] = [
    { key: 'basic', label: 'Datos básicos', description: 'Nombre, especie y perfil principal' },
    { key: 'health', label: 'Salud y dieta', description: 'Actividad, preferencias y alergias' },
    { key: 'review', label: 'Revisión', description: 'Revisa todo antes de guardar' },
  ];
  readonly monthOptions = [
    { value: 0, label: 'Enero' },
    { value: 1, label: 'Febrero' },
    { value: 2, label: 'Marzo' },
    { value: 3, label: 'Abril' },
    { value: 4, label: 'Mayo' },
    { value: 5, label: 'Junio' },
    { value: 6, label: 'Julio' },
    { value: 7, label: 'Agosto' },
    { value: 8, label: 'Septiembre' },
    { value: 9, label: 'Octubre' },
    { value: 10, label: 'Noviembre' },
    { value: 11, label: 'Diciembre' },
  ];
  readonly quickAllergies = ['Pollo', 'Maíz', 'Trigo', 'Lácteos', 'Soya', 'Pescado'];
  readonly petColorOptions = [
    'Negro',
    'Blanco',
    'Café',
    'Gris',
    'Dorado',
    'Crema',
    'Naranja',
    'Manchado',
  ];
  readonly profileColorOptions = [
    { label: 'Naranja', value: '#ff6f0f' },
    { label: 'Dorado', value: '#f59e0b' },
    { label: 'Rosa', value: '#f7b7bd' },
    { label: 'Azul', value: '#60a5fa' },
    { label: 'Verde', value: '#34d399' },
    { label: 'Menta', value: '#5eead4' },
    { label: 'Lila', value: '#c4b5fd' },
    { label: 'Gris', value: '#94a3b8' },
  ];

  id: string | null = null;
  form!: PetForm;
  currentStepIndex = 0;

  submitAttempted = false;
  submitError = '';
  saving = false;
  selectedAvatarFile: File | null = null;
  avatarPreviewUrl: string | null = null;
  removeAvatarOnSave = false;
  private objectPreviewUrl: string | null = null;

  breedOptions: string[] = BREEDS.dog;
  filteredBreedOptions: string[] = [...BREEDS.dog];
  allergyList: string[] = [];
  allergyInputValue = '';
  allergyInputFocus = false;
  catalogAnimals: StorefrontCatalogAnimalRef[] = [];

  speciesOptions: Array<ChoiceOption<Species>> = [
    { v: 'dog', label: 'Perro' },
    { v: 'cat', label: 'Gato' },
    { v: 'bird', label: 'Ave' },
    { v: 'fish', label: 'Pez y acuario' },
    { v: 'reptile', label: 'Reptil' },
    { v: 'small-pet', label: 'Pequeña mascota' },
    { v: 'other', label: 'Otra' },
  ];

  sizeOptions: Array<ChoiceOption<Size>> = [
    { v: 'small', label: 'Pequeño' },
    { v: 'medium', label: 'Mediano' },
    { v: 'large', label: 'Grande' },
  ];

  sexOptions: Array<ChoiceOption<Sex>> = [
    { v: 'male', label: 'Macho' },
    { v: 'female', label: 'Hembra' },
  ];

  lifeStages: Array<ChoiceOption<LifeStage>> = [
    { v: 'puppy', label: 'Cachorro' },
    { v: 'adult', label: 'Adulto' },
    { v: 'senior', label: 'Senior' },
  ];

  activityLevels: Array<ChoiceOption<ActivityLevel>> = [
    { v: 'low', label: 'Baja', description: 'Mayormente en casa y paseos suaves' },
    { v: 'medium', label: 'Media', description: 'Rutina equilibrada y actividad diaria' },
    { v: 'high', label: 'Alta', description: 'Muy activa, juega o entrena seguido' },
  ];

  dietOptions: Array<ChoiceOption<DietPref>> = [
    { v: 'grain_free', label: 'Libre de granos' },
    { v: 'high_protein', label: 'Alta proteína' },
    { v: 'low_calorie', label: 'Bajas calorías' },
    { v: 'urinary', label: 'Salud urinaria' },
    { v: 'renal', label: 'Soporte renal' },
    { v: 'hypoallergenic', label: 'Hipoalergénico' },
  ];

  get currentStep(): PetStepDefinition {
    return this.steps[this.currentStepIndex];
  }

  get isReviewStep(): boolean {
    return this.currentStep.key === 'review';
  }

  get pageTitle(): string {
    return this.id ? 'Editar perfil de mascota' : 'Crear perfil de mascota';
  }

  get pageSubtitle(): string {
    return 'Ayúdanos a personalizar recomendaciones y filtros para tu mascota.';
  }

  get breedListId(): string {
    return `breed-options-${this.id || 'new'}`;
  }

  get selectedAnimalKey(): Species {
    return this.form?.controls.species.value || 'dog';
  }

  get showBreedField(): boolean {
    return ['dog', 'cat', 'bird', 'small-pet', 'other'].includes(this.selectedAnimalKey);
  }

  get showSizeField(): boolean {
    return ['dog', 'cat', 'small-pet', 'other'].includes(this.selectedAnimalKey);
  }

  get showLifeStageField(): boolean {
    return ['dog', 'cat', 'small-pet', 'other'].includes(this.selectedAnimalKey);
  }

  get showBiologyFields(): boolean {
    return ['dog', 'cat', 'small-pet', 'other'].includes(this.selectedAnimalKey);
  }

  get selectedCatalogAnimalId(): number | undefined {
    return this.catalogAnimals.find((animal) => animal.key === this.selectedAnimalKey)?.id;
  }

  get yearOptions(): number[] {
    return Array.from({ length: 31 }, (_, index) => this.currentYear - index);
  }

  get computedAgeLabel(): string {
    const age = this.computeAgeFromForm();
    if (age === null) return '';
    if (age <= 0) return 'Menos de 1 año';
    if (age === 1) return '1 año';
    return `${age} años`;
  }

  get birthSummary(): string {
    const month = this.monthOptions.find((entry) => entry.value === this.form?.controls.birthMonth.value)?.label;
    const year = this.form?.controls.birthYear.value;
    if (!month || !year) return 'Por definir';
    return `${month} ${year}`;
  }

  get previewDraft(): PetDraft {
    return {
      ...this.draft,
      avatarUrl: this.avatarPreviewUrl || undefined,
    };
  }

  get draft(): PetDraft {
    const value = this.form.getRawValue();
    return {
      name: value.name,
      species: value.species,
      catalogAnimalId: this.selectedCatalogAnimalId,
      breed: this.showBreedField ? (value.breed || undefined) : undefined,
      color: value.color || undefined,
      avatarHex: value.avatarHex || undefined,
      avatarUrl: this.avatarPreviewUrl || undefined,
      size: this.showSizeField ? value.size : undefined,
      weightKg: value.weightKg,
      ageYears: this.computeAge(value.birthMonth, value.birthYear) ?? undefined,
      birthMonth: value.birthMonth,
      birthYear: value.birthYear,
      sex: value.sex,
      notes: value.notes || undefined,
      lifeStage: this.showLifeStageField ? value.lifeStage : undefined,
      sterilized: this.showBiologyFields ? value.sterilized : undefined,
      activity: value.activity,
      allergies: [...this.allergyList],
      diet: [...value.diet],
    };
  }

  get dietSummary(): string {
    const selected = this.form?.controls.diet.value || [];
    if (!selected.length) return 'Sin preferencias';
    return selected
      .map((value) => this.dietOptions.find((option) => option.v === value)?.label || value)
      .join(', ');
  }

  get allergiesSummary(): string {
    return this.allergyList.length ? this.allergyList.join(', ') : 'Sin alergias registradas';
  }

  get activitySummary(): string {
    const selected = this.form?.controls.activity.value;
    if (!selected) return 'Sin nivel definido';
    return this.activityLevels.find((option) => option.v === selected)?.label || selected;
  }

  speciesOptionLabel(value: Species | null | undefined): string {
    if (!value) return 'Por definir';
    return this.speciesOptions.find((option) => option.v === value)?.label || value;
  }

  sexOptionLabel(value: Sex | null | undefined): string {
    if (!value) return 'Por definir';
    return this.sexOptions.find((option) => option.v === value)?.label || value;
  }

  sizeOptionLabel(value: Size | null | undefined): string {
    if (!value) return 'Por definir';
    return this.sizeOptions.find((option) => option.v === value)?.label || value;
  }

  ngOnInit(): void {
    this.storefrontApi.getPetTaxonomy().pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        const animals = response.data?.catalogAnimals || [];
        if (!animals.length) {
          return;
        }

        this.catalogAnimals = animals;
        this.speciesOptions = animals.map((animal) => ({
          v: animal.key as Species,
          label: animal.label,
        }));
        this.cdr.markForCheck();
      },
      error: () => {
        this.catalogAnimals = [];
      },
    });

    this.form = this.fb.group({
      name: this.fb.control('', { validators: [Validators.required, Validators.maxLength(40)] }),
      species: this.fb.control<Species>('dog', { validators: [Validators.required] }),
      breed: this.fb.control(''),
      color: this.fb.control('Crema'),
      avatarHex: this.fb.control('#ff6f0f'),
      size: this.fb.control<Size | undefined>('medium' as Size, { validators: [Validators.required] }),
      weightKg: this.fb.control<number | undefined>(undefined),
      birthMonth: this.fb.control(this.currentMonth, { validators: [Validators.required] }),
      birthYear: this.fb.control(this.currentYear - 2, {
        validators: [
          Validators.required,
          Validators.min(this.currentYear - 30),
          Validators.max(this.currentYear),
        ],
      }),
      sex: this.fb.control<Sex | undefined>('female' as Sex, { validators: [Validators.required] }),
      notes: this.fb.control(''),
      lifeStage: this.fb.control<LifeStage | undefined>('adult' as LifeStage),
      sterilized: this.fb.control(false),
      activity: this.fb.control<ActivityLevel | undefined>(undefined),
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

        if (this.form.controls.breed.value && this.breedOptions.length && !this.breedOptions.includes(this.form.controls.breed.value)) {
          this.form.controls.breed.setValue('');
          this.filteredBreedOptions = [...this.breedOptions];
        }

        if (!this.showSizeField) {
          this.form.controls.size.setValue(undefined);
        } else if (!this.form.controls.size.value) {
          this.form.controls.size.setValue('medium');
        }

        if (!this.showLifeStageField) {
          this.form.controls.lifeStage.setValue(undefined);
        } else if (!this.form.controls.lifeStage.value) {
          this.form.controls.lifeStage.setValue('adult');
        }

        if (!this.showBiologyFields) {
          this.form.controls.sterilized.setValue(false);
        }

        this.cdr.markForCheck();
      });

    this.form.controls.birthMonth.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.cdr.markForCheck());

    this.form.controls.birthYear.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.cdr.markForCheck());
  }

  ngOnDestroy(): void {
    this.clearObjectPreviewUrl();
    this.destroy$.next();
    this.destroy$.complete();
  }

  isStepActive(index: number): boolean {
    return this.currentStepIndex === index;
  }

  isStepComplete(index: number): boolean {
    return this.currentStepIndex > index;
  }

  selectStep(index: number): void {
    if (index < 0 || index >= this.steps.length) {
      return;
    }

    if (index <= this.currentStepIndex) {
      this.currentStepIndex = index;
      return;
    }

    if (index === this.currentStepIndex + 1 && this.validateStep(this.currentStepIndex)) {
      this.currentStepIndex = index;
    }
  }

  goNext(): void {
    if (!this.validateStep(this.currentStepIndex)) {
      return;
    }

    this.currentStepIndex = Math.min(this.currentStepIndex + 1, this.steps.length - 1);
  }

  goBack(): void {
    this.currentStepIndex = Math.max(this.currentStepIndex - 1, 0);
  }

  selectSpecies(species: Species): void {
    this.form.controls.species.setValue(species);
    this.form.controls.species.markAsTouched();
  }

  selectSex(sex: Sex): void {
    this.form.controls.sex.setValue(sex);
    this.form.controls.sex.markAsTouched();
  }

  selectSize(size: Size): void {
    this.form.controls.size.setValue(size);
    this.form.controls.size.markAsTouched();
  }

  selectLifeStage(stage: LifeStage): void {
    this.form.controls.lifeStage.setValue(stage);
    this.form.controls.lifeStage.markAsTouched();
  }

  selectProfileColor(color: string): void {
    this.form.controls.avatarHex.setValue(color);
    this.form.controls.avatarHex.markAsDirty();
    this.form.controls.avatarHex.markAsTouched();
  }

  isDietSelected(value: DietPref): boolean {
    return (this.form.controls.diet.value || []).includes(value);
  }

  toggleDiet(value: DietPref): void {
    const current = this.form.controls.diet.value || [];
    const next = current.includes(value)
      ? current.filter((entry) => entry !== value)
      : [...current, value];

    this.form.controls.diet.setValue(next);
    this.form.controls.diet.markAsDirty();
  }

  onBreedInput(event: Event): void {
    const value = String((event.target as HTMLInputElement).value || '');
    this.filteredBreedOptions = this.filterBreeds(value);
  }

  onBreedFocus(): void {
    this.filteredBreedOptions = this.filterBreeds(this.form.controls.breed.value || '');
  }

  onAvatarSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] || null;
    if (!file) return;

    this.selectedAvatarFile = file;
    this.removeAvatarOnSave = false;
    this.setAvatarPreviewUrl(URL.createObjectURL(file), true);
    input.value = '';
  }

  clearAvatar(): void {
    this.selectedAvatarFile = null;
    this.removeAvatarOnSave = Boolean(this.id);
    this.setAvatarPreviewUrl(null, false);
    this.cdr.markForCheck();
  }

  addAllergyTag(value?: string): void {
    const raw = value ?? this.allergyInputValue;
    const items = raw.split(',').map((entry) => entry.trim()).filter(Boolean);

    for (const item of items) {
      if (!this.allergyList.some((allergy) => allergy.toLowerCase() === item.toLowerCase())) {
        this.allergyList = [...this.allergyList, item];
      }
    }

    this.allergyInputValue = '';
    this.cdr.markForCheck();
  }

  toggleSuggestedAllergy(allergy: string): void {
    if (this.hasAllergy(allergy)) {
      this.allergyList = this.allergyList.filter((item) => item.toLowerCase() !== allergy.toLowerCase());
    } else {
      this.allergyList = [...this.allergyList, allergy];
    }
    this.cdr.markForCheck();
  }

  hasAllergy(allergy: string): boolean {
    return this.allergyList.some((item) => item.toLowerCase() === allergy.toLowerCase());
  }

  removeAllergyTag(index: number): void {
    this.allergyList = this.allergyList.filter((_, currentIndex) => currentIndex !== index);
    this.cdr.markForCheck();
  }

  onAllergyKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      this.addAllergyTag();
      return;
    }

    if (event.key === 'Backspace' && !this.allergyInputValue && this.allergyList.length) {
      this.removeAllergyTag(this.allergyList.length - 1);
    }
  }

  save(): void {
    if (!this.isReviewStep) {
      this.goNext();
      return;
    }

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

          const petId = pet?.id || this.id;
          if (petId && this.auth.isLoggedIn && this.selectedAvatarFile) {
            this.pets.uploadAvatar(String(petId), this.selectedAvatarFile)
              .pipe(takeUntil(this.destroy$))
              .subscribe({
                next: (result) => {
                  if (!result) {
                    this.saving = false;
                    this.submitError = 'La mascota se guardó, pero no pudimos subir su foto.';
                    this.cdr.markForCheck();
                    return;
                  }
                  this.router.navigate(['/account/pets']);
                },
                error: () => {
                  this.saving = false;
                  this.submitError = 'La mascota se guardó, pero no pudimos subir su foto.';
                  this.cdr.markForCheck();
                },
              });
            return;
          }

          if (petId && this.auth.isLoggedIn && this.removeAvatarOnSave) {
            this.pets.removeAvatar(String(petId))
              .pipe(takeUntil(this.destroy$))
              .subscribe({
                next: () => this.router.navigate(['/account/pets']),
                error: () => {
                  this.submitError = 'La mascota se guardó, pero no pudimos actualizar su foto.';
                  this.cdr.markForCheck();
                },
              });
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

  cancel(): void {
    this.router.navigate(['/account/pets']);
  }

  hasError(name: PetFormControlName, error: string): boolean {
    const control = this.form.controls[name];
    return (control.touched || this.submitAttempted) && control.hasError(error);
  }

  private validateStep(index: number): boolean {
    const controlNames = this.getStepControlNames(index);
    controlNames.forEach((controlName) => this.form.controls[controlName].markAsTouched());

    const valid = controlNames.every((controlName) => this.form.controls[controlName].valid);
    if (!valid) {
      this.submitAttempted = true;
    }

    return valid;
  }

  private getStepControlNames(index: number): PetFormControlName[] {
    if (index !== 0) {
      return [];
    }

    const controlNames: PetFormControlName[] = ['name', 'species', 'sex', 'birthMonth', 'birthYear'];
    if (this.showSizeField) {
      controlNames.push('size');
    }
    return controlNames;
  }

  private computeAgeFromForm(): number | null {
    return this.computeAge(
      this.form?.controls.birthMonth.value,
      this.form?.controls.birthYear.value,
    );
  }

  private computeAge(month?: number, year?: number): number | null {
    if (!Number.isFinite(Number(month)) || !Number.isFinite(Number(year))) {
      return null;
    }

    const numericMonth = Number(month);
    const numericYear = Number(year);
    const now = new Date();
    let age = now.getFullYear() - numericYear;
    if (now.getMonth() < numericMonth) {
      age -= 1;
    }
    return Math.max(0, age);
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

    const birthYear = pet.birthYear
      ?? (pet.ageYears !== undefined ? Math.max(this.currentYear - 30, this.currentYear - pet.ageYears) : this.currentYear - 2);
    const birthMonth = pet.birthMonth ?? this.currentMonth;

    this.form.patchValue({
      name: pet.name,
      species: pet.species,
      breed: pet.breed || '',
      color: pet.color || 'Crema',
      avatarHex: pet.avatarHex || '#ff6f0f',
      size: pet.size,
      weightKg: pet.weightKg,
      birthMonth,
      birthYear,
      sex: pet.sex,
      notes: pet.notes || '',
      lifeStage: pet.lifeStage,
      sterilized: !!pet.sterilized,
      activity: pet.activity,
      diet: pet.diet || [],
    });

    this.allergyList = pet.allergies ? [...pet.allergies] : [];
    this.selectedAvatarFile = null;
    this.removeAvatarOnSave = false;
    this.setAvatarPreviewUrl(pet.avatarUrl || null, false);
    this.breedOptions = BREEDS[pet.species] || [];
    this.filteredBreedOptions = this.filterBreeds(pet.breed || '');
  }

  private setAvatarPreviewUrl(url: string | null, isObjectUrl: boolean): void {
    this.clearObjectPreviewUrl();
    this.avatarPreviewUrl = url;
    this.objectPreviewUrl = isObjectUrl ? url : null;
  }

  private clearObjectPreviewUrl(): void {
    if (this.objectPreviewUrl) {
      URL.revokeObjectURL(this.objectPreviewUrl);
      this.objectPreviewUrl = null;
    }
  }
}
