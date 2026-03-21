import { Component, OnInit } from '@angular/core';
import { AuthService } from './auth/services/auth.service';

@Component({
  standalone: false,
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  title = 'marketplace-frontend';

  constructor(private auth: AuthService) {}

  ngOnInit(): void {
    this.auth.bootstrapSession().subscribe();
  }
}
