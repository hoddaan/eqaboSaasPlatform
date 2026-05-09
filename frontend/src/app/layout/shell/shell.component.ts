import { Component, computed, OnInit } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';

interface NavItem { label: string; icon: string; route: string; badge?: number; roles?: string[]; service?: string; }

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule],
  template: `
<div class="shell">
  <aside class="sidebar">
    <div class="sb-brand">
      <div class="sb-logo">Eqabo</div>
      <div class="sb-sub">Hotel SaaS Platform</div>
    </div>

    <div class="sb-ctx">
      <div class="sb-ctx-row">
        <div *ngIf="hotelLogo()" style="width:36px;height:36px;border-radius:8px;overflow:hidden;border:1.5px solid rgba(255,255,255,.2);flex-shrink:0;background:#fff;display:flex;align-items:center;justify-content:center">
          <img [src]="hotelLogo()" alt="logo" style="width:100%;height:100%;object-fit:contain;padding:2px">
        </div>
        <div *ngIf="!hotelLogo()" class="sb-dot"></div>
        <div>
          <div class="sb-ctx-name">{{ contextName() }}</div>
          <div class="sb-ctx-meta">{{ contextMeta() }}</div>
        </div>
      </div>
    </div>

    <ng-container *ngFor="let section of navSections">
      <ng-container *ngIf="sectionVisible(section)">
        <div class="sb-sec">{{ section.label }}</div>
        <nav class="nav">
          <a *ngFor="let item of section.items"
             [class.hidden]="!canSee(item)"
             class="ni"
             [routerLink]="item.route"
             routerLinkActive="act"
             [routerLinkActiveOptions]="{ exact: false }">
            <span class="ni-ico">{{ item.icon }}</span>
            <span>{{ item.label }}</span>
            <span *ngIf="item.badge" class="ni-badge">{{ item.badge }}</span>
          </a>
        </nav>
      </ng-container>
    </ng-container>

    <div class="sb-foot">
      <div class="sb-user" [routerLink]="'/settings'">
        <div class="u-av">{{ initials() }}</div>
        <div>
          <div class="u-name">{{ user()?.name }}</div>
          <div class="u-role">{{ user()?.role }}</div>
        </div>
      </div>
      <button class="sb-logout" (click)="auth.logout()">
        <span style="font-size:15px">🚪</span>
        <span>Sign Out</span>
      </button>
    </div>
  </aside>

  <div class="main">
    <div class="topbar">
      <div class="tb-breadcrumb">
        <img *ngIf="hotelLogo()" [src]="hotelLogo()" alt="Hotel Logo"
          style="height:28px;width:28px;border-radius:6px;object-fit:contain;border:1px solid var(--border);background:#fff;padding:1px">
        <span *ngIf="!hotelLogo()" style="font-size:13px">🏨</span>
        <span class="tb-sep">›</span>
        <span style="font-weight:600;color:var(--text)">{{ contextName() }}</span>
      </div>
      <div class="tb-right">
        <a class="tb-ico" [routerLink]="'/notifications'" title="Notifications">
          🔔<div class="notif-dot"></div>
        </a>
        <a class="tb-ico" [routerLink]="'/settings'" title="Settings">⚙️</a>
        <button class="btn btn-g btn-sm" style="gap:5px" (click)="goTo('/bookings')">
          <span>＋</span> New Booking
        </button>
      </div>
    </div>
    <div class="page-wrap">
      <router-outlet></router-outlet>
    </div>
  </div>
</div>`,
  styles: [`.hidden{display:none!important}`],
})
export class ShellComponent implements OnInit {
  readonly user = this.auth.user;

  readonly hotelLogo = computed(() => {
    const u = this.user();
    if (!u) return '';
    const h = u.hotelId as any;
    const logo = h?.logoUrl || '';
    if (!logo) return '';
    return logo.startsWith('http') ? logo : 'http://localhost:5000' + logo;
  });

  readonly contextName = computed(() => {
    const u = this.user();
    if (!u) return '';
    if (u.role === 'SuperAdmin') return 'Super Admin';
    const co = u.companyId as any;
    if (u.role === 'CompanyAdmin') return co?.name || 'Company Admin';
    const h = u.hotelId as any;
    return h?.name || 'My Hotel';
  });

  readonly contextMeta = computed(() => {
    const map: Record<string, string> = {
      SuperAdmin:      'Platform Owner',
      CompanyAdmin:    'Company Admin',
      HotelAdmin:      'Hotel Admin',
      Manager:         'Manager',
      Receptionist:    'Receptionist',
      RestaurantStaff: 'Restaurant Staff',
      Finance:         'Finance',
      Technician:      'Technician',
    };
    return map[this.user()?.role || ''] || '';
  });

  readonly initials = computed(() =>
    (this.user()?.name || '').split(' ').map((n: string) => n[0] || '').join('').toUpperCase().slice(0, 2)
  );

