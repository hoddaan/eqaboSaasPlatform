import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface User {
  _id: string;
  name: string;
  email: string;
  role: 'SuperAdmin' | 'CompanyAdmin' | 'HotelAdmin' | 'Manager' | 'Receptionist' | 'RestaurantStaff' | 'Finance' | 'Technician';
  companyId?: string | { _id: string; name: string };
  hotelId?: string | { _id: string; name: string; currency: string; timezone: string };
  isActive: boolean;
  avatar?: string;
  phone?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly API = `${environment.apiUrl}/auth`;

  // Reactive state
  private _user   = signal<User | null>(this.loadUser());
  private _token  = signal<string | null>(localStorage.getItem('accessToken'));

  readonly user         = this._user.asReadonly();
  readonly token        = this._token.asReadonly();
  readonly isLoggedIn   = computed(() => !!this._user() && !!this._token());
  readonly isSuperAdmin = computed(() => this._user()?.role === 'SuperAdmin');
  readonly currentRole  = computed(() => this._user()?.role);
  // Services enabled for the hotel this user belongs to
  // Stored in localStorage after login alongside the user
  readonly hotelServices = computed(() => {
    try {
      const raw = localStorage.getItem('hotelServices');
      return raw ? JSON.parse(raw) as string[] : ['hotel','restaurant','coffee'];
    } catch { return ['hotel','restaurant','coffee']; }
  });

  hasService(svc: string): boolean {
    const svcs = this.hotelServices();
    return svcs.includes(svc);
  }

  constructor(private http: HttpClient, private router: Router) {}

  login(email: string, password: string) {
    return this.http.post<any>(`${this.API}/login`, { email, password }).pipe(
      tap(res => {
        this.setSession(res.data.user, res.data.accessToken, res.data.refreshToken);
      }),
      catchError(err => throwError(() => err.error?.message || 'Login failed'))
    );
  }

  logout() {
    this.http.post(`${this.API}/logout`, {}).subscribe();
    this.clearSession();
    this.router.navigate(['/auth/login']);
  }

  refreshToken() {
    const refreshToken = localStorage.getItem('refreshToken');
    return this.http.post<any>(`${this.API}/refresh`, { refreshToken }).pipe(
      tap(res => {
        localStorage.setItem('accessToken', res.data.accessToken);
        localStorage.setItem('refreshToken', res.data.refreshToken);
        this._token.set(res.data.accessToken);
      })
    );
  }

  getMe() {
    return this.http.get<any>(`${this.API}/me`).pipe(
      tap(res => {
        this._user.set(res.data.user);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        if (res.data.hotelServices) {
          localStorage.setItem('hotelServices', JSON.stringify(res.data.hotelServices));
        }
      })
    );
  }

  changePassword(currentPassword: string, newPassword: string) {
    return this.http.put(`${this.API}/change-password`, { currentPassword, newPassword });
  }

  hasRole(...roles: string[]): boolean {
    return roles.includes(this._user()?.role || '');
  }

  private setSession(user: User, accessToken: string, refreshToken: string) {
    this._user.set(user);
    this._token.set(accessToken);
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  }

  private clearSession() {
    this._user.set(null);
    this._token.set(null);
    localStorage.removeItem('user');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('hotelServices');
  }

  private loadUser(): User | null {
    try {
      const raw = localStorage.getItem('user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
}
