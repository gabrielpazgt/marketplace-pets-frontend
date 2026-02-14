import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormControl, FormGroup, NonNullableFormBuilder, Validators } from '@angular/forms';
import { distinctUntilChanged, startWith } from 'rxjs/operators';

import {
  PetDraft, Species, Size, Sex,
  LifeStage, ActivityLevel, DietPref
} from '../../models/pet.models';
import { PetsStateService } from '../../services/pet-state.service';
import { AuthService } from '../../../../auth/services/auth.service';

type PetForm = FormGroup<{
  name: FormControl<string>;
  species: FormControl<Species>;
  breed: FormControl<string>;
  color: FormControl<string>;           // <- ya no se muestra en UI, pero lo dejamos por compatibilidad
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
  'Negro','Blanco','Café','Gris','Dorado','Crema','Naranja','Atigrado','Manchado','Bicolor','Moteado'
];

const BREEDS: Record<Species, string[]> = {
  dog: ['Pastor Alemán','Labrador','Golden Retriever','Chihuahua','Pug','French Bulldog','Border Collie','Pitbull','Shih Tzu','Schnauzer'],
  cat: ['Persa','Siamés','Maine Coon','Bengala','Esfinge (Sphynx)','Azul Ruso','British Shorthair'],
  bird: ['Perico','Canario','Cacatúa','Agapornis','Loro Amazónico'],
  hamster: ['Sirio','Enano Campbell','Roborovski','Chino'],
  turtle: ['Orejas Rojas','Rusa','Caja'],
  other: ['—'],
};

@Component({
  selector: 'mp-pet-form',
  templateUrl: './pet-form.component.html',
  styleUrls: ['./pet-form.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PetFormComponent implements OnInit {
  private fb = inject(NonNullableFormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private pets = inject(PetsStateService);
  private auth = inject(AuthService);

  id: string | null = null;
  form!: PetForm;

  submitAttempted = false;

  // Opciones
  petColorOptions = PET_COLORS; // (ya no se usa en UI, pero lo conservamos)
  breedOptions: string[] = BREEDS['dog'];

  speciesOptions: Array<{v:Species; label:string; emoji:string}> = [
    {v:'dog',label:'Perro',emoji:'🐶'},
    {v:'cat',label:'Gato',emoji:'🐱'},
    {v:'bird',label:'Ave',emoji:'🦜'},
    {v:'hamster',label:'Hamster',emoji:'🐹'},
    {v:'turtle',label:'Tortuga',emoji:'🐢'},
    {v:'other',label:'Otra',emoji:'🐾'},
  ];
  sizeOptions: Array<{v:Size; label:string}> = [
    {v:'small',label:'Pequeño'},{v:'medium',label:'Mediano'},{v:'large',label:'Grande'}
  ];
  sexOptions: Array<{v:Sex; label:string}> = [
    {v:'male',label:'Macho'},{v:'female',label:'Hembra'}
  ];
  lifeStages: Array<{v:LifeStage; label:string}> = [
    {v:'puppy',label:'Cachorro'},{v:'adult',label:'Adulto'},{v:'senior',label:'Senior'}
  ];
  activityLevels: Array<{v:ActivityLevel; label:string}> = [
    {v:'low',label:'Baja'},{v:'medium',label:'Media'},{v:'high',label:'Alta'}
  ];
  dietOptions: Array<{v:DietPref; label:string}> = [
    {v:'grain_free',label:'Libre de granos'},
    {v:'high_protein',label:'Alta proteína'},
    {v:'low_calorie',label:'Bajas calorías'},
    {v:'urinary',label:'Salud urinaria'},
    {v:'renal',label:'Soporte renal'},
    {v:'hypoallergenic',label:'Hipoalergénico'},
  ];

  ngOnInit(): void {
    this.form = this.fb.group({
      name: this.fb.control('', { validators: [Validators.required, Validators.maxLength(40)] }),
      species: this.fb.control<Species>('dog', { validators: [Validators.required] }),
      breed: this.fb.control(''),
      color: this.fb.control('Negro'),           // <- no visible en UI
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

    // edición
    this.id = this.route.snapshot.paramMap.get('id');
    if (this.id) {
      const p = this.pets.getById(this.id);
      if (p) {
        this.form.patchValue({
          name: p.name,
          species: p.species,
          breed: p.breed || '',
          color: p.color || 'Negro',
          avatarHex: p.avatarHex || '#7023a4',
          size: p.size,
          ageYears: p.ageYears ?? 0,
          sex: p.sex,
          notes: p.notes || '',
          lifeStage: p.lifeStage,
          sterilized: !!p.sterilized,
          activity: p.activity,
          allergies: (p.allergies || []).join(', '),
          diet: p.diet || [],
        });
      }
    }

    // Razas reactivas según especie
    this.form.controls.species.valueChanges
      .pipe(startWith(this.form.controls.species.value), distinctUntilChanged())
      .subscribe(sp => {
        this.breedOptions = BREEDS[sp];
        if (!this.breedOptions.includes(this.form.controls.breed.value)) {
          this.form.controls.breed.setValue('');
        }
      });

    // Clamp edad
    this.form.controls.ageYears.valueChanges.subscribe(v => {
      let n = Number(v);
      if (Number.isNaN(n)) n = 0;
      n = Math.max(0, Math.min(30, Math.round(n)));
      if (n !== v) this.form.controls.ageYears.setValue(n, { emitEvent: false });
    });
  }

  get ageDisplay(): string {
    const n = this.form?.controls.ageYears.value ?? 0;
    return String(n).padStart(2, '0');
  }

  get draft(): PetDraft {
    const v = this.form.getRawValue();
    return {
      name: v.name,
      species: v.species,
      breed: v.breed || undefined,
      color: v.color || undefined,             // sigue soportado si algún día lo usas
      avatarHex: v.avatarHex || undefined,
      size: v.size,
      ageYears: v.ageYears,
      sex: v.sex,
      notes: v.notes || undefined,
      lifeStage: v.lifeStage,
      sterilized: v.sterilized,
      activity: v.activity,
      allergies: v.allergies ? v.allergies.split(',').map(s => s.trim()).filter(Boolean) : undefined,
      diet: v.diet && v.diet.length ? v.diet : undefined,
    };
  }

  onDietToggle(ev: Event, value: DietPref) {
    const checked = (ev.target as HTMLInputElement).checked;
    const current = this.form.controls.diet.value ?? [];
    if (checked) {
      if (!current.includes(value)) {
        this.form.controls.diet.setValue([...current, value]);
      }
    } else {
      this.form.controls.diet.setValue(current.filter(v => v !== value));
    }
    this.form.controls.diet.markAsDirty();
  }

  save() {
    this.submitAttempted = true;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    // ⚠️ Fallback mientras no hay auth real
    const userId = this.auth.userId ?? 'dev_user';

    if (this.id) {
      this.pets.update(this.id, this.draft);
    } else {
      this.pets.add(userId, this.draft);
    }
    this.router.navigate(['/account/pets']);
  }

  cancel() { this.router.navigate(['/account/pets']); }

  hasError(name: keyof PetForm['controls'], error: string) {
    const c = this.form.controls[name];
    return (c.touched || this.submitAttempted) && c.hasError(error);
  }
}
