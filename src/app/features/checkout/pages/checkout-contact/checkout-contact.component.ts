import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService, AuthUser } from '../../../../auth/services/auth.service';
import { StorefrontApiService } from '../../../../core/services/storefront-api.service';
import { StorefrontAddress } from '../../../../core/models/storefront.models';
import { CheckoutStateService } from '../../services/checkout-state.service';
import { GT_DEPARTMENTS, GT_MUNICIPALITIES } from '../../services/gt-data';

@Component({
  standalone: false,
  selector: 'mp-checkout-contact',
  templateUrl: './checkout-contact.component.html',
  styleUrls: ['./checkout-contact.component.scss']
})
export class CheckoutContactComponent implements OnInit, OnDestroy {
  departments = GT_DEPARTMENTS;
  municipalities: string[] = [];
  muniMap = GT_MUNICIPALITIES;

  isLoggedIn = false;
  authUser: AuthUser | null = null;
  checkoutMode: 'guest' | 'account' = 'guest';
  showAuthModal = true;
  readonly authQueryParams = { returnUrl: '/checkout/contact' };
  private readonly destroy$ = new Subject<void>();

  savedAddresses: StorefrontAddress[] = [];
  loadingAddresses = false;

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    nit: ['CF'],
    address: this.fb.group({
      country: ['Guatemala', Validators.required],
      department: ['', Validators.required],
      municipality: ['', Validators.required],
      line1: ['', Validators.required],
      line2: [''],
      references: [''],
      postalCode: ['']
    }),
    saveInfo: [false]
  });

  constructor(
    private fb: FormBuilder,
    private state: CheckoutStateService,
    private router: Router,
    private auth: AuthService,
    private storefrontApi: StorefrontApiService,
  ) {}

  ngOnInit(): void {
    const snap = this.state.snapshot;
    if (snap.contact) {
      this.form.patchValue({
        email: snap.contact.email,
        phone: snap.contact.phone || '',
        firstName: snap.contact.firstName,
        lastName: snap.contact.lastName,
        saveInfo: !!snap.contact.saveInfo,
      });
    }

    if (snap.shippingAddress) {
      this.form.get('address')?.patchValue({
        country: snap.shippingAddress.country,
        department: snap.shippingAddress.department ?? '',
        municipality: snap.shippingAddress.municipality ?? '',
        line1: snap.shippingAddress.line1 ?? '',
        line2: snap.shippingAddress.line2 ?? '',
        references: snap.shippingAddress.references ?? '',
        postalCode: snap.shippingAddress.postalCode ?? ''
      });
    }

    this.auth.user$
      .pipe(takeUntil(this.destroy$))
      .subscribe((user) => {
        this.authUser = user;
        this.isLoggedIn = !!user;
        this.checkoutMode = user ? 'account' : 'guest';
        if (user) {
          this.showAuthModal = false;
          this.prefillFromAuth(user);
          this.loadSavedAddresses();
        }
      });

    this.onDepartmentChange();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  setCheckoutMode(mode: 'guest' | 'account') {
    this.checkoutMode = mode;
  }

  continueAsGuest(): void {
    this.showAuthModal = false;
    this.setCheckoutMode('guest');
  }

  onDepartmentChange() {
    const dep = this.form.get('address.department')?.value || '';
    this.municipalities = this.muniMap[dep] || [];
    const current = this.form.get('address.municipality')?.value as string;
    if (!this.municipalities.includes(current)) {
      this.form.get('address.municipality')?.setValue('');
    }
  }

  onPhoneInput(event: Event) {
    const input = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '').slice(0, 12);
    let formatted = digits;
    if (digits.startsWith('502')) {
      const local = digits.slice(3, 11);
      formatted = local.length > 4
        ? `+502 ${local.slice(0, 4)}-${local.slice(4)}`
        : `+502 ${local}`;
    }
    this.form.get('phone')?.setValue(formatted, { emitEvent: false });
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const val = this.form.getRawValue();
    this.state.setContactAndShipping(
      {
        email: val.email!,
        phone: val.phone || undefined,
        firstName: val.firstName!,
        lastName: val.lastName!,
        nit: val.nit || 'CF',
        saveInfo: !!val.saveInfo
      },
      val.address as any
    );

    this.router.navigate(['checkout/shipping']);
  }

  loadSavedAddresses(): void {
    this.loadingAddresses = true;
    this.storefrontApi.listMyAddresses().subscribe({
      next: (res) => {
        this.savedAddresses = res.data || [];
        this.loadingAddresses = false;
        // Auto-apply default address if form is empty
        const def = this.savedAddresses.find(a => a.isDefault) || this.savedAddresses[0];
        if (def && !this.state.snapshot.shippingAddress) {
          this.applyAddress(def);
        }
      },
      error: () => { this.loadingAddresses = false; },
    });
  }

  applyAddress(a: StorefrontAddress): void {
    const dept = a.state || '';
    this.form.get('address')?.patchValue({
      country: a.country || 'Guatemala',
      department: dept,
      municipality: a.city || '',
      line1: a.addressLine1 || '',
      line2: a.addressLine2 || '',
      references: a.reference || '',
      postalCode: a.postalCode || '',
    });
    this.municipalities = this.muniMap[dept] || [];
  }

  private prefillFromAuth(user: AuthUser) {
    const fullName = (user.username || '').trim();
    const [firstName, ...rest] = fullName.split(' ').filter(Boolean);
    const lastName = rest.join(' ');

    if (!this.form.get('email')?.value) {
      this.form.get('email')?.setValue(user.email);
    }
    if (!this.form.get('firstName')?.value && firstName) {
      this.form.get('firstName')?.setValue(firstName);
    }
    if (!this.form.get('lastName')?.value && lastName) {
      this.form.get('lastName')?.setValue(lastName);
    }
  }
}
