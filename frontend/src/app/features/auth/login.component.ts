import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
<div class="login-wrap">
  <div class="login-card">
    <div class="login-logo">Eqabo</div>
    <div class="login-sub">Hotel SaaS Platform</div>
    <h2 class="login-title">Sign in to your account</h2>

    <div *ngIf="error()" class="login-error">{{ error() }}</div>

    <div class="fg">
      <label>Email Address</label>
      <input type="email" [(ngModel)]="email" placeholder="superadmin@eqabo.com" (keyup.enter)="submit()" autocomplete="email">
    </div>
    <div class="fg">
      <label>Password</label>
      <input type="password" [(ngModel)]="password" placeholder="••••••••" (keyup.enter)="submit()" autocomplete="current-password">
    </div>

    <button class="btn btn-g" style="width:100%;justify-content:center;padding:12px" (click)="submit()" [disabled]="loading()">
      <span *ngIf="!loading()">Sign In →</span>
      <span *ngIf="loading()">Signing in...</span>
    </button>

    <div class="login-demo">
      <div class="demo-title">Demo Credentials</div>
      <div class="demo-row" (click)="fillDemo('superadmin@eqabo.com','Admin@1234')">
        <span class="badge b-purple">SuperAdmin</span>
        <span>superadmin&#64;eqabo.com</span>
      </div>
      <div class="demo-row" (click)="fillDemo('admin@grandpalace.ae','Admin@1234')">
        <span class="badge b-blue">HotelAdmin</span>
        <span>admin&#64;grandpalace.ae</span>
      </div>
      <div class="demo-row" (click)="fillDemo('reception@grandpalace.ae','Admin@1234')">
        <span class="badge b-green">Receptionist</span>
        <span>reception&#64;grandpalace.ae</span>
      </div>
      <div style="font-size:11px;color:var(--muted);margin-top:6px;text-align:center">All passwords: Admin&#64;1234</div>
    </div>
  </div>
</div>
  `,
})
export class LoginComponent {
  email    = '';
  password = '';
  loading  = signal(false);
  error    = signal('');

  constructor(private auth: AuthService, private router: Router) {}

  submit() {
    if (!this.email || !this.password) {
      this.error.set('Please enter email and password');
      return;
    }
    this.loading.set(true);
    this.error.set('');

    this.auth.login(this.email, this.password).subscribe({
      next: () => this.router.navigate(['/']),
      error: (err) => {
        const msg = typeof err === 'string' ? err : err?.message || err?.error?.message || 'Login failed. Check credentials.';
        this.error.set(msg);
        this.loading.set(false);
      },
    });
  }

  fillDemo(email: string, password: string) {
    this.email    = email;
    this.password = password;
  }
}
