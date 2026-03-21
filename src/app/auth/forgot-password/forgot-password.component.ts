import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { AppHttpError } from '../../core/models/http.models';
import { AuthService } from '../services/auth.service';

@Component({
  standalone: false,
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.scss']
})
export class ForgotPasswordComponent implements OnInit {
  form!: FormGroup;
  submitting = false;
  submitAttempted = false;
  sent = false;
  errorMsg = '';
  returnUrl = '/auth/login';

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    const qp = this.route.snapshot.queryParamMap.get('returnUrl');
    if (qp) this.returnUrl = qp;

    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email, Validators.maxLength(120)]],
    });
  }

  get emailCtrl(): AbstractControl {
    return this.form.get('email')!;
  }

  get emailError(): string {
    if (!this.shouldShowControlError(this.emailCtrl)) return '';
    if (this.emailCtrl.hasError('required')) return 'Ingresa tu correo.';
    if (this.emailCtrl.hasError('email')) return 'Ingresa un correo valido.';
    if (this.emailCtrl.hasError('maxlength')) return 'Correo demasiado largo.';
    return 'Correo invalido.';
  }

  submit(): void {
    this.submitAttempted = true;

    if (this.form.invalid || this.submitting || this.sent) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting = true;
    this.errorMsg = '';

    const { email } = this.form.getRawValue();

    this.auth.forgotPassword(email)
      .pipe(finalize(() => { this.submitting = false; }))
      .subscribe({
        next: () => {
          this.sent = true;
        },
        error: (error: AppHttpError) => {
          if (error?.status >= 500) {
            this.errorMsg = 'No se pudo enviar el correo de recuperacion en este momento.';
            return;
          }

          this.errorMsg = error?.message || 'No se pudo procesar la solicitud.';
        }
      });
  }

  private shouldShowControlError(ctrl: AbstractControl): boolean {
    return !!ctrl && ctrl.invalid && (ctrl.touched || this.submitAttempted);
  }
}
