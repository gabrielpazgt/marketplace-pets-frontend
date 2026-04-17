import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { resolveApiBaseUrl } from '../config/api-base-url';
import {
  StorefrontAddCartItemPayload,
  StorefrontAddress,
  StorefrontAddressPayload,
  StorefrontCatalogTaxonomy,
  StorefrontCart,
  StorefrontCheckoutPayload,
  StorefrontCheckoutResult,
  StorefrontDeletedResult,
  StorefrontHeaderAnnouncement,
  StorefrontMembership,
  StorefrontMembershipPayload,
  StorefrontMembershipPlan,
  StorefrontMedia,
  StorefrontOrder,
  StorefrontPublicCoupon,
  StorefrontProductFacets,
  StorefrontPet,
  StorefrontPetPayload,
  StorefrontPetTaxonomy,
  StorefrontProduct,
  StorefrontProductsQuery,
  StorefrontSettings,
  StorefrontUpdateCartItemPayload,
  StorefrontUserPreferences,
  StorefrontUserPreferencesPayload,
  StorefrontUserProfile,
  StorefrontUserProfilePayload,
  StrapiItemResponse,
  StrapiListResponse,
  OpsMetrics,
  OpsOrder,
  OpsMetricsEnhanced,
  OpsSalesReport,
  OpsTopProduct,
  OpsTopCustomer,
  OpsInventory,
  OpsFinances,
  StorefrontFilterScope,
} from '../models/storefront.models';

@Injectable({ providedIn: 'root' })
export class StorefrontApiService {
  private readonly apiBaseUrl = resolveApiBaseUrl();

  constructor(private http: HttpClient) {}

  listProducts(query: StorefrontProductsQuery = {}): Observable<StrapiListResponse<StorefrontProduct>> {
    return this.http.get<StrapiListResponse<StorefrontProduct>>(
      `${this.apiBaseUrl}/api/storefront/products`,
      { params: this.toHttpParams(query) }
    );
  }

  listProductFacets(query: StorefrontProductsQuery = {}): Observable<StrapiItemResponse<StorefrontProductFacets>> {
    return this.http.get<StrapiItemResponse<StorefrontProductFacets>>(
      `${this.apiBaseUrl}/api/storefront/products/facets`,
      { params: this.toHttpParams(query) }
    );
  }

  listMyProducts(query: StorefrontProductsQuery = {}): Observable<StrapiListResponse<StorefrontProduct>> {
    return this.http.get<StrapiListResponse<StorefrontProduct>>(
      `${this.apiBaseUrl}/api/storefront/me/products`,
      { params: this.toHttpParams(query) }
    );
  }

  listMyProductFacets(query: StorefrontProductsQuery = {}): Observable<StrapiItemResponse<StorefrontProductFacets>> {
    return this.http.get<StrapiItemResponse<StorefrontProductFacets>>(
      `${this.apiBaseUrl}/api/storefront/me/products/facets`,
      { params: this.toHttpParams(query) }
    );
  }

  getProduct(idOrSlug: number | string): Observable<StrapiItemResponse<StorefrontProduct>> {
    return this.http.get<StrapiItemResponse<StorefrontProduct>>(
      `${this.apiBaseUrl}/api/storefront/products/${idOrSlug}`
    );
  }

  listMembershipPlans(): Observable<StrapiListResponse<StorefrontMembershipPlan>> {
    return this.http.get<StrapiListResponse<StorefrontMembershipPlan>>(
      `${this.apiBaseUrl}/api/storefront/memberships/plans`
    );
  }

  listPublicCoupons(): Observable<StrapiListResponse<StorefrontPublicCoupon>> {
    return this.http.get<StrapiListResponse<StorefrontPublicCoupon>>(
      `${this.apiBaseUrl}/api/storefront/coupons/public`
    );
  }

  listHeaderAnnouncements(): Observable<StrapiListResponse<StorefrontHeaderAnnouncement>> {
    return this.http.get<StrapiListResponse<StorefrontHeaderAnnouncement>>(
      `${this.apiBaseUrl}/api/storefront/header-announcements`
    );
  }

  getStorefrontSettings(): Observable<StrapiItemResponse<StorefrontSettings>> {
    return this.http.get<StrapiItemResponse<StorefrontSettings>>(
      `${this.apiBaseUrl}/api/storefront/settings`
    );
  }

