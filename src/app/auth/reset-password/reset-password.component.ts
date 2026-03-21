import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { AppHttpError } from '../../core/models/http.models';
import { AuthService } from '../services/auth.service';

function passwordsMatchValidator(group: AbstractControl) {
  const pass = group.get('password')?.value;
  const confirm = group.get('confirmPassword')?.value;
  return pass === confirm ? null : { passwordsMismatch: true };
}

@Component({
  standalone: false,
  selector: 'app-reset-password',
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.scss']
})
export class ResetPasswordComponent implements OnInit {
  form!: FormGroup;
  hide = true;
  hideConfirm = true;
  submitting = false;
  submitAttempted = false;
  errorMsg = '';
  code = '';
  returnUrl = '/account/profile';

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    const codeFromQuery = this.route.snapshot.queryParamMap.get('code');
    this.code = (codeFromQuery || '').trim();

    const qp = this.route.snapshot.queryParamMap.get('returnUrl');
    if (qp) this.returnUrl = qp;

    this.form = this.fb.group({
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
    }, { validators: passwordsMatchValidator });
  }

  get codeMissing(): boolean {
    return !this.code;
  }

  get passwordCtrl(): AbstractControl {
    return this.form.get('password')!;
  }

  get confirmPasswordCtrl(): AbstractControl {
    return this.form.get('confirmPassword')!;
  }

  get passwordError(): string {
    if (!this.shouldShowControlError(this.passwordCtrl)) return '';
    if (this.passwordCtrl.hasError('required')) return 'Ingresa una contrasena.';
    if (this.passwordCtrl.hasError('minlength')) return 'Debe tener al menos 8 caracteres.';
    return 'Contrasena invalida.';
  }

  get confirmPasswordError(): string {
    const shouldShow = this.shouldShowControlError(this.confirmPasswordCtrl) || this.submitAttempted;
    if (!shouldShow) return '';
    if (this.confirmPasswordCtrl.hasError('required')) return 'Confirma tu contrasena.';
    if (this.form.hasError('passwordsMismatch')) return 'Las contrasenas no coinciden.';
    return '';
  }

  togglePasswordVisibility(): void {
    this.hide = !this.hide;
  }

  toggleConfirmPasswordVisibility(): void {
    this.hideConfirm = !this.hideConfirm;
  }

  submit(): void {
    this.submitAttempted = true;

    if (this.codeMissing) {
      this.errorMsg = 'El enlace de recuperacion no es valido o esta incompleto.';
      return;
    }

    if (this.form.invalid || this.submitting) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting = true;
    this.errorMsg = '';

    const { password, confirmPassword } = this.form.getRawValue();

    this.auth.resetPassword(this.code, password, confirmPassword)
      .pipe(finalize(() => { this.submitting = false; }))
      .subscribe({
        next: () => {
          this.router.navigateByUrl(this.returnUrl);
        },
        error: (error: AppHttpError) => {
          this.errorMsg = error?.message || 'No se pudo restablecer la contrasena.';
        }
      });
  }

  private shouldShowControlError(ctrl: AbstractControl): boolean {
    return !!ctrl && ctrl.invalid && (ctrl.touched || this.submitAttempted);
  }
}
