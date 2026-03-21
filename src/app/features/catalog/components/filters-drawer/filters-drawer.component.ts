import { Component, ElementRef, EventEmitter, HostListener, Input, OnChanges, Output, SimpleChanges, ViewChild } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { StorefrontProductFacets } from '../../../../core/models/storefront.models';
import { DIET_LABEL, LIFESTAGE_LABEL, Pet, SPECIES_LABEL } from '../../../pets/models/pet.models';

export interface FilterState {
  min?: number | null;
  max?: number | null;
  inStockOnly: boolean;
  petId?: string | null;
  category?: string | null;
  subcategory?: string | null;
  brandId?: number | null;
  form?: string | null;
  proteinSource?: string | null;
  specieId?: number | null;
  lifeStageId?: number | null;
  dietTagId?: number | null;
  healthConditionId?: number | null;
  ingredientId?: number | null;
}

export type DrawerFacetControlKey =
  | 'form'
  | 'proteinSource'
  | 'specieId'
  | 'lifeStageId'
  | 'dietTagId'
  | 'healthConditionId'
  | 'ingredientId';

@Component({
  standalone: false,
  selector: 'app-filters-drawer',
  templateUrl: './filters-drawer.component.html',
  styleUrls: ['./filters-drawer.component.scss']
})
export class FiltersDrawerComponent implements OnChanges {
  private priceMinSelection = 0;
  private priceMaxSelection = 0;
  private draggingPriceThumb: 'min' | 'max' | null = null;

  @ViewChild('priceSliderTrack')
  private priceSliderTrack?: ElementRef<HTMLDivElement>;

  @Input() open = false;
  @Input() state: FilterState = {
    min: null,
    max: null,
    inStockOnly: true,
    petId: null,
    category: null,
    subcategory: null,
    brandId: null,
    form: null,
    proteinSource: null,
    specieId: null,
    lifeStageId: null,
    dietTagId: null,
    healthConditionId: null,
    ingredientId: null,
  };
  @Input() pets: Pet[] = [];
  @Input() showPetFilter = false;
  @Input() categories: Array<{ value: string; label: string }> = [];
  @Input() subcategories: Array<{ value: string; label: string; count: number; suggested?: boolean }> = [];
  @Input() facets: StorefrontProductFacets | null = null;
  @Input() priceRangeBounds: { min: number; max: number } | null = null;
  @Input() lockBiologyFilters = false;
  @Input() visibleFacetControls: DrawerFacetControlKey[] = [
    'form',
    'proteinSource',
    'specieId',
    'lifeStageId',
    'dietTagId',
    'healthConditionId',
    'ingredientId',
  ];
  @Input() veterinaryHint = '';
  @Input() veterinaryFocusTags: string[] = [];

  @Output() apply = new EventEmitter<FilterState>();
  @Output() close = new EventEmitter<void>();
  @Output() clear = new EventEmitter<void>();

  form = this.fb.group({
    min: this.fb.control<number | null>(null),
    max: this.fb.control<number | null>(null),
    inStockOnly: this.fb.nonNullable.control<boolean>(true),
    petId: this.fb.control<string | null>(null),
    category: this.fb.control<string | null>(null),
    subcategory: this.fb.control<string | null>(null),
    brandId: this.fb.control<number | null>(null),
    form: this.fb.control<string | null>(null),
    proteinSource: this.fb.control<string | null>(null),
    specieId: this.fb.control<number | null>(null),
    lifeStageId: this.fb.control<number | null>(null),
    dietTagId: this.fb.control<number | null>(null),
    healthConditionId: this.fb.control<number | null>(null),
    ingredientId: this.fb.control<number | null>(null),
  });

  constructor(private fb: FormBuilder) {}

  get selectedPetProfile(): Pet | null {
    const petId = this.form.controls.petId.value;
    if (!petId) return null;
    return this.pets.find((pet) => pet.id === petId) || null;
  }

