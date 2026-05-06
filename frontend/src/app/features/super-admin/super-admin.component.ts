import { Component, OnInit, signal, computed, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HotelService, UserService, CountryService, CityService, CompanyService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';

type Tab = 'hotels' | 'users';

@Component({
  selector: 'app-super-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
<div class="page-content">

  <!-- HERO -->
  <div class="hero mb24">
    <div style="position:relative;z-index:1">
      <div class="hero-label">{{ isSA() ? 'Super Admin' : 'Company Admin' }} Panel</div>
      <div class="hero-title">{{ isSA() ? 'Global Platform Control 👑' : ctxName() + ' — Control Panel 🏢' }}</div>
      <div class="hero-sub">Manage hotels and team members {{ isSA() ? 'across the platform' : 'for your company' }}</div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:20px">
        <div style="background:rgba(255,255,255,.12);border-radius:12px;padding:14px;text-align:center">
          <div style="font-size:26px;font-weight:800;line-height:1">{{ hotels().length }}</div>
          <div style="font-size:10px;opacity:.65;margin-top:4px;text-transform:uppercase;letter-spacing:1px">Hotels</div>
        </div>
        <div style="background:rgba(255,255,255,.12);border-radius:12px;padding:14px;text-align:center">
          <div style="font-size:26px;font-weight:800;line-height:1">{{ users().length }}</div>
          <div style="font-size:10px;opacity:.65;margin-top:4px;text-transform:uppercase;letter-spacing:1px">Team Members</div>
        </div>
        <div style="background:rgba(255,255,255,.12);border-radius:12px;padding:14px;text-align:center">
          <div style="font-size:26px;font-weight:800;line-height:1">{{ activeUsers() }}</div>
          <div style="font-size:10px;opacity:.65;margin-top:4px;text-transform:uppercase;letter-spacing:1px">Active Staff</div>
        </div>
        <div style="background:rgba(255,255,255,.12);border-radius:12px;padding:14px;text-align:center">
          <div style="font-size:26px;font-weight:800;line-height:1">{{ users().length - activeUsers() }}</div>
          <div style="font-size:10px;opacity:.65;margin-top:4px;text-transform:uppercase;letter-spacing:1px">Inactive</div>
        </div>
      </div>
    </div>
  </div>

  <!-- TAB BAR -->
  <div style="display:flex;gap:4px;margin-bottom:20px;background:var(--bg);border-radius:12px;padding:4px;width:fit-content;border:1px solid var(--border)">
    <button class="btn btn-sm" [ngClass]="tab()==='hotels' ? 'btn-g' : 'btn-ghost'" (click)="tab.set('hotels')">🏨 Hotels ({{ hotels().length }})</button>
    <button class="btn btn-sm" [ngClass]="tab()==='users'  ? 'btn-g' : 'btn-ghost'" (click)="tab.set('users')">👥 Team ({{ users().length }})</button>
  </div>

  <!-- ══ HOTELS TAB ══ -->
  <ng-container *ngIf="tab() === 'hotels'">
    <div class="sec-head mb16">
      <div style="font-size:15px;font-weight:700;letter-spacing:-.2px">{{ isSA() ? 'All Hotels' : 'Your Hotels' }}</div>
      <button class="btn btn-g btn-sm" (click)="openHotelForm()">＋ Add Hotel</button>
    </div>

    <div *ngIf="hotelsLoading()" style="text-align:center;padding:60px;color:var(--muted)">
      <div style="font-size:28px;margin-bottom:8px">⏳</div>Loading hotels...
    </div>

    <div class="g2" *ngIf="!hotelsLoading()">
      <div *ngFor="let h of hotels()" class="hc">
        <div class="hc-banner"></div>
        <div class="hc-body">
          <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:14px">
            <div style="width:52px;height:52px;border-radius:12px;overflow:hidden;background:var(--grad-soft);display:flex;align-items:center;justify-content:center;flex-shrink:0;border:1.5px solid var(--border)">
              <img *ngIf="h.logoUrl" [src]="h.logoUrl" style="width:100%;height:100%;object-fit:cover">
              <span *ngIf="!h.logoUrl" style="font-size:22px">
                {{ h.propertyType === 'villa' ? '🏡' : h.propertyType === 'resort' ? '🌴' : h.propertyType === 'hostel' ? '🏠' : '🏨' }}
              </span>
            </div>
            <div style="flex:1;min-width:0">
              <div class="hc-name">{{ h.name }}</div>
              <div class="hc-loc">📍 {{ h.city }}, {{ h.country }}</div>
              <div style="display:flex;gap:5px;flex-wrap:wrap;margin-top:6px">
                <span class="badge" [ngClass]="h.isActive ? 'b-green' : 'b-red'">{{ h.isActive ? '● Active' : '● Off' }}</span>
                <span class="tag" style="font-size:10px">{{ h.propertyType | titlecase }}</span>
                <span *ngIf="h.propertyType !== 'villa'" class="tag" style="font-size:10px">{{ h.floors || 1 }} floor{{ (h.floors || 1) !== 1 ? 's' : '' }}</span>
                <span *ngIf="h.propertyType === 'villa'" class="tag" style="font-size:10px">Villa</span>
              </div>
              <!-- Services badges -->
              <div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:5px">
                <span *ngIf="h.services?.includes('hotel')"      style="background:#eff6ff;color:#1d4ed8;font-size:10px;padding:2px 7px;border-radius:20px;font-weight:600">🛏 Hotel</span>
                <span *ngIf="h.services?.includes('restaurant')" style="background:#f0fdf4;color:#15803d;font-size:10px;padding:2px 7px;border-radius:20px;font-weight:600">🍽 Restaurant</span>
                <span *ngIf="h.services?.includes('coffee')"     style="background:#fef9c3;color:#854d0e;font-size:10px;padding:2px 7px;border-radius:20px;font-weight:600">☕ Coffee</span>
              </div>
            </div>
          </div>
          <div style="display:flex;flex-direction:column;gap:5px;margin-bottom:14px;font-size:12.5px">
            <div class="rj" style="padding:6px 10px;background:var(--bg);border-radius:8px">
              <span style="color:var(--muted)">Currency</span><span class="tag">{{ h.currency }}</span>
            </div>
            <div class="rj" style="padding:6px 10px;background:var(--bg);border-radius:8px">
              <span style="color:var(--muted)">Tax Rate</span><span style="font-weight:700">{{ h.taxRate || 0 }}%</span>
            </div>
            <div class="rj" style="padding:6px 10px;background:var(--bg);border-radius:8px">
              <span style="color:var(--muted)">Staff assigned</span><span style="font-weight:700">{{ hotelUserCount(h._id) }}</span>
            </div>
          </div>
          <div style="display:flex;gap:8px">
            <button class="btn btn-g btn-sm" style="flex:1" (click)="openEditHotel(h)">✏️ Edit</button>
            <button class="btn btn-o btn-sm" (click)="doToggleHotel(h._id)">{{ h.isActive ? 'Suspend' : 'Activate' }}</button>
          </div>
        </div>
      </div>
    </div>

    <div *ngIf="!hotelsLoading() && !hotels().length" class="card" style="text-align:center;padding:60px">
      <div style="font-size:36px;margin-bottom:12px">🏨</div>
      <div style="font-size:15px;font-weight:700;margin-bottom:6px">No hotels yet</div>
      <div style="font-size:13px;color:var(--muted);margin-bottom:20px">Create your first hotel to get started</div>
      <button class="btn btn-g" (click)="openHotelForm()">＋ Create First Hotel</button>
    </div>
  </ng-container>

  <!-- ══ USERS TAB ══ -->
  <ng-container *ngIf="tab() === 'users'">
    <div class="sec-head mb16">
      <div>
        <div style="font-size:15px;font-weight:700;letter-spacing:-.2px">Team Members</div>
        <div style="font-size:12px;color:var(--muted);margin-top:2px">Manage staff across all your hotels</div>
      </div>
      <div style="display:flex;gap:8px">
        <select class="tb-sel" [(ngModel)]="filterHotel" (change)="loadUsers()">
          <option value="">All Hotels</option>
          <option *ngFor="let h of hotels()" [value]="h._id">{{ h.name }}</option>
        </select>
        <select class="tb-sel" [(ngModel)]="filterRole">
          <option value="">All Roles</option>
          <option value="HotelAdmin">Hotel Admin</option>
          <option value="Manager">Manager</option>
          <option value="Receptionist">Receptionist</option>
          <option value="RestaurantStaff">Restaurant Staff</option>
          <option value="Finance">Finance</option>
          <option value="Technician">Technician</option>
        </select>
        <button class="btn btn-g btn-sm" (click)="openUserForm()">＋ Add Staff</button>
      </div>
    </div>

    <!-- Role summary pills -->
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">
      <div *ngFor="let r of roleSummary()"
        style="background:var(--surface);border:1.5px solid var(--border);border-radius:10px;padding:8px 14px;display:flex;align-items:center;gap:8px;cursor:pointer"
        (click)="filterRole = r.role">
        <span style="font-size:15px">{{ r.icon }}</span>
        <div>
          <div style="font-size:12px;font-weight:700">{{ r.role }}</div>
          <div style="font-size:10px;color:var(--muted)">{{ r.count }} member{{ r.count !== 1 ? 's' : '' }}</div>
        </div>
      </div>
    </div>

    <div class="card">
      <div *ngIf="usersLoading()" style="text-align:center;padding:40px;color:var(--muted)">Loading...</div>
      <table class="tbl-hover" *ngIf="!usersLoading()">
        <thead>
          <tr><th>Name</th><th>Email</th><th>Role</th><th>Hotel</th><th>Status</th><th>Last Login</th><th>Actions</th></tr>
        </thead>
        <tbody>
          <tr *ngFor="let u of filteredUsers()">
            <td>
              <div style="display:flex;align-items:center;gap:10px">
                <div class="av" style="width:32px;height:32px;font-size:10px;border-radius:8px">{{ makeInitials(u.name) }}</div>
                <div>
                  <div style="font-weight:700;font-size:13.5px">{{ u.name }}</div>
                  <div style="font-size:11px;color:var(--muted)">{{ u.phone || '—' }}</div>
                </div>
              </div>
            </td>
            <td style="font-size:12.5px;color:var(--text2)">{{ u.email }}</td>
            <td><span class="badge" [ngClass]="getBadge(u.role)">{{ u.role }}</span></td>
            <td style="font-size:12px;color:var(--muted)">{{ getHotelName(u.hotelId) }}</td>
            <td><span class="badge" [ngClass]="u.isActive ? 'b-green' : 'b-red'">{{ u.isActive ? 'Active' : 'Off' }}</span></td>
            <td style="font-size:11.5px;color:var(--muted)">{{ u.lastLogin ? (u.lastLogin | date:'MMM d, y') : 'Never' }}</td>
            <td>
              <div style="display:flex;gap:5px">
                <button class="btn btn-o btn-xs" (click)="openEditUser(u)">Edit</button>
                <button class="btn btn-danger btn-xs" (click)="doDeactivateUser(u._id, u.name)" *ngIf="u.isActive">Disable</button>
              </div>
            </td>
          </tr>
          <tr *ngIf="!filteredUsers().length">
            <td colspan="7" style="text-align:center;padding:40px;color:var(--muted)">
              <div style="font-size:24px;margin-bottom:8px">👥</div>No staff found
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </ng-container>

  <!-- ══ HOTEL MODAL ══ -->
  <div class="overlay" [class.show]="showHotelForm()" (click)="bgClick($event, 'hotel')">
    <div class="modal">
      <div class="modal-head">
        <div class="modal-title">{{ editingHotelId() ? 'Edit Hotel' : 'Create New Hotel' }}</div>
        <button class="modal-close" (click)="showHotelForm.set(false)">✕</button>
      </div>

      <!-- Profile photo -->
      <div style="display:flex;flex-direction:column;align-items:center;margin-bottom:20px">
        <div style="position:relative;cursor:pointer" (click)="pickImage()">
          <div style="width:90px;height:90px;border-radius:16px;overflow:hidden;border:2.5px dashed var(--border);background:var(--bg);display:flex;align-items:center;justify-content:center">
            <img *ngIf="hf.logoPreview" [src]="hf.logoPreview" style="width:100%;height:100%;object-fit:cover;border-radius:13px">
            <div *ngIf="!hf.logoPreview" style="text-align:center;padding:10px">
              <div style="font-size:26px;margin-bottom:4px">🏨</div>
              <div style="font-size:10px;color:var(--muted);font-weight:600">Upload Photo</div>
            </div>
          </div>
          <div style="position:absolute;bottom:-6px;right:-6px;width:24px;height:24px;background:var(--grad);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;color:#fff;border:2px solid #fff">+</div>
        </div>
        <input #imgInput type="file" accept="image/*" style="display:none" (change)="handleImage($event)">
        <div style="font-size:11px;color:var(--muted);margin-top:10px">Hotel profile photo (optional)</div>
        <button *ngIf="hf.logoPreview" class="btn btn-danger btn-xs" style="margin-top:6px" (click)="hf.logoPreview='';hf.logoUrl=''">Remove</button>
      </div>

      <div class="div"></div>

      <div class="fg"><label>Hotel Name</label><input [(ngModel)]="hf.name" placeholder="e.g. Grand Palace Dubai"></div>

      <!-- Company — SuperAdmin only -->
      <div class="fg" *ngIf="isSA()">
        <label>Assign to Company</label>
        <select [(ngModel)]="hf.companyId">
          <option value="">— Select a company —</option>
          <option *ngFor="let c of companies()" [value]="c._id">{{ c.name }}</option>
        </select>
        <div *ngIf="!companies().length" style="font-size:11.5px;color:var(--warn);margin-top:5px">
          ⚠️ No companies found. <a routerLink="/companies" style="color:var(--purple)">Create one first →</a>
        </div>
      </div>

      <div class="form-row">
        <div class="fg">
          <label>Country</label>
          <select [(ngModel)]="hf.countryId" (change)="onCtryChange()">
            <option value="">— Select country —</option>
            <option *ngFor="let c of countries()" [value]="c._id">{{ c.name }}</option>
          </select>
        </div>
        <div class="fg">
          <label>City</label>
          <select [(ngModel)]="hf.cityId" (change)="onCityChange()" [disabled]="!hf.countryId">
            <option value="">{{ hf.countryId ? '— Select city —' : '← Select country first' }}</option>
            <option *ngFor="let c of citiesForCountry()" [value]="c._id">{{ c.name }}</option>
          </select>
          <div *ngIf="hf.countryId && citiesForCountry().length === 0" style="font-size:11.5px;color:var(--warn);margin-top:5px">
            ⚠️ No cities for this country. <a routerLink="/cities" style="color:var(--purple)">Add one →</a>
          </div>
        </div>
      </div>

      <!-- Services / Modules enabled -->
      <div class="fg">
        <label>Services Offered</label>
        <div style="font-size:11.5px;color:var(--muted);margin-bottom:8px">Select which modules will be available to this hotel's staff</div>
        <div style="display:flex;flex-direction:column;gap:8px">
          <label *ngFor="let svc of serviceOptions"
            style="display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:10px;cursor:pointer;transition:all .15s;text-transform:none;letter-spacing:0;font-size:13px;font-weight:500"
            [style.border]="hf.services.includes(svc.value) ? '1.5px solid var(--purple)' : '1.5px solid var(--border)'"
            [style.background]="hf.services.includes(svc.value) ? '#f3e8ff' : 'var(--bg)'">
            <input type="checkbox" [checked]="hf.services.includes(svc.value)"
              (change)="toggleService(svc.value)"
              style="width:16px;height:16px;accent-color:var(--purple);cursor:pointer">
            <span style="font-size:20px">{{ svc.icon }}</span>
            <div style="flex:1">
              <div [style.color]="hf.services.includes(svc.value) ? 'var(--purple)' : 'var(--text)'">{{ svc.label }}</div>
              <div style="font-size:11px;color:var(--muted);margin-top:2px">{{ svc.desc }}</div>
            </div>
            <span *ngIf="hf.services.includes(svc.value)" style="font-size:16px">✅</span>
          </label>
        </div>
        <div *ngIf="!hf.services.length" style="font-size:11.5px;color:var(--danger);margin-top:6px">⚠️ Please select at least one service</div>
      </div>

      <!-- Property type radio buttons -->
      <div class="fg">
        <label>Property Type</label>
        <div style="display:flex;gap:8px;margin-top:2px;flex-wrap:wrap">
          <label *ngFor="let t of propTypes"
            style="display:flex;align-items:center;gap:7px;padding:9px 13px;border-radius:9px;cursor:pointer;flex:1;min-width:80px;transition:all .15s;text-transform:none;letter-spacing:0;font-size:13px;font-weight:500"
            [style.border]="hf.propertyType===t.value ? '1.5px solid var(--purple)' : '1.5px solid var(--border)'"
            [style.background]="hf.propertyType===t.value ? '#f3e8ff' : 'var(--bg)'"
            [style.color]="hf.propertyType===t.value ? 'var(--purple)' : 'var(--text2)'">
            <input type="radio" [(ngModel)]="hf.propertyType" [value]="t.value" style="width:auto;accent-color:var(--purple)">
            <span style="font-size:16px">{{ t.icon }}</span>{{ t.label }}
          </label>
        </div>
      </div>

      <!-- Floors (hidden for villa) -->
      <div class="fg" *ngIf="hf.propertyType !== 'villa'">
        <label>Number of Floors</label>
        <div style="display:flex;align-items:center;gap:12px">
          <button type="button" class="btn btn-o btn-sm" style="width:36px;padding:0;font-size:18px;font-weight:700"
            (click)="hf.floors = hf.floors > 1 ? hf.floors - 1 : 1">−</button>
          <div style="flex:1;text-align:center">
            <div style="font-size:28px;font-weight:800;color:var(--text);letter-spacing:-1px;line-height:1">{{ hf.floors }}</div>
            <div style="font-size:11px;color:var(--muted);margin-top:2px">floor{{ hf.floors !== 1 ? 's' : '' }}</div>
          </div>
          <button type="button" class="btn btn-g btn-sm" style="width:36px;padding:0;font-size:18px;font-weight:700"
            (click)="hf.floors = hf.floors + 1">+</button>
        </div>
        <div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap">
          <button *ngFor="let n of floorPresets" type="button" class="btn btn-xs"
            [ngClass]="hf.floors === n ? 'btn-g' : 'btn-o'"
            (click)="hf.floors = n">{{ n }}</button>
        </div>
      </div>

      <div *ngIf="hf.propertyType === 'villa'" style="background:var(--grad-soft);border-radius:10px;padding:12px 14px;margin-bottom:14px;font-size:12.5px;color:var(--purple);font-weight:500">
        🏡 Villa — single-level property, floor management not applicable.
      </div>

      <div class="form-row">
        <div class="fg">
          <label>Currency</label>
          <select [(ngModel)]="hf.currency">
            <option value="USD">USD — US Dollar</option>
            <option value="EUR">EUR — Euro</option>
            <option value="GBP">GBP — British Pound</option>
            <option value="AED">AED — UAE Dirham</option>
            <option value="SAR">SAR — Saudi Riyal</option>
            <option value="KES">KES — Kenyan Shilling</option>
          </select>
        </div>
        <div class="fg">
          <label>Tax Rate (%)</label>
          <input type="number" [(ngModel)]="hf.taxRate" min="0" max="100">
        </div>
      </div>
      <div class="form-row">
        <div class="fg"><label>Contact Email</label><input type="email" [(ngModel)]="hf.contactEmail" placeholder="hotel@company.com"></div>
        <div class="fg"><label>Address</label><input [(ngModel)]="hf.address" placeholder="Street address"></div>
      </div>

      <div *ngIf="!editingHotelId()">
        <div class="div"></div>
        <div style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:12px">Hotel Admin Account (optional)</div>
        <div class="fg"><label>Admin Name</label><input [(ngModel)]="hf.adminName" placeholder="Hotel Manager Name"></div>
        <div class="form-row">
          <div class="fg"><label>Admin Email</label><input type="email" [(ngModel)]="hf.adminEmail" placeholder="admin@hotel.com"></div>
          <div class="fg"><label>Admin Password</label><input type="password" [(ngModel)]="hf.adminPassword" placeholder="Min 8 characters"></div>
        </div>
      </div>

      <div *ngIf="hotelErr()" style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:10px 13px;font-size:12.5px;color:#b91c1c;margin-bottom:12px">
        ⚠️ {{ hotelErr() }}
      </div>
      <div style="display:flex;gap:10px;margin-top:6px">
        <button class="btn btn-o" style="flex:1" (click)="showHotelForm.set(false)">Cancel</button>
        <button class="btn btn-g" style="flex:2" (click)="saveHotel()" [disabled]="hotelSaving()">
          {{ hotelSaving() ? 'Saving...' : (editingHotelId() ? 'Update Hotel' : 'Create Hotel') }}
        </button>
      </div>
    </div>
  </div>

  <!-- ══ USER MODAL ══ -->
  <div class="overlay" [class.show]="showUserForm()" (click)="bgClick($event, 'user')">
    <div class="modal">
      <div class="modal-head">
        <div class="modal-title">{{ editingUserId() ? 'Edit Staff Member' : 'Add Staff Member' }}</div>
        <button class="modal-close" (click)="showUserForm.set(false)">✕</button>
      </div>

      <div style="background:var(--grad-soft);border-radius:10px;padding:12px 14px;margin-bottom:18px">
        <div style="font-size:12px;font-weight:700;color:var(--purple);margin-bottom:8px">Select Role</div>
        <div style="display:flex;flex-wrap:wrap;gap:5px">
          <span *ngFor="let r of allowedRoles" class="badge" [ngClass]="getBadge(r.name)"
            style="cursor:pointer" (click)="uf.role=r.name">{{ r.name }}</span>
        </div>
      </div>

      <div class="form-row">
        <div class="fg"><label>Full Name</label><input [(ngModel)]="uf.name" placeholder="Ahmed Hassan"></div>
        <div class="fg"><label>Phone</label><input [(ngModel)]="uf.phone" placeholder="+971 50 000 0001"></div>
      </div>
      <div class="fg">
        <label>Email Address</label>
        <input type="email" [(ngModel)]="uf.email" placeholder="staff@hotel.com" [disabled]="!!editingUserId()">
      </div>
      <div class="form-row">
        <div class="fg">
          <label>Role</label>
          <select [(ngModel)]="uf.role">
            <option *ngFor="let r of allowedRoles" [value]="r.name">{{ r.name }} — {{ r.desc }}</option>
          </select>
        </div>
        <div class="fg">
          <label>Assign to Hotel</label>
          <select [(ngModel)]="uf.hotelId">
            <option value="">— Company level —</option>
            <option *ngFor="let h of hotels()" [value]="h._id">{{ h.name }}</option>
          </select>
        </div>
      </div>
      <div class="fg" *ngIf="!editingUserId()">
        <label>Password</label>
        <input type="password" [(ngModel)]="uf.password" placeholder="Minimum 8 characters">
      </div>

      <!-- Permission preview -->
      <div *ngIf="uf.role" style="background:var(--bg);border-radius:9px;padding:12px 14px;margin-bottom:14px">
        <div style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">{{ uf.role }} can access</div>
        <div style="display:flex;flex-wrap:wrap;gap:5px">
          <span *ngFor="let p of getPerms(uf.role)"
            style="background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:3px 8px;font-size:11px;color:var(--text2);font-weight:500">✓ {{ p }}</span>
        </div>
      </div>

      <div *ngIf="userErr()" style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:10px 13px;font-size:12.5px;color:#b91c1c;margin-bottom:12px">
        ⚠️ {{ userErr() }}
      </div>
      <div style="display:flex;gap:10px;margin-top:6px">
        <button class="btn btn-o" style="flex:1" (click)="showUserForm.set(false)">Cancel</button>
        <button class="btn btn-g" style="flex:2" (click)="saveUser()" [disabled]="userSaving()">
          {{ userSaving() ? 'Saving...' : (editingUserId() ? 'Update Member' : 'Add Staff Member') }}
        </button>
      </div>
    </div>
  </div>

</div>`,
})
export class SuperAdminComponent implements OnInit {

  @ViewChild('imgInput') imgInput!: ElementRef<HTMLInputElement>;

  // ── Signals ──
  tab           = signal<Tab>('hotels');
  hotels        = signal<any[]>([]);
  users         = signal<any[]>([]);
  countries     = signal<any[]>([]);
  allCities     = signal<any[]>([]);
  companies     = signal<any[]>([]);
  hotelsLoading = signal(true);
  usersLoading  = signal(true);
  showHotelForm = signal(false);
  showUserForm  = signal(false);
  editingHotelId= signal<string|null>(null);
  editingUserId = signal<string|null>(null);
  hotelSaving   = signal(false);
  userSaving    = signal(false);
  hotelErr      = signal('');
  userErr       = signal('');

  // ── Form objects (avoid complex typed signals) ──
  hf: any = this.blankHotel();
  uf: any = this.blankUser();

  filterHotel = '';
  filterRole  = '';

  floorPresets = [1,2,3,5,7,10,15,20,25,30];

  propTypes = [
    { value: 'hotel',  icon: '🏨', label: 'Hotel'  },
    { value: 'resort', icon: '🌴', label: 'Resort'  },
    { value: 'villa',  icon: '🏡', label: 'Villa'   },
    { value: 'hostel', icon: '🏠', label: 'Hostel'  },
  ];

  serviceOptions = [
    { value: 'hotel',      icon: '🛏', label: 'Hotel Management',     desc: 'Rooms, bookings, guests, maintenance, staff' },
    { value: 'restaurant', icon: '🍽', label: 'Restaurant & Dining',  desc: 'Full POS system, orders, dine-in & room service' },
    { value: 'coffee',     icon: '☕', label: 'Coffee Shop',          desc: 'Coffee shop menu & quick orders (subset of POS)' },
  ];

  allowedRoles = [
    { name: 'HotelAdmin',      desc: 'Full hotel access' },
    { name: 'Manager',         desc: 'Manage operations' },
    { name: 'Receptionist',    desc: 'Bookings & check-in' },
    { name: 'RestaurantStaff', desc: 'POS system' },
    { name: 'Finance',         desc: 'Finance & reports' },
    { name: 'Technician',      desc: 'Maintenance tasks' },
  ];

  // ── Computed ──
  readonly ctxName   = computed(() => (this.auth.user()?.companyId as any)?.name || 'Company');
  readonly activeUsers = computed(() => this.users().filter(u => u.isActive).length);
  readonly filteredUsers = computed(() => {
    let list = this.users();
    if (this.filterRole)  list = list.filter(u => u.role === this.filterRole);
    return list;
  });
  readonly roleSummary = computed(() => {
    const defs = [
      { role: 'HotelAdmin',      icon: '🏨' },
      { role: 'Manager',         icon: '📋' },
      { role: 'Receptionist',    icon: '🛎' },
      { role: 'RestaurantStaff', icon: '🍽' },
      { role: 'Finance',         icon: '💰' },
      { role: 'Technician',      icon: '🔧' },
    ];
    return defs
      .map(d => ({ ...d, count: this.users().filter(u => u.role === d.role).length }))
      .filter(d => d.count > 0);
  });

  constructor(
    private hotelSvc:   HotelService,
    private userSvc:    UserService,
    private countrySvc: CountryService,
    private citySvc:    CityService,
    private companySvc: CompanyService,
    public  auth:       AuthService,
  ) {}

  ngOnInit() {
    this.loadHotels();
    this.loadUsers();
    this.countrySvc.getAll().subscribe({ next: r => this.countries.set(r.data.countries) });
    this.citySvc.getAll().subscribe({ next: r => this.allCities.set(r.data.cities) });
    if (this.isSA()) {
      this.companySvc.getAll().subscribe({ next: r => this.companies.set(r.data.companies) });
    }
  }

  isSA() { return this.auth.user()?.role === 'SuperAdmin'; }

  // ── Helpers ──
  toggleService(val: string) {
    const idx = this.hf.services.indexOf(val);
    if (idx > -1) this.hf.services.splice(idx, 1);
    else          this.hf.services.push(val);
    // trigger change detection
    this.hf.services = [...this.hf.services];
  }

  blankHotel() {
    return { name:'', companyId:'', countryId:'', cityId:'', city:'', country:'',
             currency:'USD', taxRate:5, contactEmail:'', address:'',
             propertyType:'hotel', floors:1, logoUrl:'', logoPreview:'',
             services: ['hotel', 'restaurant', 'coffee'],
             adminName:'', adminEmail:'', adminPassword:'' };
  }

  blankUser() {
    return { name:'', email:'', phone:'', role:'Receptionist', hotelId:'', password:'' };
  }

  citiesForCountry() {
    if (!this.hf.countryId) return this.allCities();
    return this.allCities().filter((c: any) => (c.countryId?._id || c.countryId) === this.hf.countryId);
  }

  onCtryChange() {
    this.hf.cityId = '';
    const found = this.countries().find((c: any) => c._id === this.hf.countryId);
    if (found) this.hf.country = found.code || found.name;
  }

  onCityChange() {
    const found = this.allCities().find((c: any) => c._id === this.hf.cityId);
    if (found) this.hf.city = found.name;
  }

  getHotelName(hotelId: any) {
    if (!hotelId) return '— Company Level —';
    const id = typeof hotelId === 'object' ? hotelId._id : hotelId;
    return this.hotels().find(h => h._id === id)?.name || '—';
  }

  hotelUserCount(hotelId: string) {
    return this.users().filter(u => {
      const uid = typeof u.hotelId === 'object' ? u.hotelId?._id : u.hotelId;
      return uid === hotelId;
    }).length;
  }

  makeInitials(name: string) {
    return (name || '').split(' ').map((w: string) => w[0] || '').join('').toUpperCase().slice(0, 2);
  }

  getBadge(r: string) {
    const m: Record<string,string> = {
      SuperAdmin:'b-purple', CompanyAdmin:'b-pink', HotelAdmin:'b-blue',
      Manager:'b-orange', Receptionist:'b-green', RestaurantStaff:'b-yellow',
      Finance:'b-gray', Technician:'b-gray',
    };
    return m[r] || 'b-gray';
  }

  getPerms(role: string): string[] {
    const p: Record<string, string[]> = {
      HotelAdmin:      ['Dashboard','Rooms','Bookings','Guests','POS','Maintenance','Finance','Staff','Settings'],
      Manager:         ['Dashboard','Rooms','Bookings','Guests','POS','Maintenance','Finance'],
      Receptionist:    ['Dashboard','Bookings','Guests','Calendar'],
      RestaurantStaff: ['Dashboard','POS','Orders'],
      Finance:         ['Dashboard','Finance','Invoices','Transactions'],
      Technician:      ['Dashboard','Maintenance'],
    };
    return p[role] || [];
  }

  // ── Load data ──
  loadHotels() {
    this.hotelsLoading.set(true);
    const f: Record<string, string> = {};
    if (!this.isSA()) {
      const co = this.auth.user()?.companyId as any;
      const coId = co?._id || co;
      if (coId) f['companyId'] = coId;
    }
    this.hotelSvc.getAll(f).subscribe({
      next: r => { this.hotels.set(r.data.hotels); this.hotelsLoading.set(false); },
      error: () => this.hotelsLoading.set(false),
    });
  }

  loadUsers() {
    this.usersLoading.set(true);
    const f: Record<string, string> = {};
    if (this.filterHotel) f['hotelId'] = this.filterHotel;
    this.userSvc.getAll(f).subscribe({
      next: r => { this.users.set(r.data.users); this.usersLoading.set(false); },
      error: () => this.usersLoading.set(false),
    });
  }

  // ── Image upload ──
  pickImage() {
    this.imgInput.nativeElement.click();
  }

  handleImage(event: Event) {
    const inp = event.target as HTMLInputElement;
    const file = inp.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { this.hotelErr.set('Image must be smaller than 5MB'); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      this.hf.logoPreview = result;
      this.hf.logoUrl     = result;
    };
    reader.readAsDataURL(file);
  }

  // ── Hotel CRUD ──
  openHotelForm() {
    this.editingHotelId.set(null);
    this.hf = this.blankHotel();
    this.hotelErr.set('');
    this.showHotelForm.set(true);
  }

  openEditHotel(h: any) {
    this.editingHotelId.set(h._id);
    this.hf = {
      name:h.name, country:h.country||'', city:h.city||'',
      countryId:'', cityId:'',
      currency:h.currency||'USD', taxRate:h.taxRate||5,
      contactEmail:h.contactEmail||'', address:h.address||'',
      propertyType:h.propertyType||'hotel', floors:h.floors||1,
      logoUrl:h.logoUrl||'', logoPreview:h.logoUrl||'',
      services: h.services?.length ? h.services : ['hotel','restaurant','coffee'],
      companyId:'', adminName:'', adminEmail:'', adminPassword:'',
    };
    this.hotelErr.set('');
    this.showHotelForm.set(true);
  }

  saveHotel() {
    if (!this.hf.name.trim()) { this.hotelErr.set('Hotel name is required'); return; }
    if (!this.hf.city && !this.hf.cityId) { this.hotelErr.set('Please select a city'); return; }
    if (this.isSA() && !this.hf.companyId) { this.hotelErr.set('Please select a company'); return; }
    this.hotelSaving.set(true);
    this.hotelErr.set('');

    const payload: Record<string, any> = {
      name:         this.hf.name,
      country:      this.hf.country,
      city:         this.hf.city,
      countryId:    this.hf.countryId  || undefined,
      cityId:       this.hf.cityId     || undefined,
      currency:     this.hf.currency,
      taxRate:      this.hf.taxRate,
      contactEmail: this.hf.contactEmail,
      address:      this.hf.address,
      propertyType: this.hf.propertyType,
      floors:       this.hf.propertyType === 'villa' ? 1 : this.hf.floors,
      logoUrl:      this.hf.logoUrl || undefined,
      services:     this.hf.services,
    };

    if (this.isSA()) payload['companyId'] = this.hf.companyId;

    if (!this.editingHotelId() && this.hf.adminEmail) {
      payload['adminName']     = this.hf.adminName;
      payload['adminEmail']    = this.hf.adminEmail;
      payload['adminPassword'] = this.hf.adminPassword;
    }

    const eid = this.editingHotelId();
    const req = eid
      ? this.hotelSvc.update(eid, payload)
      : this.hotelSvc.create(payload);

    req.subscribe({
      next: () => {
        this.hotelSaving.set(false);
        this.showHotelForm.set(false);
        this.loadHotels();
      },
      error: (e: any) => {
        this.hotelSaving.set(false);
        this.hotelErr.set(e.error?.message || 'Error saving hotel');
      },
    });
  }

  doToggleHotel(id: string) {
    if (!confirm('Toggle hotel active status?')) return;
    this.hotelSvc.toggle(id).subscribe(() => this.loadHotels());
  }

  // ── User CRUD ──
  openUserForm() {
    this.editingUserId.set(null);
    this.uf = { ...this.blankUser(), hotelId: this.hotels()[0]?._id || '' };
    this.userErr.set('');
    this.showUserForm.set(true);
  }

  openEditUser(u: any) {
    this.editingUserId.set(u._id);
    this.uf = { name:u.name, email:u.email, phone:u.phone||'', role:u.role, hotelId:u.hotelId||'' };
    this.userErr.set('');
    this.showUserForm.set(true);
  }

  saveUser() {
    if (!this.uf.name.trim())  { this.userErr.set('Name is required'); return; }
    if (!this.uf.email.trim()) { this.userErr.set('Email is required'); return; }
    if (!this.editingUserId() && this.uf.password.length < 8) { this.userErr.set('Password must be at least 8 characters'); return; }
    this.userSaving.set(true);
    this.userErr.set('');

    const eid = this.editingUserId();
    const payload: Record<string, any> = eid
      ? { name: this.uf.name, role: this.uf.role, hotelId: this.uf.hotelId || null, phone: this.uf.phone }
      : { name: this.uf.name, email: this.uf.email, password: this.uf.password, role: this.uf.role, hotelId: this.uf.hotelId || null, phone: this.uf.phone };

    const req = eid
      ? this.userSvc.update(eid, payload)
      : this.userSvc.create(payload);

    req.subscribe({
      next: () => { this.userSaving.set(false); this.showUserForm.set(false); this.loadUsers(); },
      error: (e: any) => { this.userSaving.set(false); this.userErr.set(e.error?.message || 'Error saving user'); },
    });
  }

  doDeactivateUser(id: string, name: string) {
    if (!confirm(`Disable ${name}? They won't be able to log in.`)) return;
    this.userSvc.deactivate(id).subscribe(() => this.loadUsers());
  }

  bgClick(e: Event, type: string) {
    if ((e.target as HTMLElement).classList.contains('overlay')) {
      if (type === 'hotel') this.showHotelForm.set(false);
      else this.showUserForm.set(false);
    }
  }
}
