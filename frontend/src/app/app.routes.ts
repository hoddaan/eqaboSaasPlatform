import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes').then(m => m.AUTH_ROUTES),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/shell/shell.component').then(m => m.ShellComponent),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard',     loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent) },

      // ── Super Admin only ──
      { path: 'super-admin',   canActivate: [roleGuard(['SuperAdmin'])], loadComponent: () => import('./features/super-admin/super-admin.component').then(m => m.SuperAdminComponent) },
      { path: 'countries',     canActivate: [roleGuard(['SuperAdmin'])], loadComponent: () => import('./features/countries/countries.component').then(m => m.CountriesComponent) },
      { path: 'cities',        canActivate: [roleGuard(['SuperAdmin'])], loadComponent: () => import('./features/cities/cities.component').then(m => m.CitiesComponent) },
      { path: 'companies',     canActivate: [roleGuard(['SuperAdmin'])], loadComponent: () => import('./features/companies/companies.component').then(m => m.CompaniesComponent) },

      // ── Hotel management ──
      { path: 'rooms',         loadComponent: () => import('./features/rooms/rooms.component').then(m => m.RoomsComponent) },
      { path: 'bookings',      loadComponent: () => import('./features/bookings/bookings.component').then(m => m.BookingsComponent) },
      { path: 'guests',        loadComponent: () => import('./features/guests/guests.component').then(m => m.GuestsComponent) },
      { path: 'calendar',      loadComponent: () => import('./features/calendar/calendar.component').then(m => m.CalendarComponent) },

      // ── Operations ──
      { path: 'pos',           canActivate: [roleGuard(['SuperAdmin','CompanyAdmin','HotelAdmin','Manager','RestaurantStaff'])], loadComponent: () => import('./features/pos/pos.component').then(m => m.PosComponent) },
      { path: 'restaurant', loadComponent: () => import('./features/restaurant/restaurant.component').then(m => m.RestaurantComponent) },
  { path: 'partners', loadComponent: () => import('./features/partners/partners.component').then(m => m.PartnersComponent) },
  { path: 'maintenance',   loadComponent: () => import('./features/maintenance/maintenance.component').then(m => m.MaintenanceComponent) },
  { path: 'halls',         loadComponent: () => import('./features/halls/halls.component').then(m => m.HallsComponent) },
      { path: 'staff',         canActivate: [roleGuard(['SuperAdmin','CompanyAdmin','HotelAdmin','Manager'])], loadComponent: () => import('./features/staff/staff.component').then(m => m.StaffComponent) },

      // ── Finance ──
      { path: 'finance',       canActivate: [roleGuard(['SuperAdmin','CompanyAdmin','HotelAdmin','Manager','Finance'])], loadComponent: () => import('./features/finance/finance.component').then(m => m.FinanceComponent) },
      { path: 'invoices',      canActivate: [roleGuard(['SuperAdmin','CompanyAdmin','HotelAdmin','Manager','Finance'])], loadComponent: () => import('./features/invoices/invoices.component').then(m => m.InvoicesComponent) },
      { path: 'transactions',  canActivate: [roleGuard(['SuperAdmin','CompanyAdmin','HotelAdmin','Manager','Finance'])], loadComponent: () => import('./features/transactions/transactions.component').then(m => m.TransactionsComponent) },

      // ── System ──
      { path: 'notifications', loadComponent: () => import('./features/notifications/notifications.component').then(m => m.NotificationsComponent) },
      { path: 'settings',      loadComponent: () => import('./features/settings/settings.component').then(m => m.SettingsComponent) },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