  getFooterNewsletterPromo(): Observable<StrapiItemResponse<StorefrontMedia | null>> {
    return this.http.get<StrapiItemResponse<StorefrontMedia | null>>(
      `${this.apiBaseUrl}/api/storefront/footer-newsletter-promo`
    );
  }

  getPetTaxonomy(): Observable<StrapiItemResponse<StorefrontPetTaxonomy>> {
    return this.http.get<StrapiItemResponse<StorefrontPetTaxonomy>>(
      `${this.apiBaseUrl}/api/storefront/taxonomy/pets`
    );
  }

  getCatalogTaxonomy(): Observable<StrapiItemResponse<StorefrontCatalogTaxonomy>> {
    return this.http.get<StrapiItemResponse<StorefrontCatalogTaxonomy>>(
      `${this.apiBaseUrl}/api/storefront/taxonomy/catalog`
    );
  }

  getFilterScopes(animal?: string, category?: string): Observable<{ data: StorefrontFilterScope }> {
    let params = new HttpParams();
    if (animal) params = params.set('animal', animal);
    if (category) params = params.set('category', category);
    return this.http.get<{ data: StorefrontFilterScope }>(
      `${this.apiBaseUrl}/api/storefront/taxonomy/filter-scopes`,
      { params }
    );
  }

  getGuestCart(sessionKey?: string): Observable<StrapiItemResponse<StorefrontCart>> {
    return this.http.get<StrapiItemResponse<StorefrontCart>>(
      `${this.apiBaseUrl}/api/storefront/guest/cart`,
      { headers: this.guestHeaders(sessionKey) }
    );
  }

  listGuestCartRecommendations(sessionKey: string, limit = 4): Observable<StrapiListResponse<StorefrontProduct>> {
    return this.http.get<StrapiListResponse<StorefrontProduct>>(
      `${this.apiBaseUrl}/api/storefront/guest/cart/recommendations`,
      {
        headers: this.guestHeaders(sessionKey),
        params: this.toHttpParams({ limit }),
      }
    );
  }

  addGuestCartItem(sessionKey: string, payload: StorefrontAddCartItemPayload): Observable<StrapiItemResponse<StorefrontCart>> {
    return this.http.post<StrapiItemResponse<StorefrontCart>>(
      `${this.apiBaseUrl}/api/storefront/guest/cart/items`,
      payload,
      { headers: this.guestHeaders(sessionKey) }
    );
  }

  updateGuestCartItem(
    sessionKey: string,
    itemId: number | string,
    payload: StorefrontUpdateCartItemPayload
  ): Observable<StrapiItemResponse<StorefrontCart>> {
    return this.http.patch<StrapiItemResponse<StorefrontCart>>(
      `${this.apiBaseUrl}/api/storefront/guest/cart/items/${itemId}`,
      payload,
      { headers: this.guestHeaders(sessionKey) }
    );
  }

  removeGuestCartItem(sessionKey: string, itemId: number | string): Observable<StrapiItemResponse<StorefrontCart>> {
    return this.http.delete<StrapiItemResponse<StorefrontCart>>(
      `${this.apiBaseUrl}/api/storefront/guest/cart/items/${itemId}`,
      { headers: this.guestHeaders(sessionKey) }
    );
  }

  applyGuestCoupon(sessionKey: string, code: string): Observable<StrapiItemResponse<StorefrontCart>> {
    return this.http.post<StrapiItemResponse<StorefrontCart>>(
      `${this.apiBaseUrl}/api/storefront/guest/cart/coupon`,
      { code },
      { headers: this.guestHeaders(sessionKey) }
    );
  }

  clearGuestCoupon(sessionKey: string): Observable<StrapiItemResponse<StorefrontCart>> {
    return this.http.delete<StrapiItemResponse<StorefrontCart>>(
      `${this.apiBaseUrl}/api/storefront/guest/cart/coupon`,
      { headers: this.guestHeaders(sessionKey) }
    );
  }

  checkoutGuest(sessionKey: string, payload: StorefrontCheckoutPayload): Observable<StrapiItemResponse<StorefrontCheckoutResult>> {
    return this.http.post<StrapiItemResponse<StorefrontCheckoutResult>>(
      `${this.apiBaseUrl}/api/storefront/guest/checkout`,
      payload,
      { headers: this.guestHeaders(sessionKey) }
    );
  }

