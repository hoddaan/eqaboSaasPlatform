import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CityService, CountryService } from '../../core/services/api.service';

@Component({
  selector: 'app-cities',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
<div class="page-content">
  <div class="sec-head mb20">
    <div>
      <div style="font-family:'Syne',sans-serif;font-size:18px;font-weight:800">Cities</div>
      <div style="font-size:12px;color:var(--muted);margin-top:2px">Manage cities per country</div>
    </div>
    <div style="display:flex;gap:8px">
      <select class="tb-sel" [(ngModel)]="filterCountry" (change)="load()">
        <option value="">All Countries</option>
        <option *ngFor="let c of countries()" [value]="c._id">{{ c.flag }} {{ c.name }}</option>
      </select>
      <button class="btn btn-g btn-sm" (click)="openForm()">+ Add City</button>
    </div>
  </div>

  <div class="g4 mb20">
    <div class="mc"><div class="mc-lbl">Total Cities</div><div class="mc-val">{{ cities().length }}</div></div>
    <div class="mc"><div class="mc-lbl">Countries</div><div class="mc-val">{{ countries().length }}</div></div>
    <div class="mc"><div class="mc-lbl">Active</div><div class="mc-val" style="color:var(--success)">{{ cities().length }}</div></div>
    <div class="mc"><div class="mc-lbl">Filtered</div><div class="mc-val" style="color:var(--purple)">{{ filterCountry ? cities().length : '—' }}</div></div>
  </div>

  <div class="card">
    <div *ngIf="loading()" style="text-align:center;padding:20px;color:var(--muted)">Loading...</div>
    <table class="tbl-hover" *ngIf="!loading()">
      <thead><tr><th>City</th><th>Country</th><th>Timezone</th><th>Status</th><th>Actions</th></tr></thead>
      <tbody>
        <tr *ngFor="let c of cities()">
          <td style="font-weight:600">{{ c.name }}</td>
          <td><span style="margin-right:4px">{{ c.countryId?.flag || '🌍' }}</span>{{ c.countryId?.name }}</td>
          <td style="font-size:11px;color:var(--muted)">{{ c.timezone || '—' }}</td>
          <td><span class="badge" [ngClass]="c.isActive?'b-green':'b-red'">{{ c.isActive ? 'Active' : 'Inactive' }}</span></td>
          <td>
            <div style="display:flex;gap:4px">
              <button class="btn btn-o btn-sm" (click)="editCity(c)">Edit</button>
              <button class="btn btn-danger btn-sm" (click)="remove(c._id)">Remove</button>
            </div>
          </td>
        </tr>
        <tr *ngIf="!cities().length"><td colspan="5" style="text-align:center;padding:20px;color:var(--muted)">No cities found.</td></tr>
      </tbody>
    </table>
  </div>

  <div class="overlay" [class.show]="showForm()" (click)="closeForm($event)">
    <div class="modal">
      <div class="modal-head">
        <div class="modal-title">{{ editingId() ? 'Edit City' : 'Add City' }}</div>
        <button class="modal-close" (click)="showForm.set(false)">✕</button>
      </div>
      <div class="fg"><label>City Name</label><input [(ngModel)]="form.name" placeholder="Dubai"></div>
      <div class="fg"><label>Country</label>
        <select [(ngModel)]="form.countryId">
          <option value="">Select country...</option>
          <option *ngFor="let c of countries()" [value]="c._id">{{ c.flag }} {{ c.name }}</option>
        </select>
      </div>
      <div class="fg"><label>Timezone (optional)</label><input [(ngModel)]="form.timezone" placeholder="Asia/Dubai"></div>
      <div style="display:flex;gap:8px;margin-top:4px">
        <button class="btn btn-o btn-sm" style="flex:1" (click)="showForm.set(false)">Cancel</button>
        <button class="btn btn-g btn-sm" style="flex:2" (click)="save()" [disabled]="saving()">{{ saving() ? 'Saving...' : (editingId() ? 'Update' : 'Add City') }}</button>
      </div>
    </div>
  </div>
</div>`,
})
export class CitiesComponent implements OnInit {
  cities    = signal<any[]>([]);
  countries = signal<any[]>([]);
  loading   = signal(true);
  saving    = signal(false);
  showForm  = signal(false);
  editingId = signal<string|null>(null);
  filterCountry = '';
  form: any = { name: '', countryId: '', timezone: '' };

  constructor(private svc: CityService, private countrySvc: CountryService) {}

  ngOnInit() {
    this.countrySvc.getAll().subscribe({ next: r => this.countries.set(r.data.countries) });
    this.load();
  }

  load() {
    this.loading.set(true);
    this.svc.getAll(this.filterCountry || undefined).subscribe({
      next: r => { this.cities.set(r.data.cities); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  openForm() {
    this.editingId.set(null);
    this.form = { name: '', countryId: '', timezone: '' };
    this.showForm.set(true);
  }

  editCity(c: any) {
    this.editingId.set(c._id);
    this.form = { name: c.name, countryId: c.countryId?._id || c.countryId, timezone: c.timezone || '' };
    this.showForm.set(true);
  }

  save() {
    if (!this.form.countryId) { alert('Please select a country'); return; }
    this.saving.set(true);
    const req = this.editingId()
      ? this.svc.update(this.editingId()!, this.form)
      : this.svc.create(this.form);
    req.subscribe({
      next: () => { this.saving.set(false); this.showForm.set(false); this.load(); },
      error: (e: any) => { this.saving.set(false); alert(e.error?.message || 'Error saving'); },
    });
  }

  remove(id: string) {
    if (!confirm('Remove this city?')) return;
    this.svc.remove(id).subscribe(() => this.load());
  }

  closeForm(e: Event) {
    if ((e.target as HTMLElement).classList.contains('overlay')) this.showForm.set(false);
  }
}
