import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, forkJoin } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService } from '../../../../auth/services/auth.service';
import { StorefrontApiService } from '../../../../core/services/storefront-api.service';
import { PetsStateService } from '../../../pets/services/pet-state.service';

type Address = {
  id: string;
  label: string;
  recipient: string;
  phone?: string;
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  zip?: string;
  country: string;
  instructions?: string;
  isDefault?: boolean;
  createdAt: string;
  updatedAt: string;
};

@Component({
  standalone: false,
  selector: 'app-profile-overview',
  templateUrl: './profile-overview.component.html',
  styleUrls: ['./profile-overview.component.scss']
})
export class ProfileOverviewComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  user = {
    id: 'dev-user',
    name: 'Usuario',
    email: 'usuario@aumakki.com',
    avatar: '' as string | null,
    membership: 'Free',
    ordersCount: 0,
    petsCount: 0,
    phone: '',
    documentIdNumber: '',
    birthDate: '',
  };

  get avatarUrl(): string | null {
    return this.user.avatar || null;
  }

  prefs = {
    locale: 'ES',
    currency: 'GTQ',
    newsletter: true,
    notifyPromos: true,
    notifyOrders: true,
  };

  addresses: Address[] = [];
  recentOrders: any[] = [];
  loading = false;
  loadingAddresses = false;
  loadingOrders = false;
  formSaving = false;
  errorMessage = '';

  formOpen = false;
  formMode: 'create' | 'edit' = 'create';
  editingId: string | null = null;
  addrForm!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private storefrontApi: StorefrontApiService,
    private pets: PetsStateService
  ) {}

  ngOnInit(): void {
    const authUser = this.auth.user;
    if (authUser) {
      this.user.id = String(authUser.id);
      this.user.name = authUser.username;
      this.user.email = authUser.email;
    }

    this.addrForm = this.fb.group({
      label: ['', [Validators.required, Validators.maxLength(24)]],
      recipient: ['', [Validators.required, Validators.maxLength(80)]],
      phone: [''],
      line1: ['', [Validators.required, Validators.maxLength(120)]],
      line2: [''],
      city: ['', [Validators.required, Validators.maxLength(60)]],
      state: [''],
      zip: [''],
      country: ['Guatemala', [Validators.required]],
      instructions: [''],
      isDefault: [false],
    });

    this.pets.pets$
      .pipe(takeUntil(this.destroy$))
      .subscribe((pets) => {
        this.user.petsCount = pets.length;
      });

    this.loadProfileAndPreferences();
    this.loadAddresses();
    this.loadRecentOrders();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadProfileAndPreferences(): void {
    if (!this.auth.isLoggedIn) return;

    this.loading = true;
    this.errorMessage = '';

    forkJoin({
      profile: this.storefrontApi.getMyProfile(),
      preferences: this.storefrontApi.getMyPreferences(),
      membership: this.storefrontApi.getMyMembership(),
    }).subscribe({
      next: ({ profile, preferences, membership }) => {
        const p = profile.data;

        this.user.id = String(p.id);
        this.user.name = p.fullName || p.username;
        this.user.email = p.email;
        this.user.avatar = p.avatar?.url ? this.storefrontApi.resolveMediaUrl(p.avatar.url) : null;
        this.user.phone = p.phone || '';
        this.user.documentIdNumber = p.documentIdNumber || '';
        this.user.birthDate = p.birthDate || '';
        this.user.ordersCount = Number(p.stats?.orders || 0);
        this.user.petsCount = Number(p.stats?.pets || 0);

        const tier = membership.data?.tier === 'premium' ? 'Premium' : 'Free';
        this.user.membership = tier;

        const pref = preferences.data;
        this.prefs = {
          locale: (pref.language || 'es').toUpperCase(),
          currency: pref.currency || 'GTQ',
          newsletter: pref.notifications?.newsletter !== false,
          notifyPromos: pref.notifications?.promotions !== false,
          notifyOrders: pref.notifications?.orderUpdates !== false,
        };

        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'No se pudo cargar la informacion de tu perfil.';
      },
    });
  }

  loadAddresses() {
    if (!this.auth.isLoggedIn) {
      this.addresses = [];
      return;
    }

    this.loadingAddresses = true;
    this.storefrontApi.listMyAddresses().subscribe({
      next: (response) => {
        this.addresses = (response.data || []).map((address) => ({
          id: String(address.id),
          label: address.label || 'Direccion',
          recipient: address.fullName || this.user.name,
          phone: address.phone || undefined,
          line1: address.addressLine1 || '',
          line2: address.addressLine2 || undefined,
          city: address.city || '',
          state: address.state || undefined,
          zip: address.postalCode || undefined,
          country: address.country || 'Guatemala',
          instructions: address.reference || undefined,
          isDefault: !!address.isDefault,
          createdAt: address.createdAt,
          updatedAt: address.updatedAt,
        }));
        this.loadingAddresses = false;
      },
      error: () => {
        this.loadingAddresses = false;
      },
    });
  }

  openCreate() {
    this.formOpen = true;
    this.formMode = 'create';
    this.editingId = null;
    this.addrForm.reset({
      label: 'Casa',
      recipient: this.user.name,
      phone: this.user.phone || '',
      line1: '',
      line2: '',
      city: '',
      state: '',
      zip: '',
      country: 'Guatemala',
      instructions: '',
      isDefault: this.addresses.length === 0,
    });
  }

  openEdit(a: Address) {
    this.formOpen = true;
    this.formMode = 'edit';
    this.editingId = a.id;
    this.addrForm.patchValue({
      label: a.label,
      recipient: a.recipient,
      phone: a.phone || '',
      line1: a.line1,
      line2: a.line2 || '',
      city: a.city,
      state: a.state || '',
      zip: a.zip || '',
      country: a.country,
      instructions: a.instructions || '',
      isDefault: !!a.isDefault,
    });
  }

  cancelForm() {
    this.formOpen = false;
    this.addrForm.reset();
    this.editingId = null;
  }

  saveAddress() {
    if (this.addrForm.invalid || this.formSaving) {
      this.addrForm.markAllAsTouched();
      return;
    }

    const value = this.addrForm.value;
    const payload = {
      label: value.label,
      fullName: value.recipient,
      phone: value.phone || undefined,
      addressLine1: value.line1,
      addressLine2: value.line2 || undefined,
      city: value.city,
      state: value.state || undefined,
      postalCode: value.zip || undefined,
      country: value.country,
      reference: value.instructions || undefined,
      isDefault: !!value.isDefault,
    };

    this.formSaving = true;

    const request$ = this.formMode === 'create'
      ? this.storefrontApi.createMyAddress(payload)
      : this.storefrontApi.updateMyAddress(this.editingId as string, payload);

    request$.subscribe({
      next: () => {
        this.formSaving = false;
        this.cancelForm();
        this.loadAddresses();
      },
      error: () => {
        this.formSaving = false;
        this.errorMessage = 'No se pudo guardar la direccion.';
      },
    });
  }

  setDefault(a: Address) {
    this.storefrontApi
      .updateMyAddress(a.id, { isDefault: true })
      .subscribe({
        next: () => this.loadAddresses(),
        error: () => {
          this.errorMessage = 'No se pudo actualizar la direccion predeterminada.';
        },
      });
  }

  remove(a: Address) {
    if (!confirm(`¿Eliminar la direccion "${a.label}"?`)) return;

    this.storefrontApi.deleteMyAddress(a.id).subscribe({
      next: () => this.loadAddresses(),
      error: () => {
        this.errorMessage = 'No se pudo eliminar la direccion.';
      },
    });
  }

  get defaultAddress(): Address | undefined {
    return this.addresses.find((address) => address.isDefault) || this.addresses[0];
  }

  loadRecentOrders(): void {
    if (!this.auth.isLoggedIn) return;
    this.loadingOrders = true;
    this.storefrontApi.listMyOrders(1, 3).subscribe({
      next: (res) => {
        this.recentOrders = res.data || [];
        this.loadingOrders = false;
      },
      error: () => {
        this.loadingOrders = false;
      },
    });
  }

  statusLabel(status: string): string {
    const map: Record<string, string> = {
      pending: 'Pendiente',
      paid: 'Pagado',
      processing: 'En proceso',
      shipped: 'Enviado',
      delivered: 'Entregado',
      cancelled: 'Cancelado',
      refunded: 'Reembolsado',
    };
    return map[status] || status;
  }

  statusClass(status: string): string {
    return `status--${status}`;
  }

  kpiLabel(n: number) {
    return n === 1 ? 'pedido' : 'pedidos';
  }
}