  getMyCart(): Observable<StrapiItemResponse<StorefrontCart>> {
    return this.http.get<StrapiItemResponse<StorefrontCart>>(`${this.apiBaseUrl}/api/storefront/me/cart`);
  }

  listMyCartRecommendations(limit = 4): Observable<StrapiListResponse<StorefrontProduct>> {
    return this.http.get<StrapiListResponse<StorefrontProduct>>(
      `${this.apiBaseUrl}/api/storefront/me/cart/recommendations`,
      { params: this.toHttpParams({ limit }) }
    );
  }

  adoptGuestCart(sessionKey: string): Observable<StrapiItemResponse<StorefrontCart>> {
    return this.http.post<StrapiItemResponse<StorefrontCart>>(
      `${this.apiBaseUrl}/api/storefront/me/cart/adopt-guest`,
      { sessionKey }
    );
  }

  addMyCartItem(payload: StorefrontAddCartItemPayload): Observable<StrapiItemResponse<StorefrontCart>> {
    return this.http.post<StrapiItemResponse<StorefrontCart>>(
      `${this.apiBaseUrl}/api/storefront/me/cart/items`,
      payload
    );
  }

  updateMyCartItem(itemId: number | string, payload: StorefrontUpdateCartItemPayload): Observable<StrapiItemResponse<StorefrontCart>> {
    return this.http.patch<StrapiItemResponse<StorefrontCart>>(
      `${this.apiBaseUrl}/api/storefront/me/cart/items/${itemId}`,
      payload
    );
  }

  removeMyCartItem(itemId: number | string): Observable<StrapiItemResponse<StorefrontCart>> {
    return this.http.delete<StrapiItemResponse<StorefrontCart>>(
      `${this.apiBaseUrl}/api/storefront/me/cart/items/${itemId}`
    );
  }

  applyMyCoupon(code: string): Observable<StrapiItemResponse<StorefrontCart>> {
    return this.http.post<StrapiItemResponse<StorefrontCart>>(
      `${this.apiBaseUrl}/api/storefront/me/cart/coupon`,
      { code }
    );
  }

  clearMyCoupon(): Observable<StrapiItemResponse<StorefrontCart>> {
    return this.http.delete<StrapiItemResponse<StorefrontCart>>(
      `${this.apiBaseUrl}/api/storefront/me/cart/coupon`
    );
  }

  checkoutMy(payload: StorefrontCheckoutPayload): Observable<StrapiItemResponse<StorefrontCheckoutResult>> {
    return this.http.post<StrapiItemResponse<StorefrontCheckoutResult>>(
      `${this.apiBaseUrl}/api/storefront/me/checkout`,
      payload
    );
  }

  getMyProfile(): Observable<StrapiItemResponse<StorefrontUserProfile>> {
    return this.http.get<StrapiItemResponse<StorefrontUserProfile>>(
      `${this.apiBaseUrl}/api/storefront/me/profile`
    );
  }

  updateMyProfile(payload: StorefrontUserProfilePayload): Observable<StrapiItemResponse<StorefrontUserProfile>> {
    return this.http.patch<StrapiItemResponse<StorefrontUserProfile>>(
      `${this.apiBaseUrl}/api/storefront/me/profile`,
      payload
    );
  }

  getMyPreferences(): Observable<StrapiItemResponse<StorefrontUserPreferences>> {
    return this.http.get<StrapiItemResponse<StorefrontUserPreferences>>(
      `${this.apiBaseUrl}/api/storefront/me/preferences`
    );
  }

  updateMyPreferences(payload: StorefrontUserPreferencesPayload): Observable<StrapiItemResponse<StorefrontUserPreferences>> {
    return this.http.patch<StrapiItemResponse<StorefrontUserPreferences>>(
      `${this.apiBaseUrl}/api/storefront/me/preferences`,
      payload
    );
  }

  getMyMembership(): Observable<StrapiItemResponse<StorefrontMembership>> {
    return this.http.get<StrapiItemResponse<StorefrontMembership>>(
      `${this.apiBaseUrl}/api/storefront/me/membership`
    );
  }

  updateMyMembership(payload: StorefrontMembershipPayload): Observable<StrapiItemResponse<StorefrontMembership>> {
    return this.http.patch<StrapiItemResponse<StorefrontMembership>>(
      `${this.apiBaseUrl}/api/storefront/me/membership`,
      payload
    );
  }

