import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TimeoutError } from 'rxjs';
import { take, timeout } from 'rxjs/operators';
import { AppHttpError } from '../../core/models/http.models';
import { AuthService } from '../services/auth.service';

@Component({
  standalone: false,
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  hide = true;
  submitting = false;
  submitAttempted = false;
  errorMsg = '';
  returnUrl = '/account/profile';

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    const qp = this.route.snapshot.queryParamMap.get('returnUrl');
    if (qp) this.returnUrl = qp;

    this.loginForm = this.fb.group({
      identifier: ['', [Validators.required, Validators.minLength(3)]],
      password: ['', [Validators.required]],
    });
  }

  get identifierCtrl() {
    return this.loginForm.get('identifier')!;
  }

  get passwordCtrl() {
    return this.loginForm.get('password')!;
  }

  get identifierError(): string {
    if (!this.shouldShowControlError(this.identifierCtrl)) return '';
    if (this.identifierCtrl.hasError('required')) return 'Ingresa tu correo o usuario.';
    if (this.identifierCtrl.hasError('minlength')) return 'Debe tener al menos 3 caracteres.';
    return 'Valor invalido.';
  }

  get passwordError(): string {
    if (!this.shouldShowControlError(this.passwordCtrl)) return '';
    if (this.passwordCtrl.hasError('required')) return 'Ingresa tu contrasena.';
    return 'Contrasena invalida.';
  }

  togglePasswordVisibility(): void {
    this.hide = !this.hide;
  }

  login(): void {
    this.submitAttempted = true;

    if (this.loginForm.invalid || this.submitting) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.submitting = true;
    this.errorMsg = '';

    const { identifier, password } = this.loginForm.getRawValue();

    const uiSafeguard = window.setTimeout(() => {
      if (!this.submitting) {
        return;
      }

      this.submitting = false;
      this.errorMsg = 'No recibimos respuesta del servidor. Intentalo nuevamente.';
    }, 20000);

    this.auth.login(identifier, password)
      .pipe(
        take(1),
        timeout(15000)
      )
      .subscribe({
        next: () => {
          window.clearTimeout(uiSafeguard);
          this.submitting = false;
          this.router.navigateByUrl(this.returnUrl);
        },
        error: (error: unknown) => {
          window.clearTimeout(uiSafeguard);
          this.submitting = false;
          this.errorMsg = this.resolveLoginErrorMessage(error);
        }
      });
  }

  private shouldShowControlError(ctrl: AbstractControl): boolean {
    return !!ctrl && ctrl.invalid && (ctrl.touched || this.submitAttempted);
  }

  private resolveLoginErrorMessage(error: unknown): string {
    if (error instanceof TimeoutError || this.hasErrorName(error, 'TimeoutError')) {
      return 'La solicitud tardo demasiado. Verifica tu conexion e intentalo otra vez.';
    }

    const appError = this.asAppHttpError(error);

    if (appError.status === 0) {
      return 'No se pudo conectar con el servidor. Verifica tu conexion e intentalo de nuevo.';
    }

    if (appError.status === 400 || appError.status === 401) {
      return 'Correo/usuario o contrasena incorrectos. Intenta nuevamente.';
    }

    return appError.message || 'No se pudo iniciar sesion. Intentalo nuevamente.';
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
}
