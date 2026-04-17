import { Component, ElementRef, EventEmitter, HostListener, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { Subscription } from 'rxjs';
import { StorefrontCatalogFilterDefinition, StorefrontCountedTaxonomyItem, StorefrontProductFacets } from '../../../../core/models/storefront.models';
import { StorefrontApiService } from '../../../../core/services/storefront-api.service';
import { DIET_LABEL, LIFESTAGE_LABEL, Pet, SPECIES_LABEL } from '../../../pets/models/pet.models';

export interface FilterState {
  min?: number | null;
  max?: number | null;
  inStockOnly: boolean;
  petId?: string | null;
  category?: string | null;
  subcategory?: string | null;
  brandIds?: number[];
  forms?: string[];
  proteinSources?: string[];
  specieIds?: number[];
  lifeStageIds?: number[];
  dietTagIds?: number[];
  healthConditionIds?: number[];
  ingredientIds?: number[];
}

export type DrawerFacetControlKey =
  | 'form'
  | 'proteinSource'
  | 'specieId'
  | 'lifeStageId'
  | 'dietTagId'
  | 'healthConditionId'
  | 'ingredientId';

type StringFilterControlName = 'forms' | 'proteinSources';
type NumericFilterControlName =
  | 'brandIds'
  | 'specieIds'
  | 'lifeStageIds'
  | 'dietTagIds'
  | 'healthConditionIds'
  | 'ingredientIds';
type FiltersPanelMode = 'drawer' | 'sidebar';

@Component({
  standalone: false,
  selector: 'app-filters-drawer',
  templateUrl: './filters-drawer.component.html',
  styleUrls: ['./filters-drawer.component.scss']
})
export class FiltersDrawerComponent implements OnChanges, OnInit, OnDestroy {
  private readonly autoApplyDelayMs = 180;
  private priceMinSelection = 0;
  private priceMaxSelection = 0;
  private draggingPriceThumb: 'min' | 'max' | null = null;
  private autoApplyTimer: ReturnType<typeof setTimeout> | null = null;
  private formChangesSub?: Subscription;

  @ViewChild('priceSliderTrack')
  private priceSliderTrack?: ElementRef<HTMLDivElement>;

  @Input() open = false;
  @Input() mode: FiltersPanelMode = 'drawer';
  @Input() state: FilterState = {
    min: null,
    max: null,
    inStockOnly: true,
    petId: null,
    category: null,
    subcategory: null,
    brandIds: [],
    forms: [],
    proteinSources: [],
    specieIds: [],
    lifeStageIds: [],
    dietTagIds: [],
    healthConditionIds: [],
    ingredientIds: [],
  };
  @Input() pets: Pet[] = [];
  @Input() showPetFilter = false;
  @Input() categories: Array<{ value: string; label: string }> = [];
  @Input() subcategories: Array<{ value: string; label: string; count: number; suggested?: boolean }> = [];
  @Input() facets: StorefrontProductFacets | null = null;
  @Input() priceRangeBounds: { min: number; max: number } | null = null;
  @Input() lockBiologyFilters = false;
  @Input() applicableFilterKeys: string[] | null = null;
  @Input() petDerivedFilterIds: { specieIds: number[]; lifeStageIds: number[]; dietTagIds: number[] } = {
    specieIds: [],
    lifeStageIds: [],
    dietTagIds: [],
  };
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
  @Input() technicalFilterDefinitions: StorefrontCatalogFilterDefinition[] = [];

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
    brandIds: this.fb.nonNullable.control<number[]>([]),
    forms: this.fb.nonNullable.control<string[]>([]),
    proteinSources: this.fb.nonNullable.control<string[]>([]),
    specieIds: this.fb.nonNullable.control<number[]>([]),
    lifeStageIds: this.fb.nonNullable.control<number[]>([]),
    dietTagIds: this.fb.nonNullable.control<number[]>([]),
    healthConditionIds: this.fb.nonNullable.control<number[]>([]),
    ingredientIds: this.fb.nonNullable.control<number[]>([]),
  });

  constructor(
    private fb: FormBuilder,
    private storefrontApi: StorefrontApiService
  ) {}

  ngOnInit(): void {
    this.formChangesSub = this.form.valueChanges.subscribe(() => {
      this.scheduleAutoApply();
    });
  }

  ngOnDestroy(): void {
    this.clearAutoApplyTimer();
    this.formChangesSub?.unsubscribe();
  }

  get isDrawerMode(): boolean {
    return this.mode === 'drawer';
  }

  speciesEmoji(species: Pet['species']): string {
    const map: Record<NonNullable<Pet['species']>, string> = {
      dog: '🐕',
      cat: '🐈',
      bird: '🐦',
      fish: '🐟',
      reptile: '🦎',
      'small-pet': '🐹',
      other: '🐾',
    };
    return map[species] ?? '🐾';
  }

  clearPetFilter(): void {
    this.form.controls.petId.setValue(null);
  }

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
      return 'El perfil elegido usa la especie como filtro principal y toma etapa, peso, preferencias y alertas como guia de compatibilidad.';
    }

    const parts = [
      `${pet.name} esta definiendo el contexto del catalogo.`,
      pet.lifeStage ? `Etapa de referencia: ${LIFESTAGE_LABEL[pet.lifeStage].toLowerCase()}.` : '',
      Number.isFinite(Number(pet.weightKg)) ? `Peso de referencia: ${Number(pet.weightKg)} kg.` : '',
      pet.diet?.length ? `Preferencias sugeridas: ${pet.diet.slice(0, 2).map((entry) => DIET_LABEL[entry]).join(', ').toLowerCase()}.` : '',
      pet.allergies?.length ? `Alertas revisadas: ${pet.allergies.slice(0, 2).join(', ')}.` : '',
    ].filter(Boolean);

    return parts.join(' ');
  }

  get selectedBrandCount(): number {
    return this.normalizeIdList(this.form.controls.brandIds.value).length;
  }

  selectedStringFilterCount(controlName: StringFilterControlName): number {
    return this.getStringArrayControlValue(controlName).length;
  }

  selectedIdFilterCount(controlName: NumericFilterControlName): number {
    return this.getIdArrayControlValue(controlName).length;
  }

  showFacetControl(control: DrawerFacetControlKey): boolean {
    return (this.visibleFacetControls || []).includes(control);
  }

  showFilter(key: string): boolean {
    if (this.applicableFilterKeys === null) return true;
    return this.applicableFilterKeys.includes(key);
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
    this.emitCurrentState();
  }

  get activeCount(): number {
    const value = this.form.getRawValue();
    const minCount = this.selectedPriceMin > this.priceRangeMin ? 1 : 0;
    const maxCount = this.selectedPriceMax < this.priceRangeMax ? 1 : 0;
    const stockCount = value.inStockOnly === false ? 1 : 0;
    const petCount = value.petId ? 1 : 0;
    const brandCount = this.normalizeIdList(value.brandIds).length ? 1 : 0;
    const formCount = this.normalizeTextList(value.forms).length ? 1 : 0;
    const proteinCount = this.normalizeTextList(value.proteinSources).length ? 1 : 0;
    const specieCount = this.normalizeIdList(value.specieIds).length ? 1 : 0;
    const lifeStageCount = this.normalizeIdList(value.lifeStageIds).length ? 1 : 0;
    const dietCount = this.normalizeIdList(value.dietTagIds).length ? 1 : 0;
    const healthCount = this.normalizeIdList(value.healthConditionIds).length ? 1 : 0;
    const ingredientCount = this.normalizeIdList(value.ingredientIds).length ? 1 : 0;

    return minCount + maxCount + stockCount + petCount + brandCount + formCount
      + proteinCount + specieCount + lifeStageCount + dietCount + healthCount + ingredientCount;
  }

  onCloseRequested(): void {
    this.close.emit();
  }

  onClearRequested(): void {
    this.clearAutoApplyTimer();
    this.clear.emit();
  }

  isBrandDisabled(item: StorefrontCountedTaxonomyItem): boolean {
    return !this.isBrandSelected(item.id) && Number(item.count || 0) <= 0;
  }

  isStringFilterDisabled(controlName: StringFilterControlName, item: { value: string; count: number }): boolean {
    return !this.isStringFilterSelected(controlName, item.value) && Number(item.count || 0) <= 0;
  }

  isIdFilterDisabled(controlName: NumericFilterControlName, item: StorefrontCountedTaxonomyItem): boolean {
    return !this.isIdFilterSelected(controlName, item.id) && Number(item.count || 0) <= 0;
  }

  getOptionCountLabel(count?: number | null): string {
    const numeric = Number(count || 0);
    return numeric > 0 ? String(numeric) : '0';
  }

  private emitCurrentState(): void {
    const {
      inStockOnly,
      petId,
      category,
      subcategory,
      brandIds,
      forms,
      proteinSources,
      specieIds,
      lifeStageIds,
      dietTagIds,
      healthConditionIds,
      ingredientIds,
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
      brandIds: this.normalizeIdList(brandIds),
      forms: this.normalizeTextList(forms),
      proteinSources: this.normalizeTextList(proteinSources),
      specieIds: this.normalizeIdList(specieIds),
      lifeStageIds: this.normalizeIdList(lifeStageIds),
      dietTagIds: this.normalizeIdList(dietTagIds),
      healthConditionIds: this.normalizeIdList(healthConditionIds),
      ingredientIds: this.normalizeIdList(ingredientIds),
    });
  }

  private scheduleAutoApply(): void {
    this.clearAutoApplyTimer();
    this.autoApplyTimer = setTimeout(() => {
      this.autoApplyTimer = null;
      this.emitCurrentState();
    }, this.autoApplyDelayMs);
  }

  private clearAutoApplyTimer(): void {
    if (this.autoApplyTimer) {
      clearTimeout(this.autoApplyTimer);
      this.autoApplyTimer = null;
    }
  }

  trackByBrandId(_: number, item: StorefrontCountedTaxonomyItem): number {
    return Number(item.id || 0);
  }

  isBrandSelected(brandId: number): boolean {
    return this.normalizeIdList(this.form.controls.brandIds.value).includes(Number(brandId));
  }

  onBrandToggle(brandId: number, event?: Event): void {
    const input = event?.target instanceof HTMLInputElement ? event.target : null;
    const selected = this.normalizeIdList(this.form.controls.brandIds.value);
    const targetId = Number(brandId);
    const shouldSelect = input ? input.checked : !selected.includes(targetId);
    const next = shouldSelect
      ? [...selected, targetId]
      : selected.filter((value) => value !== targetId);

    this.patchArrayControl('brandIds', this.normalizeIdList(next));
  }

  clearBrandSelection(): void {
    this.patchArrayControl('brandIds', []);
  }

  isStringFilterSelected(controlName: StringFilterControlName, value: string): boolean {
    return this.getStringArrayControlValue(controlName).includes(String(value || '').trim());
  }

  isIdFilterSelected(controlName: NumericFilterControlName, value: number): boolean {
    if (this.getIdArrayControlValue(controlName).includes(Number(value))) return true;
    // También marcar como seleccionado si viene del perfil de la mascota activa
    if (this.lockBiologyFilters) {
      if (controlName === 'specieIds') return this.petDerivedFilterIds.specieIds.includes(Number(value));
      if (controlName === 'lifeStageIds') return this.petDerivedFilterIds.lifeStageIds.includes(Number(value));
      if (controlName === 'dietTagIds') return this.petDerivedFilterIds.dietTagIds.includes(Number(value));
    }
    return false;
  }

  get lockDietFilters(): boolean {
    return this.lockBiologyFilters;
  }

  onStringFilterToggle(controlName: StringFilterControlName, value: string, event?: Event): void {
    const input = event?.target instanceof HTMLInputElement ? event.target : null;
    const selected = this.getStringArrayControlValue(controlName);
    const targetValue = String(value || '').trim();
    if (!targetValue) return;

    const shouldSelect = input ? input.checked : !selected.includes(targetValue);
    const next = shouldSelect
      ? [...selected, targetValue]
      : selected.filter((entry) => entry !== targetValue);

    this.patchArrayControl(controlName, this.normalizeTextList(next));
  }

  onIdFilterToggle(controlName: NumericFilterControlName, value: number, event?: Event): void {
    const input = event?.target instanceof HTMLInputElement ? event.target : null;
    const selected = this.getIdArrayControlValue(controlName);
    const targetValue = Number(value);
    if (!Number.isFinite(targetValue) || targetValue <= 0) return;

    const shouldSelect = input ? input.checked : !selected.includes(targetValue);
    const next = shouldSelect
      ? [...selected, targetValue]
      : selected.filter((entry) => entry !== targetValue);

    this.patchArrayControl(controlName, this.normalizeIdList(next));
  }

  clearStringFilterSelection(controlName: StringFilterControlName): void {
    this.patchArrayControl(controlName, []);
  }

  clearIdFilterSelection(controlName: NumericFilterControlName): void {
    this.patchArrayControl(controlName, []);
  }

  trackByFacetValue(_: number, item: { value: string }): string {
    return String(item.value || '');
  }

  trackByTechnicalFilterKey(_: number, item: StorefrontCatalogFilterDefinition): string {
    return String(item.key || '');
  }

  resolveBrandLogoUrl(item: StorefrontCountedTaxonomyItem): string {
    const media = item?.logo;
    const url =
      media?.formats?.['small']?.url ||
      media?.formats?.['thumbnail']?.url ||
      media?.url ||
      '';

    return this.storefrontApi.resolveMediaUrl(url);
  }

  getBrandInitial(name?: string | null): string {
    return String(name || '').trim().charAt(0).toUpperCase() || 'M';
  }

  private parseNumber(value: number | string | null | undefined): number | null {
    if (value === null || value === undefined) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private normalizeIdList(values?: Array<number | string | null | undefined> | null): number[] {
    return Array.from(
      new Set(
        (values || [])
          .map((value) => this.parseNumber(value))
          .filter((value): value is number => value !== null && value > 0)
      )
    ).sort((a, b) => a - b);
  }

  private normalizeTextList(values?: Array<string | null | undefined> | null): string[] {
    return Array.from(
      new Set(
        (values || [])
          .map((value) => String(value || '').trim())
          .filter(Boolean)
      )
    );
  }

  private getStringArrayControlValue(controlName: StringFilterControlName): string[] {
    const controls = this.form.controls as unknown as Record<StringFilterControlName, { value: string[] }>;
    return this.normalizeTextList(controls[controlName]?.value || []);
  }

  private getIdArrayControlValue(controlName: NumericFilterControlName): number[] {
    const controls = this.form.controls as unknown as Record<NumericFilterControlName, { value: number[] }>;
    return this.normalizeIdList(controls[controlName]?.value || []);
  }

  private patchArrayControl(
    controlName: 'brandIds' | StringFilterControlName | NumericFilterControlName,
    value: string[] | number[]
  ): void {
    this.form.patchValue(
      { [controlName]: Array.isArray(value) ? [...value] : value } as never,
      { emitEvent: false }
    );
    this.scheduleAutoApply();
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
    this.clearAutoApplyTimer();
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
        brandIds: this.normalizeIdList(this.state.brandIds),
        forms: this.normalizeTextList(this.state.forms),
        proteinSources: this.normalizeTextList(this.state.proteinSources),
        specieIds: this.normalizeIdList(this.state.specieIds),
        lifeStageIds: this.normalizeIdList(this.state.lifeStageIds),
        dietTagIds: this.normalizeIdList(this.state.dietTagIds),
        healthConditionIds: this.normalizeIdList(this.state.healthConditionIds),
        ingredientIds: this.normalizeIdList(this.state.ingredientIds),
      },
      { emitEvent: false }
    );

    this.priceMinSelection = priceSelection.min;
    this.priceMaxSelection = priceSelection.max;
  }

  private syncPriceSelectionToCurrentRange(): void {
    // Treat 0 as "not yet initialized" so resolvePriceSelection falls back to
    // the range floor/ceil instead of clamping 0 up to the floor value.
    const prevMin = this.priceMinSelection > 0 ? this.priceMinSelection : null;
    const prevMax = this.priceMaxSelection > 0 ? this.priceMaxSelection : null;
    const normalized = this.resolvePriceSelection(
      this.state.min ?? prevMin,
      this.state.max ?? prevMax,
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
      this.form.patchValue({ min: next });
      return;
    }

    const next = this.clamp(rawValue, this.priceMinSelection, this.priceRangeMax);
    this.priceMaxSelection = next;
    this.form.patchValue({ max: next });
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