  listMyAddresses(): Observable<StrapiListResponse<StorefrontAddress>> {
    return this.http.get<StrapiListResponse<StorefrontAddress>>(
      `${this.apiBaseUrl}/api/storefront/me/addresses`
    );
  }

  createMyAddress(payload: StorefrontAddressPayload): Observable<StrapiItemResponse<StorefrontAddress>> {
    return this.http.post<StrapiItemResponse<StorefrontAddress>>(
      `${this.apiBaseUrl}/api/storefront/me/addresses`,
      payload
    );
  }

  updateMyAddress(id: number | string, payload: StorefrontAddressPayload): Observable<StrapiItemResponse<StorefrontAddress>> {
    return this.http.patch<StrapiItemResponse<StorefrontAddress>>(
      `${this.apiBaseUrl}/api/storefront/me/addresses/${id}`,
      payload
    );
  }

  deleteMyAddress(id: number | string): Observable<StrapiItemResponse<StorefrontDeletedResult>> {
    return this.http.delete<StrapiItemResponse<StorefrontDeletedResult>>(
      `${this.apiBaseUrl}/api/storefront/me/addresses/${id}`
    );
  }

  listMyPets(): Observable<StrapiListResponse<StorefrontPet>> {
    return this.http.get<StrapiListResponse<StorefrontPet>>(
      `${this.apiBaseUrl}/api/storefront/me/pets`
    );
  }

  createMyPet(payload: StorefrontPetPayload): Observable<StrapiItemResponse<StorefrontPet>> {
    return this.http.post<StrapiItemResponse<StorefrontPet>>(
      `${this.apiBaseUrl}/api/storefront/me/pets`,
      payload
    );
  }

  updateMyPet(id: number | string, payload: StorefrontPetPayload): Observable<StrapiItemResponse<StorefrontPet>> {
    return this.http.patch<StrapiItemResponse<StorefrontPet>>(
      `${this.apiBaseUrl}/api/storefront/me/pets/${id}`,
      payload
    );
  }

  uploadMyPetAvatar(id: number | string, file: File): Observable<StrapiItemResponse<StorefrontPet>> {
    const formData = new FormData();
    formData.append('files', file, file.name);

    return this.http.post<any>(`${this.apiBaseUrl}/api/upload`, formData).pipe(
      switchMap((uploaded: any) => {
        const uploadedFiles = Array.isArray(uploaded)
          ? uploaded
          : Array.isArray(uploaded?.data)
            ? uploaded.data
            : uploaded?.data
              ? [uploaded.data]
              : uploaded
                ? [uploaded]
                : [];

        const fileId = uploadedFiles.find((entry: any) => Number(entry?.id) > 0)?.id;
        if (!fileId) throw new Error('Upload failed: no file returned');

        return this.http.post<StrapiItemResponse<StorefrontPet>>(
          `${this.apiBaseUrl}/api/storefront/me/pets/${id}/avatar`,
          { avatarId: fileId }
        );
      })
    );
  }

  deleteMyPetAvatar(id: number | string): Observable<StrapiItemResponse<StorefrontPet>> {
    return this.http.delete<StrapiItemResponse<StorefrontPet>>(
      `${this.apiBaseUrl}/api/storefront/me/pets/${id}/avatar`
    );
  }

  deleteMyPet(id: number | string): Observable<StrapiItemResponse<StorefrontDeletedResult>> {
    return this.http.delete<StrapiItemResponse<StorefrontDeletedResult>>(
      `${this.apiBaseUrl}/api/storefront/me/pets/${id}`
    );
  }

  deleteMyAccount(): Observable<StrapiItemResponse<StorefrontDeletedResult>> {
    return this.http.delete<StrapiItemResponse<StorefrontDeletedResult>>(
      `${this.apiBaseUrl}/api/storefront/me/account`
    );
  }

  listMyOrders(page = 1, pageSize = 20): Observable<StrapiListResponse<StorefrontOrder>> {
    return this.http.get<StrapiListResponse<StorefrontOrder>>(
      `${this.apiBaseUrl}/api/storefront/me/orders`,
      { params: this.toHttpParams({ page, pageSize }) }
    );
  }

  getMyOrder(orderId: number | string): Observable<StrapiItemResponse<StorefrontOrder>> {
    return this.http.get<StrapiItemResponse<StorefrontOrder>>(
      `${this.apiBaseUrl}/api/storefront/me/orders/${orderId}`
    );
  }

