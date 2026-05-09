import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HotelService } from '../../core/services/api.service';

const BASE_URL = 'http://localhost:5000';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `<div class="page-content">

  <div class="sec-head mb20">
    <div>
      <div style="font-size:18px;font-weight:800;letter-spacing:-.4px">⚙️ Hotel Profile & Settings</div>
      <div style="font-size:12.5px;color:var(--muted);margin-top:3px">Branding · Profile · Contact · Receipt Settings</div>
    </div>
    <button class="btn btn-g btn-sm" (click)="saveProfile()" [disabled]="saving()">
      {{ saving() ? 'Saving...' : '💾 Save Changes' }}
    </button>
  </div>

  <!-- Hotel selector for SuperAdmin/CompanyAdmin -->
  <div *ngIf="hotels().length>1" style="background:var(--surface);border-radius:12px;padding:12px 16px;margin-bottom:16px;display:flex;align-items:center;gap:12px;border:1px solid var(--border)">
    <span style="font-size:13px;font-weight:700;color:var(--muted)">🏨 Editing hotel:</span>
    <select [(ngModel)]="selectedHotelIdStr" (change)="onHotelChange(selectedHotelIdStr)" style="flex:1;max-width:360px;font-weight:700">
      <option *ngFor="let h of hotels()" [value]="h._id">{{ h.name }} — {{ h.city || h.address?.city }}</option>
    </select>
  </div>

  <div *ngIf="loading()" style="text-align:center;padding:40px;color:var(--muted)">Loading hotel profile...</div>

  <div *ngIf="!loading()" style="display:grid;grid-template-columns:1fr 1.6fr;gap:20px;align-items:start">

    <!-- LEFT: Branding images -->
    <div style="display:flex;flex-direction:column;gap:16px">

      <!-- Logo -->
      <div class="card">
        <div style="font-size:13px;font-weight:700;margin-bottom:14px">🏨 Hotel Logo</div>
        <div style="display:flex;flex-direction:column;align-items:center;gap:12px">
          <div style="width:140px;height:140px;border-radius:16px;border:2.5px dashed var(--border);display:flex;align-items:center;justify-content:center;overflow:hidden;background:var(--bg);cursor:pointer;transition:all .15s"
            [style.border-color]="hotel().logoUrl?'var(--purple)':'var(--border)'"
            (click)="logoInput.click()">
            <img *ngIf="hotel().logoUrl" [src]="imgUrl(hotel().logoUrl)" style="width:100%;height:100%;object-fit:contain">
            <div *ngIf="!hotel().logoUrl" style="text-align:center;color:var(--muted)">
              <div style="font-size:32px;margin-bottom:4px">🏨</div>
              <div style="font-size:11px">Click to upload</div>
            </div>
          </div>
          <input #logoInput type="file" accept="image/*" style="display:none" (change)="onImageSelect($event,'logo')">
          <div style="text-align:center">
            <button class="btn btn-o btn-sm" (click)="logoInput.click()">{{ hotel().logoUrl ? '🔄 Change Logo' : '📷 Upload Logo' }}</button>
            <div style="font-size:10.5px;color:var(--muted);margin-top:4px">PNG, SVG recommended · Max 5MB</div>
          </div>
          <div *ngIf="uploadingField()==='logo'" style="font-size:12px;color:var(--purple)">📤 Uploading...</div>
        </div>
      </div>

      <!-- Cover Image -->
      <div class="card">
        <div style="font-size:13px;font-weight:700;margin-bottom:14px">🖼 Cover / Banner Photo</div>
        <div style="border-radius:12px;border:2.5px dashed var(--border);overflow:hidden;background:var(--bg);cursor:pointer;height:140px;display:flex;align-items:center;justify-content:center;position:relative"
          [style.border-color]="hotel().coverImageUrl?'var(--purple)':'var(--border)'"
          (click)="coverInput.click()">
          <img *ngIf="hotel().coverImageUrl" [src]="imgUrl(hotel().coverImageUrl)" style="width:100%;height:100%;object-fit:cover">
          <div *ngIf="!hotel().coverImageUrl" style="text-align:center;color:var(--muted)">
            <div style="font-size:28px;margin-bottom:4px">🌄</div>
            <div style="font-size:11px">Click to upload cover photo</div>
          </div>
        </div>
        <input #coverInput type="file" accept="image/*" style="display:none" (change)="onImageSelect($event,'cover')">
        <button class="btn btn-o btn-sm" style="width:100%;margin-top:10px" (click)="coverInput.click()">{{ hotel().coverImageUrl ? '🔄 Change Cover' : '📷 Upload Cover' }}</button>
        <div *ngIf="uploadingField()==='cover'" style="font-size:12px;color:var(--purple);text-align:center;margin-top:4px">📤 Uploading...</div>
      </div>

      <!-- Signature / Receipt Image -->
      <div class="card">
        <div style="font-size:13px;font-weight:700;margin-bottom:6px">✍️ Receipt Signature</div>
        <div style="font-size:11.5px;color:var(--muted);margin-bottom:12px">Appears at the bottom of printed receipts</div>
        <div style="border-radius:10px;border:2.5px dashed var(--border);background:var(--bg);height:100px;display:flex;align-items:center;justify-content:center;cursor:pointer;overflow:hidden"
          [style.border-color]="hotel().signatureUrl?'var(--purple)':'var(--border)'"
          (click)="sigInput.click()">
          <img *ngIf="hotel().signatureUrl" [src]="imgUrl(hotel().signatureUrl)" style="max-height:90px;max-width:90%;object-fit:contain">
          <div *ngIf="!hotel().signatureUrl" style="text-align:center;color:var(--muted)">
            <div style="font-size:24px;margin-bottom:3px">✍️</div>
            <div style="font-size:11px">Upload signature image</div>
          </div>
        </div>
        <input #sigInput type="file" accept="image/*" style="display:none" (change)="onImageSelect($event,'signature')">
        <button class="btn btn-o btn-sm" style="width:100%;margin-top:10px" (click)="sigInput.click()">{{ hotel().signatureUrl ? '🔄 Change Signature' : '📷 Upload Signature' }}</button>
        <div *ngIf="uploadingField()==='signature'" style="font-size:12px;color:var(--purple);text-align:center;margin-top:4px">📤 Uploading...</div>
      </div>

      <!-- Stamp -->
      <div class="card">
        <div style="font-size:13px;font-weight:700;margin-bottom:6px">🔖 Official Stamp</div>
        <div style="font-size:11.5px;color:var(--muted);margin-bottom:12px">Round or square stamp shown on receipts</div>
        <div style="border-radius:10px;border:2.5px dashed var(--border);background:var(--bg);height:100px;display:flex;align-items:center;justify-content:center;cursor:pointer;overflow:hidden"
          [style.border-color]="hotel().stampUrl?'var(--purple)':'var(--border)'"
          (click)="stampInput.click()">
          <img *ngIf="hotel().stampUrl" [src]="imgUrl(hotel().stampUrl)" style="max-height:90px;max-width:90%;object-fit:contain">
          <div *ngIf="!hotel().stampUrl" style="text-align:center;color:var(--muted)">
            <div style="font-size:24px;margin-bottom:3px">🔖</div>
            <div style="font-size:11px">Upload stamp image</div>
          </div>
        </div>
        <input #stampInput type="file" accept="image/*" style="display:none" (change)="onImageSelect($event,'stamp')">
        <button class="btn btn-o btn-sm" style="width:100%;margin-top:10px" (click)="stampInput.click()">{{ hotel().stampUrl ? '🔄 Change Stamp' : '📷 Upload Stamp' }}</button>
        <div *ngIf="uploadingField()==='stamp'" style="font-size:12px;color:var(--purple);text-align:center;margin-top:4px">📤 Uploading...</div>
      </div>

      <!-- Receipt Preview -->
      <div class="card" style="background:var(--bg)">
        <div style="font-size:13px;font-weight:700;margin-bottom:12px">🧾 Receipt Preview</div>
        <div style="background:#fff;border-radius:8px;padding:14px;font-family:'Courier New',monospace;font-size:11px;border:1px solid var(--border)">
          <div style="text-align:center;margin-bottom:8px">
            <img *ngIf="hotel().logoUrl" [src]="imgUrl(hotel().logoUrl)" style="height:40px;object-fit:contain;margin-bottom:4px"><br>
            <strong style="font-size:13px">{{ hotel().name }}</strong><br>
            <span style="font-size:10px;color:#666">{{ hotel().contactPhone }}</span><br>
            <span style="font-size:10px;color:#666">{{ hotel().contactEmail }}</span>
          </div>
          <div style="border-top:1px dashed #ccc;margin:6px 0"></div>
          <div style="display:flex;justify-content:space-between"><span>Item × 2</span><span>\$10.00</span></div>
          <div style="border-top:1px dashed #ccc;margin:6px 0"></div>
          <div style="display:flex;justify-content:space-between;font-weight:bold"><span>TOTAL</span><span>\$10.00</span></div>
          <div style="text-align:center;margin-top:8px;font-size:10px;color:#666">{{ pf.receiptFooter || 'Thank you for your visit!' }}</div>
          <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:8px">
            <div *ngIf="hotel().signatureUrl">
              <div style="font-size:9px;color:#999;margin-bottom:2px">Signature</div>
              <img [src]="imgUrl(hotel().signatureUrl)" style="max-height:36px;object-fit:contain">
            </div>
            <div *ngIf="hotel().stampUrl" style="text-align:right">
              <div style="font-size:9px;color:#999;margin-bottom:2px">Stamp</div>
              <img [src]="imgUrl(hotel().stampUrl)" style="max-height:40px;max-width:40px;object-fit:contain">
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- RIGHT: Profile form -->
    <div style="display:flex;flex-direction:column;gap:16px">

      <!-- Basic Info -->
      <div class="card">
        <div style="font-size:13px;font-weight:700;margin-bottom:14px">🏨 Basic Information</div>
        <div class="form-row">
          <div class="fg"><label>Hotel Name *</label><input [(ngModel)]="pf.name" placeholder="Grand Hotel"></div>
          <div class="fg"><label>Property Type</label>
            <select [(ngModel)]="pf.propertyType">
              <option value="hotel">Hotel</option><option value="resort">Resort</option>
              <option value="villa">Villa</option><option value="hostel">Hostel</option>
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="fg"><label>Number of Floors</label><input type="number" [(ngModel)]="pf.floors" min="1"></div>
          <div class="fg"><label>Currency</label><input [(ngModel)]="pf.currency" placeholder="USD" style="text-transform:uppercase"></div>
          <div class="fg"><label>Tax Rate (%)</label><input type="number" [(ngModel)]="pf.taxRate" min="0" max="100" step="0.5"></div>
        </div>
        <div class="fg"><label>Description</label><textarea rows="3" [(ngModel)]="pf.description" placeholder="Brief description of your property..."></textarea></div>
        <div class="fg"><label>Website</label><input [(ngModel)]="pf.website" placeholder="https://yourhotel.com"></div>
      </div>

      <!-- Contact -->
      <div class="card">
        <div style="font-size:13px;font-weight:700;margin-bottom:14px">📞 Contact Information</div>
        <div class="form-row">
          <div class="fg"><label>Contact Email</label><input type="email" [(ngModel)]="pf.contactEmail" placeholder="info@hotel.com"></div>
          <div class="fg"><label>Contact Phone</label><input [(ngModel)]="pf.contactPhone" placeholder="+971 4 000 0000"></div>
        </div>
        <div style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">Address</div>
        <div class="form-row">
          <div class="fg" style="flex:2"><label>Street</label><input [(ngModel)]="pf.address.street" placeholder="123 Main St"></div>
          <div class="fg"><label>City</label><input [(ngModel)]="pf.address.city" placeholder="Dubai"></div>
        </div>
        <div class="form-row">
          <div class="fg"><label>Post Code</label><input [(ngModel)]="pf.address.postcode" placeholder="00000"></div>
          <div class="fg"><label>Country</label><input [(ngModel)]="pf.address.country" placeholder="UAE"></div>
        </div>
      </div>

      <!-- Social Media -->
      <div class="card">
        <div style="font-size:13px;font-weight:700;margin-bottom:14px">📱 Social Media</div>
        <div class="fg"><label>Facebook</label><input [(ngModel)]="pf.socialMedia.facebook" placeholder="https://facebook.com/yourhotel"></div>
        <div class="fg"><label>Instagram</label><input [(ngModel)]="pf.socialMedia.instagram" placeholder="https://instagram.com/yourhotel"></div>
        <div class="fg"><label>Twitter / X</label><input [(ngModel)]="pf.socialMedia.twitter" placeholder="https://twitter.com/yourhotel"></div>
      </div>

      <!-- Receipt Settings -->
      <div class="card">
        <div style="font-size:13px;font-weight:700;margin-bottom:6px">🧾 Receipt Settings</div>
        <div style="font-size:11.5px;color:var(--muted);margin-bottom:12px">This text appears at the bottom of every printed receipt</div>
        <div class="fg"><label>Receipt Footer Message</label><textarea rows="2" [(ngModel)]="pf.receiptFooter" placeholder="Thank you for dining with us! We hope to see you again."></textarea></div>
      </div>

      <!-- Services / Modules -->
      <div class="card">
        <div style="font-size:13px;font-weight:700;margin-bottom:6px">🔧 Active Modules</div>
        <div style="font-size:11.5px;color:var(--muted);margin-bottom:12px">Controls which sections appear in the sidebar</div>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <label *ngFor="let s of allServices" style="display:flex;align-items:center;gap:8px;background:var(--bg);border-radius:10px;padding:10px 14px;cursor:pointer;border:1.5px solid"
            [style.border-color]="pf.services.includes(s.val)?'var(--purple)':'var(--border)'"
            [style.background]="pf.services.includes(s.val)?'#f3e8ff':'var(--bg)'">
            <input type="checkbox" [checked]="pf.services.includes(s.val)" (change)="toggleService(s.val)" style="display:none">
            <span style="font-size:18px">{{ s.icon }}</span>
            <div>
              <div style="font-weight:700;font-size:12.5px" [style.color]="pf.services.includes(s.val)?'var(--purple)':'var(--text1)'">{{ s.label }}</div>
              <div style="font-size:10.5px;color:var(--muted)">{{ s.desc }}</div>
            </div>
            <span *ngIf="pf.services.includes(s.val)" style="font-size:16px;margin-left:4px">✅</span>
          </label>
        </div>
      </div>

      <!-- Save result -->
      <div *ngIf="saveMsg()" style="background:#f0fdf4;border:1.5px solid #bbf7d0;border-radius:10px;padding:12px 16px;font-size:13px;color:var(--success);display:flex;align-items:center;gap:8px">
        ✅ {{ saveMsg() }}
      </div>
      <div *ngIf="saveErr()" style="background:#fef2f2;border:1.5px solid #fecaca;border-radius:10px;padding:12px 16px;font-size:13px;color:var(--danger)">
        ❌ {{ saveErr() }}
      </div>

      <button class="btn btn-g" style="width:100%;padding:14px;font-size:14px;font-weight:700" (click)="saveProfile()" [disabled]="saving()">
        {{ saving() ? 'Saving...' : '💾 Save Hotel Profile' }}
      </button>
    </div>
  </div>

</div>`,
})
export class SettingsComponent implements OnInit {
  hotel       = signal<any>({});
  hotels      = signal<any[]>([]);
  selectedHotelId = signal('');
  selectedHotelIdStr = '';  // for ngModel binding
  loading     = signal(true);
  saving      = signal(false);
  uploadingField = signal<string|null>(null);
  saveMsg     = signal('');
  saveErr     = signal('');