  get selectedPetSummaryTags(): string[] {
    const pet = this.selectedPetProfile;
    if (!pet) return [];

    const tags = [
      `Especie: ${SPECIES_LABEL[pet.species]}`,
      pet.lifeStage ? `Etapa: ${LIFESTAGE_LABEL[pet.lifeStage]}` : '',
      Number.isFinite(Number(pet.weightKg)) ? `${Number(pet.weightKg)} kg` : '',
      pet.diet?.[0] ? DIET_LABEL[pet.diet[0]] : '',
      pet.allergies?.[0] ? `Evitar ${pet.allergies[0]}` : '',
    ].filter(Boolean);

    return Array.from(new Set(tags)).slice(0, 5);
  }

  get petTemplateSummary(): string {
    const pet = this.selectedPetProfile;
    if (!pet) {
      return 'El perfil elegido aplica especie, etapa, peso, preferencias y alertas relacionadas para usar la mascota como plantilla de filtrado.';
    }

    const parts = [
      `${pet.name} esta definiendo el contexto del catalogo.`,
      pet.lifeStage ? `Etapa: ${LIFESTAGE_LABEL[pet.lifeStage].toLowerCase()}.` : '',
      Number.isFinite(Number(pet.weightKg)) ? `Peso aprox: ${Number(pet.weightKg)} kg.` : '',
      pet.diet?.length ? `Preferencias: ${pet.diet.slice(0, 2).map((entry) => DIET_LABEL[entry]).join(', ').toLowerCase()}.` : '',
      pet.allergies?.length ? `Alertas revisadas: ${pet.allergies.slice(0, 2).join(', ')}.` : '',
    ].filter(Boolean);

    return parts.join(' ');
  }

  showFacetControl(control: DrawerFacetControlKey): boolean {
    return (this.visibleFacetControls || []).includes(control);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['state'] || changes['open']) {
      this.syncFromState();
      return;
    }