  navSections: { label: string; items: NavItem[]; roles?: string[] }[] = [
    {
      label: 'Overview',
      items: [{ label: 'Dashboard', icon: '▣', route: '/dashboard' }],
    },
    {
      label: 'Platform',
      roles: ['SuperAdmin'],
      items: [
        { label: 'Overview',   icon: '👑', route: '/super-admin', roles: ['SuperAdmin'] },
        { label: 'Companies',  icon: '🏢', route: '/companies',   roles: ['SuperAdmin'] },
        { label: 'Countries',  icon: '🌍', route: '/countries',   roles: ['SuperAdmin'] },
        { label: 'Cities',     icon: '🏙', route: '/cities',      roles: ['SuperAdmin'] },
      ],
    },
    {
      label: 'My Company',
      roles: ['CompanyAdmin'],
      items: [
        { label: 'Hotels & Team', icon: '🏢', route: '/super-admin', roles: ['CompanyAdmin'] },
      ],
    },
    {
      label: 'Hotel',
      roles: ['SuperAdmin','CompanyAdmin','HotelAdmin','Manager','Receptionist','Technician','Finance'],
      items: [
        { label: 'Rooms',    icon: '🛏', route: '/rooms',    service: 'hotel', roles: ['SuperAdmin','CompanyAdmin','HotelAdmin','Manager','Receptionist','Finance'] },
        { label: 'Bookings', icon: '📅', route: '/bookings', service: 'hotel', badge: 3, roles: ['SuperAdmin','CompanyAdmin','HotelAdmin','Manager','Receptionist','Finance'] },
        { label: 'Guests',   icon: '👤', route: '/guests',   service: 'hotel', roles: ['SuperAdmin','CompanyAdmin','HotelAdmin','Manager','Receptionist','Finance'] },
        { label: 'Calendar', icon: '🗓', route: '/calendar', service: 'hotel', roles: ['SuperAdmin','CompanyAdmin','HotelAdmin','Manager','Receptionist','Finance'] },
      ],
    },
    {
      label: 'Operations',
      items: [
        { label: 'Restaurant', icon: '🍽', route: '/restaurant', service: 'restaurant',
          roles: ['SuperAdmin','CompanyAdmin','HotelAdmin','Manager','RestaurantStaff'] },
        { label: 'Partners',   icon: '🏢', route: '/partners',    roles: ['SuperAdmin','CompanyAdmin','HotelAdmin','Manager'] },
        { label: 'Halls & Events', icon: '🏛', route: '/halls',   service: 'hotel', roles: ['SuperAdmin','CompanyAdmin','HotelAdmin','Manager','Receptionist','RestaurantStaff','Finance'] },
        { label: 'Maintenance',    icon: '🔧', route: '/maintenance', service: 'hotel', badge: 2, roles: ['SuperAdmin','CompanyAdmin','HotelAdmin','Manager','Receptionist','RestaurantStaff','Technician','Finance'] },
        { label: 'Staff',          icon: '👥', route: '/staff', roles: ['SuperAdmin','CompanyAdmin','HotelAdmin','Manager'] },
      ],
    },
    {
      label: 'Finance',
      roles: ['SuperAdmin','CompanyAdmin','HotelAdmin','Manager','Finance'],
      items: [
        { label: 'Finance',      icon: '💰', route: '/finance',
          roles: ['SuperAdmin','CompanyAdmin','HotelAdmin','Manager','Finance'] },
        { label: 'Invoices',     icon: '🧾', route: '/invoices',
          roles: ['SuperAdmin','CompanyAdmin','HotelAdmin','Manager','Finance'] },
        { label: 'Transactions', icon: '📊', route: '/transactions',
          roles: ['SuperAdmin','CompanyAdmin','HotelAdmin','Manager','Finance'] },
      ],
    },
    {
      label: 'System',
      items: [
        { label: 'Notifications', icon: '🔔', route: '/notifications', badge: 5 },
        { label: 'Settings',      icon: '⚙️', route: '/settings' },
      ],
    },
  ];

  constructor(public auth: AuthService) {}

  ngOnInit() {
    // Refresh user + hotel services on every shell load
    this.auth.getMe().subscribe();
  }

  canSee(item: NavItem): boolean {
    // Role check
    if (item.roles && !this.auth.hasRole(...item.roles)) return false;
    // Service check — only applies to non-admin roles
    if (item.service) {
      const role = this.auth.user()?.role;
      const adminRoles = ['SuperAdmin','CompanyAdmin','HotelAdmin','Manager','Receptionist','RestaurantStaff','Technician','Finance'];
      if (!adminRoles.includes(role || '')) {
        return this.auth.hasService(item.service);
      }
    }
    return true;
  }

  sectionVisible(s: any): boolean {
    return !s.roles || this.auth.hasRole(...s.roles);
  }

  goTo(path: string) { window.location.href = path; }
}
