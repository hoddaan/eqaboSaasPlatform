import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GuestService, RoomService, PartnerService, BookingService } from '../../core/services/api.service';

type GTab = 'staying' | 'reserved' | 'visitors' | 'history' | 'all';

@Component({
  selector: 'app-guests',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
<div class="page-content">
  <div class="sec-head mb20">
    <div>
      <div style="font-size:18px;font-weight:800;letter-spacing:-.4px">Guest Profiles</div>
      <div style="font-size:12.5px;color:var(--muted);margin-top:3px">In-house · visitors · history</div>
    </div>
    <div style="display:flex;gap:8px">
      <input style="width:200px" [(ngModel)]="search" (input)="load()" placeholder="Search name or email...">
      <button class="btn btn-g btn-sm" (click)="openForm()">+ Add Guest</button>
    </div>
  </div>

  <div class="g4 mb20">
    <div class="mc"><div class="mc-ico">🏨</div><div class="mc-lbl">Staying Now</div><div class="mc-val" style="color:var(--success)">{{ stayingGuests().length }}</div></div>
    <div class="mc"><div class="mc-ico">👥</div><div class="mc-lbl">Visitors</div><div class="mc-val" style="color:var(--info)">{{ visitorGuests().length }}</div></div>
    <div class="mc"><div class="mc-ico">👑</div><div class="mc-lbl">VIP / Gold</div><div class="mc-val" style="color:var(--purple)">{{ vipCount() }}</div></div>
    <div class="mc"><div class="mc-ico">📋</div><div class="mc-lbl">Total Guests</div><div class="mc-val">{{ guests().length }}</div></div>
  </div>

  <div style="display:flex;gap:4px;margin-bottom:16px;background:var(--bg);border-radius:12px;padding:4px;width:fit-content;border:1px solid var(--border)">
    <button class="btn btn-sm" [ngClass]="tab()==='staying'?'btn-g':'btn-ghost'" (click)="setTab('staying')">🏨 In-House ({{ stayingGuests().length }})</button>
    <button class="btn btn-sm" [ngClass]="tab()==='reserved'?'btn-g':'btn-ghost'" (click)="setTab('reserved')">🔵 Reserved ({{ reservedGuests().length }})</button>
    <button class="btn btn-sm" [ngClass]="tab()==='visitors'?'btn-g':'btn-ghost'" (click)="setTab('visitors')">👥 Visitors ({{ visitorGuests().length }})</button>
    <button class="btn btn-sm" [ngClass]="tab()==='history'?'btn-g':'btn-ghost'" (click)="setTab('history')">📜 History ({{ historyGuests().length }})</button>
    <button class="btn btn-sm" [ngClass]="tab()==='all'?'btn-g':'btn-ghost'" (click)="setTab('all')">📋 All ({{ guests().length }})</button>
  </div>

  <div style="display:grid;grid-template-columns:1fr 1.6fr;gap:16px">

    <div class="card">
      <div *ngIf="loading()" style="text-align:center;padding:24px;color:var(--muted)">Loading...</div>
      <ng-container *ngIf="!loading()">
        <ng-container *ngIf="tab()==='reserved'">
          <div style="font-size:11px;font-weight:700;color:#1d4ed8;margin-bottom:12px">🔵 UPCOMING RESERVATIONS</div>
          <div *ngFor="let g of reservedGuests()" class="guest-row"
            style="border-left:3px solid transparent"
            [style.background]="selected()?._id===g._id?'#eff6ff':''"
            [style.border-left-color]="selected()?._id===g._id?'#2563eb':'transparent'"
            (click)="selectGuest(g)">
            <div class="av" style="border-radius:10px;flex-shrink:0;background:#2563eb">{{ initials(g) }}</div>
            <div style="flex:1;min-width:0">
              <div style="font-weight:700;font-size:13px">{{ g.firstName }} {{ g.lastName }}</div>
              <div style="font-size:10.5px;color:var(--muted)">🔵 Room {{ g.currentRoomId?.roomNumber || '—' }}</div>
              <div style="font-size:10.5px;color:var(--muted)">Check-in: {{ g.currentBookingId?.checkIn | date:'MMM d' }}</div>
            </div>
            <span style="background:#dbeafe;color:#1d4ed8;font-size:9.5px;font-weight:700;padding:2px 7px;border-radius:20px">Reserved</span>
          </div>
          <div *ngIf="!reservedGuests().length" style="text-align:center;padding:30px;color:var(--muted)">
            <div style="font-size:24px;margin-bottom:6px">🔵</div>No upcoming reservations
          </div>
        </ng-container>

        <ng-container *ngIf="tab()==='staying'">
          <div style="font-size:11px;font-weight:700;color:var(--text2);margin-bottom:12px">IN-HOUSE</div>
          <div *ngFor="let g of stayingGuests()" class="guest-row"
            style="border-left:3px solid transparent"
            [style.background]="selected()?._id===g._id?'#f3e8ff':''"
            [style.border-left-color]="selected()?._id===g._id?'var(--purple)':'transparent'"
            (click)="selectGuest(g)">
            <div class="av" style="border-radius:10px;flex-shrink:0">{{ initials(g) }}</div>
            <div style="flex:1;min-width:0">
              <div style="font-weight:700;font-size:13px">{{ g.firstName }} {{ g.lastName }}</div>
              <div style="font-size:10.5px;color:var(--muted)">Room {{ g.currentRoomId?.roomNumber || "—" }}</div>
              <div style="font-size:10.5px;color:var(--muted)">Out: {{ g.currentBookingId?.checkOut | date:"MMM d" }}</div>
            </div>
            <span class="badge" [ngClass]="vipBadge(g.vipTier)">{{ g.vipTier }}</span>
          </div>
          <div *ngIf="!stayingGuests().length" style="text-align:center;padding:30px;color:var(--muted)">No guests staying</div>
        </ng-container>
        <ng-container *ngIf="tab()==='visitors'">
          <div style="font-size:11px;font-weight:700;color:var(--text2);margin-bottom:12px">VISITORS</div>
          <div *ngFor="let g of visitorGuests()" class="guest-row" [style.background]="selected()?._id===g._id?'#eff6ff':''" (click)="selectGuest(g)">
            <div class="av" style="border-radius:10px;flex-shrink:0;background:#2563eb">{{ initials(g) }}</div>
            <div style="flex:1;min-width:0">
              <div style="font-weight:700;font-size:13px">{{ g.firstName }} {{ g.lastName }}</div>
              <div style="font-size:10.5px;color:var(--muted)">Visiting: {{ g.visitingGuestId?.firstName }} {{ g.visitingGuestId?.lastName }}</div>
            </div>
          </div>
          <div *ngIf="!visitorGuests().length" style="text-align:center;padding:30px;color:var(--muted)">No visitors</div>
        </ng-container>
        <ng-container *ngIf="tab()==='history'">
          <div style="font-size:11px;font-weight:700;color:var(--text2);margin-bottom:12px">PAST GUESTS</div>
          <div *ngFor="let g of historyGuests()" class="guest-row" [style.background]="selected()?._id===g._id?'var(--bg)':''" (click)="selectGuest(g)">
            <div class="av" style="border-radius:10px;flex-shrink:0;background:#64748b">{{ initials(g) }}</div>
            <div style="flex:1;min-width:0">
              <div style="font-weight:600;font-size:13px">{{ g.firstName }} {{ g.lastName }}</div>
              <div style="font-size:10.5px;color:var(--muted)">{{ g.totalStays }} stays</div>
            </div>
            <span class="badge" [ngClass]="vipBadge(g.vipTier)">{{ g.vipTier }}</span>
          </div>
          <div *ngIf="!historyGuests().length" style="text-align:center;padding:30px;color:var(--muted)">No history</div>
        </ng-container>
        <ng-container *ngIf="tab()==='all'">
          <div *ngFor="let g of guests()" class="guest-row" [style.background]="selected()?._id===g._id?'var(--bg)':''" (click)="selectGuest(g)">
            <div class="av" style="border-radius:10px;flex-shrink:0">{{ initials(g) }}</div>
            <div style="flex:1;min-width:0">
              <div style="font-weight:600;font-size:13px">{{ g.firstName }} {{ g.lastName }}</div>
              <div style="font-size:10.5px;color:var(--muted)">{{ g.email || "—" }}</div>
            </div>
            <span class="badge" [ngClass]="vipBadge(g.vipTier)">{{ g.vipTier }}</span>
          </div>
        </ng-container>
      </ng-container>
    </div>

    <div class="card">
      <div *ngIf="!selected()" style="text-align:center;padding:50px;color:var(--muted)">
        <div style="font-size:32px;margin-bottom:8px">👤</div>Select a guest
      </div>
      <div *ngIf="selected()">
        <div style="display:flex;align-items:flex-start;gap:14px;margin-bottom:14px">
          <div class="av" style="width:56px;height:56px;font-size:16px;border-radius:14px;flex-shrink:0"
            [style.background]="selected().currentBookingId?'var(--grad)':'#64748b'">{{ initials(selected()) }}</div>
          <div style="flex:1">
            <div style="font-size:17px;font-weight:800;letter-spacing:-.3px">{{ selected().firstName }} {{ selected().lastName }}</div>
            <div style="font-size:12px;color:var(--muted)">{{ selected().email }} · {{ selected().phone }}</div>
            <div style="display:flex;gap:5px;margin-top:5px;flex-wrap:wrap">
              <span class="badge" [ngClass]="vipBadge(selected().vipTier)">{{ selected().vipTier | titlecase }}</span>
              <span *ngIf="selected().currentBookingId?.status==='checked_in'" style="background:#dcfce7;color:#15803d;font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px">● In-House</span>
              <span *ngIf="selected().currentBookingId?.status==='reserved'" style="background:#dbeafe;color:#1d4ed8;font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px">🔵 Reserved</span>
            </div>
          </div>
        </div>

        <div class="g2 mb14">
          <div style="background:var(--bg);border-radius:10px;padding:10px;text-align:center">
            <div class="mc-lbl">Total Stays</div><div style="font-size:20px;font-weight:800">{{ selected().totalStays }}</div>
          </div>
          <div style="background:var(--bg);border-radius:10px;padding:10px;text-align:center">
            <div class="mc-lbl">Total Spend</div><div style="font-size:20px;font-weight:800;color:var(--purple)">\${{ (selected().totalSpend||0) | number }}</div>
          </div>
        </div>

        <div *ngIf="selected().currentBookingId" style="background:var(--grad-soft);border-radius:12px;padding:12px 14px;margin-bottom:12px;border:1.5px solid rgba(109,42,117,.15)">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
            <div style="font-size:10px;font-weight:700;color:var(--purple);text-transform:uppercase;letter-spacing:.5px">🏨 Current Stay</div>
            <button *ngIf="selected().currentBookingId?.status==='checked_in'" class="btn btn-o btn-xs" (click)="openExtendModal()" title="Extend stay">📅 Extend Stay</button>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:12.5px;margin-bottom:10px">
            <div><div style="color:var(--muted);font-size:11px">Room</div><div style="font-weight:700">{{ selected().currentRoomId?.roomNumber || "—" }}</div></div>
            <div><div style="color:var(--muted);font-size:11px">Ref</div><div style="font-weight:700;font-family:monospace;color:var(--purple);font-size:11px">{{ selected().currentBookingId?.bookingRef }}</div></div>
            <div><div style="color:var(--muted);font-size:11px">Check-in</div><div style="font-weight:700">{{ selected().currentBookingId?.checkIn | date:"MMM d, y" }}</div></div>
            <div><div style="color:var(--muted);font-size:11px">Check-out</div><div style="font-weight:700">{{ selected().currentBookingId?.checkOut | date:"MMM d, y" }}</div></div>
          </div>
          <!-- Stay timeline bar -->
          <div style="background:rgba(255,255,255,.5);border-radius:8px;padding:8px 10px">
            <div style="display:flex;justify-content:space-between;font-size:10.5px;color:var(--purple);font-weight:600;margin-bottom:5px">
              <span>{{ selected().currentBookingId?.checkIn | date:"MMM d" }}</span>
              <span style="font-weight:800">{{ selected().currentBookingId?.nights }} nights</span>
              <span>{{ selected().currentBookingId?.checkOut | date:"MMM d" }}</span>
            </div>
            <div style="height:5px;background:rgba(109,42,117,.15);border-radius:3px;overflow:hidden">
              <div style="height:100%;background:var(--grad);border-radius:3px" [style.width.%]="stayProgress()"></div>
            </div>
            <div style="font-size:10px;color:var(--muted);margin-top:4px;text-align:center">
              {{ daysRemaining() > 0 ? daysRemaining()+' day(s) remaining' : daysRemaining() === 0 ? 'Checking out today' : 'Overdue by '+(-daysRemaining())+' day(s)' }}
            </div>
          </div>
        </div>

        <div *ngIf="selected().currentBookingId?.status==='checked_in'" style="background:var(--surface);border:1.5px solid var(--border);border-radius:12px;padding:14px;margin-bottom:12px">
          <div style="font-size:10px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:12px">💰 Payment Dashboard</div>
          <!-- All paid banner -->
          <div *ngIf="isFullyPaid()" style="background:#dcfce7;border:1.5px solid #6ee7b7;border-radius:10px;padding:12px 14px;margin-bottom:12px;display:flex;align-items:center;gap:10px">
            <span style="font-size:22px">🎉</span>
            <div>
              <div style="font-weight:700;color:#15803d;font-size:13.5px">All Payments Settled</div>
              <div style="font-size:11.5px;color:#166534">Room nights + all services fully paid — ready to checkout</div>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:12px">
            <div style="background:var(--bg);border-radius:10px;padding:10px;text-align:center">
              <div style="font-size:10px;color:var(--muted);font-weight:600;margin-bottom:3px">Total Bill</div>
              <div style="font-size:17px;font-weight:800">\${{ totalBill() }}</div>
            </div>
            <div style="background:#dcfce7;border-radius:10px;padding:10px;text-align:center">
              <div style="font-size:10px;color:#15803d;font-weight:600;margin-bottom:3px">✅ Paid</div>
              <div style="font-size:17px;font-weight:800;color:#15803d">\${{ totalPaidSoFar() }}</div>
            </div>
            <div [style.background]="isFullyPaid()?'#dcfce7':'#fee2e2'" style="border-radius:10px;padding:10px;text-align:center">
              <div style="font-size:10px;font-weight:600;margin-bottom:3px" [style.color]="isFullyPaid()?'#15803d':'#b91c1c'">
                {{ isFullyPaid() ? "🎉 Settled" : "⏳ Remaining" }}
              </div>
              <div style="font-size:17px;font-weight:800" [style.color]="isFullyPaid()?'#15803d':'#b91c1c'">
                {{ isFullyPaid() ? "PAID" : "\$"+totalRemaining() }}
              </div>
            </div>
          </div>
          <div style="margin-bottom:10px">
            <div style="display:flex;justify-content:space-between;font-size:10.5px;color:var(--muted);margin-bottom:4px">
              <span>Payment progress</span>
              <span style="font-weight:700">{{ totalBill()>0 ? round(totalPaidSoFar()/totalBill()*100) : 0 }}%</span>
            </div>
            <div style="height:6px;background:var(--bg);border-radius:3px;overflow:hidden">
              <div style="height:100%;background:var(--grad);border-radius:3px;transition:width .4s"
                [style.width.%]="totalBill()>0 ? round(totalPaidSoFar()/totalBill()*100) : 0"></div>
            </div>
          </div>
          <div *ngIf="selected().payments?.length" style="margin-bottom:10px">
            <div style="font-size:10px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.4px;margin-bottom:7px">📒 Payment History</div>
            <div *ngFor="let p of selected().payments" style="background:var(--bg);border-radius:9px;margin-bottom:6px;overflow:hidden">
              <!-- Payment header -->
              <div style="display:flex;align-items:center;gap:8px;padding:8px 10px;border-bottom:1px solid var(--border)">
                <span style="font-size:15px">{{ payIcon(p.method) }}</span>
                <div style="flex:1">
                  <div style="font-weight:700;font-size:12.5px">\${{ p.amount }} <span style="font-weight:400;color:var(--muted)">· {{ p.method | titlecase }}</span></div>
                  <div style="font-size:10px;color:var(--muted)">{{ p.paidAt | date:"MMM d, y · HH:mm" }} · <span style="font-family:monospace">{{ p.receiptRef }}</span></div>
                </div>
                <span style="background:#dcfce7;color:#15803d;font-size:9.5px;font-weight:700;padding:2px 7px;border-radius:20px">✓ Paid</span>
              </div>
              <!-- What was paid in this payment -->
              <div style="padding:7px 10px">
                <div *ngIf="p.roomNights>0" style="display:flex;justify-content:space-between;font-size:11.5px;padding:2px 0;color:var(--text2)">
                  <span>🛏 Room nights</span>
                  <span style="font-weight:600">\${{ p.roomNights }}</span>
                </div>
                <div *ngFor="let sid of (p.servicesPaid||[])" style="font-size:11px;color:var(--muted);padding:1px 0">
                  <span>{{ getSvcName(sid) }}</span>
                </div>
                <div *ngIf="p.servicesTotal>0" style="display:flex;justify-content:space-between;font-size:11.5px;padding:2px 0;color:var(--text2)">
                  <span>🛎 Services ({{ (p.servicesPaid||[]).length }})</span>
                  <span style="font-weight:600">\${{ p.servicesTotal }}</span>
                </div>
                <div *ngIf="p.discount>0" style="display:flex;justify-content:space-between;font-size:11px;padding:2px 0;color:var(--success)">
                  <span>🏷 Discount {{ p.discountPct }}%</span>
                  <span style="font-weight:600">-\${{ p.discount }}</span>
                </div>
              </div>
            </div>
          </div>
          <div style="display:flex;gap:8px">
            <button class="btn btn-o btn-sm" style="flex:1" (click)="openPayModal()">💳 Pay Now</button>
            <button class="btn btn-danger btn-sm" style="flex:1" (click)="openCheckoutModal()">🚪 Checkout</button>
          </div>
        </div>

        <div *ngIf="!selected().currentBookingId && selected().visitingGuestId" style="background:#fef9c3;border-radius:12px;padding:14px;margin-bottom:12px">
          <div style="font-size:10px;font-weight:700;color:#854d0e;margin-bottom:6px">VISITING</div>
          <div style="font-size:13px;font-weight:700;margin-bottom:8px">{{ selected().visitingGuestId?.firstName }} {{ selected().visitingGuestId?.lastName }}</div>
          <button class="btn btn-warn btn-sm" style="width:100%" (click)="finishVisit()">Finish Visit</button>
        </div>

        <div *ngIf="selected().stayHistory?.length" style="margin-bottom:12px">
          <div class="div" style="margin:10px 0"></div>
          <div style="font-size:11px;font-weight:700;color:var(--text2);margin-bottom:8px">📜 Stay History</div>
          <div *ngFor="let h of selected().stayHistory.slice().reverse()" style="background:var(--bg);border-radius:9px;padding:9px 12px;margin-bottom:5px;font-size:12px">
            <div style="display:flex;justify-content:space-between;align-items:center">
              <div><div style="font-weight:600">Room {{ h.roomNumber }} · {{ h.nights }} nights</div><div style="font-size:11px;color:var(--muted)">{{ h.checkIn | date:"MMM d" }} - {{ h.checkOut | date:"MMM d, y" }}</div></div>
              <div style="text-align:right"><div style="font-weight:800;color:var(--purple)">\${{ h.totalPaid | number }}</div><div style="font-size:10px;color:var(--muted)">paid</div></div>
            </div>
          </div>
        </div>

        <div class="div" style="margin:10px 0"></div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
          <div>
            <div style="font-size:12px;font-weight:700;color:var(--text2)">Services</div>
            <div *ngIf="svcCheckoutTotal()>0" style="font-size:11px;color:var(--muted)">\${{ svcCheckoutTotal() }} due at checkout</div>
          </div>
          <button *ngIf="selected().currentBookingId?.status==='checked_in'" class="btn btn-g btn-xs" (click)="openServiceForm()">+ Add</button>
        </div>
        <div *ngFor="let svc of selected().services||[]; let i=index"
          style="padding:9px 12px;background:var(--bg);border-radius:9px;margin-bottom:6px;border:1.5px solid"
          [style.border-color]="svc.status==='in_progress'?'var(--purple)':'var(--border)'">
          <div style="display:flex;align-items:flex-start;gap:8px">
            <span style="font-size:17px">{{ svc.icon }}</span>
            <div style="flex:1">
              <div style="display:flex;justify-content:space-between"><div style="font-size:13px;font-weight:700">{{ svc.service }}</div><div style="font-size:14px;font-weight:800;color:var(--purple)">\${{ svc.price }}</div></div>
              <div *ngIf="svc.note" style="font-size:11px;color:var(--muted)">{{ svc.note }}</div>
              <div style="display:flex;gap:5px;margin-top:4px;flex-wrap:wrap">
                <span class="badge" [ngClass]="svcBadge(svc.status)">{{ svc.status | titlecase }}</span>
                <span *ngIf="svc.billing==='checkout'&&!svc.paid" style="background:#fef9c3;color:#854d0e;font-size:9.5px;font-weight:700;padding:2px 7px;border-radius:20px">Bill at checkout</span>
                <span *ngIf="svc.paid" style="background:#dcfce7;color:#15803d;font-size:9.5px;font-weight:700;padding:2px 7px;border-radius:20px">Paid</span>
              </div>
            </div>
          </div>
          <div style="display:flex;gap:5px;margin-top:7px">
            <button *ngIf="svc.status==='pending'" class="btn btn-o btn-xs" (click)="doUpdateSvc(svc,'in_progress')">Start</button>
            <button *ngIf="svc.status!=='done'" class="btn btn-success btn-xs" (click)="doUpdateSvc(svc,'done')">Done</button>
            <button *ngIf="svc.status==='done'&&!svc.paid" class="btn btn-warn btn-xs" (click)="confirmMarkPaid(svc)">Pay</button>
            <button class="btn btn-danger btn-xs" style="margin-left:auto" (click)="confirmRemoveSvc(svc)">x</button>
          </div>
        </div>
        <div *ngIf="!selected().services?.length" style="background:var(--bg);border-radius:9px;padding:14px;text-align:center;color:var(--muted);font-size:12.5px">No services yet</div>

        <div class="div" style="margin:12px 0"></div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-g btn-sm" style="flex:1" (click)="editGuest(selected())">Edit</button>
          <button class="btn btn-danger btn-sm" (click)="deleteGuest(selected()._id)">Delete</button>
        </div>
      </div>
    </div>
  </div>

  <div class="overlay" [class.show]="showServiceForm()" (click)="bgClick($event,'svc')">
    <div class="modal">
      <div class="modal-head"><div class="modal-title">Add Service</div><button class="modal-close" (click)="showServiceForm.set(false)">x</button></div>
      <div style="max-height:280px;overflow-y:auto;margin-bottom:14px">
        <div *ngFor="let cat of serviceCategories" style="margin-bottom:12px">
          <div style="font-size:11px;font-weight:700;color:var(--text2);margin-bottom:6px">{{ cat.icon }} {{ cat.label }}</div>
          <div style="display:flex;flex-wrap:wrap;gap:6px">
            <div *ngFor="let svc of cat.items"
              style="display:flex;align-items:center;gap:5px;padding:6px 11px;border-radius:8px;cursor:pointer;font-size:12.5px;font-weight:500"
              [style.border]="sf.isCustom&&svc.name==='__custom__'?'1.5px solid var(--purple)':sf.service===svc.name?'1.5px solid var(--purple)':'1.5px solid var(--border)'"
              [style.background]="sf.isCustom&&svc.name==='__custom__'?'#f3e8ff':sf.service===svc.name?'#f3e8ff':'var(--bg)'"
              [style.color]="sf.isCustom&&svc.name==='__custom__'?'var(--purple)':sf.service===svc.name?'var(--purple)':'var(--text2)'"
              (click)="sf.service=svc.name==='__custom__'?'':svc.name;sf.icon=svc.icon;sf.category=cat.label;sf.price=svc.price;sf.isCustom=svc.name==='__custom__'">
              <span>{{ svc.icon }}</span>{{ svc.name==='__custom__' ? 'Other (enter below)' : svc.name }} <span style="font-size:10.5px;opacity:.55">\${{ svc.price }}</span>
            </div>
          </div>
        </div>
      <!-- Custom service input -->
      <div *ngIf="sf.isCustom" style="background:var(--grad-soft);border-radius:10px;padding:12px;margin-bottom:10px;border:1.5px solid rgba(109,42,117,.2)">
        <div style="font-size:11.5px;font-weight:700;color:var(--purple);margin-bottom:8px">✏️ Custom Service Details</div>
        <div class="form-row">
          <div class="fg"><label>Service Name *</label><input [(ngModel)]="sf.service" placeholder="e.g. Late checkout fee"></div>
          <div class="fg"><label>Icon (emoji)</label><input [(ngModel)]="sf.icon" placeholder="✨" style="width:60px"></div>
        </div>
      </div>
      </div>
      <div class="form-row">
        <div class="fg"><label>Price ($)</label><input type="number" [(ngModel)]="sf.price" min="0"></div>
        <div class="fg"><label>Payment</label>
          <select [(ngModel)]="sf.billing"><option value="checkout">Bill at checkout</option><option value="pay_now">Pay now</option></select>
        </div>
      </div>
      <div class="fg"><label>Note</label><input [(ngModel)]="sf.note" placeholder="Special instructions..."></div>
      <div style="display:flex;gap:10px">
        <button class="btn btn-o" style="flex:1" (click)="showServiceForm.set(false)">Cancel</button>
        <button class="btn btn-g" style="flex:2" (click)="submitService()" [disabled]="!sf.service||svcSaving()">
          {{ svcSaving()?'Saving...':(sf.billing==='pay_now'?'Charge $'+sf.price+' Now':'Add to Bill') }}
        </button>
      </div>
    </div>
  </div>

  <div class="overlay" [class.show]="showPayModal()" (click)="bgClick($event,'pay')">
    <div class="modal" style="width:500px">
      <div class="modal-head"><div class="modal-title">Record Payment</div><button class="modal-close" (click)="showPayModal.set(false)">x</button></div>
      <div style="background:var(--grad-soft);border-radius:10px;padding:10px 14px;margin-bottom:16px;font-size:12.5px;color:var(--purple)">Guest stays checked in. Select what to collect now.</div>
      <div style="font-size:11px;font-weight:700;color:var(--muted);margin-bottom:8px">Room Stay</div>
      <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:9px;margin-bottom:14px;cursor:pointer"
        [style.border]="payIncludeRoom()?'1.5px solid var(--purple)':'1.5px solid var(--border)'"
        [style.background]="payIncludeRoom()?'#f3e8ff':'var(--bg)'"
        (click)="payIncludeRoom.set(!payIncludeRoom())">
        <input type="checkbox" [checked]="payIncludeRoom()" style="accent-color:var(--purple)" (click)="$event.stopPropagation()">
        <div style="flex:1">
          <div style="font-size:13px;font-weight:700">Room {{ selected()?.currentRoomId?.roomNumber }}</div>
          <div style="font-size:11px;color:var(--muted)">{{ selected()?.currentBookingId?.nights }} nights x \${{ selected()?.currentBookingId?.ratePerNight }}/night</div>
        </div>
        <span style="font-size:15px;font-weight:800;color:var(--purple)">\${{ roomTotal() }}</span>
      </div>
      <div style="font-size:11px;font-weight:700;color:var(--muted);margin-bottom:8px">Services</div>
      <div *ngFor="let svc of unpaidSvcs()"
        style="display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:9px;margin-bottom:5px;cursor:pointer"
        [style.border]="paySelSvcs().includes(svc._id)?'1.5px solid var(--purple)':'1.5px solid var(--border)'"
        [style.background]="paySelSvcs().includes(svc._id)?'#f3e8ff':'var(--bg)'"
        (click)="togglePaySvc(svc._id)">
        <input type="checkbox" [checked]="paySelSvcs().includes(svc._id)" style="accent-color:var(--purple)" (click)="$event.stopPropagation()">
        <span>{{ svc.icon }}</span>
        <div style="flex:1"><div style="font-size:13px;font-weight:600">{{ svc.service }}</div></div>
        <span style="font-size:15px;font-weight:800;color:var(--purple)">\${{ svc.price }}</span>
      </div>
      <div *ngIf="!unpaidSvcs().length" style="text-align:center;padding:12px;color:var(--muted);font-size:12.5px;margin-bottom:8px">No unpaid services</div>
      <div *ngIf="unpaidSvcs().length" style="display:flex;gap:8px;margin-bottom:14px">
        <button class="btn btn-o btn-xs" (click)="selectAllPaySvcs()">Select All</button>
        <button class="btn btn-o btn-xs" (click)="paySelSvcs.set([])">Clear</button>
      </div>
      <div class="fg"><label>Payment Method</label>
        <select [(ngModel)]="payForm.method">
          <option value="cash">Cash</option><option value="visa">Visa</option>
          <option value="mastercard">Mastercard</option><option value="bank_transfer">Bank Transfer</option>
        </select>
      </div>
      <!-- Already paid notice -->
      <div *ngIf="isFullyPaid()" style="background:#dcfce7;border:1.5px solid #6ee7b7;border-radius:10px;padding:12px 14px;margin-bottom:14px;display:flex;align-items:center;gap:8px">
        <span style="font-size:20px">✅</span>
        <span style="font-size:13px;font-weight:700;color:#15803d">All charges already paid — nothing outstanding</span>
      </div>
      <!-- Discount field -->
      <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--bg);border-radius:9px;margin-bottom:14px;border:1.5px solid var(--border)">
        <span style="font-size:16px">🏷</span>
        <div style="flex:1">
          <div style="font-size:12.5px;font-weight:600">Discount (optional)</div>
          <div *ngIf="payDiscount()>0" style="font-size:11px;color:var(--success)">-\${{ payDiscountAmt() }} off</div>
        </div>
        <div style="display:flex;align-items:center;gap:6px">
          <input type="number" [(ngModel)]="payDiscountInput" (ngModelChange)="payDiscount.set(+$event||0)" min="0" max="100"
            style="width:60px;text-align:center;font-weight:700;font-size:14px;padding:4px 8px;border-radius:7px;border:1.5px solid var(--border)"
            placeholder="0">
          <span style="font-size:13px;font-weight:700;color:var(--muted)">%</span>
        </div>
      </div>
      <div style="background:var(--grad);color:#fff;border-radius:12px;padding:14px 16px;margin-bottom:14px">
        <div style="font-size:10px;opacity:.65;margin-bottom:8px">PAYMENT SUMMARY</div>
        <div *ngIf="payIncludeRoom()" style="display:flex;justify-content:space-between;font-size:12.5px;margin-bottom:5px;opacity:.85">
          <span>Room stay</span><span style="font-weight:700">\${{ roomTotal() }}</span>
        </div>
        <div *ngFor="let svc of selectedPaySvcs()" style="display:flex;justify-content:space-between;font-size:12.5px;margin-bottom:5px;opacity:.85">
          <span>{{ svc.icon }} {{ svc.service }}</span><span style="font-weight:700">\${{ svc.price }}</span>
        </div>
        <div *ngIf="payDiscount()>0" style="display:flex;justify-content:space-between;font-size:12.5px;margin-bottom:5px;opacity:.85">
          <span>🏷 Discount {{ payDiscount() }}%</span><span style="font-weight:700;color:#fbbf24">-\${{ payDiscountAmt() }}</span>
        </div>
        <div style="border-top:1px solid rgba(255,255,255,.2);margin-top:8px;padding-top:8px;display:flex;justify-content:space-between;align-items:center">
          <span style="font-size:13px;font-weight:700">Total to Collect</span>
          <span style="font-size:22px;font-weight:800">\${{ finalPayTotal() }}</span>
        </div>
      </div>
      <div style="display:flex;gap:10px">
        <button class="btn btn-o" style="flex:1" (click)="showPayModal.set(false)">Cancel</button>
        <button class="btn btn-g" style="flex:2" (click)="confirmPay()" [disabled]="paySaving()||finalPayTotal()===0">
          {{ paySaving()?'Processing...':'Collect $'+finalPayTotal()+' Now' }}
        </button>
      </div>
    </div>
  </div>

  <div class="overlay" [class.show]="showPayReceipt()" (click)="bgClick($event,'payreceipt')">
    <div class="modal" style="width:480px">
      <div class="modal-head"><div class="modal-title">Payment Receipt</div><button class="modal-close" (click)="showPayReceipt.set(false)">x</button></div>
      <div *ngIf="payReceipt()" style="background:var(--dark);border-radius:14px;padding:22px;color:#fff;margin-bottom:16px">
        <div style="text-align:center;margin-bottom:16px"><div style="font-size:30px">✅</div><div style="font-size:16px;font-weight:800">Payment Collected</div><div style="font-size:11px;opacity:.5">{{ payReceipt().paidAt | date:"MMM d, y HH:mm" }}</div></div>
        <div style="background:rgba(255,255,255,.07);border-radius:10px;padding:12px;margin-bottom:12px;font-size:12.5px">
          <div class="rj mb5"><span style="opacity:.65">Guest</span><span style="font-weight:700">{{ payReceipt().guestName }}</span></div>
          <div class="rj mb5"><span style="opacity:.65">Room</span><span style="font-weight:700">{{ payReceipt().roomNumber }}</span></div>
          <div class="rj"><span style="opacity:.65">Receipt</span><span style="font-family:monospace;font-size:11px">{{ payReceipt().receiptRef }}</span></div>
        </div>
        <div *ngIf="payReceipt().roomAmount>0" class="rj mb5" style="font-size:12.5px"><span style="opacity:.8">Room nights</span><span style="font-weight:700">\${{ payReceipt().roomAmount }}</span></div>
        <div *ngFor="let s of payReceipt().services" class="rj mb5" style="font-size:12.5px"><span style="opacity:.8">{{ s.icon }} {{ s.service }}</span><span style="font-weight:700">\${{ s.price }}</span></div>
        <div style="border-top:1px solid rgba(255,255,255,.12);margin-top:10px;padding-top:10px" class="rj">
          <span style="font-weight:700">Total Paid</span><span style="font-size:22px;font-weight:800;color:#4ade80">\${{ payReceipt().totalPaid }}</span>
        </div>
      </div>
      <div style="display:flex;gap:10px">
        <button class="btn btn-o" style="flex:1" (click)="printReceipt()">Print</button>
        <button class="btn btn-g" style="flex:2" (click)="showPayReceipt.set(false)">Done</button>
      </div>
    </div>
  </div>

  <div class="overlay" [class.show]="showCheckoutModal()" (click)="bgClick($event,'checkout')">
    <div class="modal" style="width:540px">
      <div class="modal-head"><div class="modal-title">Checkout</div><button class="modal-close" (click)="showCheckoutModal.set(false)">x</button></div>
      <div *ngIf="receipt()" style="background:var(--dark);border-radius:14px;padding:24px;color:#fff;margin-bottom:16px">
        <div style="text-align:center;margin-bottom:18px"><div style="font-size:28px">🏨</div><div style="font-size:16px;font-weight:800">Guest Receipt</div><div style="font-size:11px;opacity:.5">{{ receipt().settledAt | date:"MMM d, y HH:mm" }}</div></div>
        <div style="background:rgba(255,255,255,.06);border-radius:10px;padding:14px;margin-bottom:14px;font-size:12.5px">
          <div class="rj mb6"><span style="opacity:.65">Guest</span><span style="font-weight:700">{{ receipt().guestName }}</span></div>
          <div class="rj mb6"><span style="opacity:.65">Room</span><span style="font-weight:700">{{ receipt().roomNumber }}</span></div>
          <div class="rj mb6"><span style="opacity:.65">Booking</span><span style="font-family:monospace;font-size:11px">{{ receipt().bookingRef }}</span></div>
          <div class="rj mb6"><span style="opacity:.65">Check-in</span><span style="font-weight:700">{{ receipt().checkIn | date:"MMM d, y" }}</span></div>
          <div class="rj"><span style="opacity:.65">Check-out</span><span style="font-weight:700">{{ receipt().checkOut | date:"MMM d, y" }}</span></div>
        </div>
        <div class="rj mb6" style="font-size:12.5px"><span style="opacity:.75">Room ({{ receipt().nights }} nights x \${{ receipt().ratePerNight }})</span><span style="font-weight:700">\${{ receipt().roomTotal }}</span></div>
        <div *ngFor="let s of receipt().services" class="rj mb5" style="font-size:12.5px"><span style="opacity:.75">{{ s.icon }} {{ s.service }}</span><span style="font-weight:700">\${{ s.price }}</span></div>
        <div style="border-top:1px solid rgba(255,255,255,.1);margin-top:10px;padding-top:10px" class="rj">
          <span style="font-weight:700;font-size:14px">TOTAL</span><span style="font-size:24px;font-weight:800">\${{ receipt().totalDue }}</span>
        </div>
      </div>
      <div *ngIf="!receipt()">
        <!-- All paid banner inside checkout -->
        <div *ngIf="isFullyPaid()" style="background:#dcfce7;border:1.5px solid #6ee7b7;border-radius:10px;padding:12px 14px;margin-bottom:14px;display:flex;align-items:center;gap:10px">
          <span style="font-size:20px">🎉</span>
          <div>
            <div style="font-weight:700;color:#15803d">All payments already collected!</div>
            <div style="font-size:11.5px;color:#166534">No outstanding balance — just confirm checkout.</div>
          </div>
        </div>
        <div style="font-size:12.5px;margin-bottom:14px">
          <div class="rj mb6">
            <span style="color:var(--muted)">Room nights ({{ selected()?.currentBookingId?.nights }} x \${{ selected()?.currentBookingId?.ratePerNight }})</span>
            <span [style.text-decoration]="isFullyPaid()?'line-through':'none'" [style.color]="isFullyPaid()?'var(--muted)':'inherit'" style="font-weight:700">\${{ roomTotal() }}</span>
          </div>
          <!-- All services with paid indicator -->
          <div *ngFor="let s of selected()?.services||[]" class="rj mb5">
            <span style="color:var(--muted)">
              {{ s.icon }} {{ s.service }}
              <span *ngIf="s.paid" style="background:#dcfce7;color:#15803d;font-size:9px;font-weight:700;padding:1px 5px;border-radius:10px;margin-left:4px">✓ paid</span>
            </span>
            <span [style.text-decoration]="s.paid?'line-through':'none'" [style.color]="s.paid?'var(--muted)':'var(--danger)'" style="font-weight:700">\${{ s.price }}</span>
          </div>
          <div *ngIf="totalPaidSoFar()>0" class="rj mb5" style="padding-top:6px;border-top:1px solid var(--border)">
            <span style="color:var(--success)">✅ Total already paid</span>
            <span style="font-weight:700;color:var(--success)">-\${{ totalPaidSoFar() }}</span>
          </div>
          <!-- Discount field -->
          <div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-top:1px dashed var(--border);margin-top:6px">
            <span style="font-size:14px">🏷</span>
            <div style="flex:1">
              <div style="font-size:12.5px;color:var(--muted)">Discount (optional)</div>
              <div *ngIf="checkoutDiscount()>0" style="font-size:11px;color:var(--success)">-\${{ checkoutDiscountAmt() }} off</div>
            </div>
            <input type="number" [(ngModel)]="checkoutDiscountInput" (ngModelChange)="checkoutDiscount.set(+$event||0)" min="0" max="100"
              style="width:60px;text-align:center;font-weight:700;font-size:13px;padding:4px 8px;border-radius:7px;border:1.5px solid var(--border)"
              placeholder="0">
            <span style="font-size:13px;font-weight:700;color:var(--muted)">%</span>
          </div>
          <div style="border-top:1px solid var(--border);padding-top:8px;margin-top:6px" class="rj">
            <span style="font-weight:700;font-size:14px">{{ isFullyPaid() ? "Outstanding" : "Net Due" }}</span>
            <span style="font-size:20px;font-weight:800" [style.color]="checkoutNetDue()===0?'var(--success)':'var(--purple)'">
              {{ checkoutNetDue()===0 ? "PAID ✓" : "\$"+checkoutNetDue() }}
            </span>
          </div>
        </div>
        <div class="fg"><label>Payment Method</label>
          <select [(ngModel)]="checkoutForm.method">
            <option value="cash">Cash</option><option value="visa">Visa</option>
            <option value="mastercard">Mastercard</option><option value="bank_transfer">Bank Transfer</option>
          </select>
        </div>
        <div *ngIf="!checkoutSaving()" style="display:flex;gap:10px;flex-wrap:wrap">
          <button class="btn btn-o" style="flex:1" (click)="showCheckoutModal.set(false)">Cancel</button>
          <button class="btn btn-g btn-sm" style="flex:1" (click)="openSendToPartner()" title="Charge corporate partner instead">
            🏢 Bill Partner
          </button>
          <button class="btn btn-danger" style="flex:2" (click)="confirmCheckout()">
            {{ checkoutNetDue()===0 ? "Confirm Checkout (Paid)" : "Checkout \$"+checkoutNetDue() }}
          </button>
        </div>
        <div *ngIf="checkoutSaving()" style="text-align:center;padding:16px;color:var(--muted)">Processing...</div>
      </div>
      <div *ngIf="receipt()" style="display:flex;gap:10px">
        <button class="btn btn-o" style="flex:1" (click)="printReceipt()">Print</button>
        <button class="btn btn-g" style="flex:2" (click)="showCheckoutModal.set(false);load()">Done</button>
      </div>
    </div>
  </div>

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

  <!-- EXTEND STAY MODAL -->
  <div class="overlay" [class.show]="showExtendModal()" (click)="bgClick($event,'extend')">
    <div class="modal" style="width:480px">
      <div class="modal-head">
        <div class="modal-title">📅 Extend Stay</div>
        <button class="modal-close" (click)="showExtendModal.set(false)">x</button>
      </div>
      <div style="background:var(--grad-soft);border-radius:10px;padding:10px 14px;margin-bottom:16px;font-size:12.5px;color:var(--purple)">
        <div style="font-weight:700">{{ selected()?.firstName }} {{ selected()?.lastName }} — Room {{ selected()?.currentRoomId?.roomNumber }}</div>
        <div style="opacity:.7;margin-top:2px">Current checkout: {{ selected()?.currentBookingId?.checkOut | date:"EEE, MMM d, y" }}</div>
      </div>

      <!-- Calendar picker -->
      <div style="margin-bottom:16px">
        <label style="font-size:12px;font-weight:700;color:var(--text2);display:block;margin-bottom:8px">New Check-out Date</label>
        <div style="background:var(--bg);border-radius:12px;overflow:hidden;border:1.5px solid var(--border)">
          <!-- Month nav -->
          <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:var(--grad);color:#fff">
            <button class="btn btn-ghost btn-xs" style="color:#fff;background:rgba(255,255,255,.15)" (click)="calPrevMonth()">‹</button>
            <span style="font-weight:700;font-size:14px">{{ calTitle() }}</span>
            <button class="btn btn-ghost btn-xs" style="color:#fff;background:rgba(255,255,255,.15)" (click)="calNextMonth()">›</button>
          </div>
          <!-- Day labels -->
          <div style="display:grid;grid-template-columns:repeat(7,1fr);padding:8px 8px 0">
            <div *ngFor="let d of ['Su','Mo','Tu','We','Th','Fr','Sa']" style="text-align:center;font-size:10.5px;font-weight:700;color:var(--muted);padding:4px 0">{{ d }}</div>
          </div>
          <!-- Days grid -->
          <div style="display:grid;grid-template-columns:repeat(7,1fr);padding:4px 8px 10px;gap:2px">
            <div *ngFor="let cell of calCells()"
              style="aspect-ratio:1;display:flex;align-items:center;justify-content:center;border-radius:8px;font-size:12.5px;font-weight:500;cursor:pointer;transition:all .12s"
              [style.visibility]="cell.day ? 'visible' : 'hidden'"
              [style.background]="cell.isSelected?'var(--grad)':cell.isCheckout?'rgba(109,42,117,.12)':cell.isPast?'transparent':'var(--surface)'"
              [style.color]="cell.isSelected?'#fff':cell.isPast?'var(--border)':cell.isCheckout?'var(--purple)':'var(--text)'"
              [style.font-weight]="cell.isSelected||cell.isCheckout?'800':'500'"
              [style.cursor]="cell.isPast?'not-allowed':'pointer'"
              (click)="selectExtendDate(cell)">
              {{ cell.day }}
            </div>
          </div>
        </div>
      </div>

      <!-- Summary -->
      <div *ngIf="extendForm.newCheckout" style="background:var(--bg);border-radius:10px;padding:12px 14px;margin-bottom:14px;font-size:12.5px">
        <div class="rj mb5"><span style="color:var(--muted)">Current checkout</span><span style="font-weight:600">{{ selected()?.currentBookingId?.checkOut | date:"MMM d, y" }}</span></div>
        <div class="rj mb5"><span style="color:var(--muted)">New checkout</span><span style="font-weight:700;color:var(--purple)">{{ extendForm.newCheckout | date:"MMM d, y" }}</span></div>
        <div class="rj mb5"><span style="color:var(--muted)">Extra nights</span><span style="font-weight:700;color:var(--success)">+{{ extendNights() }} night(s)</span></div>
        <div style="border-top:1px solid var(--border);padding-top:8px;margin-top:4px" class="rj">
          <span style="font-weight:700">Additional charge</span>
          <span style="font-size:16px;font-weight:800;color:var(--purple)">\${{ extendNights() * (selected()?.currentBookingId?.ratePerNight||0) }}</span>
        </div>
      </div>
      <div *ngIf="!extendForm.newCheckout" style="text-align:center;padding:12px;color:var(--muted);font-size:12.5px">
        Select a date after the current checkout to extend the stay
      </div>

      <div *ngIf="extendErr()" style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:10px;font-size:12.5px;color:#b91c1c;margin-bottom:10px">{{ extendErr() }}</div>
      <div style="display:flex;gap:10px">
        <button class="btn btn-o" style="flex:1" (click)="showExtendModal.set(false)">Cancel</button>
        <button class="btn btn-g" style="flex:2" (click)="confirmExtend()" [disabled]="!extendForm.newCheckout||extendSaving()">
          {{ extendSaving() ? 'Extending...' : 'Confirm Extension' }}
        </button>
      </div>
    </div>
  </div>

  <!-- BILL PARTNER MODAL -->
  <div class="overlay" [class.show]="showPartnerModal()" (click)="bgClick($event,'partner')">
    <div class="modal" style="width:480px">
      <div class="modal-head">
        <div class="modal-title">🏢 Bill to Partner Company</div>
        <button class="modal-close" (click)="showPartnerModal.set(false)">x</button>
      </div>
      <div style="background:var(--grad-soft);border-radius:10px;padding:10px 14px;margin-bottom:14px;font-size:12.5px;color:var(--purple)">
        Create an invoice for a corporate partner. Guest will be checked out after confirming.
      </div>
      <div class="fg">
        <label>Select Partner Company *</label>
        <select [(ngModel)]="partnerForm.partnerId">
          <option value="">-- Select partner --</option>
          <option *ngFor="let p of partners()" [value]="p._id">{{ p.companyName }} ({{ p.contactEmail }})</option>
        </select>
        <div *ngIf="!partners().length" style="font-size:11.5px;color:var(--warn);margin-top:5px">
          No partners registered yet. Go to the Partners menu to add one first.
        </div>
      </div>
      <div style="background:var(--bg);border-radius:10px;padding:12px;margin-bottom:14px;font-size:12.5px">
        <div style="font-size:10px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">Invoice Summary</div>
        <div class="rj mb5"><span style="color:var(--muted)">Guest</span><span style="font-weight:700">{{ selected()?.firstName }} {{ selected()?.lastName }}</span></div>
        <div class="rj mb5"><span style="color:var(--muted)">Room {{ selected()?.currentRoomId?.roomNumber }} ({{ selected()?.currentBookingId?.nights }} nights)</span><span style="font-weight:700">\${{ roomTotal() }}</span></div>
        <div *ngFor="let s of (selected()?.services||[])" class="rj mb5">
          <span style="color:var(--muted)">{{ s.icon }} {{ s.service }}
            <span *ngIf="s.paid" style="color:var(--success);font-size:10px"> paid</span>
          </span>
          <span [style.text-decoration]="s.paid?'line-through':'none'" [style.color]="s.paid?'var(--muted)':'inherit'" style="font-weight:700">\${{ s.price }}</span>
        </div>
        <div *ngIf="totalPaidSoFar()>0" class="rj mb5" style="border-top:1px dashed var(--border);padding-top:6px;margin-top:4px">
          <span style="color:var(--success)">Already paid</span>
          <span style="font-weight:700;color:var(--success)">-\${{ totalPaidSoFar() }}</span>
        </div>
        <div *ngIf="checkoutDiscount()>0" class="rj mb5" style="padding-top:4px">
          <span style="color:var(--warn)">🏷 Discount {{ checkoutDiscount() }}%</span>
          <span style="font-weight:700;color:var(--warn)">-\${{ checkoutDiscountAmt() }}</span>
        </div>
        <div style="border-top:1px solid var(--border);padding-top:8px;margin-top:4px" class="rj">
          <span style="font-weight:700">Total to invoice</span>
          <span style="font-size:18px;font-weight:800;color:var(--purple)">\${{ checkoutNetDue() }}</span>
        </div>
      </div>
      <div class="fg">
        <label>Notes (optional)</label>
        <input [(ngModel)]="partnerForm.notes" placeholder="Employee business stay, project XYZ...">
      </div>
      <div *ngIf="partnerResult()" style="border-radius:9px;padding:10px 13px;font-size:12.5px;margin-bottom:12px"
        [style.background]="partnerResult().success?'#dcfce7':'#fee2e2'"
        [style.color]="partnerResult().success?'#15803d':'#b91c1c'">
        {{ partnerResult().message }}
      </div>
      <div *ngIf="!partnerResult()" style="display:flex;gap:10px">
        <button class="btn btn-o" style="flex:1" (click)="showPartnerModal.set(false)">Cancel</button>
        <button class="btn btn-g" style="flex:2" (click)="confirmBillPartner()" [disabled]="!partnerForm.partnerId||partnerSending()">
          {{ partnerSending() ? 'Creating invoice...' : 'Create Invoice & Checkout' }}
        </button>
      </div>
      <button *ngIf="partnerResult()&&partnerResult().success" class="btn btn-g" style="width:100%;margin-top:8px" (click)="showPartnerModal.set(false);showCheckoutModal.set(false);load()">Done</button>
      <button *ngIf="partnerResult()&&!partnerResult().success" class="btn btn-o" style="width:100%;margin-top:8px" (click)="partnerResult.set(null)">Try Again</button>
    </div>
  </div>

  <div class="overlay" [class.show]="showForm()" (click)="bgClick($event,'guest')">
    <div class="modal" style="width:540px">
      <div class="modal-head"><div class="modal-title">{{ editingId() ? "Edit Guest" : "Add Guest" }}</div><button class="modal-close" (click)="showForm.set(false)">x</button></div>
      <div class="form-row">
        <div class="fg"><label>First Name *</label><input [(ngModel)]="gf.firstName" placeholder="Maria"></div>
        <div class="fg"><label>Last Name *</label><input [(ngModel)]="gf.lastName" placeholder="Garcia"></div>
      </div>
      <div class="form-row">
        <div class="fg"><label>Email</label><input type="email" [(ngModel)]="gf.email"></div>
        <div class="fg"><label>Phone</label><input [(ngModel)]="gf.phone"></div>
      </div>
      <div class="form-row">
        <div class="fg"><label>Nationality</label><input [(ngModel)]="gf.nationality" placeholder="AE"></div>
        <div class="fg"><label>VIP Tier</label>
          <select [(ngModel)]="gf.vipTier"><option value="regular">Regular</option><option value="silver">Silver</option><option value="gold">Gold</option><option value="vip">VIP</option></select>
        </div>
      </div>
      <div class="form-row">
        <div class="fg"><label>ID Type (optional)</label>
          <select [(ngModel)]="gf.idType"><option value="passport">Passport</option><option value="national_id">National ID</option></select>
        </div>
        <div class="fg"><label>ID Number (optional)</label><input [(ngModel)]="gf.idNumber"></div>
      </div>
      <div class="fg"><label>Assign to Room</label>
        <select [(ngModel)]="gf.currentRoomId">
          <option value="">No room</option>
          <option *ngFor="let r of rooms()" [value]="r._id">Room {{ r.roomNumber }} ({{ r.status }})</option>
        </select>
      </div>

      <!-- Visiting Guest -->
      <div class="fg">
        <label>Visiting Guest <span style="color:var(--muted);font-weight:400;font-size:11px">(if this person is visiting someone staying)</span></label>
        <div style="position:relative;margin-bottom:6px">
          <input [(ngModel)]="formVisitSearch" (input)="searchFormVisiting()"
            placeholder="Type name to search in-house guests..." style="padding-left:34px">
          <span style="position:absolute;left:11px;top:50%;transform:translateY(-50%);color:var(--muted);font-size:13px">🔍</span>
        </div>
        <div *ngIf="formVisitResults().length" style="background:var(--bg);border-radius:10px;border:1px solid var(--border);overflow:hidden;margin-bottom:6px;max-height:160px;overflow-y:auto">
          <div *ngFor="let g of formVisitResults()"
            style="display:flex;align-items:center;gap:10px;padding:9px 12px;cursor:pointer;transition:background .12s;border-bottom:1px solid var(--border)"
            [style.background]="gf.visitingGuestId===g._id?'#f3e8ff':'var(--surface)'"
            (click)="selectFormVisiting(g)">
            <div class="av" style="width:32px;height:32px;font-size:10px;border-radius:8px;flex-shrink:0"
              [style.background]="gf.visitingGuestId===g._id?'var(--grad)':'#64748b'">
              {{ initials(g) }}
            </div>
            <div style="flex:1;min-width:0">
              <div style="font-weight:600;font-size:13px">{{ g.firstName }} {{ g.lastName }}</div>
              <div style="font-size:11px;color:var(--muted)">
                🛏 Room {{ g.currentRoomId?.roomNumber || g.currentBookingId?.roomId?.roomNumber || '—' }}
                <span *ngIf="g.phone"> · {{ g.phone }}</span>
              </div>
            </div>
            <span *ngIf="g.currentBookingId?.status==='checked_in'" style="background:#dcfce7;color:#15803d;font-size:9.5px;font-weight:700;padding:2px 7px;border-radius:20px">In-House</span>
            <span *ngIf="g.currentBookingId?.status==='reserved'" style="background:#dbeafe;color:#1d4ed8;font-size:9.5px;font-weight:700;padding:2px 7px;border-radius:20px">Reserved</span>
            <span *ngIf="gf.visitingGuestId===g._id" style="color:var(--purple);font-size:18px">✓</span>
          </div>
        </div>
        <div *ngIf="gf.visitingGuestId" style="background:#fef9c3;border:1.5px solid #fcd34d;border-radius:10px;padding:10px 14px;display:flex;align-items:center;gap:10px">
          <span style="font-size:18px">👥</span>
          <div style="flex:1">
            <div style="font-weight:700;color:#854d0e;font-size:13px">Visiting: {{ formVisitingName() }}</div>
            <div style="font-size:11px;color:#92400e">
              Room {{ formVisitingRoom() }}
            </div>
          </div>
          <button type="button" class="btn btn-danger btn-xs" (click)="clearFormVisiting()">Remove</button>
        </div>
        <div *ngIf="gf.visitingGuestId" style="margin-top:8px">
          <label style="font-size:11.5px">Visit Purpose</label>
          <select [(ngModel)]="gf.visitPurpose" style="margin-top:4px">
            <option value="family">👨‍👩‍👧 Family Visit</option>
            <option value="business">💼 Business</option>
            <option value="tourism">🗺 Tourism</option>
            <option value="medical">🏥 Medical</option>
            <option value="social">🎉 Social</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      <div class="fg"><label>Notes</label><textarea rows="2" [(ngModel)]="gf.notes"></textarea></div>
      <div *ngIf="formErr()" style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:10px;font-size:12.5px;color:#b91c1c;margin-bottom:10px">{{ formErr() }}</div>
      <div style="display:flex;gap:10px">
        <button class="btn btn-o" style="flex:1" (click)="showForm.set(false)">Cancel</button>
        <button class="btn btn-g" style="flex:2" (click)="save()" [disabled]="saving()">
          {{ saving()?(editingId()?'Updating...':'Adding...'):(editingId()?'Update Guest':'Add Guest') }}
        </button>
      </div>
    </div>
  </div>

</div>`,
})
export class GuestsComponent implements OnInit {
  guests            = signal<any[]>([]);
  rooms             = signal<any[]>([]);
  loading           = signal(true);
  saving            = signal(false);
  svcSaving         = signal(false);
  paySaving         = signal(false);
  checkoutSaving    = signal(false);
  showForm          = signal(false);
  showServiceForm   = signal(false);
  showPayModal      = signal(false);
  showPayReceipt    = signal(false);
  showCheckoutModal = signal(false);
  editingId         = signal<string|null>(null);
  selected          = signal<any>(null);
  formErr           = signal('');
  receipt           = signal<any>(null);
  payReceipt        = signal<any>(null);
  tab               = signal<GTab>('staying');
  search            = '';

  gf: any           = this.blankGuest();
  sf: any           = { service:'', icon:'✨', category:'', note:'', price:0, billing:'checkout', isCustom:false };
  payForm: any      = { method:'cash', selectedSvcs:[] as string[], includeRoom: false };
  paySelSvcs        = signal<string[]>([]);
  payIncludeRoom    = signal(false);
  checkoutForm: any = { method:'cash', discount: 0 };

  payDiscount        = signal(0);
  checkoutDiscount   = signal(0);
  payDiscountInput   = 0;   // % 0-100
  checkoutDiscountInput = 0; // % 0-100

  // Discount amounts computed from percentage
  readonly payDiscountAmt = computed(() =>
    Math.round(this.fullPayTotal() * (this.payDiscount() / 100))
  );
  readonly checkoutDiscountAmt = computed(() =>
    Math.round((this.roomTotal() + this.svcCheckoutTotal()) * (this.checkoutDiscount() / 100))
  );

  readonly isFullyPaid = computed(() => this.totalBill() > 0 && this.totalRemaining() <= 0);

  readonly finalPayTotal = computed(() =>
    Math.max(0, this.fullPayTotal() - this.payDiscountAmt())
  );

  readonly checkoutNetDue = computed(() => {
    // Use totalRemaining which correctly accounts for all paid services and partial payments
    // Then subtract any checkout discount
    const remaining = this.totalRemaining();
    const discount  = this.checkoutDiscountAmt();
    return Math.max(0, Math.round(remaining - discount));
  });

  serviceCategories = [
    { label:'Housekeeping', icon:'🧹', items:[
      {icon:'🧺',name:'Laundry',price:15},{icon:'👔',name:'Dry Cleaning',price:25},{icon:'👕',name:'Ironing',price:10},
    ]},
    { label:'Wellness & Spa', icon:'💆', items:[
      {icon:'💆',name:'Massage',price:80},{icon:'🧴',name:'Facial Treatment',price:60},{icon:'🛁',name:'Spa Bath',price:50},
      {icon:'💅',name:'Manicure',price:30},{icon:'🦶',name:'Pedicure',price:35},{icon:'🧖',name:'Body Scrub',price:55},
      {icon:'🫀',name:'Sauna',price:20},{icon:'🏊',name:'Pool Access',price:15},
    ]},
    { label:'Transport & Concierge', icon:'🚗', items:[
      {icon:'🚗',name:'Airport Transfer',price:60},{icon:'🚕',name:'Taxi Request',price:20},{icon:'🗺',name:'City Tour',price:120},
      {icon:'🎫',name:'Event Tickets',price:50},{icon:'💐',name:'Flower Arrangement',price:40},
    ]},
    { label:'Other Services', icon:'✨', items:[
      {icon:'📸',name:'Photography',price:100},{icon:'🎂',name:'Birthday Decoration',price:75},
      {icon:'🎁',name:'Gift Wrapping',price:15},{icon:'👶',name:'Babysitting',price:25},
      {icon:'🧘',name:'Yoga Session',price:40},{icon:'🏋',name:'Personal Trainer',price:60},
      {icon:'🔧',name:'Technical Support',price:20},{icon:'💊',name:'Medical Assistance',price:0},
    ]},
    { label:'Other (Custom)', icon:'✏️', items:[
      {icon:'✏️',name:'__custom__',price:0},
    ]},
  ];

  readonly stayingGuests  = computed(() => this.guests().filter(g => g.currentBookingId && g.currentBookingId?.status === 'checked_in'));
  readonly reservedGuests = computed(() => this.guests().filter(g => g.currentBookingId && g.currentBookingId?.status === 'reserved'));
  readonly visitorGuests  = computed(() => this.guests().filter(g => !g.currentBookingId && g.visitingGuestId));
  readonly historyGuests  = computed(() => this.guests().filter(g => !g.currentBookingId && !g.visitingGuestId && g.stayHistory?.length));
  readonly vipCount       = computed(() => this.guests().filter(g => g.vipTier==='vip'||g.vipTier==='gold').length);
  readonly unpaidSvcs     = computed(() => (this.selected()?.services||[]).filter((s: any) => s.billing==='checkout' && !s.paid));
  readonly selectedPaySvcs = computed(() => (this.selected()?.services||[]).filter((s: any) => this.paySelSvcs().includes(s._id)));
  readonly selectedPayTotal = computed(() => this.selectedPaySvcs().reduce((sum: number, s: any) => sum+(s.price||0), 0));

  readonly fullPayTotal = computed(() =>
    (this.payIncludeRoom() ? this.roomTotal() : 0) +
    this.selectedPaySvcs().reduce((sum: number, s: any) => sum + (s.price || 0), 0)
  );
  readonly roomTotal = computed(() => {
    const b = this.selected()?.currentBookingId;
    return b ? (b.ratePerNight || 0) * (b.nights || 0) : 0;
  });
  readonly svcCheckoutTotal = computed(() =>
    (this.selected()?.services||[]).filter((s: any) => s.billing==='checkout'&&!s.paid&&s.status==='done').reduce((sum: number, s: any) => sum+(s.price||0), 0)
  );
  readonly svcPendingTotal = computed(() =>
    (this.selected()?.services||[]).filter((s: any) => s.billing==='checkout'&&!s.paid&&s.status!=='done').reduce((sum: number, s: any) => sum+(s.price||0), 0)
  );
  // ── Billing calculations ─────────────────────────────
  // totalBill  = room + ALL services (full stay value)
  // totalPaidSoFar = payments[] + individually-marked-paid services (via Pay button)
  // Remaining  = Bill - Paid
  //
  // NOTE: pay_now services are already included in a payments[] record when added.
  // Services marked paid individually via "Pay" button (doMarkPaid) are NOT in payments[].
  // So: totalPaidSoFar = payments[] + paid-checkout-services (not pay_now, those are in payments[])

  readonly totalBill = computed(() =>
    this.roomTotal() + (this.selected()?.services||[]).reduce((sum: number, v: any) => sum + (v.price||0), 0)
  );

  readonly totalPaidSoFar = computed(() => {
    const services = this.selected()?.services || [];
    const payments = this.selected()?.payments || [];

    // All payment records (Pay Now modal — covers room nights + selected services)
    const fromPayments = payments.reduce((s: number, p: any) => s + (p.amount || 0), 0);

    // All services with paid=true that are NOT covered by a pay_now payment record
    // pay_now services generate a payments[] entry, so skip those to avoid double-counting
    // checkout services marked paid individually (Pay button) have NO payments[] entry
    const paidSvcIds = new Set(payments.flatMap((p: any) => p.servicesPaid || []));
    const fromPaidSvcsNotInPayments = services
      .filter((s: any) => s.paid === true && !paidSvcIds.has(String(s._id)))
      .reduce((s: number, v: any) => s + (v.price || 0), 0);

    return fromPayments + fromPaidSvcsNotInPayments;
  });

  readonly totalRemaining = computed(() => Math.max(0, this.totalBill() - this.totalPaidSoFar()));
  pendingSvcCount(g: any): number { return (g.services||[]).filter((s: any) => s.status!=='done'&&!s.paid).length; }
  round(n: number): number { return Math.round(n); }
  getSvcName(sid: string): string {
    const svc = (this.selected()?.services||[]).find((s: any) => s._id === sid);
    return svc ? `${svc.icon} ${svc.service} $${svc.price}` : '';
  }

  payIcon(m: string): string { const x: Record<string,string>={cash:'💵',visa:'💳',mastercard:'💳',bank_transfer:'🏦'}; return x[m]||'💳'; }

  constructor(private guestSvc: GuestService, private roomSvc: RoomService, private partnerSvc: PartnerService, private bookSvc: BookingService) {}
  ngOnInit() { this.load(); this.loadRooms(); this.loadPartners(); }
  setTab(t: GTab) { this.tab.set(t); this.selected.set(null); }

  load() {
    this.loading.set(true);
    const f: any = {};
    if (this.search) f.search = this.search;
    this.guestSvc.getAll(f).subscribe({ next: (r: any) => { this.guests.set(r.data.guests||[]); this.loading.set(false); }, error: () => this.loading.set(false) });
  }
  loadRooms() { this.roomSvc.getAll({}).subscribe({ next: (r: any) => this.rooms.set(r.data.rooms||[]) }); }
  selectGuest(g: any) {
    this.guestSvc.getOne(g._id).subscribe({
      next: (r: any) => this.selected.set(JSON.parse(JSON.stringify(r.data.guest))),
      error: () => this.selected.set(g),
    });
  }

  openServiceForm() { this.sf = { service:'', icon:'✨', category:'', note:'', price:0, billing:'checkout', isCustom:false }; this.showServiceForm.set(true); }
  submitService() {
    if (!this.sf.service||!this.selected()) return;
    this.svcSaving.set(true);
    this.guestSvc.addService(this.selected()._id, { category:this.sf.category, service:this.sf.service, icon:this.sf.icon, note:this.sf.note, price:Number(this.sf.price)||0, billing:this.sf.billing, paid:this.sf.billing==='pay_now', status:'pending' }).subscribe({
      next: (r: any) => { this.svcSaving.set(false); this.showServiceForm.set(false); this.selected.set(r.data.guest); this.refreshInList(r.data.guest); },
      error: () => this.svcSaving.set(false)
    });
  }
  doUpdateSvc(svc: any, status: string) {
    this.guestSvc.updateService(this.selected()._id, svc._id, { status }).subscribe({
      next: (r: any) => { this.selected.set(JSON.parse(JSON.stringify(r.data.guest))); this.refreshInList(r.data.guest); }
    });
  }
  confirmMarkPaid(svc: any) {
    this.showConfirm({ icon:'💳', title:'Mark Service as Paid?', message:`Mark "${svc.service}" ($${svc.price}) as paid?`, confirmLabel:'Yes, Mark Paid', danger:false,
      action: () => this.doMarkPaid(svc)
    });
  }

  doMarkPaid(svc: any) {
    this.guestSvc.updateService(this.selected()._id, svc._id, { paid:true }).subscribe({
      next: (r: any) => { this.selected.set(JSON.parse(JSON.stringify(r.data.guest))); this.refreshInList(r.data.guest); }
    });
  }
  confirmRemoveSvc(svc: any) {
    this.showConfirm({ icon:'🗑️', title:'Remove Service?', message:`Remove "${svc.service}" ($${svc.price}) from this guest?`, confirmLabel:'Remove', danger:true,
      action: () => this.doRemoveSvc(svc._id)
    });
  }

  doRemoveSvc(sid: string) { this.guestSvc.removeService(this.selected()._id, sid).subscribe({ next: (r: any) => { this.selected.set(r.data.guest); this.refreshInList(r.data.guest); } }); }

  openPayModal() {
    this.paySelSvcs.set([]);
    this.payIncludeRoom.set(false);
    this.payDiscount.set(0);
    this.payDiscountInput = 0;
    this.payForm = { method:'cash' };
    this.showPayModal.set(true);
  }
  togglePaySvc(sid: string) {
    const cur = this.paySelSvcs();
    if (cur.includes(sid)) this.paySelSvcs.set(cur.filter(x => x !== sid));
    else this.paySelSvcs.set([...cur, sid]);
  }
  selectAllPaySvcs() { this.paySelSvcs.set(this.unpaidSvcs().map((s: any) => s._id)); }
  confirmPay() {
    this.showConfirm({ icon:'💳', title:'Collect Payment?', message:`Collect $${this.finalPayTotal()} from this guest?`, confirmLabel:`Collect $$${this.finalPayTotal()}`, danger:false,
      action: () => this.submitPay()
    });
  }

  submitPay() {
    this.paySaving.set(true);
    this.guestSvc.pay(this.selected()._id, { serviceIds:this.paySelSvcs(), includeRoom:this.payIncludeRoom(), paymentMethod:this.payForm.method, amount:this.finalPayTotal(), discount:this.payDiscount() }).subscribe({
      next: (r: any) => { this.paySaving.set(false); this.showPayModal.set(false); this.payReceipt.set(r.data.receipt); this.showPayReceipt.set(true); this.selected.set(r.data.guest); this.refreshInList(r.data.guest); },
      error: () => this.paySaving.set(false)
    });
  }
  printReceipt() { window.print(); }

  openCheckoutModal() { this.receipt.set(null); this.checkoutForm = { method:'cash' }; this.checkoutDiscount.set(0); this.checkoutDiscountInput = 0; this.showCheckoutModal.set(true); }
  confirmCheckout() {
    const due = this.checkoutNetDue();
    this.showConfirm({ icon:'🚪', title:'Confirm Checkout?', message:due===0?`${this.selected()?.firstName} ${this.selected()?.lastName} is fully paid. Proceed with checkout?`:`Checkout ${this.selected()?.firstName} ${this.selected()?.lastName} with $${due} remaining balance?`, confirmLabel:due===0?'Checkout (Paid)':'Checkout', danger:due>0,
      action: () => this.submitCheckout()
    });
  }

  submitCheckout() {
    this.checkoutSaving.set(true);
    this.guestSvc.checkout(this.selected()._id, { paymentMethod:this.checkoutForm.method, payRoomNights:true }).subscribe({
      next: (r: any) => { this.checkoutSaving.set(false); this.receipt.set(r.data.receipt); this.load(); },
      error: (e: any) => { this.checkoutSaving.set(false); alert(e.error?.message||'Checkout failed'); }
    });
  }
  finishVisit() {
    this.showConfirm({ icon:'👋', title:'Sign Out Visitor?', message:`Sign out ${this.selected()?.firstName} ${this.selected()?.lastName} as a visitor?`, confirmLabel:'Sign Out', danger:false,
      action: () => this.guestSvc.update(this.selected()._id, { visitingGuestId:null, visitPurpose:null, currentRoomId:null }).subscribe({ next: () => { this.selected.set(null); this.load(); } })
    });
  }

  showExtendModal = signal(false);
  showPartnerModal = signal(false);
  extendSaving    = signal(false);
  extendErr       = signal('');
  extendForm: any = { newCheckout: null };
  calYear         = signal(new Date().getFullYear());
  calMonth        = signal(new Date().getMonth()); // 0-based

  readonly calTitle = computed(() => {
    const d = new Date(this.calYear(), this.calMonth(), 1);
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  });

  readonly calCells = computed(() => {
    const year  = this.calYear();
    const month = this.calMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date(); today.setHours(0,0,0,0);
    const currentCheckout = this.selected()?.currentBookingId?.checkOut
      ? new Date(this.selected().currentBookingId.checkOut) : null;
    if (currentCheckout) currentCheckout.setHours(0,0,0,0);
    const selected = this.extendForm.newCheckout
      ? new Date(this.extendForm.newCheckout) : null;
    if (selected) selected.setHours(0,0,0,0);

    const cells: any[] = [];
    for (let i = 0; i < firstDay; i++) cells.push({ day: null });
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      date.setHours(0,0,0,0);
      const isPast = currentCheckout ? date <= currentCheckout : date <= today;
      const isCheckout = currentCheckout ? date.getTime() === currentCheckout.getTime() : false;
      const isSelected = selected ? date.getTime() === selected.getTime() : false;
      cells.push({ day: d, date, isPast, isCheckout, isSelected });
    }
    return cells;
  });

  calPrevMonth() {
    if (this.calMonth() === 0) { this.calYear.update(y => y-1); this.calMonth.set(11); }
    else this.calMonth.update(m => m-1);
  }
  calNextMonth() {
    if (this.calMonth() === 11) { this.calYear.update(y => y+1); this.calMonth.set(0); }
    else this.calMonth.update(m => m+1);
  }

  selectExtendDate(cell: any) {
    if (!cell.day || cell.isPast) return;
    this.extendForm = { ...this.extendForm, newCheckout: cell.date.toISOString() };
  }

  extendNights(): number {
    if (!this.extendForm.newCheckout || !this.selected()?.currentBookingId?.checkOut) return 0;
    const newOut = new Date(this.extendForm.newCheckout);
    const curOut = new Date(this.selected().currentBookingId.checkOut);
    return Math.max(0, Math.round((newOut.getTime() - curOut.getTime()) / (1000*60*60*24)));
  }

  stayProgress(): number {
    const b = this.selected()?.currentBookingId;
    if (!b?.checkIn || !b?.checkOut) return 0;
    const checkIn  = new Date(b.checkIn).getTime();
    const checkOut = new Date(b.checkOut).getTime();
    const now      = Date.now();
    const pct = ((now - checkIn) / (checkOut - checkIn)) * 100;
    return Math.min(100, Math.max(0, Math.round(pct)));
  }

  daysRemaining(): number {
    const checkOut = this.selected()?.currentBookingId?.checkOut;
    if (!checkOut) return 0;
    const diff = new Date(checkOut).getTime() - Date.now();
    return Math.ceil(diff / (1000*60*60*24));
  }

  openExtendModal() {
    const b = this.selected()?.currentBookingId;
    if (!b) return;
    // Open calendar at current checkout month
    const co = new Date(b.checkOut);
    this.calYear.set(co.getFullYear());
    this.calMonth.set(co.getMonth());
    this.extendForm = { newCheckout: null };
    this.extendErr.set('');
    this.showExtendModal.set(true);
  }

  confirmExtend() {
    this.showConfirm({
      icon: '📅',
      title: 'Extend Stay?',
      message: `Extend checkout to ${new Date(this.extendForm.newCheckout).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}? (+${this.extendNights()} nights, +$${this.extendNights() * (this.selected()?.currentBookingId?.ratePerNight||0)})`,
      confirmLabel: 'Yes, Extend',
      danger: false,
      action: () => this.submitExtend(),
    });
  }

  submitExtend() {
    const b = this.selected()?.currentBookingId;
    if (!b || !this.extendForm.newCheckout) return;
    this.extendSaving.set(true);
    this.extendErr.set('');
    const newCheckout = new Date(this.extendForm.newCheckout);
    const checkIn     = new Date(b.checkIn);
    const nights      = Math.round((newCheckout.getTime() - checkIn.getTime()) / (1000*60*60*24));
    const totalAmount = nights * (b.ratePerNight || 0);
    this.bookSvc.update(b._id || b, { checkOut: newCheckout.toISOString(), nights, totalAmount }).subscribe({
      next: () => {
        this.extendSaving.set(false);
        this.showExtendModal.set(false);
        this.selectGuest(this.selected()); // refresh
      },
      error: (e: any) => {
        this.extendSaving.set(false);
        this.extendErr.set(e.error?.message || 'Extension failed. Room may be occupied on those dates.');
      },
    });
  }
  partners         = signal<any[]>([]);
  partnerForm: any = { partnerId:'', notes:'' };
  partnerResult    = signal<any>(null);
  partnerSending   = signal(false);

  confirmDialog = signal<{show:boolean;icon:string;title:string;message:string;confirmLabel:string;danger:boolean;action:()=>void}>({
    show:false, icon:'⚠️', title:'', message:'', confirmLabel:'Confirm', danger:true, action:()=>{}
  });

  showConfirm(opts: {icon?:string;title:string;message:string;confirmLabel?:string;danger?:boolean;action:()=>void}) {
    this.confirmDialog.set({ show:true, icon:opts.icon||'⚠️', title:opts.title, message:opts.message, confirmLabel:opts.confirmLabel||'Confirm', danger:opts.danger!==false, action:opts.action });
  }
  acceptConfirm()  { const fn = this.confirmDialog().action; this.confirmDialog.update(d=>({...d,show:false})); fn(); }
  dismissConfirm() { this.confirmDialog.update(d=>({...d,show:false})); }

  formVisitSearch  = '';
  formVisitResults = signal<any[]>([]);

  searchFormVisiting() {
    if (this.formVisitSearch.length < 2) { this.formVisitResults.set([]); return; }
    // Search only in-house guests (have currentBookingId)
    this.guestSvc.getAll({ search: this.formVisitSearch }).subscribe({
      next: (r: any) => {
        const staying = (r.data.guests||[]).filter((g: any) => g.currentBookingId || g.currentRoomId);
        this.formVisitResults.set(staying);
      },
    });
  }

  selectFormVisiting(g: any) {
    this.gf.visitingGuestId = g._id;
    this.formVisitSearch = `${g.firstName} ${g.lastName}`;
    this.formVisitResults.set([g]); // keep for name/room display
    if (!this.gf.visitPurpose) this.gf.visitPurpose = 'family';
  }

  clearFormVisiting() {
    this.gf.visitingGuestId = '';
    this.gf.visitPurpose = '';
    this.formVisitSearch = '';
    this.formVisitResults.set([]);
  }

  formVisitingName(): string {
    const g = this.formVisitResults().find((x: any) => x._id === this.gf.visitingGuestId)
           || this.guests().find((x: any) => x._id === this.gf.visitingGuestId);
    return g ? `${g.firstName} ${g.lastName}` : '';
  }

  formVisitingRoom(): string {
    const g = this.formVisitResults().find((x: any) => x._id === this.gf.visitingGuestId)
           || this.guests().find((x: any) => x._id === this.gf.visitingGuestId);
    return g?.currentRoomId?.roomNumber || g?.currentBookingId?.roomId?.roomNumber || '—';
  }
  blankGuest() { return { firstName:'', lastName:'', email:'', phone:'', nationality:'', idType:'passport', idNumber:'', vipTier:'regular', currentRoomId:'', visitingGuestId:'', visitPurpose:'family', notes:'' }; }
  openForm() { this.editingId.set(null); this.gf = this.blankGuest(); this.formErr.set(''); this.formVisitSearch=''; this.formVisitResults.set([]); this.showForm.set(true); }
  editGuest(g: any) {
    this.editingId.set(g._id);
    const vid = g.visitingGuestId?._id || g.visitingGuestId || '';
    this.gf = { firstName:g.firstName, lastName:g.lastName, email:g.email||'', phone:g.phone||'', nationality:g.nationality||'', idType:g.idType||'passport', idNumber:g.idNumber||'', vipTier:g.vipTier||'regular', currentRoomId:g.currentRoomId?._id||g.currentRoomId||'', visitingGuestId:vid, visitPurpose:g.visitPurpose||'', notes:g.notes||''};
    if (vid) {
      const vg = g.visitingGuestId;
      if (vg && vg.firstName) { this.formVisitResults.set([vg]); this.formVisitSearch = `${vg.firstName} ${vg.lastName}`; }
    } else { this.formVisitSearch=''; this.formVisitResults.set([]); }
    this.formErr.set(''); this.showForm.set(true);
  }
  save() {
    if (!this.gf.firstName.trim()) { this.formErr.set('First name required'); return; }
    if (!this.gf.lastName.trim())  { this.formErr.set('Last name required'); return; }
    this.saving.set(true); this.formErr.set('');
    const eid = this.editingId();
    const payload = {...this.gf, currentRoomId:this.gf.currentRoomId||null, visitingGuestId:this.gf.visitingGuestId||null, visitPurpose:this.gf.visitPurpose||null};
    const req = eid ? this.guestSvc.update(eid, payload) : this.guestSvc.create(payload);
    req.subscribe({
      next: (r: any) => { this.saving.set(false); this.showForm.set(false); this.load(); if(r.data?.guest) this.selected.set(r.data.guest); },
      error: (e: any) => { this.saving.set(false); this.formErr.set(e.error?.message||'Error'); }
    });
  }
  deleteGuest(id: string) {
    this.showConfirm({ icon:'🗑️', title:'Delete Guest', message:'This will permanently remove the guest and all their data. This cannot be undone.', confirmLabel:'Yes, Delete', danger:true,
      action: () => this.guestSvc.delete(id).subscribe(() => { this.selected.set(null); this.load(); })
    });
  }
  refreshInList(g: any) { this.guests.set(this.guests().map((x: any) => x._id===g._id ? g : x)); }
  loadPartners() { this.partnerSvc.getAll().subscribe({ next: (r: any) => this.partners.set(r.data.partners||[]) }); }

  openSendToPartner() {
    this.partnerForm = { partnerId:'', notes:'' };
    this.partnerResult.set(null);
    this.showPartnerModal.set(true);
  }

  confirmBillPartner() {
    const partner = this.partners().find((p:any) => p._id === this.partnerForm.partnerId);
    this.showConfirm({ icon:'🏢', title:'Create Partner Invoice?', message:`Invoice $${this.checkoutNetDue()} to ${partner?.companyName||'partner'} and checkout ${this.selected()?.firstName}?`, confirmLabel:'Create Invoice', danger:false,
      action: () => this.submitBillPartner()
    });
  }

  submitBillPartner() {
    if (!this.partnerForm.partnerId) return;
    this.partnerSending.set(true);
    const g = this.selected();
    const b = g?.currentBookingId;
    // Build items list
    const items = [
      { label: `Room ${g?.currentRoomId?.roomNumber} (${b?.nights} nights x $${b?.ratePerNight})`, amount: this.roomTotal() },
      ...(g?.services||[]).filter((s: any) => !s.paid).map((s: any) => ({ label: `${s.service}`, amount: s.price })),
    ];
    this.partnerSvc.createPayment({
      partnerId:   this.partnerForm.partnerId,
      guestId:     g?._id,
      bookingId:   b?._id || b,
      guestName:   `${g?.firstName} ${g?.lastName}`,
      bookingRef:  b?.bookingRef,
      roomNumber:  g?.currentRoomId?.roomNumber,
      items,
      totalAmount: this.checkoutNetDue(),
      notes:       this.partnerForm.notes,
    }).subscribe({
      next: (r: any) => {
        this.partnerSending.set(false);
        this.partnerResult.set({ success: true, message: `Invoice ${r.data.payment.receiptRef} created — guest checked out` });
        // Also checkout the guest
        this.guestSvc.checkout(g!._id, { paymentMethod: 'partner', payRoomNights: true }).subscribe(() => this.load());
      },
      error: (e: any) => { this.partnerSending.set(false); this.partnerResult.set({ success:false, message: e.error?.message||'Error' }); },
    });
  }

  bgClick(e: Event, t: string) {
    if (!(e.target as HTMLElement).classList.contains('overlay')) return;
    const map: Record<string,any> = { svc:this.showServiceForm, pay:this.showPayModal, payreceipt:this.showPayReceipt, checkout:this.showCheckoutModal, partner:this.showPartnerModal, extend:this.showExtendModal, guest:this.showForm };
    map[t]?.set(false);
  }
  initials(g: any): string { return ((g?.firstName?.[0]||'')+( g?.lastName?.[0]||'')).toUpperCase(); }
  vipBadge(t: string): string { const m: Record<string,string>={regular:'b-gray',silver:'b-blue',gold:'b-yellow',vip:'b-purple'}; return m[t]||'b-gray'; }
  svcBadge(s: string): string { const m: Record<string,string>={pending:'b-yellow',in_progress:'b-purple',done:'b-green'}; return m[s]||'b-gray'; }
}