  // ── Portal Operativo ──────────────────────────────────────────────────
  getOpsMetrics(): Observable<{ data: OpsMetrics }> {
    return this.http.get<{ data: OpsMetrics }>(`${this.apiBaseUrl}/api/storefront/ops/metrics`);
  }

  listOpsOrders(page = 1, pageSize = 20, status?: string): Observable<StrapiListResponse<OpsOrder>> {
    const params: Record<string, string | number> = { page, pageSize };
    if (status) params['status'] = status;
    return this.http.get<StrapiListResponse<OpsOrder>>(
      `${this.apiBaseUrl}/api/storefront/ops/orders`,
      { params: this.toHttpParams(params) }
    );
  }

  getOpsOrder(orderId: number | string): Observable<{ data: OpsOrder }> {
    return this.http.get<{ data: OpsOrder }>(`${this.apiBaseUrl}/api/storefront/ops/orders/${orderId}`);
  }

  updateOpsOrderStatus(orderId: number | string, status: string, note?: string): Observable<{ data: OpsOrder }> {
    return this.http.patch<{ data: OpsOrder }>(
      `${this.apiBaseUrl}/api/storefront/ops/orders/${orderId}/status`,
      { status, note: note || undefined }
    );
  }

  getOpsMetricsEnhanced(period: 'today' | 'week' | 'month' = 'month'): Observable<{ data: OpsMetricsEnhanced }> {
    return this.http.get<{ data: OpsMetricsEnhanced }>(
      `${this.apiBaseUrl}/api/storefront/ops/metrics/enhanced`,
      { params: this.toHttpParams({ period }) }
    );
  }

  getOpsSalesReport(from: string, to: string): Observable<{ data: OpsSalesReport }> {
    return this.http.get<{ data: OpsSalesReport }>(
      `${this.apiBaseUrl}/api/storefront/ops/reports/sales`,
      { params: this.toHttpParams({ from, to }) }
    );
  }

  getOpsTopProducts(from: string, to: string, limit = 20): Observable<{ data: OpsTopProduct[] }> {
    return this.http.get<{ data: OpsTopProduct[] }>(
      `${this.apiBaseUrl}/api/storefront/ops/reports/products`,
      { params: this.toHttpParams({ from, to, limit }) }
    );
  }

  getOpsTopCustomers(from: string, to: string, limit = 20): Observable<{ data: OpsTopCustomer[] }> {
    return this.http.get<{ data: OpsTopCustomer[] }>(
      `${this.apiBaseUrl}/api/storefront/ops/reports/customers`,
      { params: this.toHttpParams({ from, to, limit }) }
    );
  }

  getOpsInventory(): Observable<{ data: OpsInventory }> {
    return this.http.get<{ data: OpsInventory }>(`${this.apiBaseUrl}/api/storefront/ops/inventory`);
  }

  bulkUpdateInventory(updates: Array<{ sku: string; stock: number }>): Observable<{ data: { updated: number; notFound: string[]; errors: string[] } }> {
    return this.http.post<{ data: { updated: number; notFound: string[]; errors: string[] } }>(
      `${this.apiBaseUrl}/api/storefront/ops/inventory/bulk-update`,
      { updates }
    );
  }

  getOpsFinances(year: number, month: number): Observable<{ data: OpsFinances }> {
    return this.http.get<{ data: OpsFinances }>(
      `${this.apiBaseUrl}/api/storefront/ops/finances`,
      { params: this.toHttpParams({ year, month }) }
    );
  }

  resolveMediaUrl(url?: string | null): string {
    if (!url) return '';
    if (/^https?:\/\//i.test(url)) return url;
    const normalized = url.startsWith('/') ? url : `/${url}`;
    return `${this.apiBaseUrl}${normalized}`;
  }

  private guestHeaders(sessionKey?: string): HttpHeaders {
    const normalized = (sessionKey || '').trim();
    return normalized ? new HttpHeaders({ 'X-Cart-Session': normalized }) : new HttpHeaders();
  }

  private toHttpParams(input: object): HttpParams {
    let params = new HttpParams();

    Object.entries(input as Record<string, unknown>).forEach(([key, rawValue]) => {
      if (rawValue === undefined || rawValue === null || rawValue === '') {
        return;
      }

      if (Array.isArray(rawValue)) {
        if (!rawValue.length) return;
        params = params.set(key, rawValue.join(','));
        return;
      }

      params = params.set(key, String(rawValue));
    });

    return params;
  }
}
