import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BookingService, GuestService, RoomService } from '../../core/services/api.service';

@Component({
  selector: 'app-bookings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
<div class="page-content">

  <div class="sec-head mb20">
    <div>
      <div style="font-size:18px;font-weight:800;letter-spacing:-.4px">Bookings</div>
      <div style="font-size:12.5px;color:var(--muted);margin-top:3px">Reservations · check-ins · check-outs</div>
    </div>
    <button class="btn btn-g btn-sm" (click)="openCreate()">＋ New Booking</button>
  </div>

  <div class="g4 mb20">
    <div class="mc"><div class="mc-ico">📅</div><div class="mc-lbl">Active</div><div class="mc-val">{{ activeBookings().length }}</div></div>
    <div class="mc"><div class="mc-ico">🟢</div><div class="mc-lbl">Checked In</div><div class="mc-val" style="color:var(--success)">{{ count('checked_in') }}</div></div>
    <div class="mc"><div class="mc-ico">🔵</div><div class="mc-lbl">Reserved</div><div class="mc-val" style="color:var(--info)">{{ count('reserved') }}</div></div>
    <div class="mc"><div class="mc-ico">💰</div><div class="mc-lbl">Revenue</div><div class="mc-val" style="color:var(--purple)">{{ totalRevenue() | currency:'USD':'symbol':'1.0-0' }}</div></div>
  </div>

  <!-- Tabs -->
  <div style="display:flex;gap:4px;margin-bottom:16px;background:var(--bg);border-radius:12px;padding:4px;width:fit-content;border:1px solid var(--border)">
    <button class="btn btn-sm" [ngClass]="bTab()==='active'?'btn-g':'btn-ghost'" (click)="bTab.set('active')">
      📋 Active ({{ activeBookings().length }})
    </button>
    <button class="btn btn-sm" [ngClass]="bTab()==='history'?'btn-g':'btn-ghost'" (click)="bTab.set('history')">
      📜 History ({{ historyBookings().length }})
    </button>
  </div>

  <div class="card">
    <div *ngIf="loading()" style="text-align:center;padding:40px;color:var(--muted)">Loading...</div>

    <!-- ACTIVE BOOKINGS -->
    <table class="tbl-hover" *ngIf="!loading() && bTab()==='active'">
      <thead>
        <tr><th>Ref</th><th>Guest</th><th>Room</th><th>Check In</th><th>Check Out</th><th>Nights</th><th>Total</th><th>Status</th><th>Actions</th></tr>
      </thead>
      <tbody>
        <tr *ngFor="let b of activeBookings()">
          <td style="font-family:monospace;font-size:11px;color:var(--purple)">{{ b.bookingRef }}</td>
          <td>
            <div style="font-weight:600">{{ b.guestId?.firstName }} {{ b.guestId?.lastName }}</div>
            <div style="font-size:11px;color:var(--muted)">{{ b.adults }} adult{{ b.adults!==1?'s':'' }}<span *ngIf="b.children"> · {{ b.children }} child</span></div>
          </td>
          <td><span class="tag">{{ b.roomId?.roomNumber }}</span></td>
          <td style="font-size:12px">{{ b.checkIn | date:'MMM d, y' }}</td>
          <td style="font-size:12px">{{ b.checkOut | date:'MMM d, y' }}</td>
          <td style="font-weight:600;text-align:center">{{ b.nights }}</td>
          <td style="font-weight:700">\${{ b.totalAmount }}</td>
          <td><span class="badge" [ngClass]="statusBadge(b.status)">{{ b.status | titlecase }}</span></td>
          <td>
            <div style="display:flex;gap:4px">
              <button class="btn btn-o btn-xs" (click)="openEdit(b)">✏️</button>
              <button *ngIf="b.status==='reserved'" class="btn btn-success btn-xs" (click)="confirmCheckIn(b)">Check In</button>
              <button *ngIf="b.status==='checked_in'" class="btn btn-o btn-xs" (click)="confirmCheckOut(b)">Check Out</button>
              <button *ngIf="b.status!=='checked_out'&&b.status!=='cancelled'" class="btn btn-danger btn-xs" (click)="confirmCancel(b)">Cancel</button>
            </div>
          </td>
        </tr>
        <tr *ngIf="!activeBookings().length">
          <td colspan="9" style="text-align:center;padding:40px;color:var(--muted)">
            <div style="font-size:28px;margin-bottom:8px">📅</div>No active bookings.
          </td>
        </tr>
      </tbody>
    </table>

    <!-- HISTORY TABLE -->
    <table class="tbl-hover" *ngIf="!loading() && bTab()==='history'">
      <thead>
        <tr><th>Ref</th><th>Guest</th><th>Room</th><th>Check In</th><th>Check Out</th><th>Nights</th><th>Total</th><th>Status</th></tr>
      </thead>
      <tbody>
        <tr *ngFor="let b of historyBookings()" style="opacity:.85">
          <td style="font-family:monospace;font-size:11px;color:var(--muted)">{{ b.bookingRef }}</td>
          <td>
            <div style="font-weight:600">{{ b.guestId?.firstName }} {{ b.guestId?.lastName }}</div>
            <div style="font-size:11px;color:var(--muted)">{{ b.adults }} adult{{ b.adults!==1?'s':'' }}</div>
          </td>
          <td><span class="tag">{{ b.roomId?.roomNumber }}</span></td>
          <td style="font-size:12px">{{ b.checkIn | date:'MMM d, y' }}</td>
          <td style="font-size:12px">{{ b.checkOut | date:'MMM d, y' }}</td>
          <td style="text-align:center;font-weight:600">{{ b.nights }}</td>
          <td style="font-weight:700">\${{ b.totalAmount }}</td>
          <td><span class="badge" [ngClass]="statusBadge(b.status)">{{ b.status | titlecase }}</span></td>
        </tr>
        <tr *ngIf="!historyBookings().length">
          <td colspan="8" style="text-align:center;padding:40px;color:var(--muted)">
            <div style="font-size:28px;margin-bottom:8px">📜</div>No history yet.
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- ══ CREATE / EDIT MODAL ══ -->
  <!-- CONFIRM DIALOG -->
  <div class="overlay" [class.show]="confirmDialog().show" style="z-index:9999">
    <div class="modal" style="width:420px;text-align:center">
      <div style="font-size:36px;margin-bottom:12px">{{ confirmDialog().icon }}</div>
      <div style="font-size:16px;font-weight:800;margin-bottom:8px">{{ confirmDialog().title }}</div>
      <div style="font-size:13px;color:var(--muted);margin-bottom:22px;line-height:1.5">{{ confirmDialog().message }}</div>
      <div style="display:flex;gap:10px">
        <button class="btn btn-o" style="flex:1" (click)="dismissConfirm()">Cancel</button>
        <button class="btn" style="flex:2" [ngClass]="confirmDialog().danger?'btn-danger':'btn-g'" (click)="acceptConfirm()">
          {{ confirmDialog().confirmLabel }}
        </button>
      </div>
    </div>
  </div>

  <div class="overlay" [class.show]="showForm()" (click)="bgClick($event)">
    <div class="modal" style="width:660px">
      <div class="modal-head">
        <div class="modal-title">{{ editingId() ? 'Edit Booking — '+bf.bookingRef : 'New Booking' }}</div>
        <button class="modal-close" (click)="showForm.set(false)">✕</button>
      </div>

      <!-- Steps -->
      <div *ngIf="!editingId()" style="display:flex;gap:0;margin-bottom:22px;background:var(--bg);border-radius:10px;padding:4px">
        <div *ngFor="let s of steps; let i=index"
          style="flex:1;text-align:center;padding:8px 4px;border-radius:7px;transition:all .15s;cursor:pointer;font-size:12px;font-weight:600"
          [style.background]="step()===i?'var(--surface)':'transparent'"
          [style.color]="step()===i?'var(--purple)':step()>i?'var(--success)':'var(--muted)'"
          [style.box-shadow]="step()===i?'var(--shadow)':'none'"
          (click)="step()>i && step.set(i)">
          <span style="font-size:15px">{{ step()>i?'✅':s.icon }}</span>
          <div style="margin-top:2px">{{ s.label }}</div>
        </div>
      </div>

      <!-- ── STEP 0: GUEST ── -->
      <ng-container *ngIf="step()===0">
        <div style="font-size:13px;font-weight:700;margin-bottom:12px;color:var(--text2)">👤 Guest Details</div>
        <div style="position:relative;margin-bottom:10px">
          <input [(ngModel)]="guestSearch" (input)="searchGuests()" placeholder="Search existing guest by name or email...">
        </div>
        <div *ngIf="guestResults().length" style="background:var(--bg);border-radius:10px;padding:6px;margin-bottom:12px;max-height:160px;overflow-y:auto">
          <div *ngFor="let g of guestResults()"
            style="display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:8px;cursor:pointer;transition:background .12s"
            [style.background]="bf.guestId===g._id?'#f3e8ff':'transparent'"
            (click)="selectGuest(g)">
            <div class="av" style="width:30px;height:30px;font-size:10px;border-radius:7px">{{ (g.firstName[0]||'')+(g.lastName[0]||'') }}</div>
            <div style="flex:1"><div style="font-size:13px;font-weight:600">{{ g.firstName }} {{ g.lastName }}</div><div style="font-size:11px;color:var(--muted)">{{ g.email }} · {{ g.totalStays }} stays</div></div>
            <span class="badge" [ngClass]="vipBadge(g.vipTier)">{{ g.vipTier }}</span>
          </div>
        </div>
        <div *ngIf="bf.guestId" style="background:#f3e8ff;border-radius:10px;padding:10px 14px;margin-bottom:14px;display:flex;align-items:center;gap:10px">
          <span style="font-size:18px">✅</span>
          <div style="flex:1"><div style="font-weight:700;color:var(--purple)">{{ selGuest()?.firstName }} {{ selGuest()?.lastName }}</div><div style="font-size:11px;color:var(--muted)">{{ selGuest()?.email }}</div></div>
          <button class="btn btn-o btn-xs" (click)="bf.guestId='';guestSearch=''">Change</button>
        </div>
        <div *ngIf="!bf.guestId">
          <div class="div" style="margin:10px 0"></div>
          <div style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">— or create new guest —</div>
          <div class="form-row">
            <div class="fg"><label>First Name *</label><input [(ngModel)]="ng.firstName" placeholder="Maria"></div>
            <div class="fg"><label>Last Name *</label><input [(ngModel)]="ng.lastName" placeholder="Garcia"></div>
          </div>
          <div class="form-row">
            <div class="fg"><label>Email</label><input type="email" [(ngModel)]="ng.email" placeholder="guest@email.com"></div>
            <div class="fg"><label>Phone</label><input [(ngModel)]="ng.phone" placeholder="+971 50 000 0001"></div>
          </div>
          <div class="form-row">
            <div class="fg"><label>Nationality</label><input [(ngModel)]="ng.nationality" placeholder="AE"></div>
            <div class="fg"><label>ID Number</label><input [(ngModel)]="ng.idNumber" placeholder="Passport / National ID"></div>
          </div>
        </div>

        <!-- Companions -->
        <div class="div" style="margin:12px 0"></div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
          <div style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.5px">Companions (other guests in room)</div>
          <button class="btn btn-o btn-xs" (click)="addCompanion()">＋ Add</button>
        </div>
        <div *ngFor="let c of bf.companions; let i=index" style="background:var(--bg);border-radius:10px;padding:10px 12px;margin-bottom:8px">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
            <div style="font-size:12px;font-weight:600;color:var(--text2)">Companion {{ i+1 }}</div>
            <button class="btn btn-danger btn-xs" (click)="removeCompanion(i)">✕</button>
          </div>
          <div class="form-row" style="margin-bottom:6px">
            <div class="fg" style="margin-bottom:0"><label style="font-size:10.5px">Name</label><input [(ngModel)]="c.name" placeholder="Full name" style="font-size:12.5px"></div>
            <div class="fg" style="margin-bottom:0"><label style="font-size:10.5px">Relation</label>
              <select [(ngModel)]="c.relation" style="font-size:12.5px">
                <option value="spouse">Spouse</option><option value="child">Child</option>
                <option value="parent">Parent</option><option value="colleague">Colleague</option><option value="friend">Friend</option>
              </select>
            </div>
          </div>
          <div class="form-row" style="margin-bottom:0">
            <div class="fg" style="margin-bottom:0"><label style="font-size:10.5px">ID Type</label>
              <select [(ngModel)]="c.idType" style="font-size:12.5px">
                <option value="passport">Passport</option><option value="national_id">National ID</option>
              </select>
            </div>
            <div class="fg" style="margin-bottom:0"><label style="font-size:10.5px">ID Number</label><input [(ngModel)]="c.idNumber" placeholder="ID number" style="font-size:12.5px"></div>
          </div>
        </div>

        <div *ngIf="stepErr()" style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:10px;font-size:12.5px;color:#b91c1c;margin-bottom:10px">⚠️ {{ stepErr() }}</div>
        <div style="display:flex;justify-content:flex-end">
          <button class="btn btn-g btn-sm" (click)="step0Next()" [disabled]="stepLoading()">
            {{ stepLoading() ? 'Saving guest...' : 'Next: Room & Dates →' }}
          </button>
        </div>
      </ng-container>

      <!-- ── STEP 1: ROOM + DATES ── -->
      <ng-container *ngIf="step()===1">
        <div style="font-size:13px;font-weight:700;margin-bottom:12px;color:var(--text2)">🛏 Select Room & Dates</div>
        <div class="form-row" style="margin-bottom:14px">
          <div class="fg"><label>Check-in Date *</label><input type="date" [(ngModel)]="bf.checkIn" (change)="calcNights()"></div>
          <div class="fg"><label>Check-out Date *</label><input type="date" [(ngModel)]="bf.checkOut" (change)="calcNights()"></div>
        </div>
        <div *ngIf="bf.nights" style="background:var(--grad-soft);border-radius:10px;padding:10px 14px;margin-bottom:14px;display:flex;align-items:center;gap:10px">
          <span style="font-size:18px">🌙</span><span style="font-weight:700;color:var(--purple)">{{ bf.nights }} night{{ bf.nights!==1?'s':'' }}</span>
        </div>
        <div style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">Available Rooms</div>
        <div *ngIf="loadingRooms()" style="text-align:center;padding:20px;color:var(--muted)">Loading rooms...</div>
        <div style="max-height:240px;overflow-y:auto;display:flex;flex-direction:column;gap:6px" *ngIf="!loadingRooms()">
          <div *ngFor="let r of availRooms()"
            style="display:flex;align-items:center;gap:12px;padding:10px 14px;border-radius:10px;cursor:pointer;transition:all .15s;border:2px solid transparent"
            [style.border-color]="bf.roomId===r._id?'var(--purple)':'var(--border)'"
            [style.background]="bf.roomId===r._id?'#f3e8ff':'var(--bg)'"
            (click)="selectRoom(r)">
            <div style="width:44px;height:44px;border-radius:10px;overflow:hidden;background:var(--surface);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;flex-shrink:0">
              <img *ngIf="r.images?.[0]" [src]="r.images[0]" style="width:100%;height:100%;object-fit:cover">
              <span *ngIf="!r.images?.[0]" style="font-size:18px">🛏</span>
            </div>
            <div style="flex:1">
              <div style="font-weight:700;font-size:13.5px">Room {{ r.roomNumber }} — {{ r.type | titlecase }}</div>
              <div style="font-size:11px;color:var(--muted)">Floor {{ r.floor }} · Max {{ r.maxGuests }} guests · {{ r.building }}</div>
              <div style="display:flex;gap:4px;margin-top:3px;flex-wrap:wrap">
                <span *ngFor="let a of (r.amenities||[]).slice(0,4)" class="tag" style="font-size:9.5px">{{ a }}</span>
              </div>
            </div>
            <div style="text-align:right;flex-shrink:0">
              <div style="font-size:17px;font-weight:800;color:var(--purple)">\${{ r.pricePerNight }}</div>
              <div style="font-size:10px;color:var(--muted)">/night</div>
              <div *ngIf="bf.nights" style="font-size:11px;font-weight:700;margin-top:2px">\${{ r.pricePerNight*bf.nights }} total</div>
            </div>
            <span *ngIf="bf.roomId===r._id" style="color:var(--purple);font-size:18px">✓</span>
          </div>
          <div *ngIf="!availRooms().length&&!loadingRooms()" style="text-align:center;padding:30px;color:var(--muted)">
            <div style="font-size:24px;margin-bottom:6px">🚫</div>No available rooms for selected dates
          </div>
        </div>
        <div *ngIf="stepErr()" style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:10px;font-size:12.5px;color:#b91c1c;margin:10px 0">⚠️ {{ stepErr() }}</div>
        <div style="display:flex;justify-content:space-between;margin-top:14px">
          <button class="btn btn-o btn-sm" (click)="step.set(0)">← Back</button>
          <button class="btn btn-g btn-sm" (click)="step1Next()">Next: Details →</button>
        </div>
      </ng-container>

      <!-- ── STEP 2: DETAILS + DOCS ── -->
      <ng-container *ngIf="step()===2">
        <div style="font-size:13px;font-weight:700;margin-bottom:14px;color:var(--text2)">📝 Booking Details</div>
        <div class="form-row">
          <div class="fg"><label>Adults *</label>
            <select [(ngModel)]="bf.adults"><option *ngFor="let n of [1,2,3,4,5,6]" [value]="n">{{ n }} adult{{ n!==1?'s':'' }}</option></select>
          </div>
          <div class="fg"><label>Children</label>
            <select [(ngModel)]="bf.children"><option *ngFor="let n of [0,1,2,3,4]" [value]="n">{{ n }}</option></select>
          </div>
        </div>
        <div class="form-row">
          <div class="fg"><label>Payment Method</label>
            <select [(ngModel)]="bf.paymentMethod">
              <option value="cash">💵 Cash</option><option value="visa">💳 Visa</option>
              <option value="mastercard">💳 Mastercard</option><option value="bank_transfer">🏦 Bank Transfer</option><option value="online">🌐 Online</option>
            </select>
          </div>
          <div class="fg"><label>Booking Status</label>
            <select [(ngModel)]="bf.status">
              <option value="reserved">Reserved</option><option value="checked_in">Check In Now</option>
            </select>
          </div>
        </div>
        <div class="fg"><label>Special Requests</label>
          <textarea rows="2" [(ngModel)]="bf.specialRequests" placeholder="High floor, extra pillows, late check-in..."></textarea>
        </div>

        <!-- Guest Document Upload -->
        <div class="div" style="margin:14px 0"></div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
          <div>
            <div style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.5px">Guest Documents</div>
            <div style="font-size:11.5px;color:var(--muted);margin-top:2px">Upload passport, visa, ID photos</div>
          </div>
          <label class="btn btn-o btn-xs" style="cursor:pointer">
            📎 Upload Doc
            <input type="file" accept="image/*,application/pdf" multiple style="display:none" (change)="uploadDocs($event)">
          </label>
        </div>
        <div *ngIf="bf.documents.length" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
          <div *ngFor="let doc of bf.documents; let i=index"
            style="position:relative;background:var(--bg);border:1.5px solid var(--border);border-radius:10px;padding:8px 12px;display:flex;align-items:center;gap:8px;max-width:180px">
            <span style="font-size:18px">{{ doc.url.startsWith('data:image')?'🖼️':'📄' }}</span>
            <div style="flex:1;min-width:0">
              <div style="font-size:11px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ doc.label }}</div>
              <select [(ngModel)]="doc.type" style="font-size:10px;padding:2px 4px;height:20px;border-radius:4px">
                <option value="passport">Passport</option><option value="national_id">National ID</option>
                <option value="visa">Visa</option><option value="drivers_license">Driver's License</option><option value="other">Other</option>
              </select>
            </div>
            <button type="button" style="position:absolute;top:-5px;right:-5px;width:16px;height:16px;border-radius:50%;background:#dc2626;color:#fff;border:none;cursor:pointer;font-size:9px" (click)="removeDoc(i)">✕</button>
          </div>
        </div>
        <div *ngIf="!bf.documents.length" style="background:var(--bg);border:1.5px dashed var(--border);border-radius:10px;padding:16px;text-align:center;margin-bottom:12px;color:var(--muted);font-size:12.5px">
          No documents uploaded yet. Click "Upload Doc" to add passport or ID photos.
        </div>

        <!-- Summary -->
        <div style="background:var(--grad);color:#fff;border-radius:14px;padding:18px;margin-bottom:14px;position:relative;overflow:hidden">
          <div style="position:absolute;top:-30px;right:-30px;width:100px;height:100px;border-radius:50%;background:rgba(255,255,255,.06)"></div>
          <div style="font-size:10px;letter-spacing:2px;text-transform:uppercase;opacity:.65;margin-bottom:8px">Booking Summary</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12.5px;position:relative">
            <div><div style="opacity:.65">Guest</div><div style="font-weight:700">{{ selGuest()?.firstName }} {{ selGuest()?.lastName }}</div></div>
            <div><div style="opacity:.65">Room</div><div style="font-weight:700">{{ selRoom()?.roomNumber }} — {{ selRoom()?.type | titlecase }}</div></div>
            <div><div style="opacity:.65">Check-in</div><div style="font-weight:700">{{ bf.checkIn | date:'MMM d, y' }}</div></div>
            <div><div style="opacity:.65">Check-out</div><div style="font-weight:700">{{ bf.checkOut | date:'MMM d, y' }}</div></div>
            <div><div style="opacity:.65">Nights</div><div style="font-weight:700">{{ bf.nights }}</div></div>
            <div><div style="opacity:.65">Rate/Night</div><div style="font-weight:700">\${{ selRoom()?.pricePerNight }}</div></div>
          </div>
          <div style="border-top:1px solid rgba(255,255,255,.2);margin-top:12px;padding-top:12px;display:flex;justify-content:space-between;align-items:center;position:relative">
            <span style="opacity:.7;font-size:12px">Total Amount</span>
            <span style="font-size:24px;font-weight:800;letter-spacing:-1px">\${{ bf.totalAmount }}</span>
          </div>
        </div>

        <div *ngIf="stepErr()" style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:10px;font-size:12.5px;color:#b91c1c;margin-bottom:10px">⚠️ {{ stepErr() }}</div>
        <div style="display:flex;gap:10px">
          <button class="btn btn-o" style="flex:1" (click)="step.set(1)">← Back</button>
          <button class="btn btn-g" style="flex:2" (click)="saveBooking()" [disabled]="saving()">
            {{ saving() ? 'Creating Booking...' : 'Confirm Booking ✓' }}
          </button>
        </div>
      </ng-container>

      <!-- ── STEP 3: DONE ── -->
      <ng-container *ngIf="step()===3">
        <div style="text-align:center;padding:20px 0">
          <div style="font-size:52px;margin-bottom:12px">🎉</div>
          <div style="font-size:18px;font-weight:800;letter-spacing:-.3px;margin-bottom:6px">Booking Confirmed!</div>
          <div style="font-size:13px;color:var(--muted);margin-bottom:20px">The reservation has been created successfully</div>
          <div style="background:var(--grad-soft);border-radius:12px;padding:14px;margin-bottom:20px;display:inline-block;min-width:200px">
            <div style="font-size:11px;color:var(--muted);margin-bottom:4px">Booking Reference</div>
            <div style="font-size:20px;font-weight:800;color:var(--purple);font-family:monospace;letter-spacing:1px">{{ createdRef() }}</div>
          </div>
          <div style="display:flex;gap:10px;justify-content:center">
            <button class="btn btn-o btn-sm" (click)="showForm.set(false)">Close</button>
            <button class="btn btn-g btn-sm" (click)="openCreate()">＋ New Booking</button>
          </div>
        </div>
      </ng-container>

      <!-- ── EDIT MODE ── -->
      <ng-container *ngIf="editingId()">
        <div class="form-row">
          <div class="fg"><label>Status</label>
            <select [(ngModel)]="bf.status">
              <option value="reserved">Reserved</option>
              <option value="checked_in">Checked In</option>
              <option value="checked_out">Checked Out</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div class="fg"><label>Payment Method</label>
            <select [(ngModel)]="bf.paymentMethod">
              <option value="cash">Cash</option><option value="visa">Visa</option>
              <option value="mastercard">Mastercard</option><option value="bank_transfer">Bank Transfer</option>
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="fg"><label>Adults</label>
            <select [(ngModel)]="bf.adults"><option *ngFor="let n of [1,2,3,4,5,6]" [value]="n">{{ n }}</option></select>
          </div>
          <div class="fg"><label>Children</label>
            <select [(ngModel)]="bf.children"><option *ngFor="let n of [0,1,2,3,4]" [value]="n">{{ n }}</option></select>
          </div>
        </div>
        <div class="fg"><label>Special Requests</label>
          <textarea rows="2" [(ngModel)]="bf.specialRequests"></textarea>
        </div>

        <!-- Documents in edit mode -->
        <div class="div" style="margin:14px 0"></div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
          <div style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.5px">Guest Documents</div>
          <label class="btn btn-o btn-xs" style="cursor:pointer">
            📎 Upload Doc
            <input type="file" accept="image/*,application/pdf" multiple style="display:none" (change)="uploadDocs($event)">
          </label>
        </div>
        <div *ngIf="bf.documents?.length" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
          <div *ngFor="let doc of bf.documents; let i=index"
            style="position:relative;background:var(--bg);border:1.5px solid var(--border);border-radius:10px;padding:8px 12px;display:flex;align-items:center;gap:8px;max-width:180px">
            <span style="font-size:18px">{{ doc.url?.startsWith('data:image')?'🖼️':'📄' }}</span>
            <div style="flex:1;min-width:0">
              <div style="font-size:11px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ doc.label }}</div>
              <select [(ngModel)]="doc.type" style="font-size:10px;padding:2px 4px;height:20px;border-radius:4px">
                <option value="passport">Passport</option><option value="national_id">National ID</option>
                <option value="visa">Visa</option><option value="drivers_license">Driver's License</option><option value="other">Other</option>
              </select>
            </div>
            <button type="button" style="position:absolute;top:-5px;right:-5px;width:16px;height:16px;border-radius:50%;background:#dc2626;color:#fff;border:none;cursor:pointer;font-size:9px" (click)="removeDoc(i)">✕</button>
          </div>
        </div>
        <div *ngIf="!bf.documents?.length" style="background:var(--bg);border:1.5px dashed var(--border);border-radius:10px;padding:14px;text-align:center;margin-bottom:12px;color:var(--muted);font-size:12.5px">
          No documents uploaded. Click "Upload Doc" to add.
        </div>

        <div *ngIf="stepErr()" style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:10px;font-size:12.5px;color:#b91c1c;margin-bottom:10px">⚠️ {{ stepErr() }}</div>
        <div style="display:flex;gap:10px">
          <button class="btn btn-o" style="flex:1" (click)="showForm.set(false)">Cancel</button>
          <button class="btn btn-g" style="flex:2" (click)="updateBooking()" [disabled]="saving()">
            {{ saving() ? 'Saving...' : 'Update Booking' }}
          </button>
        </div>
      </ng-container>
    </div>
  </div>
</div>`,
})
export class BookingsComponent implements OnInit {

  bookings      = signal<any[]>([]);
  bTab          = signal<'active'|'history'>('active');
  confirmDialog = signal<{show:boolean;icon:string;title:string;message:string;confirmLabel:string;danger:boolean;action:()=>void}>({
    show:false, icon:'⚠️', title:'', message:'', confirmLabel:'Confirm', danger:true, action:()=>{}
  });
  showConfirm(opts: {icon?:string;title:string;message:string;confirmLabel?:string;danger?:boolean;action:()=>void}) {
    this.confirmDialog.set({ show:true, icon:opts.icon||'⚠️', title:opts.title, message:opts.message, confirmLabel:opts.confirmLabel||'Confirm', danger:opts.danger!==false, action:opts.action });
  }
  acceptConfirm()  { const fn = this.confirmDialog().action; this.confirmDialog.update(d=>({...d,show:false})); fn(); }
  dismissConfirm() { this.confirmDialog.update(d=>({...d,show:false})); }
  searchText    = '';
  readonly activeBookings  = computed(() => this.bookings().filter(b => b.status !== 'checked_out' && b.status !== 'cancelled').filter(b => this.matchesSearch(b)));
  readonly historyBookings = computed(() => this.bookings().filter(b => b.status === 'checked_out' || b.status === 'cancelled').filter(b => this.matchesSearch(b)));
  filterList() { /* search reactive via computed */ }
  matchesSearch(b: any): boolean {
    const s = this.searchText.toLowerCase();
    if (!s) return true;
    return b.bookingRef?.toLowerCase().includes(s) || b.guestId?.firstName?.toLowerCase().includes(s) || b.guestId?.lastName?.toLowerCase().includes(s);
  }
  guestResults  = signal<any[]>([]);
  availRooms    = signal<any[]>([]);
  loading       = signal(true);
  loadingRooms  = signal(false);
  saving        = signal(false);
  stepLoading   = signal(false);
  showForm      = signal(false);
  step          = signal(0);
  stepErr       = signal('');
  createdRef    = signal('');
  editingId     = signal<string|null>(null);
  filterStatus  = '';
  guestSearch   = '';

  steps = [
    { icon:'👤', label:'Guest'   },
    { icon:'🛏', label:'Room'    },
    { icon:'📝', label:'Details' },
    { icon:'✅', label:'Done'    },
  ];

  ng: any = { firstName:'', lastName:'', email:'', phone:'', nationality:'', idNumber:'' };

  bf: any = {
    guestId:'', roomId:'', checkIn:'', checkOut:'', nights:0,
    adults:2, children:0, paymentMethod:'cash', status:'reserved',
    specialRequests:'', ratePerNight:0, totalAmount:0,
    documents:[], companions:[], bookingRef:'',
  };

  private _selGuest: any = null;
  private _selRoom: any = null;

  readonly selGuest = computed(() => this.guestResults().find(g => g._id === this.bf.guestId) || this._selGuest);
  readonly selRoom  = computed(() => this.availRooms().find(r => r._id === this.bf.roomId) || this._selRoom);

  constructor(
    private bookSvc: BookingService,
    private guestSvc: GuestService,
    private roomSvc: RoomService,
  ) {}

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.bookSvc.getAll({}).subscribe({
      next: (r: any) => { this.bookings.set(r.data.bookings||[]); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  count(s: string) { return this.bookings().filter(b => b.status === s).length; }
  totalRevenue()   { return this.bookings().filter(b => b.status !== 'cancelled').reduce((s, b) => s + (b.totalAmount||0), 0); }

  openCreate() {
    this.editingId.set(null);
    this.step.set(0); this.stepErr.set('');
    this.ng = { firstName:'', lastName:'', email:'', phone:'', nationality:'', idNumber:'' };
    this.bf = { guestId:'', roomId:'', checkIn:'', checkOut:'', nights:0, adults:2, children:0, paymentMethod:'cash', status:'reserved', specialRequests:'', ratePerNight:0, totalAmount:0, documents:[], companions:[], bookingRef:'' };
    this.guestSearch = ''; this.guestResults.set([]); this.availRooms.set([]);
    this._selGuest = null; this._selRoom = null;
    this.showForm.set(true);
  }

  openEdit(b: any) {
    this.editingId.set(b._id);
    this.bf = { ...b, documents: b.documents||[], companions: b.companions||[], bookingRef: b.bookingRef };
    this._selGuest = b.guestId; this._selRoom = b.roomId;
    this.stepErr.set('');
    this.showForm.set(true);
  }

  searchGuests() {
    if (this.guestSearch.length < 2) { this.guestResults.set([]); return; }
    this.guestSvc.getAll({ search: this.guestSearch }).subscribe({ next: r => this.guestResults.set(r.data.guests||[]) });
  }

  selectGuest(g: any) { this.bf.guestId = g._id; this._selGuest = g; }
  selectRoom(r: any)  { this.bf.roomId = r._id; this._selRoom = r; this.bf.ratePerNight = r.pricePerNight; this.updateTotal(); }

  addCompanion()          { this.bf.companions = [...(this.bf.companions||[]), { name:'', relation:'spouse', idType:'passport', idNumber:'' }]; }
  removeCompanion(i: number) { this.bf.companions = this.bf.companions.filter((_: any, x: number) => x !== i); }

  uploadDocs(event: Event) {
    const files = (event.target as HTMLInputElement).files;
    if (!files) return;
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        this.bf.documents = [...(this.bf.documents||[]), {
          label: file.name.split('.')[0],
          type: 'passport',
          url: e.target?.result as string,
        }];
      };
      reader.readAsDataURL(file);
    });
  }

  removeDoc(i: number) { this.bf.documents = this.bf.documents.filter((_: any, x: number) => x !== i); }

  calcNights() {
    if (!this.bf.checkIn || !this.bf.checkOut) return;
    const nights = Math.round((new Date(this.bf.checkOut).getTime() - new Date(this.bf.checkIn).getTime()) / 86400000);
    if (nights > 0) { this.bf.nights = nights; if (this.bf.roomId) this.updateTotal(); this.loadRooms(); }
  }

  updateTotal() { this.bf.totalAmount = this.bf.ratePerNight * (this.bf.nights||1); }

  loadRooms() {
    this.loadingRooms.set(true);
    this.roomSvc.getAll({ status: 'available' }).subscribe({
      next: r => { this.availRooms.set(r.data.rooms||[]); this.loadingRooms.set(false); },
      error: () => this.loadingRooms.set(false),
    });
  }

  step0Next() {
    this.stepErr.set('');
    if (this.bf.guestId) { this.step.set(1); this.loadRooms(); return; }
    if (!this.ng.firstName || !this.ng.lastName) { this.stepErr.set('First name and last name are required'); return; }
    this.stepLoading.set(true);
    this.guestSvc.create(this.ng).subscribe({
      next: r => {
        const g = r.data.guest;
        this.bf.guestId = g._id; this._selGuest = g;
        this.guestResults.set([g]);
        this.stepLoading.set(false);
        this.step.set(1); this.loadRooms();
      },
      error: (e: any) => { this.stepLoading.set(false); this.stepErr.set(e.error?.message||'Could not create guest'); },
    });
  }

  step1Next() {
    this.stepErr.set('');
    if (!this.bf.checkIn || !this.bf.checkOut) { this.stepErr.set('Select check-in and check-out dates'); return; }
    if (!this.bf.roomId) { this.stepErr.set('Please select a room'); return; }
    if (!this.bf.nights || this.bf.nights < 1) { this.stepErr.set('Check-out must be after check-in'); return; }
    this.step.set(2);
  }

  saveBooking() {
    this.saving.set(true); this.stepErr.set('');
    const payload = {
      guestId: this.bf.guestId, roomId: this.bf.roomId,
      checkIn: new Date(this.bf.checkIn).toISOString(), checkOut: new Date(this.bf.checkOut).toISOString(),
      nights: this.bf.nights, adults: this.bf.adults, children: this.bf.children||0,
      ratePerNight: this.bf.ratePerNight, totalAmount: this.bf.totalAmount,
      status: this.bf.status, paymentMethod: this.bf.paymentMethod,
      specialRequests: this.bf.specialRequests,
      documents: this.bf.documents, companions: this.bf.companions,
    };
    this.bookSvc.create(payload).subscribe({
      next: r => { this.saving.set(false); this.createdRef.set(r.data.booking?.bookingRef||'—'); this.step.set(3); this.load(); },
      error: (e: any) => { this.saving.set(false); this.stepErr.set(e.error?.message||'Booking failed'); },
    });
  }

  updateBooking() {
    this.saving.set(true); this.stepErr.set('');
    const eid = this.editingId()!;
    this.bookSvc.update(eid, {
      status: this.bf.status, adults: this.bf.adults, children: this.bf.children,
      paymentMethod: this.bf.paymentMethod, specialRequests: this.bf.specialRequests,
      documents: this.bf.documents, companions: this.bf.companions,
    }).subscribe({
      next: () => { this.saving.set(false); this.showForm.set(false); this.load(); },
      error: (e: any) => { this.saving.set(false); this.stepErr.set(e.error?.message||'Update failed'); },
    });
  }

  confirmCheckIn(b: any) {
    this.showConfirm({ icon:'🟢', title:'Confirm Check-In?', message:`Check in ${b.guestId?.firstName} ${b.guestId?.lastName} to Room ${b.roomId?.roomNumber}?`, confirmLabel:'Check In', danger:false,
      action: () => this.doCheckIn(b._id)
    });
  }
  doCheckIn(id: string) {
    this.bookSvc.update(id, { status:'checked_in', actualCheckIn: new Date().toISOString() }).subscribe(() => this.load());
  }

  confirmCheckOut(b: any) {
    this.showConfirm({ icon:'🚪', title:'Confirm Check-Out?', message:`Check out ${b.guestId?.firstName} ${b.guestId?.lastName} from Room ${b.roomId?.roomNumber}? This will free the room.`, confirmLabel:'Check Out', danger:false,
      action: () => this.doCheckOut(b._id)
    });
  }
  doCheckOut(id: string) {
    this.bookSvc.update(id, { status:'checked_out', actualCheckOut: new Date().toISOString() }).subscribe(() => {
      this.load();
      this.bTab.set('history');
    });
  }

  confirmCancel(b: any) {
    this.showConfirm({ icon:'❌', title:'Cancel Booking?', message:`Cancel booking ${b.bookingRef} for ${b.guestId?.firstName} ${b.guestId?.lastName}? This will free Room ${b.roomId?.roomNumber}.`, confirmLabel:'Cancel Booking', danger:true,
      action: () => this.cancel(b._id)
    });
  }
  cancel(id: string) {
    this.bookSvc.update(id, { status:'cancelled' }).subscribe(() => {
      this.load();
      this.bTab.set('history');
    });
  }

  bgClick(e: Event) { if ((e.target as HTMLElement).classList.contains('overlay')) this.showForm.set(false); }
  statusBadge(s: string) { const m: Record<string,string>={reserved:'b-blue',checked_in:'b-green',checked_out:'b-gray',cancelled:'b-red',no_show:'b-yellow'}; return m[s]||'b-gray'; }
  vipBadge(t: string)    { const m: Record<string,string>={regular:'b-gray',silver:'b-blue',gold:'b-yellow',vip:'b-purple'}; return m[t]||'b-gray'; }
}
