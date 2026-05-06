import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
<div class="page-content">
  <div style="font-family:'Syne',sans-serif;font-size:18px;font-weight:800;margin-bottom:20px">System Settings</div>
  <div class="g2">
    <div style="display:flex;flex-direction:column;gap:16px">
      <div class="card">
        <div class="sec-title">Hotel Information</div>
        <div class="fg"><label>Hotel Name</label><input [(ngModel)]="hotel.name"></div>
        <div class="form-row">
          <div class="fg"><label>Country</label><select [(ngModel)]="hotel.country"><option value="AE">United Arab Emirates</option><option value="GB">United Kingdom</option><option value="FR">France</option><option value="KE">Kenya</option><option value="US">United States</option></select></div>
          <div class="fg"><label>City</label><input [(ngModel)]="hotel.city"></div>
        </div>
        <div class="form-row">
          <div class="fg"><label>Currency</label><select [(ngModel)]="hotel.currency"><option value="USD">USD ($)</option><option value="AED">AED (د.إ)</option><option value="EUR">EUR (€)</option><option value="GBP">GBP (£)</option></select></div>
          <div class="fg"><label>Tax Rate (%)</label><input type="number" [(ngModel)]="hotel.taxRate"></div>
        </div>
        <div class="fg"><label>Timezone</label><select [(ngModel)]="hotel.timezone"><option value="Asia/Dubai">Asia/Dubai (GMT+4)</option><option value="Europe/London">Europe/London (GMT+1)</option><option value="Europe/Paris">Europe/Paris (GMT+2)</option><option value="Africa/Nairobi">Africa/Nairobi (GMT+3)</option></select></div>
        <div class="fg"><label>Contact Email</label><input type="email" [(ngModel)]="hotel.contactEmail"></div>
        <button class="btn btn-g btn-sm" (click)="saveHotel()">{{ saved() ? '✅ Saved!' : 'Save Changes' }}</button>
      </div>
      <div class="card">
        <div class="sec-title">Change Password</div>
        <div class="fg"><label>Current Password</label><input type="password" [(ngModel)]="pwd.current" placeholder="••••••••"></div>
        <div class="fg"><label>New Password</label><input type="password" [(ngModel)]="pwd.new" placeholder="Minimum 8 characters"></div>
        <div class="fg"><label>Confirm New Password</label><input type="password" [(ngModel)]="pwd.confirm" placeholder="••••••••"></div>
        <div *ngIf="pwdError()" style="color:var(--danger);font-size:12px;margin-bottom:10px">{{ pwdError() }}</div>
        <button class="btn btn-o btn-sm" (click)="changePassword()">Update Password</button>
      </div>
    </div>
    <div style="display:flex;flex-direction:column;gap:16px">
      <div class="card" style="background:var(--dark);border-color:var(--dark)">
        <div style="font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:rgba(255,255,255,.4);margin-bottom:6px">Logged in as</div>
        <div style="font-family:'Syne',sans-serif;font-size:16px;font-weight:800;color:#fff;margin-bottom:2px">{{ user()?.name }}</div>
        <div style="font-size:12px;color:rgba(255,255,255,.5);margin-bottom:4px">{{ user()?.email }}</div>
        <span class="badge b-purple">{{ user()?.role }}</span>
        <div class="div" style="border-color:rgba(255,255,255,.1);margin:14px 0"></div>
        <div style="font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:rgba(255,255,255,.4);margin-bottom:8px">Current Subscription</div>
        <div style="font-family:'Syne',sans-serif;font-size:18px;font-weight:800;background:var(--g);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin-bottom:4px">Active Plan</div>
        <div style="font-size:12px;color:rgba(255,255,255,.4);margin-bottom:12px">$249/month · Renews Jun 1, 2026</div>
        
      </div>
      <div class="card">
        <div class="sec-title">User Roles &amp; Permissions</div>
        <div style="display:flex;flex-direction:column;gap:6px">
          <div *ngFor="let r of roles" style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:var(--bg);border-radius:9px">
            <span style="font-size:12.5px;font-weight:600">{{ r.name }}</span>
            <div style="display:flex;align-items:center;gap:8px">
              <span style="font-size:11px;color:var(--muted)">{{ r.perm }}</span>
              <span class="badge" [ngClass]="r.badge">{{ r.name.split(' ')[0] }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>`,
})
export class SettingsComponent implements OnInit {
  user = signal<any>(null);
  saved = signal(false);
  pwdError = signal('');
  hotel = { name:'Grand Palace Hotel', country:'AE', city:'Dubai', currency:'USD', timezone:'Asia/Dubai', contactEmail:'admin@grandpalace.ae', taxRate:5 };
  pwd = { current:'', new:'', confirm:'' };
  roles = [
    {name:'Super Admin',badge:'b-purple',perm:'Full platform access'},
    {name:'Hotel Admin',badge:'b-pink',perm:'Full hotel access'},
    {name:'Manager',badge:'b-blue',perm:'View & manage'},
    {name:'Receptionist',badge:'b-green',perm:'Bookings & guests'},
    {name:'Restaurant Staff',badge:'b-gray',perm:'POS only'},
    {name:'Finance',badge:'b-yellow',perm:'Finance & reports'},
    {name:'Technician',badge:'b-gray',perm:'Maintenance only'},
  ];
  constructor(private auth: AuthService) {}
  ngOnInit() { this.user.set(this.auth.user()); }
  saveHotel() { this.saved.set(true); setTimeout(() => this.saved.set(false), 2000); }
  changePassword() {
    this.pwdError.set('');
    if (!this.pwd.current) { this.pwdError.set('Enter your current password'); return; }
    if (this.pwd.new.length < 8) { this.pwdError.set('New password must be at least 8 characters'); return; }
    if (this.pwd.new !== this.pwd.confirm) { this.pwdError.set('Passwords do not match'); return; }
    this.auth.changePassword(this.pwd.current, this.pwd.new).subscribe({
      next: () => { alert('Password updated successfully'); this.pwd = { current:'', new:'', confirm:'' }; },
      error: (e: any) => this.pwdError.set(e.error?.message || 'Failed to update password'),
    });
  }
}
