import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CompanyService, CountryService, CityService } from '../../core/services/api.service';

@Component({
  selector: 'app-companies',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
<div class="page-content">
  <!-- Header -->
  <div class="sec-head mb20">
    <div>
      <div style="font-family:'Syne',sans-serif;font-size:18px;font-weight:800">Companies</div>
      <div style="font-size:12px;color:var(--muted);margin-top:2px">Hotel management companies — each gets a Company Admin user</div>
    </div>
    <button class="btn btn-g btn-sm" (click)="openForm()">+ Add Company</button>
  </div>

  <!-- Stats -->
  <div class="g4 mb20">
  </div>

  <!-- Company Cards -->
  <div class="g2 mb20">
    <div *ngFor="let c of companies()" class="hc">
      <div class="hc-banner"></div>
      <div class="hc-body">
        <div class="rj mb12">
          <div>
            <div class="hc-name">{{ c.name }}</div>
            <div class="hc-loc">
              {{ c.countryId?.flag || '🌍' }} {{ c.countryId?.name }}
              <span *ngIf="c.cityId"> · {{ c.cityId?.name }}</span>
            </div>
          </div>
          <span class="badge" [ngClass]="c.isActive?'b-green':'b-red'">{{ c.isActive ? '● Active' : '● Suspended' }}</span>
        </div>

        <!-- Admin user -->
        <div *ngIf="c.adminUserId" style="background:var(--bg);border-radius:8px;padding:8px;margin-bottom:10px;font-size:11px">
          <div style="font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px">Company Admin</div>
          <div style="font-weight:600">{{ c.adminUserId?.name }}</div>
          <div style="color:var(--muted)">{{ c.adminUserId?.email }}</div>
        </div>
        <div *ngIf="!c.adminUserId" style="background:#fef9c3;border-radius:8px;padding:8px;margin-bottom:10px;font-size:11px;color:#854d0e">
          ⚠️ No admin user assigned
        </div>

        <div class="hc-stats">
        </div>

        <div style="display:flex;gap:6px;margin-top:12px">
          <button class="btn btn-g btn-sm" style="flex:1" (click)="viewCompany(c)">Manage</button>
          <button class="btn btn-o btn-sm" (click)="editCompany(c)">Edit</button>
          <button class="btn btn-danger btn-sm" (click)="toggleCompany(c._id)">{{ c.isActive ? 'Suspend' : 'Activate' }}</button>
        </div>
      </div>
    </div>
  </div>

  <!-- Detail panel for selected company -->
  <div *ngIf="selectedCompany()" class="card mb20">
    <div class="sec-head">
      <div class="sec-title" style="margin:0">{{ selectedCompany().name }} — Details</div>
      <button class="btn btn-o btn-sm" (click)="selectedCompany.set(null)">Close ✕</button>
    </div>
    <div class="g2">
      <div>
        <div style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">Hotels ({{ companyHotels().length }})</div>
        <div *ngFor="let h of companyHotels()" style="background:var(--bg);border-radius:8px;padding:10px;margin-bottom:6px;display:flex;justify-content:space-between;align-items:center">
          <div>
            <div style="font-size:13px;font-weight:600">{{ h.name }}</div>
            <div style="font-size:11px;color:var(--muted)">{{ h.city }}, {{ h.country }}</div>
          </div>
          <span class="badge" [ngClass]="h.isActive?'b-green':'b-red'">{{ h.isActive?'Active':'Inactive' }}</span>
        </div>
        <div *ngIf="!companyHotels().length" style="color:var(--muted);font-size:12px;padding:10px">No hotels yet</div>
      </div>
      <div>
        <div style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">Users ({{ companyUsers().length }})</div>
        <div *ngFor="let u of companyUsers()" style="display:flex;align-items:center;gap:8px;padding:8px;background:var(--bg);border-radius:8px;margin-bottom:5px">
          <div class="av" style="width:28px;height:28px;font-size:10px;border-radius:7px">{{ userInitials(u.name) }}</div>
          <div style="flex:1"><div style="font-size:12px;font-weight:600">{{ u.name }}</div><div style="font-size:10px;color:var(--muted)">{{ u.email }}</div></div>
          <span class="badge b-blue" style="font-size:9px">{{ u.role }}</span>
        </div>
      </div>
    </div>
  </div>

  <!-- Create/Edit Modal -->
  <div class="overlay" [class.show]="showForm()" (click)="closeForm($event)">
    <div class="modal">
      <div class="modal-head">
        <div class="modal-title">{{ editingId() ? 'Edit Company' : 'Create Company' }}</div>
        <button class="modal-close" (click)="showForm.set(false)">✕</button>
      </div>

      <div style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">Company Details</div>
      <div class="fg"><label>Company Name</label><input [(ngModel)]="form.name" placeholder="Grand Palace Group"></div>
      <div class="form-row">
        <div class="fg"><label>Country</label>
          <select [(ngModel)]="form.countryId" (change)="onCountryChange()">
            <option value="">Select country...</option>
            <option *ngFor="let c of countries()" [value]="c._id">{{ c.flag }} {{ c.name }}</option>
          </select>
        </div>
        <div class="fg"><label>City</label>
          <select [(ngModel)]="form.cityId">
            <option value="">Select city...</option>
            <option *ngFor="let c of filteredCities()" [value]="c._id">{{ c.name }}</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="fg"><label>Contact Email</label><input type="email" [(ngModel)]="form.contactEmail" placeholder="info@company.com"></div>
        <div class="fg"><label>Contact Phone</label><input [(ngModel)]="form.contactPhone" placeholder="+971 50 000 0001"></div>
      </div>


      <ng-container *ngIf="!editingId()">
        <div class="div"></div>
        <div style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">Company Admin Account</div>
        <div class="fg"><label>Admin Full Name</label><input [(ngModel)]="form.adminName" placeholder="Ahmed Al-Mansouri"></div>
        <div class="fg"><label>Admin Email</label><input type="email" [(ngModel)]="form.adminEmail" placeholder="admin@company.com"></div>
        <div class="fg"><label>Admin Password</label><input type="password" [(ngModel)]="form.adminPassword" placeholder="Minimum 8 characters"></div>
        <div style="font-size:11px;color:var(--muted);margin-bottom:10px">
          ℹ️ This creates a <strong>CompanyAdmin</strong> user who can manage all hotels and staff under this company.
        </div>
      </ng-container>

      <div style="display:flex;gap:8px;margin-top:4px">
        <button class="btn btn-o btn-sm" style="flex:1" (click)="showForm.set(false)">Cancel</button>
        <button class="btn btn-g btn-sm" style="flex:2" (click)="save()" [disabled]="saving()">{{ saving() ? 'Saving...' : (editingId() ? 'Update Company' : 'Create Company') }}</button>
      </div>
    </div>
  </div>
</div>`,
})
export class CompaniesComponent implements OnInit {
  companies      = signal<any[]>([]);
  countries      = signal<any[]>([]);
  allCities      = signal<any[]>([]);
  stats          = signal<any>({ companies:0, hotels:0, users:0 });
  loading        = signal(true);
  saving         = signal(false);
  showForm       = signal(false);
  editingId      = signal<string|null>(null);
  selectedCompany= signal<any>(null);
  companyHotels  = signal<any[]>([]);
  companyUsers   = signal<any[]>([]);

  form: any = {
    name:'', countryId:'', cityId:'', contactEmail:'', contactPhone:'',
    adminName:'', adminEmail:'', adminPassword:'',
  };

  constructor(
    private svc: CompanyService,
    private countrySvc: CountryService,
    private citySvc: CityService,
  ) {}

  ngOnInit() {
    this.loadStats();
    this.load();
    this.countrySvc.getAll().subscribe({ next: r => this.countries.set(r.data.countries) });
    this.citySvc.getAll().subscribe({ next: r => this.allCities.set(r.data.cities) });
  }

  load() {
    this.loading.set(true);
    this.svc.getAll().subscribe({
      next: r => { this.companies.set(r.data.companies); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  loadStats() {
    this.svc.getStats().subscribe({ next: r => this.stats.set(r.data) });
  }

  filteredCities() {
    if (!this.form.countryId) return this.allCities();
    return this.allCities().filter(c => (c.countryId?._id || c.countryId) === this.form.countryId);
  }

  onCountryChange() { this.form.cityId = ''; }

  openForm() {
    this.editingId.set(null);
    this.form = { name:'', countryId:'', cityId:'', contactEmail:'', contactPhone:'', adminName:'', adminEmail:'', adminPassword:'' };
    this.showForm.set(true);
  }

  editCompany(c: any) {
    this.editingId.set(c._id);
    this.form = {
      name: c.name, contactEmail: c.contactEmail || '', contactPhone: c.contactPhone || '',
      countryId: c.countryId?._id || c.countryId || '',
      cityId: c.cityId?._id || c.cityId || '',
    };
    this.showForm.set(true);
  }

  save() {
    if (!this.form.name) { alert('Company name is required'); return; }
    if (!this.editingId() && !this.form.adminEmail) { alert('Admin email is required'); return; }
    this.saving.set(true);
    const req = this.editingId()
      ? this.svc.update(this.editingId()!, this.form)
      : this.svc.create(this.form);
    req.subscribe({
      next: () => { this.saving.set(false); this.showForm.set(false); this.load(); this.loadStats(); },
      error: (e: any) => { this.saving.set(false); alert(e.error?.message || 'Error saving'); },
    });
  }

  viewCompany(c: any) {
    this.selectedCompany.set(c);
    this.svc.getHotels(c._id).subscribe({ next: r => this.companyHotels.set(r.data.hotels) });
    this.svc.getUsers(c._id).subscribe({ next: r => this.companyUsers.set(r.data.users) });
  }

  toggleCompany(id: string) {
    if (!confirm('Toggle company status?')) return;
    this.svc.toggle(id).subscribe(() => this.load());
  }

  closeForm(e: Event) {
    if ((e.target as HTMLElement).classList.contains('overlay')) this.showForm.set(false);
  }
  userInitials(name: string): string {
    return (name || '').split(' ').map(w => w[0] || '').join('').toUpperCase().slice(0, 2);
  }

}
