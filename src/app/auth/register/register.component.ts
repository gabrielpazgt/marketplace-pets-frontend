import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { EMPTY, TimeoutError, defer } from 'rxjs';
import { catchError, finalize, startWith, take, timeout } from 'rxjs/operators';
import { AppHttpError } from '../../core/models/http.models';
import { AuthService } from '../services/auth.service';

type StrengthLevel = 'low' | 'medium' | 'high';

interface PasswordChecks {
  length: boolean;
  upper: boolean;
  lower: boolean;
  number: boolean;
  symbol: boolean;
}

interface PasswordStrength {
  score: number;
  percent: number;
  level: StrengthLevel;
  label: string;
  isHigh: boolean;
}

const EMAIL_DOMAIN_REGEX = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/;

function passwordsMatchValidator(group: AbstractControl) {
  const pass = group.get('password')?.value;
  const confirm = group.get('confirmPassword')?.value;
  return pass === confirm ? null : { passwordsMismatch: true };
}

@Component({
  standalone: false,
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent implements OnInit {
  registerForm!: FormGroup;
  hide = true;
  hideConfirm = true;
  submitting = false;
  submitAttempted = false;
  errorMsg = '';
  passwordStrengthError = false;
  returnUrl = '/account/profile';

  passwordChecks: PasswordChecks = {
    length: false,
    upper: false,
    lower: false,
    number: false,
    symbol: false,
  };

  passwordStrength: PasswordStrength = {
    score: 0,
    percent: 0,
    level: 'low',
    label: 'Baja',
    isHigh: false,
  };

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    const qp = this.route.snapshot.queryParamMap.get('returnUrl');
    if (qp) this.returnUrl = qp;

    this.registerForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(40)]],
      lastName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(40)]],
      email: ['', [Validators.required, Validators.email, Validators.pattern(EMAIL_DOMAIN_REGEX), Validators.maxLength(120)]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
      acceptTerms: [false, [Validators.requiredTrue]]
    }, { validators: passwordsMatchValidator });

    this.passwordCtrl.valueChanges
      .pipe(startWith(this.passwordCtrl.value || ''))
      .subscribe((value) => this.updatePasswordStrength(String(value || '')));
  }

  get firstNameCtrl() { return this.registerForm.get('firstName')!; }
  get lastNameCtrl() { return this.registerForm.get('lastName')!; }
  get emailCtrl() { return this.registerForm.get('email')!; }
  get passwordCtrl() { return this.registerForm.get('password')!; }
  get confirmPasswordCtrl() { return this.registerForm.get('confirmPassword')!; }
  get acceptTermsCtrl() { return this.registerForm.get('acceptTerms')!; }

  get firstNameError(): string {
    if (!this.showControlError(this.firstNameCtrl)) return '';
    if (this.firstNameCtrl.hasError('required')) return 'Ingresa tu nombre.';
    if (this.firstNameCtrl.hasError('minlength')) return 'Debe tener al menos 2 caracteres.';
    if (this.firstNameCtrl.hasError('maxlength')) return 'Demasiado largo.';
    return 'Nombre inválido.';
  }

  get lastNameError(): string {
    if (!this.showControlError(this.lastNameCtrl)) return '';
    if (this.lastNameCtrl.hasError('required')) return 'Ingresa tu apellido.';
    if (this.lastNameCtrl.hasError('minlength')) return 'Debe tener al menos 2 caracteres.';
    if (this.lastNameCtrl.hasError('maxlength')) return 'Demasiado largo.';
    return 'Apellido inválido.';
  }

  get emailError(): string {
    if (!this.showControlError(this.emailCtrl)) return '';
    if (this.emailCtrl.hasError('required')) return 'Ingresa tu correo.';
    if (this.emailCtrl.hasError('email') || this.emailCtrl.hasError('pattern')) return 'Ingresa un correo válido (ej. nombre@dominio.com).';
    if (this.emailCtrl.hasError('maxlength')) return 'Correo demasiado largo.';
    return 'Correo inválido.';
  }

  get passwordError(): string {
    if (!this.showControlError(this.passwordCtrl) && !this.passwordStrengthError) return '';
    if (this.passwordCtrl.hasError('required')) return 'Ingresa una contraseña.';
    if (this.passwordCtrl.hasError('minlength')) return 'Debe tener al menos 8 caracteres.';
    if (this.passwordStrengthError) return 'Para registrarte, la seguridad debe estar en nivel Alto.';
    return '';
  }

  get confirmPasswordError(): string {
    const shouldShow = this.showControlError(this.confirmPasswordCtrl) || this.submitAttempted;
    if (!shouldShow) return '';
    if (this.confirmPasswordCtrl.hasError('required')) return 'Confirma tu contraseña.';
    if (this.registerForm.hasError('passwordsMismatch')) return 'Las contraseñas no coinciden.';
    return '';
  }

  get termsError(): string {
    if (!this.showControlError(this.acceptTermsCtrl)) return '';
    return 'Debes aceptar los términos y condiciones para continuar.';
  }

  get passwordStrengthClass(): string {
    return `level-${this.passwordStrength.level}`;
  }

  togglePasswordVisibility(): void {
    this.hide = !this.hide;
  }

  toggleConfirmPasswordVisibility(): void {
    this.hideConfirm = !this.hideConfirm;
  }

  signUp(): void {
    this.submitAttempted = true;
    this.passwordStrengthError = false;

    if (this.registerForm.invalid || this.submitting) {
      this.registerForm.markAllAsTouched();
      return;
    }

    if (!this.passwordStrength.isHigh) {
      this.passwordStrengthError = true;
      this.passwordCtrl.markAsTouched();
      return;
    }

    this.submitting = true;
    this.errorMsg = '';

    const value = this.registerForm.getRawValue();
    const username = this.buildUsername(value.firstName, value.lastName, value.email);

    defer(() => this.auth.register(value.email, value.password, username))
      .pipe(
        take(1),
        timeout(15000),
        catchError((error: unknown) => {
          this.errorMsg = this.resolveRegisterErrorMessage(error);
          return EMPTY;
        }),
        finalize(() => {
          this.submitting = false;
        })
      )
      .subscribe({
        next: () => {
          this.router.navigateByUrl(this.returnUrl);
        }
      });
  }

  private updatePasswordStrength(password: string): void {
    this.passwordChecks = {
      length: password.length >= 8,
      upper: /[A-Z]/.test(password),
      lower: /[a-z]/.test(password),
      number: /\d/.test(password),
      symbol: /[^A-Za-z0-9]/.test(password),
    };

    const score = Object.values(this.passwordChecks).filter(Boolean).length;

    let level: StrengthLevel = 'low';
    let label = 'Baja';

    if (score >= 5) {
      level = 'high';
      label = 'Alta';
    } else if (score >= 3) {
      level = 'medium';
      label = 'Media';
    }

    this.passwordStrength = {
      score,
      percent: Math.round((score / 5) * 100),
      level,
      label,
      isHigh: level === 'high',
    };

    if (this.passwordStrength.isHigh) {
      this.passwordStrengthError = false;
    }
  }

  private showControlError(ctrl: AbstractControl): boolean {
    return ctrl.invalid && (ctrl.touched || this.submitAttempted);
  }

  private resolveRegisterErrorMessage(error: unknown): string {
    if (error instanceof TimeoutError || this.hasErrorName(error, 'TimeoutError')) {
      return 'La solicitud tardo demasiado. Verifica tu conexion e intentalo otra vez.';
    }

    const appError = this.asAppHttpError(error);
    const normalizedMessage = (appError.message || '').toLowerCase();

    if (appError.status === 0) {
      return 'No se pudo conectar con el servidor. Verifica tu conexion e intentalo de nuevo.';
    }

    if (normalizedMessage.includes('already taken') || normalizedMessage.includes('already exists')) {
      return 'Este correo o usuario ya esta en uso. Prueba con otro.';
    }

    return appError.message || 'No se pudo completar el registro. Intentalo nuevamente.';
  }

  private asAppHttpError(error: unknown): AppHttpError {
    if (error && typeof error === 'object') {
      const candidate = error as Partial<AppHttpError>;
      return {
        status: typeof candidate.status === 'number' ? candidate.status : -1,
        name: typeof candidate.name === 'string' ? candidate.name : 'ApplicationError',
        message: typeof candidate.message === 'string' ? candidate.message : '',
        details: candidate.details,
      };
    }

    return {
      status: -1,
      name: 'ApplicationError',
      message: '',
    };
  }

  private hasErrorName(error: unknown, expectedName: string): boolean {
    return !!error && typeof error === 'object' && (error as { name?: string }).name === expectedName;
  }

  private buildUsername(firstName: string, lastName: string, email: string): string {
    const raw = `${firstName}.${lastName}`.trim() || email.split('@')[0];
    return raw
      .toLowerCase()
      .replace(/\s+/g, '.')
      .replace(/[^a-z0-9._-]/g, '_')
      .replace(/\.{2,}/g, '.')
      .replace(/^[_\-.]+|[_\-.]+$/g, '')
      .slice(0, 30);
  }
}
