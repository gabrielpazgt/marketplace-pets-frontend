import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';


function passwordsMatchValidator(group: AbstractControl) {
  const pass = group.get('password')?.value;
  const confirm = group.get('confirmPassword')?.value;
  return pass === confirm ? null : { passwordsMismatch: true };
}

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent implements OnInit {
  registerForm!: FormGroup;
  hide = true;
  hideConfirm = true;
  submitting = false;
  currentLanguage: 'es' | 'en' = 'es';

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    this.registerForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName:  ['', [Validators.required, Validators.minLength(2)]],
      email:     ['', [Validators.required, Validators.email]],
      password:  ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
      acceptTerms: [false, [Validators.requiredTrue]]
    }, { validators: passwordsMatchValidator });
  }

  switchLanguage(lang: 'es' | 'en') { this.currentLanguage = lang; }
  fc(name: string) { return this.registerForm.get(name)!; }

  signUp(): void {
    if (this.registerForm.invalid || this.submitting) { this.registerForm.markAllAsTouched(); return; }
    this.submitting = true;

    const v = this.registerForm.value;
    // MOCK: “crea” cuenta y entra logueado
    this.auth.loginMock({
      id: 'u_' + (v.email as string).split('@')[0],
      name: `${v.firstName} ${v.lastName}`,
      email: v.email
    });

    setTimeout(() => {
      this.submitting = false;
      this.router.navigate(['/pets']);
    }, 450);
  }

  signUpWithGoogle(): void { console.log('Google Sign-Up clicked'); }
}
