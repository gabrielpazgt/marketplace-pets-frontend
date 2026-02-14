import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';


@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  hide = true;
  submitting = false;
  currentLanguage: 'es' | 'en' = 'es';

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  switchLanguage(lang: 'es' | 'en') { this.currentLanguage = lang; }
  togglePasswordVisibility(): void { this.hide = !this.hide; }

  login(): void {
    if (this.loginForm.invalid || this.submitting) return;
    this.submitting = true;

    const { username } = this.loginForm.value;
    this.auth.loginMock({
      id: 'u_' + (username as string).toLowerCase(),
      name: (username as string),
      email: `${(username as string).toLowerCase()}@aumakki.dev`
    });

    setTimeout(() => {
      this.submitting = false;
      this.router.navigate(['/pets']);
    }, 450);
  }

  demoLogin(): void {
    if (this.submitting) return;
    this.auth.loginMock({
      id: 'u_demo_gabriel',
      name: 'Gabriel',
      email: 'gabriel@example.com'
    });
    this.router.navigate(['/pets']);
  }

  loginWithGoogle(): void {
    // TODO integrar proveedor real
    console.log('Google Sign-In clicked');
  }
}
