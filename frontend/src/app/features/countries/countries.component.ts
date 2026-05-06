import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CountryService } from '../../core/services/api.service';

@Component({
  selector: 'app-countries',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
<div class="page-content">
  <div class="sec-head mb20">
    <div>
      <div style="font-size:18px;font-weight:800;letter-spacing:-.4px">Countries</div>
      <div style="font-size:12.5px;color:var(--muted);margin-top:3px">Manage supported countries on the platform</div>
    </div>
    <button class="btn btn-g btn-sm" (click)="openForm()">＋ Add Country</button>
  </div>

  <div class="g4 mb20">
    <div class="mc"><div class="mc-ico">🌍</div><div class="mc-lbl">Total</div><div class="mc-val">{{ countries().length }}</div></div>
    <div class="mc"><div class="mc-ico">✅</div><div class="mc-lbl">Active</div><div class="mc-val" style="color:var(--success)">{{ countries().length }}</div></div>
    <div class="mc"><div class="mc-ico">💱</div><div class="mc-lbl">Currencies</div><div class="mc-val">{{ uniqueCurrencies() }}</div></div>
    <div class="mc"><div class="mc-ico">🕐</div><div class="mc-lbl">Timezones</div><div class="mc-val">{{ uniqueTimezones() }}</div></div>
  </div>

  <div class="card">
    <div *ngIf="loading()" style="text-align:center;padding:40px;color:var(--muted)">
      <div style="font-size:24px;margin-bottom:8px">⏳</div>Loading...
    </div>
    <div class="tbl-wrap" *ngIf="!loading()">
      <table>
        <thead>
          <tr>
            <th>Country</th>
            <th>Currency</th>
            <th>Timezone</th>
            <th>Status</th>
            <th>Added</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr class="tbl-hover" *ngFor="let c of countries()">
            <td><div style="font-weight:700;font-size:14px">{{ c.name }}</div></td>
            <td><span class="tag">{{ c.currency }}</span></td>
            <td style="font-size:12px;color:var(--muted)">{{ c.timezone || '—' }}</td>
            <td><span class="badge" [ngClass]="c.isActive ? 'b-green' : 'b-red'">{{ c.isActive ? 'Active' : 'Inactive' }}</span></td>
            <td style="font-size:11.5px;color:var(--muted)">{{ c.createdAt | date:'MMM d, y' }}</td>
            <td>
              <div style="display:flex;gap:6px">
                <button class="btn btn-o btn-xs" (click)="editCountry(c)">Edit</button>
                <button class="btn btn-danger btn-xs" (click)="remove(c._id)">Remove</button>
              </div>
            </td>
          </tr>
          <tr *ngIf="!countries().length">
            <td colspan="6" style="text-align:center;padding:40px;color:var(--muted)">
              <div style="font-size:28px;margin-bottom:8px">🌍</div>
              No countries yet. Add your first one.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <div class="overlay" [class.show]="showForm()" (click)="closeForm($event)">
    <div class="modal">
      <div class="modal-head">
        <div class="modal-title">{{ editingId() ? 'Edit Country' : 'Add Country' }}</div>
        <button class="modal-close" (click)="showForm.set(false)">✕</button>
      </div>
      <div class="fg">
        <label>Country Name</label>
        <input [(ngModel)]="form.name" placeholder="e.g. United Arab Emirates">
      </div>
      <div class="form-row">
        <div class="fg">
          <label>Default Currency</label>
          <select [(ngModel)]="form.currency">
            <option value="USD">USD — US Dollar</option>
            <option value="EUR">EUR — Euro</option>
            <option value="GBP">GBP — British Pound</option>
            <option value="AED">AED — UAE Dirham</option>
            <option value="SAR">SAR — Saudi Riyal</option>
            <option value="KES">KES — Kenyan Shilling</option>
            <option value="NGN">NGN — Nigerian Naira</option>
            <option value="ZAR">ZAR — South African Rand</option>
            <option value="INR">INR — Indian Rupee</option>
            <option value="JPY">JPY — Japanese Yen</option>
          </select>
        </div>
        <div class="fg">
          <label>Default Timezone</label>
          <select [(ngModel)]="form.timezone">
            <option value="UTC">UTC</option>
            <option value="Asia/Dubai">Asia/Dubai (GMT+4)</option>
            <option value="Asia/Riyadh">Asia/Riyadh (GMT+3)</option>
            <option value="Europe/London">Europe/London (GMT+0/1)</option>
            <option value="Europe/Paris">Europe/Paris (GMT+1/2)</option>
            <option value="Europe/Berlin">Europe/Berlin (GMT+1/2)</option>
            <option value="Africa/Nairobi">Africa/Nairobi (GMT+3)</option>
            <option value="Africa/Lagos">Africa/Lagos (GMT+1)</option>
            <option value="America/New_York">America/New_York (GMT-5/-4)</option>
            <option value="America/Los_Angeles">America/Los_Angeles (GMT-8/-7)</option>
            <option value="Asia/Tokyo">Asia/Tokyo (GMT+9)</option>
            <option value="Asia/Kolkata">Asia/Kolkata (GMT+5:30)</option>
          </select>
        </div>
      </div>
      <div *ngIf="error()" style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:10px 12px;font-size:12.5px;color:#b91c1c;margin-bottom:12px">{{ error() }}</div>
      <div style="display:flex;gap:10px;margin-top:4px">
        <button class="btn btn-o" style="flex:1" (click)="showForm.set(false)">Cancel</button>
        <button class="btn btn-g" style="flex:2" (click)="save()" [disabled]="saving()">
          {{ saving() ? 'Saving...' : (editingId() ? 'Update Country' : 'Add Country') }}
        </button>
      </div>
    </div>
  </div>
</div>`,
})
export class CountriesComponent implements OnInit {
  countries = signal<any[]>([]);
  loading   = signal(true);
  saving    = signal(false);
  showForm  = signal(false);
  editingId = signal<string|null>(null);
  error     = signal('');
  form: any = { name: '', currency: 'USD', timezone: 'UTC' };

  constructor(private svc: CountryService) {}
  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.svc.getAll().subscribe({
      next: r => { this.countries.set(r.data.countries); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  uniqueCurrencies() { return new Set(this.countries().map((c: any) => c.currency)).size; }
  uniqueTimezones()  { return new Set(this.countries().map((c: any) => c.timezone).filter(Boolean)).size; }

  openForm() {
    this.editingId.set(null);
    this.form = { name: '', currency: 'USD', timezone: 'UTC' };
    this.error.set('');
    this.showForm.set(true);
  }

  editCountry(c: any) {
    this.editingId.set(c._id);
    this.form = { name: c.name, currency: c.currency, timezone: c.timezone || 'UTC' };
    this.error.set('');
    this.showForm.set(true);
  }

  save() {
    if (!this.form.name.trim()) { this.error.set('Country name is required'); return; }
    this.saving.set(true); this.error.set('');
    const req = this.editingId() ? this.svc.update(this.editingId()!, this.form) : this.svc.create(this.form);
    req.subscribe({
      next: () => { this.saving.set(false); this.showForm.set(false); this.load(); },
      error: (e: any) => { this.saving.set(false); this.error.set(e.error?.message || 'Error saving'); },
    });
  }

  remove(id: string) {
    if (!confirm('Remove this country?')) return;
    this.svc.remove(id).subscribe(() => this.load());
  }

  closeForm(e: Event) { if ((e.target as HTMLElement).classList.contains('overlay')) this.showForm.set(false); }
}
