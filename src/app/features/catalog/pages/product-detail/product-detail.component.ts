import { Location } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, firstValueFrom } from 'rxjs';
import { take, takeUntil, withLatestFrom } from 'rxjs/operators';
import { AppHttpError } from '../../../../core/models/http.models';
import {
  StorefrontProduct,
  StorefrontProductVariant,
  StorefrontRichTextNode,
  StorefrontTaxonomyItem,
} from '../../../../core/models/storefront.models';
import { SeoService } from '../../../../core/services/seo.service';
import { StorefrontApiService } from '../../../../core/services/storefront-api.service';
import { CartStateService } from '../../../cart/services/cart-state.service';
import { MembershipsService } from '../../../memberships/services/memberships.service';
import { Pet } from '../../../pets/models/pet.models';
import { PetsStateService } from '../../../pets/services/pet-state.service';
import { Product } from '../../models/product.model';

interface ProductFact {
  label: string;
  value: string;
  note: string;
}

interface ProductSpec {
  label: string;
  value: string;
}

interface PetRecommendation {
  petId: string;
  petName: string;
  status: 'recommended' | 'caution' | 'not_recommended';
  title: string;
  detail: string;
}

@Component({
  standalone: false,
  selector: 'app-product-detail',
  templateUrl: './product-detail.component.html',
  styleUrls: ['./product-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductDetailComponent implements OnInit, OnDestroy {
  private readonly transientMessageMs = 3000;
  private readonly maxWeightFallback = 999;
  private readonly currencyFormatter = new Intl.NumberFormat('es-GT', {
    style: 'currency',
    currency: 'GTQ',
    currencyDisplay: 'narrowSymbol',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  loading = true;
  adding = false;
  errorMsg = '';
  addFeedback = '';
  cartError = '';
  leadText = '';
  descriptionHtml = '';
  characteristicsHtml = '';
  benefitsHtml = '';
  activeTab: 'description' | 'characteristics' | 'benefits' = 'description';
  freeShippingThreshold = 500;

  product: StorefrontProduct | null = null;
  related: Product[] = [];
  petRecommendations: PetRecommendation[] = [];
  gallery: { url: string; alt: string }[] = [];
  selectedImage = '';
  selectedVariantId = '';
  qty = 1;
  membershipPlanId: 'free' | 'premium' = this.memberships.currentPlan;

  private currentPets: Pet[] = [];
  private readonly destroy$ = new Subject<void>();
  private requestToken = 0;
  private addFeedbackTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private storefrontApi: StorefrontApiService,
    private cart: CartStateService,
    private memberships: MembershipsService,
    private petsState: PetsStateService,
    private seo: SeoService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.storefrontApi.getStorefrontSettings()
      .pipe(take(1), takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          const threshold = Number(response.data?.freeShippingThreshold);
          if (Number.isFinite(threshold) && threshold > 0) {
            this.freeShippingThreshold = threshold;
            this.cdr.markForCheck();
          }
        },
        error: () => undefined,
      });

    this.petsState.pets$
      .pipe(takeUntil(this.destroy$))
      .subscribe((pets) => {
        this.currentPets = pets;
        this.updatePetRecommendations();
        this.cdr.markForCheck();
      });

    this.memberships.currentPlan$
      .pipe(takeUntil(this.destroy$))
      .subscribe((planId) => {
        this.membershipPlanId = planId;
        this.cdr.markForCheck();
      });

    this.route.paramMap
      .pipe(takeUntil(this.destroy$))
      .subscribe((params) => {
        const slug = (params.get('slug') || '').trim();
        if (!slug) {
          this.errorMsg = 'Producto no encontrado.';
          this.product = null;
          this.loading = false;
          this.cdr.markForCheck();
          return;
        }

        this.loadProduct(slug);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    if (this.addFeedbackTimer) {
      clearTimeout(this.addFeedbackTimer);
      this.addFeedbackTimer = null;
    }
  }

  get inStock(): boolean {
    return this.activeStock > 0;
  }

  get presentationOptions(): StorefrontProductVariant[] {
    return this.product?.variants || [];
  }

  get selectedVariant(): StorefrontProductVariant | null {
    const variants = this.presentationOptions;
    if (!variants.length) return null;

    return variants.find((variant) => variant.id === this.selectedVariantId)
      || variants.find((variant) => variant.isDefault)
      || variants[0]
      || null;
  }

  get activePrice(): number {
    return Number(this.selectedVariant?.price ?? this.product?.price ?? 0);
  }

  get activeStock(): number {
    return Number(this.selectedVariant?.stock ?? this.product?.stock ?? 0);
  }

  get activePresentationLabel(): string {
    return (this.selectedVariant?.label || '').trim();
  }

  get brandLogoUrl(): string {
    const logo = this.product?.brand?.logo;
    const rawUrl =
      logo?.formats?.['thumbnail']?.url ||
      logo?.url ||
      '';

    return this.storefrontApi.resolveMediaUrl(rawUrl);
  }

  get stockLabel(): string {
    const stock = this.activeStock;
    if (stock <= 0) return 'Sin stock';
    if (stock <= 5) return `Últimas ${stock} unidades`;
    return `${stock} unidades disponibles`;
  }

  get stockTone(): 'none' | 'low' | 'ok' {
    const stock = this.activeStock;
    if (stock <= 0) return 'none';
    if (stock <= 5) return 'low';
    return 'ok';
  }

  get maxQty(): number {
    const stock = this.activeStock;
    if (stock <= 0) return 1;
    return Math.min(10, stock);
  }

  get membershipDiscountPct(): number {
    return this.memberships.getPlan('premium').productDiscountPct;
  }

  get membershipPrice(): number {
    return this.memberships.priceWithMembership(this.activePrice, 'premium');
  }

  get isPremiumMember(): boolean {
    return this.membershipPlanId === 'premium';
  }

  get compareAtPrice(): number | null {
    const currentPrice = this.activePrice;
    const compareAtPrice = Number(this.selectedVariant?.compareAtPrice ?? this.product?.compareAtPrice ?? 0);
    if (!Number.isFinite(compareAtPrice) || compareAtPrice <= currentPrice) {
      return null;
    }

    return compareAtPrice;
  }

  get discountPct(): number | null {
    const compareAtPrice = this.compareAtPrice;
    const currentPrice = this.activePrice;
    if (!compareAtPrice || currentPrice <= 0) {
      return null;
    }

    return Math.round(((compareAtPrice - currentPrice) / compareAtPrice) * 100);
  }

  get categoryLabel(): string {
    return this.resolveCategoryLabel(this.product?.category);
  }

  get subcategoryLabel(): string {
    return (this.product?.catalogCategory?.label || '').trim();
  }

  get heroTokens(): string[] {
    const product = this.product;
    if (!product) return [];

    return Array.from(
      new Set([
        this.resolveFormLabel(product.form),
        this.resolveProteinLabel(product.proteinSource),
        ...this.uniqueNames(product.speciesSupported),
        ...this.uniqueNames(product.lifeStages),
        ...this.uniqueNames(product.health_claims),
        ...this.uniqueNames(product.diet_tags),
      ].map((value) => String(value || '').trim()).filter(Boolean))
    ).slice(0, 5);
  }

  get priceSavings(): number | null {
    const compareAtPrice = this.compareAtPrice;
    if (!compareAtPrice) return null;

    const savings = compareAtPrice - this.activePrice;
    return savings > 0 ? savings : null;
  }

  get badgeLabel(): string | null {
    const badge = String(this.product?.badge || '').trim().toUpperCase();
    if (badge === 'TOP') return 'Más vendido';
    if (badge === 'NEW') return 'Nuevo';
    if (badge === 'SALE') return 'Oferta';
    return null;
  }

  get recommendedPetRecommendations(): PetRecommendation[] {
    return this.petRecommendations.filter((item) => item.status === 'recommended');
  }

  get petCompatibilityTitle(): string {
    const matches = this.recommendedPetRecommendations;
    if (matches.length === 1) {
      return `Recomendado para ${matches[0].petName}`;
    }

    if (matches.length > 1) {
      return `Hace match con ${matches.length} mascotas`;
    }

    return 'Revisa si le conviene a tus mascotas';
  }

  get petCompatibilitySummary(): string {
    const matches = this.recommendedPetRecommendations;
    if (matches.length) {
      return 'Tomamos en cuenta especie, etapa de vida, peso y alertas registradas para darte una señal rápida antes de comprar.';
    }

    return 'Comparamos este producto contra los perfiles que ya registraste para ayudarte a decidir mejor.';
  }

  get supportHighlights(): Array<{ icon: string; title: string; detail: string }> {
    const petHighlight = this.currentPets.length
      ? {
          icon: 'pets',
          title: 'Match con tus mascotas',
          detail: 'Comparamos especie, etapa y alertas para ayudarte a comprar con más certeza.',
        }
      : {
          icon: 'pets',
          title: 'Perfiles de mascota',
          detail: 'Crea perfiles para recibir recomendaciones y filtros más útiles al comprar.',
        };

    return [
      {
        icon: 'local_shipping',
        title: 'Envío gratis',
        detail: `Disponible desde ${this.formatCurrency(this.freeShippingThreshold)}`,
      },
      petHighlight,
      {
        icon: 'verified',
        title: 'Compra clara en Guatemala',
        detail: 'Stock visible, precios en quetzales y fichas pensadas para decidir mejor.',
      },
    ];
  }

  get tags(): string[] {
    const product = this.product;
    if (!product) return [];

    const byName = (list?: { name?: string }[]) =>
      (list || []).map((item) => (item.name || '').trim()).filter(Boolean);

    return Array.from(
      new Set([
        ...(product.category ? [this.resolveCategoryLabel(product.category)] : []),
        ...(product.brand?.name ? [product.brand.name] : []),
        ...byName(product.speciesSupported),
        ...byName(product.lifeStages),
        ...byName(product.diet_tags),
        ...byName(product.health_claims),
      ].filter(Boolean))
    );
  }

  get detailFacts(): ProductFact[] {
    const product = this.product;
    if (!product) return [];

    const facts: ProductFact[] = [];
    const audience = this.resolveAudienceLabel(product);
    const formula = [this.resolveFormLabel(product.form), this.resolveProteinLabel(product.proteinSource)]
      .filter(Boolean)
      .join(' · ');
    const weightRange = this.resolveWeightRangeLabel(product);
    const ingredientNames = this.ingredientNames;

    if (audience) {
      facts.push({
        label: 'Ideal para',
        value: audience,
        note: 'Resume a qué tipo de mascota está orientado este producto.',
      });
    }

    if (formula) {
      facts.push({
        label: 'Fórmula',
        value: formula,
        note: 'Da contexto rápido sobre el formato y la proteína principal.',
      });
    }

    if (weightRange) {
      facts.push({
        label: 'Rango sugerido',
        value: weightRange,
        note: 'Referencia útil cuando el producto está segmentado por tamaño o peso.',
      });
    }

    if (ingredientNames.length) {
      facts.push({
        label: 'Ingredientes',
        value: ingredientNames.slice(0, 3).join(', '),
        note: ingredientNames.length > 3
          ? `y ${ingredientNames.length - 3} más vinculados en catálogo.`
          : 'Relaciones listas para enriquecer la ficha.',
      });
    }

    return facts.slice(0, 4);
  }

  get productSpecs(): ProductSpec[] {
    const product = this.product;
    if (!product) return [];

    const specs: ProductSpec[] = [];
    const pushSpec = (label: string, value?: string | null) => {
      const normalized = (value || '').trim();
      if (normalized) {
        specs.push({ label, value: normalized });
      }
    };

    pushSpec('Marca', product.brand?.name || '');
    pushSpec('Categoría', this.resolveCategoryLabel(product.category));
    pushSpec('Presentación', this.activePresentationLabel);
    pushSpec('Formato', this.resolveFormLabel(product.form));
    pushSpec('Proteína', this.resolveProteinLabel(product.proteinSource));
    pushSpec('Especies', this.joinNames(product.speciesSupported));
    pushSpec('Etapas', this.joinNames(product.lifeStages));
    pushSpec('Peso recomendado', this.resolveWeightRangeLabel(product));
    pushSpec('Stock actual', this.stockLabel);

    return specs;
  }

  get ingredientNames(): string[] {
    return this.uniqueNames(this.product?.ingredients);
  }

  get wellnessTags(): string[] {
    return Array.from(
      new Set([
        ...this.uniqueNames(this.product?.diet_tags),
        ...this.uniqueNames(this.product?.health_claims),
      ])
    );
  }

  get hasCharacteristicsContent(): boolean {
    return Boolean(
      this.characteristicsHtml
      || this.detailFacts.length
      || this.productSpecs.length
      || this.ingredientNames.length
      || this.tags.length
    );
  }

  get hasBenefitsContent(): boolean {
    return Boolean(this.benefitsHtml || this.wellnessTags.length || this.brandSummary);
  }

  get brandSummary(): string {
    const product = this.product;
    if (!product?.brand?.name) return '';

    const form = this.resolveFormLabel(product.form)?.toLowerCase();
    const audience = this.resolveAudienceLabel(product);
    const parts = [
      `${product.brand.name} participa en este producto dentro del catálogo.`,
      form ? `Se presenta como ${form}.` : '',
      audience ? `Está orientado a ${audience.toLowerCase()}.` : '',
    ].filter(Boolean);

    return parts.join(' ');
  }

  selectImage(url: string): void {
    this.selectedImage = url;
  }

  goBack(): void {
    const hasHistory = typeof window !== 'undefined' && window.history.length > 1;
    if (hasHistory) {
      this.location.back();
      return;
    }

    void this.router.navigate(['/catalog']);
  }

  selectVariant(variantId: string): void {
    this.selectedVariantId = variantId;
    this.qty = Math.min(this.qty, this.maxQty);
  }

  decQty(): void {
    this.qty = Math.max(1, this.qty - 1);
  }

  incQty(): void {
    this.qty = Math.min(this.maxQty, this.qty + 1);
  }

  addToCart(): void {
    if (!this.product || !this.inStock) return;

    const variant = this.selectedVariant
      ? {
          id: this.selectedVariant.id,
          sku: this.selectedVariant.sku || null,
          label: this.selectedVariant.label,
          presentation: this.selectedVariant.presentation || null,
          size: this.selectedVariant.size || null,
        }
      : undefined;

    this.executeAddToCart(this.product.id, this.qty, 'Producto agregado al carrito.', variant);
  }

  setTab(tab: 'description' | 'characteristics' | 'benefits'): void {
    this.activeTab = tab;
    this.cdr.markForCheck();
  }

  addRelatedToCart(product: Product, variantId?: string): void {
    const variant = variantId ? product.variants?.find((item) => item.id === variantId) : undefined;

    this.executeAddToCart(
      product.id,
      1,
      `${product.name} agregado al carrito.`,
      variant
        ? { id: variant.id, label: variant.label, presentation: null, size: null, sku: null }
        : undefined
    );
  }

  private loadProduct(slug: string): void {
    const token = ++this.requestToken;
    this.loading = true;
    this.errorMsg = '';
    this.product = null;
    this.related = [];
    this.gallery = [];
    this.selectedImage = '';
    this.selectedVariantId = '';
    this.qty = 1;
    this.leadText = '';
    this.descriptionHtml = '';
    this.characteristicsHtml = '';
    this.benefitsHtml = '';

    this.storefrontApi.getProduct(slug).subscribe({
      next: (response) => {
        if (token !== this.requestToken) return;

        const product = response.data;
        this.product = product;
        this.gallery = this.buildGallery(product);
        this.selectedImage = this.gallery[0]?.url || 'assets/images/products/placeholder.png';
        this.selectedVariantId = this.resolveInitialVariantId(product);
        this.qty = Math.min(this.qty, this.maxQty);
        this.leadText = this.resolveLeadText(product);
        this.descriptionHtml = this.renderDescriptionHtml(product.description);
        this.characteristicsHtml = this.renderDescriptionHtml(product.characteristics);
        this.benefitsHtml = this.renderDescriptionHtml(product.benefits);
        this.updatePetRecommendations();
        this.applyProductSeo(product);
        this.loading = false;
        this.cdr.markForCheck();

        void this.loadRelated(product, token);
      },
      error: (error: AppHttpError) => {
        if (token !== this.requestToken) return;
        this.loading = false;
        this.errorMsg = error?.message || 'No se pudo cargar este producto.';
        this.cdr.markForCheck();
      },
    });
  }

  private async loadRelated(product: StorefrontProduct, token: number): Promise<void> {
    try {
      const result = await firstValueFrom(
        this.storefrontApi.listProducts({
          category: product.category || undefined,
          page: 1,
          pageSize: 8,
          compact: true,
          inStock: true,
          sort: 'createdAt:desc',
          excludeId: product.id,
        })
      );

      if (token !== this.requestToken) return;

      this.related = (result?.data || [])
        .map((item) => ({
          id: String(item.id),
          documentId: item.documentId,
          slug: item.slug,
          name: item.name,
          price: Number(item.price || 0),
          oldPrice: Number(item.compareAtPrice || 0) > Number(item.price || 0)
            ? Number(item.compareAtPrice || 0)
            : undefined,
          image: this.resolveProductImage(item),
          badge: ((item.stock || 0) <= 5 && (item.stock || 0) > 0 ? 'TOP' : null) as Product['badge'],
          category: item.category || 'general',
          tags: [],
          stock: Number(item.stock || 0),
          variants: (item.variants || []).map((variant) => ({
            id: variant.id,
            label: variant.label || '',
            price: Number(variant.price || 0),
            compareAtPrice: Number(variant.compareAtPrice || 0) > Number(variant.price || 0)
              ? Number(variant.compareAtPrice)
              : undefined,
            stock: typeof variant.stock === 'number' ? variant.stock : null,
          })),
        }))
        .filter((item) => item.slug !== product.slug)
        .slice(0, 4);

      this.cdr.markForCheck();
    } catch {
      if (token !== this.requestToken) return;
      this.related = [];
      this.cdr.markForCheck();
    }
  }

  private buildGallery(product: StorefrontProduct): { url: string; alt: string }[] {
    const media = product.images || [];
    if (!media.length) {
      return [{ url: 'assets/images/products/placeholder.png', alt: product.name }];
    }

    return media.map((item, index) => {
      const url =
        item.formats?.['medium']?.url ||
        item.formats?.['small']?.url ||
        item.formats?.['thumbnail']?.url ||
        item.url ||
        '';

      return {
        url: this.storefrontApi.resolveMediaUrl(url) || 'assets/images/products/placeholder.png',
        alt: item.alternativeText || `${product.name} ${index + 1}`,
      };
    });
  }

  private resolveProductImage(product: StorefrontProduct): string {
    const media = product.images?.[0];
    const url =
      media?.formats?.['medium']?.url ||
      media?.formats?.['small']?.url ||
      media?.formats?.['thumbnail']?.url ||
      media?.url ||
      '';

    return this.storefrontApi.resolveMediaUrl(url) || 'assets/images/products/placeholder.png';
  }

  private executeAddToCart(
    productId: number | string,
    qty: number,
    successMessage: string,
    variant?: { id: string; sku?: string | null; label: string; presentation?: string | null; size?: string | null }
  ): void {
    if (this.adding) return;

    this.adding = true;
    this.addFeedback = '';
    this.cartError = '';

    this.cart.addItem$(productId, qty, undefined, variant)
      .pipe(take(1), withLatestFrom(this.cart.error$), takeUntil(this.destroy$))
      .subscribe(([, error]) => {
        this.adding = false;

        if (error) {
          this.cartError = error;
          if (this.addFeedbackTimer) clearTimeout(this.addFeedbackTimer);
          this.addFeedbackTimer = setTimeout(() => {
            this.cartError = '';
            this.cdr.markForCheck();
          }, this.transientMessageMs);
          this.cdr.markForCheck();
          return;
        }

        this.addFeedback = successMessage;
        if (this.addFeedbackTimer) clearTimeout(this.addFeedbackTimer);
        this.addFeedbackTimer = setTimeout(() => {
          this.addFeedback = '';
          this.cdr.markForCheck();
        }, this.transientMessageMs);
        this.cdr.markForCheck();
      });
  }

  private resolveInitialVariantId(product: StorefrontProduct): string {
    const variants = product.variants || [];
    return variants.find((variant) => variant.isDefault)?.id || variants[0]?.id || '';
  }

  private resolveLeadText(product: StorefrontProduct): string {
    const extracted = this.extractPlainText(product.description).trim();
    if (extracted) {
      return extracted.length > 240 ? `${extracted.slice(0, 237).trim()}...` : extracted;
    }

    const audience = this.resolveAudienceLabel(product);
    const form = this.resolveFormLabel(product.form)?.toLowerCase();
    const protein = this.resolveProteinLabel(product.proteinSource)?.toLowerCase();
    const category = this.resolveCategoryLabel(product.category).toLowerCase();

    const parts = [
      `${product.name} es una opción de ${category} pensada para una compra más informada.`,
      form ? `Formato: ${form}.` : '',
      protein ? `Proteína principal: ${protein}.` : '',
      audience ? `Orientado a ${audience.toLowerCase()}.` : '',
    ].filter(Boolean);

    return parts.join(' ');
  }

  private renderDescriptionHtml(description: StorefrontProduct['description']): string {
    if (typeof description === 'string') {
      const normalized = description.trim();
      return normalized ? `<p>${this.escapeHtml(normalized)}</p>` : '';
    }

    if (!Array.isArray(description) || !description.length) {
      return '';
    }

    return description.map((node) => this.renderBlock(node)).filter(Boolean).join('');
  }

  private renderBlock(node: StorefrontRichTextNode | null | undefined): string {
    if (!node || typeof node !== 'object') return '';

    const type = (node.type || '').toLowerCase();
    const children = this.renderChildren(node.children);

    if (type === 'paragraph') {
      return children.trim() ? `<p>${children}</p>` : '';
    }

    if (type === 'heading') {
      const level = Math.min(6, Math.max(2, Number(node.level || 2)));
      return children.trim() ? `<h${level}>${children}</h${level}>` : '';
    }

    if (type === 'quote') {
      return children.trim() ? `<blockquote>${children}</blockquote>` : '';
    }

    if (type === 'code') {
      const text = this.escapeHtml(this.extractNodeText(node));
      return text ? `<pre><code>${text}</code></pre>` : '';
    }

    if (type === 'list') {
      const tag = node.format === 'ordered' ? 'ol' : 'ul';
      const items = (node.children || [])
        .map((child) => {
          if ((child?.type || '').toLowerCase() === 'list-item') {
            return `<li>${this.renderChildren(child.children)}</li>`;
          }

          const text = this.renderInlineNode(child);
          return text ? `<li>${text}</li>` : '';
        })
        .filter(Boolean)
        .join('');

      return items ? `<${tag}>${items}</${tag}>` : '';
    }

    return children.trim() ? `<p>${children}</p>` : '';
  }

  private renderChildren(nodes?: StorefrontRichTextNode[]): string {
    if (!Array.isArray(nodes) || !nodes.length) return '';
    return nodes.map((child) => this.renderInlineNode(child)).join('');
  }

  private renderInlineNode(node: StorefrontRichTextNode | null | undefined): string {
    if (!node || typeof node !== 'object') return '';

    const type = (node.type || '').toLowerCase();

    if (type === 'text' || (!type && typeof node.text === 'string')) {
      let text = this.escapeHtml(node.text || '');
      if (!text) return '';
      if (node.code) text = `<code>${text}</code>`;
      if (node.bold) text = `<strong>${text}</strong>`;
      if (node.italic) text = `<em>${text}</em>`;
      if (node.underline) text = `<u>${text}</u>`;
      if (node.strikethrough) text = `<s>${text}</s>`;
      return text;
    }

    if (type === 'link') {
      const href = this.escapeAttribute(node.url || '#');
      const content = this.renderChildren(node.children) || this.escapeHtml(node.url || '');
      return `<a href="${href}" target="_blank" rel="noopener">${content}</a>`;
    }

    if (type === 'list-item') {
      return this.renderChildren(node.children);
    }

    if (type === 'linebreak') {
      return '<br />';
    }

    return this.renderChildren(node.children);
  }

  private extractPlainText(value: StorefrontProduct['description']): string {
    if (typeof value === 'string') {
      return value;
    }

    if (!Array.isArray(value)) {
      return '';
    }

    return value
      .map((node) => this.extractNodeText(node))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private extractNodeText(node: StorefrontRichTextNode | null | undefined): string {
    if (!node || typeof node !== 'object') return '';
    const ownText = typeof node.text === 'string' ? node.text : '';
    const childText = Array.isArray(node.children)
      ? node.children.map((child) => this.extractNodeText(child)).join(' ')
      : '';
    return `${ownText} ${childText}`.replace(/\s+/g, ' ').trim();
  }

  private uniqueNames(items?: StorefrontTaxonomyItem[]): string[] {
    return Array.from(
      new Set(
        (items || [])
          .map((item) => (item?.name || '').trim())
          .filter(Boolean)
      )
    );
  }

  private joinNames(items?: StorefrontTaxonomyItem[]): string {
    return this.uniqueNames(items).join(', ');
  }

  private resolveAudienceLabel(product: StorefrontProduct): string {
    const species = this.joinNames(product.speciesSupported);
    const lifeStages = this.joinNames(product.lifeStages);

    if (species && lifeStages) {
      return `${species} en etapa ${lifeStages}`;
    }

    if (species) return species;
    if (lifeStages) return lifeStages;
    return '';
  }

  private resolveWeightRangeLabel(product: StorefrontProduct): string {
    const min = Number(product.weightMinKg);
    const max = Number(product.weightMaxKg);
    const hasMin = Number.isFinite(min) && min > 0;
    const hasMax = Number.isFinite(max) && max > 0 && max < this.maxWeightFallback;

    if (hasMin && hasMax) {
      return `${min} a ${max} kg`;
    }

    if (hasMin) {
      return `más de ${min} kg`;
    }

    if (hasMax) {
      return `hasta ${max} kg`;
    }

    return '';
  }

  private resolveCategoryLabel(category?: string | null): string {
    const map: Record<string, string> = {
      food: 'Alimento',
      treats: 'Snacks',
      hygiene: 'Higiene',
      health: 'Salud',
      accesories: 'Accesorios',
      other: 'Cuidado general',
    };

    return category ? map[category] || category : '';
  }

  private resolveFormLabel(form?: string | null): string {
    const map: Record<string, string> = {
      kibble: 'Croquetas',
      wet: 'Alimento húmedo',
      treat: 'Premio',
      supplement: 'Suplemento',
      accesory: 'Accesorio',
      hygiene: 'Cuidado e higiene',
    };

    return form ? map[form] || form : '';
  }

  private resolveProteinLabel(protein?: string | null): string {
    const map: Record<string, string> = {
      chicken: 'Pollo',
      beef: 'Res',
      fish: 'Pescado',
      lamb: 'Cordero',
      turkey: 'Pavo',
      insect: 'Proteína de insecto',
      plant: 'Proteína vegetal',
      mixed: 'Mezcla proteica',
    };

    return protein ? map[protein] || protein : '';
  }

  private formatCurrency(value: number): string {
    return this.currencyFormatter.format(Number(value || 0));
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private escapeAttribute(value: string): string {
    return this.escapeHtml(value);
  }

  private updatePetRecommendations(): void {
    if (!this.product || !this.currentPets.length) {
      this.petRecommendations = [];
      return;
    }

    this.petRecommendations = this.currentPets.map((pet) => this.buildPetRecommendation(pet, this.product as StorefrontProduct));
  }

  private buildPetRecommendation(pet: Pet, product: StorefrontProduct): PetRecommendation {
    const speciesTokens = this.normalizeKeywordSet(
      (product.speciesSupported || []).flatMap((item) => [item.name || '', item.slug || ''])
    );
    const lifeStageTokens = this.normalizeKeywordSet(
      (product.lifeStages || []).flatMap((item) => [item.name || '', item.slug || ''])
    );
    const ingredientTokens = this.normalizeKeywordSet([
      product.name,
      ...(product.ingredients || []).flatMap((item) => [item.name || '', item.slug || '']),
      ...(product.diet_tags || []).flatMap((item) => [item.name || '', item.slug || '']),
      ...(product.health_claims || []).flatMap((item) => [item.name || '', item.slug || '']),
    ]);

    const petSpeciesTokens = this.resolvePetSpeciesTokens(pet);
    const petLifeStageTokens = this.resolvePetLifeStageTokens(pet);
    const petAllergies = this.normalizeKeywordSet(pet.allergies || []);
    const allergyMatches = petAllergies.filter((term) => ingredientTokens.includes(term));

    const speciesMatch = !speciesTokens.length || petSpeciesTokens.some((token) => speciesTokens.includes(token));
    const lifeStageMatch = !lifeStageTokens.length || petLifeStageTokens.some((token) => lifeStageTokens.includes(token));
    const weightMatch = this.matchesWeightRange(product, pet.weightKg);

    if (!speciesMatch) {
      return {
        petId: pet.id,
        petName: pet.name,
        status: 'not_recommended',
        title: 'No recomendado',
        detail: 'La especie objetivo del producto no coincide con el perfil de tu mascota.',
      };
    }

    if (allergyMatches.length) {
      return {
        petId: pet.id,
        petName: pet.name,
        status: 'not_recommended',
        title: 'Revisar alergias',
        detail: `Podría contener ingredientes relacionados con: ${allergyMatches.slice(0, 2).join(', ')}.`,
      };
    }

    if (!lifeStageMatch || !weightMatch) {
      return {
        petId: pet.id,
        petName: pet.name,
        status: 'caution',
        title: 'Compatible con revisión',
        detail: 'La especie coincide, pero conviene revisar etapa de vida o rango de peso antes de comprar.',
      };
    }

    return {
      petId: pet.id,
      petName: pet.name,
      status: 'recommended',
      title: 'Buena opción para su perfil',
      detail: 'Coincide con la especie y no encontramos alertas claras por etapa, peso o alergias registradas.',
    };
  }

  private matchesWeightRange(product: StorefrontProduct, weightKg?: number): boolean {
    const petWeight = Number(weightKg);
    if (!Number.isFinite(petWeight) || petWeight <= 0) {
      return true;
    }

    const min = Number(product.weightMinKg);
    const max = Number(product.weightMaxKg);
    const hasMin = Number.isFinite(min) && min > 0;
    const hasMax = Number.isFinite(max) && max > 0 && max < this.maxWeightFallback;

    if (hasMin && petWeight < min) return false;
    if (hasMax && petWeight > max) return false;
    return true;
  }

  private resolvePetSpeciesTokens(pet: Pet): string[] {
    const map: Record<string, string[]> = {
      dog: ['perro', 'dog'],
      cat: ['gato', 'cat'],
      bird: ['ave', 'bird', 'loro'],
      fish: ['pez', 'peces', 'fish', 'acuario'],
      reptile: ['reptil', 'reptiles', 'reptile', 'tortuga', 'iguana', 'serpiente'],
      'small-pet': ['small', 'hamster', 'conejo', 'rabbit', 'cobayo', 'cuy', 'huron', 'chinchilla'],
      other: ['other'],
    };

    return map[pet.species] || [pet.species];
  }

  private resolvePetLifeStageTokens(pet: Pet): string[] {
    const map: Record<string, string[]> = {
      puppy: ['cachorro', 'puppy'],
      adult: ['adulto', 'adult'],
      senior: ['senior', 'anciano'],
    };

    return pet.lifeStage ? map[pet.lifeStage] || [pet.lifeStage] : [];
  }

  private normalizeKeywordSet(values: string[]): string[] {
    return Array.from(
      new Set(
        values
          .flatMap((value) =>
            String(value || '')
              .toLowerCase()
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .split(/[^a-z0-9]+/)
              .map((token) => token.trim())
          )
          .filter((token) => token.length >= 3)
      )
    );
  }

  private applyProductSeo(product: StorefrontProduct): void {
    const price = Number(product.price || 0);
    const image = this.gallery[0]?.url || this.selectedImage || 'assets/images/products/placeholder.png';
    const title = `${product.name}${product.brand?.name ? ` | ${product.brand.name}` : ''} | Aumakki`;
    const description = this.leadText || this.extractPlainText(product.description) || product.name;
    const productUrl = `/catalog/product/${product.slug}`;

    this.seo.setPage({
      title,
      description,
      image,
      url: productUrl,
      type: 'product',
      keywords: [
        product.name,
        product.brand?.name || '',
        this.categoryLabel,
        this.subcategoryLabel,
        ...this.uniqueNames(product.speciesSupported),
        ...this.uniqueNames(product.lifeStages),
        ...this.uniqueNames(product.diet_tags),
      ].filter(Boolean),
      structuredData: {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.name,
        description,
        image: this.gallery.map((item) => item.url),
        sku: product.documentId || String(product.id),
        category: [this.categoryLabel, this.subcategoryLabel].filter(Boolean).join(' > '),
        brand: product.brand?.name
          ? {
              '@type': 'Brand',
              name: product.brand.name,
            }
          : undefined,
        audience: this.uniqueNames(product.speciesSupported).join(', '),
        offers: {
          '@type': 'Offer',
          priceCurrency: 'GTQ',
          price,
          availability: this.inStock
            ? 'https://schema.org/InStock'
            : 'https://schema.org/OutOfStock',
          url: `${window.location.origin}${productUrl}`,
        },
      },
    });
  }
}
