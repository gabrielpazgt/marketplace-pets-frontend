import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CheckoutStateService } from '../../services/checkout-state.service';
import { GT_DEPARTMENTS, GT_MUNICIPALITIES } from '../../services/gt-data';

@Component({
  selector: 'mp-checkout-contact',
  templateUrl: './checkout-contact.component.html',
  styleUrls: ['./checkout-contact.component.scss']
})
export class CheckoutContactComponent implements OnInit {
  departments = GT_DEPARTMENTS;
  municipalities: string[] = [];
  muniMap = GT_MUNICIPALITIES;

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
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

  constructor(private fb: FormBuilder, private state: CheckoutStateService, private router: Router) {}

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
    this.onDepartmentChange();
  }

  onDepartmentChange() {
    const dep = this.form.get('address.department')?.value || '';
    this.municipalities = this.muniMap[dep] || [];
    if (!this.municipalities.includes(this.form.get('address.municipality')?.value as string)) {
      this.form.get('address.municipality')?.setValue('');
    }
  }

  submit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const val = this.form.getRawValue();
    this.state.setContactAndShipping({
      email: val.email!, phone: val.phone || undefined,
      firstName: val.firstName!, lastName: val.lastName!, saveInfo: !!val.saveInfo
    }, val.address as any);
    this.router.navigate(['checkout/shipping']);
  }
}