  private _user   = JSON.parse(localStorage.getItem('user') || '{}');
  hotelId: string = typeof this._user.hotelId === 'object'
    ? this._user.hotelId?._id
    : this._user.hotelId || '';
  userRole: string = this._user.role || '';

  pf: any = {
    name:'', propertyType:'hotel', floors:1, currency:'USD', taxRate:5,
    description:'', website:'',
    contactEmail:'', contactPhone:'',
    address:{ street:'', city:'', postcode:'', country:'' },
    socialMedia:{ facebook:'', instagram:'', twitter:'' },
    receiptFooter:'',
    services:['hotel'],
  };

  allServices = [
    { val:'hotel',      icon:'🏨', label:'Hotel',       desc:'Rooms, Bookings, Guests' },
    { val:'restaurant', icon:'🍽', label:'Restaurant',  desc:'POS, Menu, Tables, Store' },
    { val:'coffee',     icon:'☕', label:'Coffee Shop', desc:'Coffee & Café orders' },
  ];

  constructor(private hotelSvc: HotelService) {}

  ngOnInit() {
    // SuperAdmin and CompanyAdmin can pick from a list of hotels
    if (['SuperAdmin','CompanyAdmin'].includes(this.userRole)) {
      this.hotelSvc.getAll().subscribe({
        next: (r: any) => {
          this.hotels.set(r.data.hotels || []);
          // Auto-select first or the one matching hotelId
          const list = r.data.hotels || [];
          const first = this.hotelId ? list.find((h: any) => h._id === this.hotelId) : list[0];
          if (first) { this.selectedHotelId.set(first._id); this.selectedHotelIdStr = first._id; this.loadHotel(first._id); }
          else this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
    } else if (this.hotelId) {
      this.selectedHotelId.set(this.hotelId); this.selectedHotelIdStr = this.hotelId;
      this.loadHotel(this.hotelId);
    } else {
      this.loading.set(false);
    }
  }

  onHotelChange(id: string) {
    this.selectedHotelIdStr = id;
    this.selectedHotelId.set(id);
    this.loadHotel(id);
  }

  loadHotel(id: string) {
    this.loading.set(true);
    this.hotelSvc.getProfile(id).subscribe({
      next: (r: any) => {
        const h = r.data.hotel;
        this.hotel.set(h);
        this.pf = {
          name:         h.name || '',
          propertyType: h.propertyType || 'hotel',
          floors:       h.floors || 1,
          currency:     h.currency || 'USD',
          taxRate:      h.taxRate ?? 5,
          description:  h.description || '',
          website:      h.website || '',
          contactEmail: h.contactEmail || '',
          contactPhone: h.contactPhone || '',
          address:      h.address || { street:'', city:'', postcode:'', country:'' },
          socialMedia:  h.socialMedia || { facebook:'', instagram:'', twitter:'' },
          receiptFooter:h.receiptFooter || '',
          services:     h.services || ['hotel'],
        };
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  imgUrl(path: string): string {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return `${BASE_URL}${path}`;
  }

  onImageSelect(e: Event, field: string) {
    const file = (e.target as HTMLInputElement).files?.[0];
    const id = this.selectedHotelId() || this.hotelId;
    if (!file || !id) return;
    this.uploadingField.set(field);
    this.hotelSvc.uploadImage(id, field, file).subscribe({
      next: (r: any) => {
        this.uploadingField.set(null);
        this.hotel.update(h => ({ ...h, ...r.data.hotel }));
        this.saveMsg.set('Image uploaded successfully!');
        setTimeout(() => this.saveMsg.set(''), 3000);
      },
      error: (e: any) => {
        this.uploadingField.set(null);
        this.saveErr.set(e.error?.message || 'Upload failed');
        setTimeout(() => this.saveErr.set(''), 4000);
      },
    });
  }

  toggleService(val: string) {
    const idx = this.pf.services.indexOf(val);
    if (idx > -1) this.pf.services = this.pf.services.filter((s: string) => s !== val);
    else          this.pf.services = [...this.pf.services, val];
  }

  saveProfile() {
    const id = this.selectedHotelId() || this.hotelId;
    if (!id) return;
    this.saving.set(true); this.saveMsg.set(''); this.saveErr.set('');
    this.hotelSvc.updateProfile(id, this.pf).subscribe({
      next: (r: any) => {
        this.saving.set(false);
        this.hotel.update(h => ({ ...h, ...r.data.hotel }));
        this.saveMsg.set('Hotel profile saved successfully!');
        setTimeout(() => this.saveMsg.set(''), 4000);
      },
      error: (e: any) => {
        this.saving.set(false);
        this.saveErr.set(e.error?.message || 'Save failed. Please try again.');
      },
    });
  }
}