    if (changes['facets'] || changes['priceRangeBounds']) {
      this.syncPriceSelectionToCurrentRange();
    }
  }

  get priceRangeMin(): number {
    const value = this.parseNumber((this.priceRangeBounds?.min ?? this.facets?.priceRange?.min) as number | null | undefined);
    return Math.floor(value ?? 0);
  }

  get priceRangeMax(): number {
    const min = this.priceRangeMin;
    const value = this.parseNumber((this.priceRangeBounds?.max ?? this.facets?.priceRange?.max) as number | null | undefined);
    const resolved = Math.ceil(value ?? min);
    return resolved >= min ? resolved : min;
  }

  get hasPriceRange(): boolean {
    return this.priceRangeMax > this.priceRangeMin;
  }

  get selectedPriceMin(): number {
    return this.priceMinSelection;
  }

  get selectedPriceMax(): number {
    return this.priceMaxSelection;
  }

  get hasCustomPriceSelection(): boolean {
    return this.selectedPriceMin > this.priceRangeMin || this.selectedPriceMax < this.priceRangeMax;
  }

  get selectedPriceMinPct(): number {
    if (!this.hasPriceRange) return 0;
    const denominator = this.priceRangeMax - this.priceRangeMin;
    if (denominator <= 0) return 0;

    return ((this.selectedPriceMin - this.priceRangeMin) / denominator) * 100;
  }

  get selectedPriceWidthPct(): number {
    if (!this.hasPriceRange) return 0;
    const denominator = this.priceRangeMax - this.priceRangeMin;
    if (denominator <= 0) return 0;

    return ((this.selectedPriceMax - this.selectedPriceMin) / denominator) * 100;
  }

  get selectedPriceMaxPct(): number {
    return this.selectedPriceMinPct + this.selectedPriceWidthPct;
  }

  onPriceTrackPointerDown(event: PointerEvent): void {
    if (!this.hasPriceRange) return;
    const value = this.resolvePriceValueFromClientX(event.clientX);
    const distanceToMin = Math.abs(value - this.priceMinSelection);
    const distanceToMax = Math.abs(value - this.priceMaxSelection);
    const thumb: 'min' | 'max' = distanceToMin <= distanceToMax ? 'min' : 'max';

    this.draggingPriceThumb = thumb;
    this.updatePriceSelection(thumb, value);
  }

  onPriceThumbPointerDown(thumb: 'min' | 'max', event: PointerEvent): void {
    if (!this.hasPriceRange) return;
    event.preventDefault();
    event.stopPropagation();
    this.draggingPriceThumb = thumb;
  }

  onPriceThumbKeydown(thumb: 'min' | 'max', event: KeyboardEvent): void {
    if (!this.hasPriceRange) return;

    const step = event.shiftKey ? 10 : 1;
    const current = thumb === 'min' ? this.priceMinSelection : this.priceMaxSelection;

    switch (event.key) {
      case 'ArrowLeft':
      case 'ArrowDown':
        event.preventDefault();
        this.updatePriceSelection(thumb, current - step);
        break;
      case 'ArrowRight':
      case 'ArrowUp':
        event.preventDefault();
        this.updatePriceSelection(thumb, current + step);
        break;
      case 'Home':
        event.preventDefault();
        this.updatePriceSelection(thumb, this.priceRangeMin);
        break;
      case 'End':
        event.preventDefault();
        this.updatePriceSelection(thumb, this.priceRangeMax);
        break;
      default:
        break;
    }
  }

  @HostListener('window:pointermove', ['$event'])
  onWindowPointerMove(event: PointerEvent): void {
    if (!this.draggingPriceThumb || !this.hasPriceRange) return;
    this.updatePriceSelection(this.draggingPriceThumb, this.resolvePriceValueFromClientX(event.clientX));
  }

  @HostListener('window:pointerup')
  @HostListener('window:pointercancel')
  onWindowPointerEnd(): void {
    this.draggingPriceThumb = null;
  }

  onSubmit(): void {
    const {
      inStockOnly,
      petId,
      category,
      subcategory,
      brandId,
      form,
      proteinSource,
      specieId,
      lifeStageId,
      dietTagId,
      healthConditionId,
      ingredientId,
    } = this.form.getRawValue();
    const parsedMin = this.clamp(this.selectedPriceMin, this.priceRangeMin, this.priceRangeMax);
    const parsedMax = this.clamp(this.selectedPriceMax, this.priceRangeMin, this.priceRangeMax);
    const normalizedMin = parsedMin !== null && parsedMax !== null && parsedMin > parsedMax ? parsedMax : parsedMin;
    const normalizedMax = parsedMin !== null && parsedMax !== null && parsedMin > parsedMax ? parsedMin : parsedMax;
    const hasPriceFilter = this.hasCustomPriceSelection;

    this.apply.emit({
      min: hasPriceFilter && normalizedMin > this.priceRangeMin ? normalizedMin : null,
      max: hasPriceFilter && normalizedMax < this.priceRangeMax ? normalizedMax : null,
      inStockOnly: inStockOnly !== false,
      petId: (petId || '').trim() || null,
      category: (category || '').trim() || null,
      subcategory: (subcategory || '').trim() || null,
      brandId: this.parseNumber(brandId),
      form: (form || '').trim() || null,
      proteinSource: (proteinSource || '').trim() || null,
      specieId: this.parseNumber(specieId),
      lifeStageId: this.parseNumber(lifeStageId),
      dietTagId: this.parseNumber(dietTagId),
      healthConditionId: this.parseNumber(healthConditionId),
      ingredientId: this.parseNumber(ingredientId),
    });
  }

  get activeCount(): number {
    const value = this.form.getRawValue();
    const minCount = this.selectedPriceMin > this.priceRangeMin ? 1 : 0;
    const maxCount = this.selectedPriceMax < this.priceRangeMax ? 1 : 0;
    const stockCount = value.inStockOnly === false ? 1 : 0;
    const petCount = value.petId ? 1 : 0;
    const brandCount = value.brandId ? 1 : 0;
    const formCount = value.form ? 1 : 0;
    const proteinCount = value.proteinSource ? 1 : 0;
    const specieCount = value.specieId ? 1 : 0;
    const lifeStageCount = value.lifeStageId ? 1 : 0;
    const dietCount = value.dietTagId ? 1 : 0;
    const healthCount = value.healthConditionId ? 1 : 0;
    const ingredientCount = value.ingredientId ? 1 : 0;

    return minCount + maxCount + stockCount + petCount + brandCount + formCount
      + proteinCount + specieCount + lifeStageCount + dietCount + healthCount + ingredientCount;
  }

  private parseNumber(value: number | string | null | undefined): number | null {
    if (value === null || value === undefined) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private resolvePriceSelection(minValue?: number | string | null, maxValue?: number | string | null): { min: number; max: number } {
    const floor = this.priceRangeMin;
    const ceil = this.priceRangeMax;
    if (ceil <= floor) {
      return { min: floor, max: floor };
    }

    let min = this.parseNumber(minValue) ?? floor;
    let max = this.parseNumber(maxValue) ?? ceil;
    min = this.clamp(min, floor, ceil);
    max = this.clamp(max, floor, ceil);

    if (min > max) {
      [min, max] = [max, min];
    }

    return { min, max };
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }

  private syncFromState(): void {
    const priceSelection = this.resolvePriceSelection(
      this.state.min ?? null,
      this.state.max ?? null,
    );

    this.form.setValue(
      {
        min: priceSelection.min,
        max: priceSelection.max,
        inStockOnly: this.state.inStockOnly !== false,
        petId: this.state.petId ?? null,
        category: this.state.category ?? null,
        subcategory: this.state.subcategory ?? null,
        brandId: this.state.brandId ?? null,
        form: this.state.form ?? null,
        proteinSource: this.state.proteinSource ?? null,
        specieId: this.state.specieId ?? null,
        lifeStageId: this.state.lifeStageId ?? null,
        dietTagId: this.state.dietTagId ?? null,
        healthConditionId: this.state.healthConditionId ?? null,
        ingredientId: this.state.ingredientId ?? null,
      },
      { emitEvent: false }
    );

    this.priceMinSelection = priceSelection.min;
    this.priceMaxSelection = priceSelection.max;
  }

  private syncPriceSelectionToCurrentRange(): void {
    const normalized = this.resolvePriceSelection(
      this.state.min ?? this.priceMinSelection ?? null,
      this.state.max ?? this.priceMaxSelection ?? null,
    );
    this.priceMinSelection = normalized.min;
    this.priceMaxSelection = normalized.max;
    this.form.patchValue(
      {
        min: normalized.min,
        max: normalized.max,
      },
      { emitEvent: false }
    );
  }

  private updatePriceSelection(thumb: 'min' | 'max', rawValue: number): void {
    if (thumb === 'min') {
      const next = this.clamp(rawValue, this.priceRangeMin, this.priceMaxSelection);
      this.priceMinSelection = next;
      this.form.patchValue({ min: next }, { emitEvent: false });
      return;
    }

    const next = this.clamp(rawValue, this.priceMinSelection, this.priceRangeMax);
    this.priceMaxSelection = next;
    this.form.patchValue({ max: next }, { emitEvent: false });
  }

  private resolvePriceValueFromClientX(clientX: number): number {
    const track = this.priceSliderTrack?.nativeElement;
    if (!track) {
      return this.priceMinSelection;
    }

    const rect = track.getBoundingClientRect();
    if (!rect.width) {
      return this.priceMinSelection;
    }

    const ratio = this.clamp((clientX - rect.left) / rect.width, 0, 1);
    const value = this.priceRangeMin + ratio * (this.priceRangeMax - this.priceRangeMin);
    return Math.round(value);
  }
}
