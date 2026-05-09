import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HallService } from '../../core/services/api.service';

const HALL_TYPES  = ['conference','banquet','meeting','wedding','seminar','boardroom','other'];
const EVENT_TYPES = ['conference','wedding','birthday','seminar','meeting','training','dinner','other'];
const HALL_ICONS: Record<string,string>  = { conference:'🏛',banquet:'🍽',meeting:'💼',wedding:'💒',seminar:'📚',boardroom:'🤝',other:'🏢' };
const EVENT_ICONS: Record<string,string> = { conference:'🏛',wedding:'💒',birthday:'🎂',seminar:'📚',meeting:'💼',training:'🎓',dinner:'🍽',other:'🎉' };
const STATUS_COLORS: Record<string,string> = { reserved:'#3b82f6',confirmed:'#8b5cf6',in_use:'#22c55e',completed:'#94a3b8',cancelled:'#ef4444' };
const AMENITIES_LIST = ['Projector','Screen','Whiteboard','AC','WiFi','Sound System','Microphone','Podium','Stage','Catering','Parking','Reception Desk'];

type HTab = 'overview'|'halls'|'bookings'|'calendar';

@Component({
  selector: 'app-halls',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `<div class="page-content">

  <div class="sec-head mb20">
    <div>
      <div style="font-size:18px;font-weight:800;letter-spacing:-.4px">🏛 Halls & Event Spaces</div>
      <div style="font-size:12.5px;color:var(--muted);margin-top:3px">Manage halls, conference rooms &amp; venue rentals</div>
    </div>
    <div style="display:flex;gap:8px">
      <button *ngIf="tab()==='halls'" class="btn btn-g btn-sm" (click)="openHallForm()">+ Add Hall</button>
      <button *ngIf="tab()==='bookings'" class="btn btn-g btn-sm" (click)="openBookingForm()">+ Book Hall</button>
      <button *ngIf="tab()==='calendar'" class="btn btn-g btn-sm" (click)="openBookingForm()">+ Book Hall</button>
    </div>
  </div>

  <!-- KPI strip -->
  <div class="g4 mb20">
    <div class="mc" (click)="tab.set('halls')" style="cursor:pointer">
      <div class="mc-ico">🏛</div><div class="mc-lbl">Total Halls</div>
      <div class="mc-val">{{ dash().totalHalls }}</div>
    </div>
    <div class="mc" (click)="tab.set('bookings')" style="cursor:pointer">
      <div class="mc-ico">📅</div><div class="mc-lbl">Active Bookings</div>
      <div class="mc-val" style="color:var(--purple)">{{ dash().activeBookings }}</div>
    </div>
    <div class="mc">
      <div class="mc-ico">💵</div><div class="mc-lbl">This Month</div>
      <div class="mc-val" style="color:var(--success)">\${{ dash().monthRevenue | number:'1.0-0' }}</div>
    </div>
    <div class="mc">
      <div class="mc-ico">💰</div><div class="mc-lbl">Total Revenue</div>
      <div class="mc-val" style="color:var(--purple)">\${{ dash().totalRevenue | number:'1.0-0' }}</div>
    </div>
  </div>

  <!-- Tabs -->
  <div style="display:flex;gap:4px;margin-bottom:16px;background:var(--bg);border-radius:12px;padding:4px;width:fit-content;border:1px solid var(--border)">
    <button class="btn btn-sm" [ngClass]="tab()==='overview'?'btn-g':'btn-ghost'" (click)="tab.set('overview')">📊 Overview</button>
    <button class="btn btn-sm" [ngClass]="tab()==='halls'?'btn-g':'btn-ghost'" (click)="tab.set('halls');loadHalls()">🏛 Halls</button>
    <button class="btn btn-sm" [ngClass]="tab()==='bookings'?'btn-g':'btn-ghost'" (click)="tab.set('bookings');loadBookings()">📅 Bookings</button>
    <button class="btn btn-sm" [ngClass]="tab()==='calendar'?'btn-g':'btn-ghost'" (click)="tab.set('calendar');loadCalendar()">🗓 Calendar</button>
  </div>

  <!-- ══ OVERVIEW ══ -->
  <div *ngIf="tab()==='overview'">
    <!-- Today's events -->
    <div class="card" style="margin-bottom:14px">
      <div style="font-size:13px;font-weight:700;margin-bottom:12px">📅 Today's Events</div>
      <div *ngIf="!dash().todayBookings?.length" style="text-align:center;padding:20px;color:var(--muted)">
        <div style="font-size:24px;margin-bottom:6px">🌟</div>No events scheduled today
      </div>
      <div *ngFor="let b of dash().todayBookings" style="display:flex;align-items:center;gap:12px;padding:10px;background:var(--bg);border-radius:10px;margin-bottom:8px">
        <div style="font-size:28px">{{ eventIcon(b.eventType) }}</div>
        <div style="flex:1">
          <div style="font-weight:700;font-size:13px">{{ b.eventName }}</div>
          <div style="font-size:11.5px;color:var(--muted)">{{ b.hallId?.name }} · {{ b.startTime || '—' }} – {{ b.endTime || '—' }}</div>
          <div style="font-size:11px;color:var(--muted)">{{ b.organizer }} · {{ b.attendees }} attendees</div>
        </div>
        <div>
          <span class="badge" [ngClass]="statusBadge(b.status)" style="font-size:10px">{{ b.status | titlecase }}</span>
        </div>
      </div>
    </div>

    <!-- Halls grid -->
    <div class="card">
      <div style="font-size:13px;font-weight:700;margin-bottom:14px">🏛 Hall Status</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px">
        <div *ngFor="let h of halls()" style="border-radius:12px;padding:16px;border:2px solid"
          [style.border-color]="h.status==='booked'?'#f59e0b':h.status==='maintenance'?'#ef4444':'#22c55e'"
          [style.background]="h.status==='booked'?'#fffbeb':h.status==='maintenance'?'#fef2f2':'#f0fdf4'">
          <div style="font-size:28px;margin-bottom:6px">{{ hallIcon(h.type) }}</div>
          <div style="font-weight:800;font-size:14px">{{ h.name }}</div>
          <div style="font-size:11.5px;color:var(--muted)">{{ h.type | titlecase }} · {{ h.capacity }} persons</div>
          <div style="font-size:12px;font-weight:700;color:var(--purple);margin-top:6px">\${{ h.pricePerDay }}/day</div>
          <span style="font-size:9.5px;font-weight:700;padding:2px 8px;border-radius:20px;display:inline-block;margin-top:6px"
            [style.background]="h.status==='booked'?'#fef9c3':h.status==='maintenance'?'#fee2e2':'#dcfce7'"
            [style.color]="h.status==='booked'?'#854d0e':h.status==='maintenance'?'#991b1b':'#166534'">
            {{ h.status | titlecase }}
          </span>
        </div>
      </div>
    </div>
  </div>

  <!-- ══ HALLS TAB ══ -->
  <div *ngIf="tab()==='halls'">
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px">
      <div *ngFor="let h of halls()" class="card" style="position:relative">
        <div style="display:flex;gap:12px;align-items:flex-start;margin-bottom:12px">
          <div style="font-size:36px">{{ hallIcon(h.type) }}</div>
          <div style="flex:1">
            <div style="font-size:15px;font-weight:800">{{ h.name }}</div>
            <div style="font-size:11.5px;color:var(--muted)">{{ h.code ? h.code+' · ' : '' }}{{ h.type | titlecase }} · Floor {{ h.floor }}</div>
            <span style="font-size:9.5px;font-weight:700;padding:2px 8px;border-radius:20px;display:inline-block;margin-top:4px"
              [style.background]="h.status==='booked'?'#fef9c3':'#dcfce7'"
              [style.color]="h.status==='booked'?'#854d0e':'#166534'">
              {{ h.status | titlecase }}
            </span>
          </div>
          <div style="text-align:right">
            <div style="font-size:16px;font-weight:800;color:var(--purple)">\${{ h.pricePerDay }}</div>
            <div style="font-size:10px;color:var(--muted)">per day</div>
            <div *ngIf="h.pricePerHour" style="font-size:11px;color:var(--muted)">\${{ h.pricePerHour }}/hr</div>
          </div>
        </div>
        <div style="display:flex;gap:16px;margin-bottom:10px;font-size:12.5px">
          <span>👥 Max {{ h.capacity }} persons</span>
          <span>🏢 {{ h.building }}</span>
        </div>
        <div *ngIf="h.amenities?.length" style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:10px">
          <span *ngFor="let a of h.amenities" style="background:var(--bg);border-radius:20px;padding:2px 8px;font-size:10.5px;color:var(--muted)">{{ a }}</span>
        </div>
        <div *ngIf="h.images?.length" style="display:flex;gap:5px;margin-bottom:8px;overflow:hidden;border-radius:8px;height:60px">
          <img *ngFor="let img of h.images.slice(0,3)" [src]="imgUrl(img)"
            style="height:60px;flex:1;object-fit:cover;cursor:pointer" (click)="openImgLightbox(img)">
        </div>
        <div *ngIf="h.description" style="font-size:11.5px;color:var(--muted);margin-bottom:10px">{{ h.description }}</div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-g btn-sm" style="flex:1" (click)="openBookingFormForHall(h)">📅 Book</button>
          <button class="btn btn-o btn-xs" (click)="openHallEdit(h)">✏</button>
          <button class="btn btn-danger btn-xs" (click)="confirmDeleteHall(h)">🗑</button>
        </div>
      </div>
      <div *ngIf="!halls().length" style="text-align:center;padding:50px;color:var(--muted);grid-column:1/-1">
        <div style="font-size:48px;margin-bottom:12px">🏛</div>
        <div style="font-size:16px;font-weight:700;margin-bottom:8px">No halls added yet</div>
        <button class="btn btn-g btn-sm" (click)="openHallForm()">+ Add Your First Hall</button>
      </div>
    </div>
  </div>

  <!-- ══ BOOKINGS TAB ══ -->
  <div *ngIf="tab()=='bookings'">

    <!-- Filter strip -->
    <div style="display:flex;gap:10px;margin-bottom:18px;flex-wrap:wrap;align-items:center">
      <div style="display:flex;gap:4px;background:var(--bg);border-radius:10px;padding:3px;border:1px solid var(--border)">
        <button *ngFor="let s of bStatusOptions" class="btn btn-sm"
          [ngClass]="bStatusFilter===s.val?'btn-g':'btn-ghost'"
          (click)="bStatusFilter=s.val;loadBookings()">
          {{ s.icon }} {{ s.label }}
        </button>
      </div>
      <select class="tb-sel" [(ngModel)]="bHallFilter" (change)="loadBookings()" style="width:160px">
        <option value="">🏛 All Halls</option>
        <option *ngFor="let h of halls()" [value]="h._id">{{ h.name }}</option>
      </select>
      <div style="display:flex;align-items:center;gap:5px">
        <input type="date" class="tb-sel" [(ngModel)]="bFrom" (change)="loadBookings()" style="width:135px">
        <span style="color:var(--muted);font-size:12px">to</span>
        <input type="date" class="tb-sel" [(ngModel)]="bTo" (change)="loadBookings()" style="width:135px">
      </div>
      <div style="margin-left:auto;font-size:12.5px;color:var(--muted);font-weight:600">{{ bookings().length }} bookings</div>
    </div>

    <!-- Empty state -->
    <div *ngIf="!bookings().length" style="text-align:center;padding:60px;background:var(--surface);border-radius:16px;border:1.5px dashed var(--border)">
      <div style="font-size:52px;margin-bottom:12px">🏛</div>
      <div style="font-size:16px;font-weight:800;margin-bottom:6px">No bookings found</div>
      <div style="font-size:13px;color:var(--muted);margin-bottom:18px">Try adjusting filters or create a new booking</div>
      <button class="btn btn-g btn-sm" (click)="openBookingForm()">+ Create Booking</button>
    </div>

    <!-- Booking cards -->
    <div style="display:flex;flex-direction:column;gap:10px">
      <div *ngFor="let b of bookings()" style="background:var(--surface);border-radius:14px;border:1.5px solid var(--border);padding:16px 20px;display:flex;gap:16px;align-items:flex-start;transition:all .15s"
        [style.border-left]="'4px solid '+statusColor(b.status)">

        <!-- Date block -->
        <div style="min-width:68px;text-align:center;background:var(--bg);border-radius:12px;padding:10px 8px">
          <div style="font-size:11px;color:var(--muted);text-transform:uppercase;font-weight:700">{{ b.startDate | date:'MMM':'UTC' }}</div>
          <div style="font-size:24px;font-weight:900;line-height:1;color:var(--purple)">{{ b.startDate | date:'d':'UTC' }}</div>
          <div style="font-size:10px;color:var(--muted);margin-top:2px">{{ b.startDate | date:'yyyy':'UTC' }}</div>
          <div *ngIf="b.days>1" style="font-size:10px;color:var(--purple);font-weight:700;margin-top:3px;background:#f3e8ff;border-radius:8px;padding:1px 5px">{{ b.days }}d</div>
        </div>

        <!-- Main info -->
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;flex-wrap:wrap">
            <span style="font-size:16px">{{ eventIcon(b.eventType) }}</span>
            <span style="font-size:14px;font-weight:800">{{ b.eventName }}</span>
            <span class="badge" [ngClass]="statusBadge(b.status)" style="font-size:9.5px">{{ b.status | titlecase }}</span>
            <span class="badge" [ngClass]="payBadge(b.paymentStatus)" style="font-size:9px">{{ b.paymentStatus | titlecase }}</span>
            <button *ngIf="b.paymentStatus!=='paid'" class="btn btn-success btn-xs" style="font-size:9.5px;padding:2px 7px" (click)="openMarkPaidDlg(b);$event.stopPropagation()">💰 Mark Paid</button>
          </div>
          <div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:8px">
            <span style="font-size:12px;color:var(--muted)">🏛 {{ b.hallId?.name }}</span>
            <span style="font-size:12px;color:var(--muted)">👤 {{ b.organizer }}</span>
            <span style="font-size:12px;color:var(--muted)">📞 {{ b.phone }}</span>
            <span style="font-size:12px;color:var(--muted)">👥 {{ b.attendees }} attendees</span>
          </div>
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
            <div style="background:var(--bg);border-radius:8px;padding:4px 10px;font-size:11.5px;display:flex;gap:5px;align-items:center">
              <span style="color:var(--muted)">🕐</span>
              <span style="font-weight:600">{{ b.startDate | date:'MMM d':'UTC' }}{{ b.days>1 ? ' – '+( b.endDate | date:'MMM d':'UTC') : '' }}</span>
              <span style="color:var(--muted)">{{ b.startTime }} – {{ b.endTime }}</span>
            </div>
            <div style="font-family:monospace;font-size:11px;color:var(--purple);background:#f3e8ff;border-radius:8px;padding:3px 8px">{{ b.bookingRef }}</div>
          </div>
        </div>

        <!-- Amount -->
        <div style="text-align:right;min-width:100px">
          <div style="font-size:20px;font-weight:900;color:var(--purple)">\${{ b.totalAmount | number:'1.0-0' }}</div>
          <div style="font-size:10.5px;color:var(--muted)">{{ b.billingMode==='per_hour'?b.hours+'hrs':b.days+' day(s)' }}</div>
          <div style="font-size:10.5px;color:var(--muted)">Paid: \${{ b.paidAmount | number:'1.0-0' }}</div>
        </div>

        <!-- Actions -->
        <div style="display:flex;flex-direction:column;gap:5px;min-width:90px">
          <button *ngIf="b.status==='reserved'" class="btn btn-g btn-xs" style="width:100%" (click)="openConfirmBookingDlg(b)">✓ Confirm</button>
          <button *ngIf="b.status==='confirmed'" class="btn btn-success btn-xs" style="width:100%" (click)="startUse(b._id)">▶ Start</button>
          <button *ngIf="b.status==='in_use'" class="btn btn-o btn-xs" style="width:100%" (click)="openCompleteConfirm(b)">✓ Done</button>
          <button class="btn btn-o btn-xs" style="width:100%" (click)="openView(b)">🔍 View</button>
          <button *ngIf="!['completed','cancelled'].includes(b.status)" class="btn btn-o btn-xs" style="width:100%" (click)="openBookingEdit(b)">✏ Edit</button>
          <button class="btn btn-o btn-xs" style="width:100%" (click)="doPrintContract(b)">🖨 Print</button>
          <button *ngIf="!['completed','cancelled'].includes(b.status)" class="btn btn-danger btn-xs" style="width:100%" (click)="cancelBooking(b._id)">✕ Cancel</button>
        </div>
      </div>
    </div>
  </div>


  <!-- ══ CALENDAR TAB ══ -->
  <div *ngIf="tab()==='calendar'">
    <!-- Month nav -->
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:16px">
      <button class="btn btn-o btn-sm" (click)="calPrevMonth()">← Prev</button>
      <span style="font-size:16px;font-weight:800;min-width:160px;text-align:center">{{ calMonthLabel() }}</span>
      <button class="btn btn-o btn-sm" (click)="calNextMonth()">Next →</button>
      <div style="display:flex;gap:5px;margin-left:auto">
        <button *ngFor="let h of halls()" class="btn btn-xs"
          [ngClass]="calHallFilter()===h._id?'btn-g':'btn-o'"
          (click)="setCalHallFilter(h._id)">
          {{ hallIcon(h.type) }} {{ h.name }}
        </button>
        <button class="btn btn-xs" [ngClass]="calHallFilter()===''?'btn-g':'btn-o'" (click)="calHallFilter.set('');loadCalendar()">All</button>
      </div>
    </div>

    <!-- Legend -->
    <div style="display:flex;gap:14px;margin-bottom:14px;flex-wrap:wrap">
      <div *ngFor="let s of calLegend" style="display:flex;align-items:center;gap:5px;font-size:12px">
        <div style="width:12px;height:12px;border-radius:3px" [style.background]="s.color"></div>
        {{ s.label }}
      </div>
    </div>

    <!-- Calendar grid -->
    <div style="background:var(--surface);border-radius:16px;border:1.5px solid var(--border);overflow:hidden">
      <!-- Day headers -->
      <div style="display:grid;grid-template-columns:repeat(7,1fr);background:var(--bg);border-bottom:1px solid var(--border)">
        <div *ngFor="let d of calDayNames" style="padding:10px;text-align:center;font-size:11.5px;font-weight:700;color:var(--muted)">{{ d }}</div>
      </div>
      <!-- Cells -->
      <div style="display:grid;grid-template-columns:repeat(7,1fr)">
        <div *ngFor="let cell of calCells()" style="min-height:110px;padding:8px;border-right:1px solid var(--border);border-bottom:1px solid var(--border);cursor:pointer;transition:background .1s"
          [style.background]="cell.isToday?'#faf5ff':'transparent'"
          [style.opacity]="cell.day?1:.4"
          (click)="cell.day && openDayDetail(cell)">
          <!-- Day number -->
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px">
            <span style="font-size:13px;font-weight:700"
              [style.background]="cell.isToday?'var(--purple)':'transparent'"
              [style.color]="cell.isToday?'#fff':'var(--text1)'"
              style="width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center">
              {{ cell.day }}
            </span>
            <span *ngIf="cell.bookings?.length" style="font-size:10px;font-weight:700;color:var(--purple)">{{ cell.bookings.length }}</span>
          </div>
          <!-- Booking chips -->
          <div *ngFor="let b of (cell.bookings||[]).slice(0,3)" style="border-radius:6px;padding:2px 6px;margin-bottom:3px;font-size:10.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"
            [style.background]="statusColorSoft(b.status)"
            [style.color]="statusColor(b.status)"
            [title]="b.eventName">
            {{ hallIcon(b.hallId?.type) }} {{ b.hallId?.name || b.eventName }}
          </div>
          <div *ngIf="(cell.bookings||[]).length>3" style="font-size:10px;color:var(--muted);padding-left:4px">+{{ cell.bookings.length-3 }} more</div>
        </div>
      </div>
    </div>
  </div>

  <!-- ══ DAY DETAIL MODAL ══ -->
  <div class="overlay" [class.show]="showDayDetail()" (click)="bgClick($event,'day')">
    <div class="modal" style="width:520px;max-height:88vh;overflow-y:auto">
      <div class="modal-head">
        <div class="modal-title">📅 {{ selectedDay()?.date | date:'EEEE, MMMM d, y':'UTC' }}</div>
        <button class="modal-close" (click)="showDayDetail.set(false)">x</button>
      </div>
      <div *ngIf="!selectedDay()?.bookings?.length" style="text-align:center;padding:30px;color:var(--muted)">
        <div style="font-size:32px;margin-bottom:8px">✅</div>
        <div style="font-weight:600">No bookings on this day</div>
        <button class="btn btn-g btn-sm" style="margin-top:12px" (click)="openBookingForm();showDayDetail.set(false)">+ Book a Hall</button>
      </div>
      <div *ngFor="let b of selectedDay()?.bookings" style="background:var(--bg);border-radius:12px;padding:14px;margin-bottom:10px;border-left:4px solid" [style.border-left-color]="statusColor(b.status)">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
          <div>
            <div style="font-size:14px;font-weight:800">{{ eventIcon(b.eventType) }} {{ b.eventName }}</div>
            <div style="font-size:11.5px;color:var(--muted);margin-top:2px">{{ b.hallId?.name }} · {{ b.startTime }} – {{ b.endTime }}</div>
          </div>
          <span class="badge" [ngClass]="statusBadge(b.status)" style="font-size:10px">{{ b.status | titlecase }}</span>
        </div>
        <div style="display:flex;gap:12px;flex-wrap:wrap;font-size:12px;color:var(--muted)">
          <span>👤 {{ b.organizer }}</span>
          <span>👥 {{ b.attendees }} persons</span>
          <span style="color:var(--purple);font-weight:700">\${{ b.totalAmount | number:'1.0-0' }}</span>
        </div>
        <div style="display:flex;gap:6px;margin-top:10px">
          <button *ngIf="b.status==='reserved'" class="btn btn-g btn-xs" (click)="openConfirmBookingDlg(b)">✓ Confirm</button>
          <button *ngIf="b.status==='confirmed'" class="btn btn-success btn-xs" (click)="startUse(b._id)">▶ Start</button>
          <button class="btn btn-o btn-xs" (click)="openView(b);showDayDetail.set(false)">View</button>
          <button class="btn btn-o btn-xs" (click)="doPrintContract(b)">🖨</button>
        </div>
      </div>
    </div>
  </div>

  <!-- ══ COMPLETE CONFIRM MODAL ══ -->
  <div class="overlay" [class.show]="showCompleteConfirm()" (click)="bgClick($event,'completeConfirm')">
    <div class="modal" style="width:460px">
      <div style="text-align:center;padding:10px 0 6px">
        <div style="font-size:48px;margin-bottom:10px">✅</div>
        <div style="font-size:17px;font-weight:900;margin-bottom:6px">Mark as Completed?</div>
        <div style="font-size:13px;color:var(--muted);margin-bottom:16px">
          Are you sure <strong>{{ completeTarget()?.eventName }}</strong> at <strong>{{ completeTarget()?.hallId?.name }}</strong> is done?
        </div>
      </div>
      <!-- Payment status inside complete confirm -->
      <div style="background:var(--bg);border-radius:12px;padding:14px;margin-bottom:16px">
        <div style="font-size:12px;font-weight:700;color:var(--muted);margin-bottom:10px">PAYMENT STATUS</div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-sm" style="flex:1"
            [ngClass]="completePayMethod==='paid'?'btn-success':'btn-o'"
            (click)="completePayMethod='paid'">
            ✅ Payment Received — \${{ completeTarget()?.totalAmount | number:'1.2-2' }}
          </button>
          <button class="btn btn-sm" style="flex:1"
            [ngClass]="completePayMethod==='pending'?'btn-danger':'btn-o'"
            (click)="completePayMethod='pending'">
            ⏳ Still Pending
          </button>
        </div>
        <div *ngIf="completePayMethod==='paid'" style="margin-top:10px">
          <label style="font-size:11.5px;font-weight:600;color:var(--muted)">Payment Method</label>
          <select [(ngModel)]="completePaymentMethod" style="width:100%;margin-top:4px">
            <option value="cash">💵 Cash</option>
            <option value="card">💳 Card</option>
            <option value="bank_transfer">🏦 Bank Transfer</option>
            <option value="online">📱 Online</option>
          </select>
          <div style="font-size:11px;color:var(--muted);margin-top:6px">
            Paid amount: <strong>\${{ completeTarget()?.totalAmount | number:'1.2-2' }}</strong>
          </div>
        </div>
        <div *ngIf="completePayMethod==='pending'" style="margin-top:8px;font-size:12px;color:var(--warn)">
          ⚠ The hall will be marked complete but payment remains pending. You can mark it paid later.
        </div>
      </div>
      <div style="display:flex;gap:10px">
        <button class="btn btn-o" style="flex:1" (click)="showCompleteConfirm.set(false)">Cancel</button>
        <button class="btn btn-success" style="flex:2" (click)="submitComplete()">
          ✅ Yes, Mark Completed {{ completePayMethod==='paid'?' & Paid':'' }}
        </button>
      </div>
    </div>
  </div>

  <!-- ══ CONFIRM BOOKING DIALOG ══ -->
  <div class="overlay" [class.show]="showConfirmBookingDlg()" (click)="bgClick($event,'confirmDlg')">
    <div class="modal" style="width:420px">
      <div style="text-align:center;padding:10px 0 14px">
        <div style="font-size:42px;margin-bottom:8px">📋</div>
        <div style="font-size:17px;font-weight:900;margin-bottom:6px">Confirm Booking?</div>
        <div style="font-size:13px;color:var(--muted)">
          Confirm reservation for <strong>{{ confirmBookingTarget()?.eventName }}</strong>?<br>
          <span style="font-size:12px">{{ confirmBookingTarget()?.hallId?.name }} · {{ confirmBookingTarget()?.startDate | date:'MMM d, y':'UTC' }}</span>
        </div>
      </div>
      <div style="background:var(--bg);border-radius:10px;padding:12px;margin-bottom:14px;font-size:12.5px">
        <div class="rj" style="margin-bottom:4px"><span style="color:var(--muted)">Organizer</span><strong>{{ confirmBookingTarget()?.organizer }}</strong></div>
        <div class="rj" style="margin-bottom:4px"><span style="color:var(--muted)">Attendees</span><strong>{{ confirmBookingTarget()?.attendees }}</strong></div>
        <div class="rj"><span style="color:var(--muted)">Total</span><strong style="color:var(--purple)">\${{ confirmBookingTarget()?.totalAmount | number:'1.2-2' }}</strong></div>
      </div>
      <div style="display:flex;gap:10px">
        <button class="btn btn-o" style="flex:1" (click)="showConfirmBookingDlg.set(false)">Cancel</button>
        <button class="btn btn-g" style="flex:2" (click)="doConfirmBooking()">✅ Yes, Confirm Booking</button>
      </div>
    </div>
  </div>

  <!-- ══ MARK PAID DIALOG ══ -->
  <div class="overlay" [class.show]="showMarkPaidDlg()" (click)="bgClick($event,'markPaid')">
    <div class="modal" style="width:420px">
      <div style="text-align:center;padding:10px 0 14px">
        <div style="font-size:42px;margin-bottom:8px">💰</div>
        <div style="font-size:17px;font-weight:900;margin-bottom:6px">Confirm Payment Received?</div>
        <div style="font-size:13px;color:var(--muted)">
          Mark payment as received for <strong>{{ markPaidTarget()?.eventName }}</strong>?
        </div>
      </div>
      <div style="background:var(--bg);border-radius:10px;padding:12px;margin-bottom:14px;font-size:12.5px">
        <div class="rj" style="margin-bottom:4px;font-size:16px;font-weight:900;color:var(--purple)">
          <span>Amount Due</span><span>\${{ markPaidTarget()?.totalAmount | number:'1.2-2' }}</span>
        </div>
        <div class="rj" style="margin-bottom:4px"><span style="color:var(--muted)">Already Paid</span><span>\${{ markPaidTarget()?.paidAmount | number:'1.2-2' }}</span></div>
        <div class="rj"><span style="color:var(--warn);font-weight:700">Remaining</span><span style="color:var(--warn);font-weight:700">\${{ ((markPaidTarget()?.totalAmount||0)-(markPaidTarget()?.paidAmount||0)) | number:'1.2-2' }}</span></div>
      </div>
      <label style="font-size:11.5px;font-weight:600;color:var(--muted)">Payment Method</label>
      <select [(ngModel)]="markPaidMethod" style="width:100%;margin:6px 0 14px">
        <option value="cash">💵 Cash</option>
        <option value="card">💳 Card</option>
        <option value="bank_transfer">🏦 Bank Transfer</option>
        <option value="online">📱 Online</option>
      </select>
      <div style="display:flex;gap:10px">
        <button class="btn btn-o" style="flex:1" (click)="showMarkPaidDlg.set(false)">Cancel</button>
        <button class="btn btn-success" style="flex:2" (click)="doMarkPaid()">💰 Yes, Confirm Payment</button>
      </div>
    </div>
  </div>

    <!-- ══ HALL FORM ══ -->
  <div class="overlay" [class.show]="showHallForm()" (click)="bgClick($event,'hall')">
    <div class="modal" style="width:540px;max-height:90vh;overflow-y:auto">
      <div class="modal-head">
        <div class="modal-title">{{ editHallId() ? '✏ Edit Hall' : '🏛 Add New Hall' }}</div>
        <button class="modal-close" (click)="showHallForm.set(false)">x</button>
      </div>
      <div class="form-row">
        <div class="fg" style="flex:2"><label>Hall Name *</label><input [(ngModel)]="hf.name" placeholder="e.g. Grand Ballroom"></div>
        <div class="fg"><label>Code</label><input [(ngModel)]="hf.code" placeholder="HALL-A"></div>
      </div>
      <div class="form-row">
        <div class="fg"><label>Type *</label>
          <select [(ngModel)]="hf.type">
            <option *ngFor="let t of hallTypes" [value]="t">{{ hallIcon(t) }} {{ t | titlecase }}</option>
          </select>
        </div>
        <div class="fg"><label>Capacity (persons) *</label><input type="number" [(ngModel)]="hf.capacity" min="1"></div>
      </div>
      <div class="form-row">
        <div class="fg"><label>Price Per Day (\$) *</label><input type="number" [(ngModel)]="hf.pricePerDay" min="0"></div>
        <div class="fg"><label>Price Per Hour (\$)</label><input type="number" [(ngModel)]="hf.pricePerHour" min="0"></div>
      </div>
      <div class="form-row">
        <div class="fg"><label>Floor</label><input type="number" [(ngModel)]="hf.floor" min="0"></div>
        <div class="fg"><label>Building</label><input [(ngModel)]="hf.building" placeholder="Main"></div>
      </div>
      <div class="fg"><label>Description</label><textarea rows="2" [(ngModel)]="hf.description"></textarea></div>
      <div class="fg">
        <label>Amenities</label>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">
          <label *ngFor="let a of amenitiesList" style="display:flex;align-items:center;gap:5px;background:var(--bg);border-radius:20px;padding:4px 10px;cursor:pointer;border:1.5px solid;font-size:12px"
            [style.border-color]="hf.amenities.includes(a)?'var(--purple)':'var(--border)'"
            [style.background]="hf.amenities.includes(a)?'#f3e8ff':'var(--bg)'">
            <input type="checkbox" [checked]="hf.amenities.includes(a)" (change)="toggleAmenity(a)" style="display:none">
            {{ a }}
          </label>
        </div>
      </div>
      <!-- Hall Images Upload -->
      <div class="fg" style="margin-top:4px">
        <label>Hall Photos (optional)</label>
        <div style="border:2px dashed var(--border);border-radius:10px;padding:14px;text-align:center;cursor:pointer;transition:all .15s"
          [style.border-color]="hallDragOver?'var(--purple)':'var(--border)'"
          [style.background]="hallDragOver?'#f3e8ff':'var(--bg)'"
          (dragover)="$event.preventDefault();hallDragOver=true"
          (dragleave)="hallDragOver=false"
          (drop)="onHallImgDrop($event)"
          (click)="hallImgInput.click()">
          <div style="font-size:22px;margin-bottom:4px">🏛📷</div>
          <div style="font-size:12px;color:var(--muted)">Click or drag images of the hall</div>
          <div style="font-size:10.5px;color:var(--muted)">JPG, PNG, WEBP · Max 5MB each</div>
        </div>
        <input #hallImgInput type="file" accept="image/*" multiple style="display:none" (change)="onHallImgSelect($event)">
        <div *ngIf="hallImgPreviews.length" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">
          <div *ngFor="let img of hallImgPreviews; let i=index"
            style="position:relative;width:80px;height:80px;border-radius:8px;overflow:hidden;border:1.5px solid var(--border)">
            <img [src]="img.preview" style="width:100%;height:100%;object-fit:cover">
            <button (click)="removeHallImg(i)"
              style="position:absolute;top:2px;right:2px;background:rgba(0,0,0,.6);color:#fff;border:none;border-radius:50%;width:18px;height:18px;font-size:10px;cursor:pointer">✕</button>
          </div>
        </div>
        <div *ngIf="hallImgUploading()" style="font-size:11.5px;color:var(--purple);margin-top:4px">📤 Uploading photos...</div>
      </div>

      <div *ngIf="hallErr()" style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:10px;font-size:12.5px;color:#b91c1c;margin:8px 0">{{ hallErr() }}</div>
      <div style="display:flex;gap:10px;margin-top:12px">
        <button class="btn btn-o" style="flex:1" (click)="showHallForm.set(false)">Cancel</button>
        <button class="btn btn-g" style="flex:2" (click)="saveHall()" [disabled]="saving()">{{ saving()?'Saving...':'Save Hall' }}</button>
      </div>
    </div>
  </div>

  <!-- ══ BOOKING FORM ══ -->
  <div class="overlay" [class.show]="showBookingForm()" (click)="bgClick($event,'booking')">
    <div class="modal" style="width:580px;max-height:92vh;overflow-y:auto">
      <div class="modal-head">
        <div class="modal-title">{{ editBookingId() ? '✏ Edit Booking' : '📅 Book a Hall' }}</div>
        <button class="modal-close" (click)="showBookingForm.set(false)">x</button>
      </div>

      <!-- Hall selector -->
      <div class="fg" style="margin-bottom:14px">
        <label>Select Hall *</label>
        <select [(ngModel)]="bf.hallId" (change)="onHallSelect()">
          <option value="">-- Select Hall --</option>
          <option *ngFor="let h of halls()" [value]="h._id">{{ hallIcon(h.type) }} {{ h.name }} ({{ h.capacity }} persons · \${{ h.pricePerDay }}/day)</option>
        </select>
      </div>

      <!-- Event info -->
      <div class="form-row">
        <div class="fg" style="flex:2"><label>Event Name *</label><input [(ngModel)]="bf.eventName" placeholder="Annual Conference 2026"></div>
        <div class="fg"><label>Event Type</label>
          <select [(ngModel)]="bf.eventType">
            <option *ngFor="let t of eventTypes" [value]="t">{{ eventIcon(t) }} {{ t | titlecase }}</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="fg"><label>Organizer / Company *</label><input [(ngModel)]="bf.organizer" placeholder="ABC Corp"></div>
        <div class="fg"><label>Phone</label><input [(ngModel)]="bf.phone" placeholder="+971..."></div>
        <div class="fg"><label>Email</label><input type="email" [(ngModel)]="bf.email"></div>
      </div>
      <div class="form-row">
        <div class="fg"><label>Attendees</label><input type="number" [(ngModel)]="bf.attendees" min="1"></div>
        <div class="fg"><label>Billing Mode</label>
          <select [(ngModel)]="bf.billingMode" (change)="calcBookingTotal()">
            <option value="per_day">Per Day</option>
            <option value="per_hour">Per Hour</option>
          </select>
        </div>
      </div>

      <!-- Dates -->
      <div class="form-row">
        <div class="fg"><label>Start Date *</label><input type="date" [(ngModel)]="bf.startDate" (change)="calcDays();calcBookingTotal()"></div>
        <div class="fg"><label>End Date *</label><input type="date" [(ngModel)]="bf.endDate" (change)="calcDays();calcBookingTotal()"></div>
        <div class="fg"><label>Start Time</label><input type="time" [(ngModel)]="bf.startTime"></div>
        <div class="fg"><label>End Time</label><input type="time" [(ngModel)]="bf.endTime" (change)="calcHours();calcBookingTotal()"></div>
      </div>

      <!-- Pricing -->
      <div style="background:var(--bg);border-radius:10px;padding:12px 14px;margin-bottom:12px">
        <div style="font-size:11.5px;font-weight:700;color:var(--muted);margin-bottom:8px">PRICING</div>
        <div class="form-row">
          <div class="fg"><label>{{ bf.billingMode==='per_hour'?'Price/Hour':'Price/Day' }} (\$)</label>
            <input type="number" [(ngModel)]="bf.billingMode==='per_hour'?bf.pricePerHour:bf.pricePerDay" (input)="calcBookingTotal()" min="0">
          </div>
          <div class="fg"><label>{{ bf.billingMode==='per_hour'?'Hours':'Days' }}</label>
            <input type="number" [(ngModel)]="bf.billingMode==='per_hour'?bf.hours:bf.days" (input)="calcBookingTotal()" min="1" readonly>
          </div>
          <div class="fg"><label>Tax Rate (%)</label><input type="number" [(ngModel)]="bf.taxRate" (input)="calcBookingTotal()" min="0" max="30"></div>
          <div class="fg"><label>Discount (\$)</label><input type="number" [(ngModel)]="bf.discountAmount" (input)="calcBookingTotal()" min="0"></div>
        </div>
        <!-- Extra charges -->
        <div style="font-size:11.5px;font-weight:700;color:var(--muted);margin:8px 0 6px">Extra Charges</div>
        <div *ngFor="let e of bf.extraCharges; let i=index" style="display:flex;gap:6px;margin-bottom:5px">
          <input [(ngModel)]="e.description" placeholder="e.g. Catering setup" style="flex:2;font-size:12px">
          <input type="number" [(ngModel)]="e.amount" (input)="calcBookingTotal()" placeholder="\$" style="width:80px;font-size:12px" min="0">
          <button class="btn btn-danger btn-xs" (click)="removeExtra(i)">✕</button>
        </div>
        <button class="btn btn-o btn-xs" (click)="addExtra()">+ Extra Charge</button>

        <!-- Total preview -->
        <div style="border-top:1px solid var(--border);margin-top:10px;padding-top:8px">
          <div class="rj" style="font-size:12px;margin-bottom:3px"><span style="color:var(--muted)">Subtotal</span><span>\${{ bf.subtotal | number:'1.2-2' }}</span></div>
          <div class="rj" style="font-size:12px;margin-bottom:3px"><span style="color:var(--muted)">Tax ({{ bf.taxRate }}%)</span><span>\${{ bf.taxAmount | number:'1.2-2' }}</span></div>
          <div *ngIf="bf.discountAmount>0" class="rj" style="font-size:12px;margin-bottom:3px"><span style="color:var(--warn)">Discount</span><span>-\${{ bf.discountAmount | number:'1.2-2' }}</span></div>
          <div class="rj" style="font-size:15px;font-weight:900;color:var(--purple)"><span>Total</span><span>\${{ bf.totalAmount | number:'1.2-2' }}</span></div>
        </div>
      </div>

      <div class="form-row">
        <div class="fg"><label>Payment Method</label>
          <select [(ngModel)]="bf.paymentMethod">
            <option value="cash">💵 Cash</option>
            <option value="card">💳 Card</option>
            <option value="bank_transfer">🏦 Bank Transfer</option>
            <option value="online">📱 Online</option>
          </select>
        </div>
        <div class="fg"><label>Paid Amount (\$)</label><input type="number" [(ngModel)]="bf.paidAmount" min="0"></div>
      </div>
      <div class="fg"><label>Special Requests / Notes</label><textarea rows="2" [(ngModel)]="bf.notes"></textarea></div>
      <div *ngIf="bookingErr()" style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:10px;font-size:12.5px;color:#b91c1c;margin:8px 0">{{ bookingErr() }}</div>
      <div style="display:flex;gap:10px;margin-top:12px">
        <button class="btn btn-o" style="flex:1" (click)="showBookingForm.set(false)">Cancel</button>
        <button class="btn btn-g" style="flex:2" (click)="saveBooking()" [disabled]="saving()">
          {{ saving()?'Saving...':'📅 '+(editBookingId()?'Update':'Create')+' Booking' }}
        </button>
      </div>
    </div>
  </div>

  <!-- ══ BOOKING VIEW ══ -->
  <div class="overlay" [class.show]="showView()" (click)="bgClick($event,'view')">
    <div class="modal" style="width:500px;max-height:90vh;overflow-y:auto">
      <div class="modal-head">
        <div class="modal-title">{{ viewTarget()?.bookingRef }}</div>
        <button class="modal-close" (click)="showView.set(false)">x</button>
      </div>
      <ng-container *ngIf="viewTarget()">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">
          <div style="background:var(--bg);border-radius:10px;padding:10px 12px">
            <div style="font-size:10.5px;color:var(--muted)">Event</div>
            <div style="font-weight:700">{{ eventIcon(viewTarget().eventType) }} {{ viewTarget().eventName }}</div>
          </div>
          <div style="background:var(--bg);border-radius:10px;padding:10px 12px">
            <div style="font-size:10.5px;color:var(--muted)">Hall</div>
            <div style="font-weight:700">{{ viewTarget().hallId?.name }}</div>
          </div>
          <div style="background:var(--bg);border-radius:10px;padding:10px 12px">
            <div style="font-size:10.5px;color:var(--muted)">Organizer</div>
            <div style="font-weight:700">{{ viewTarget().organizer }}</div>
            <div style="font-size:11px;color:var(--muted)">{{ viewTarget().phone }}</div>
          </div>
          <div style="background:var(--bg);border-radius:10px;padding:10px 12px">
            <div style="font-size:10.5px;color:var(--muted)">Dates</div>
            <div style="font-weight:700">{{ viewTarget().startDate | date:'MMM d':'UTC' }} – {{ viewTarget().endDate | date:'MMM d, y':'UTC' }}</div>
            <div style="font-size:11px;color:var(--muted)">{{ viewTarget().days }} days · {{ viewTarget().startTime }} – {{ viewTarget().endTime }}</div>
          </div>
          <div style="background:var(--bg);border-radius:10px;padding:10px 12px">
            <div style="font-size:10.5px;color:var(--muted)">Attendees</div>
            <div style="font-weight:700">{{ viewTarget().attendees }} persons</div>
          </div>
          <div style="background:var(--bg);border-radius:10px;padding:10px 12px">
            <div style="font-size:10.5px;color:var(--muted)">Total Amount</div>
            <div style="font-weight:800;color:var(--purple);font-size:16px">\${{ viewTarget().totalAmount | number:'1.2-2' }}</div>
            <span class="badge" [ngClass]="payBadge(viewTarget().paymentStatus)" style="font-size:9.5px">{{ viewTarget().paymentStatus | titlecase }}</span>
            <button *ngIf="viewTarget().paymentStatus!=='paid'" class="btn btn-success btn-xs" (click)="openMarkPaidDlg(viewTarget())">💰 Mark Paid</button>
          </div>
        </div>
        <div *ngIf="viewTarget().notes" style="background:var(--bg);border-radius:10px;padding:10px 12px;margin-bottom:12px;font-size:12.5px">
          <div style="color:var(--muted);font-size:10.5px;margin-bottom:3px">Notes</div>
          {{ viewTarget().notes }}
        </div>
        <div style="display:flex;gap:8px">
          <button *ngIf="viewTarget().status==='reserved'" class="btn btn-g btn-sm" (click)="openConfirmBookingDlg(viewTarget());showView.set(false)">✅ Confirm</button>
          <button *ngIf="viewTarget().status==='confirmed'" class="btn btn-success btn-sm" (click)="startUse(viewTarget()._id);showView.set(false)">▶ Start Event</button>
          <button *ngIf="viewTarget().status==='in_use'" class="btn btn-o btn-sm" (click)="openCompleteConfirm(viewTarget());showView.set(false)">✓ Complete</button>
          <button class="btn btn-o btn-sm" (click)="doPrintContract(viewTarget());showView.set(false)">🖨 Print</button>
          <button *ngIf="!['completed','cancelled'].includes(viewTarget().status)" class="btn btn-danger btn-sm" (click)="cancelBooking(viewTarget()._id);showView.set(false)">Cancel</button>
        </div>
      </ng-container>
    </div>
  </div>

  <!-- ══ IMAGE LIGHTBOX ══ -->
  <div *ngIf="lightboxImg()" style="position:fixed;inset:0;background:rgba(0,0,0,.92);z-index:99999;display:flex;align-items:center;justify-content:center"
    (click)="lightboxImg.set(null)">
    <img [src]="lightboxImg()" style="max-width:92vw;max-height:92vh;border-radius:10px;box-shadow:0 20px 60px rgba(0,0,0,.5)">
    <button style="position:absolute;top:20px;right:24px;background:rgba(255,255,255,.15);color:#fff;border:none;border-radius:50%;width:40px;height:40px;font-size:20px;cursor:pointer" (click)="lightboxImg.set(null)">✕</button>
  </div>

  <!-- ══ CONFIRM DIALOG ══ -->
  <div class="overlay" [class.show]="confirmDlg().show" style="z-index:9999">
    <div class="modal" style="width:380px;text-align:center">
      <div style="font-size:36px;margin-bottom:10px">{{ confirmDlg().icon }}</div>
      <div style="font-size:15px;font-weight:800;margin-bottom:8px">{{ confirmDlg().title }}</div>
      <div style="font-size:12.5px;color:var(--muted);margin-bottom:20px">{{ confirmDlg().message }}</div>
      <div style="display:flex;gap:10px">
        <button class="btn btn-o" style="flex:1" (click)="dismissConfirm()">Cancel</button>
        <button class="btn btn-danger" style="flex:2" (click)="acceptConfirm()">{{ confirmDlg().label }}</button>
      </div>
    </div>
  </div>

</div>`,
})
export class HallsComponent implements OnInit {
  tab         = signal<HTab>('overview');
  halls         = signal<any[]>([]);
  bookings         = signal<any[]>([]);
  dash         = signal<any>({ totalHalls:0, activeBookings:0, monthRevenue:0, totalRevenue:0, todayBookings:[] });
  saving         = signal(false);
  showHallForm         = signal(false);
  showBookingForm         = signal(false);
  showView         = signal(false);
  editHallId         = signal<string|null>(null);
  editBookingId         = signal<string|null>(null);
  viewTarget         = signal<any>(null);
  hallErr         = signal('');
  bookingErr         = signal('');
  confirmDlg         = signal<any>({ show:false, icon:'⚠️', title:'', message:'', label:'Confirm', action:()=>{} });

  hallImgPreviews: any[]  = [];
  hallImgFiles: File[]    = [];
  hallImgUploading         = signal(false);
  hallDragOver            = false;
  lightboxImg         = signal<string|null>(null);
  showCompleteConfirm    = signal(false);
  showConfirmBookingDlg  = signal(false);
  showMarkPaidDlg        = signal(false);
  completeTarget         = signal<any>(null);
  confirmBookingTarget   = signal<any>(null);
  markPaidTarget         = signal<any>(null);
  completePayMethod      = 'paid';
  completePaymentMethod  = 'cash';
  markPaidMethod         = 'cash';
  bStatusFilter = ''; bHallFilter = ''; bFrom = ''; bTo = '';

  // Calendar state
  calYear     = signal(new Date().getFullYear());
  calMonth    = signal(new Date().getMonth());
  calHallFilter = signal('');
  calBookings = signal<any[]>([]);
  showDayDetail = signal(false);
  selectedDay   = signal<any>(null);

  calDayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  calLegend   = [
    { label:'Reserved',   color:'#93c5fd' },
    { label:'Confirmed',  color:'#c4b5fd' },
    { label:'In Use',     color:'#86efac' },
    { label:'Completed',  color:'#d1d5db' },
    { label:'Cancelled',  color:'#fca5a5' },
  ];

  bStatusOptions = [
    { val:'', label:'All', icon:'📋' },
    { val:'reserved',  label:'Reserved',  icon:'🔵' },
    { val:'confirmed', label:'Confirmed', icon:'🟣' },
    { val:'in_use',    label:'In Use',    icon:'🟢' },
    { val:'completed', label:'Done',      icon:'⚫' },
    { val:'cancelled', label:'Cancelled', icon:'🔴' },
  ];

  hallTypes     = HALL_TYPES;
  eventTypes    = EVENT_TYPES;
  amenitiesList = AMENITIES_LIST;

  hf: any = this.blankHall();
  bf: any = this.blankBooking();

  constructor(private hallSvc: HallService) {}

  ngOnInit() { this.loadDash(); this.loadHalls(); }

  loadDash()    { this.hallSvc.getDashboard().subscribe({ next:(r:any)=>this.dash.set(r.data||{}) }); }
  loadHalls()   { this.hallSvc.getHalls().subscribe({ next:(r:any)=>this.halls.set(r.data.halls||[]) }); }
  loadBookings() {
    const f: any = {};
    if (this.bStatusFilter) f.status = this.bStatusFilter;
    if (this.bHallFilter)   f.hallId = this.bHallFilter;
    if (this.bFrom) f.from = this.bFrom;
    if (this.bTo)   f.to   = this.bTo;
    this.hallSvc.getBookings(f).subscribe({ next:(r:any)=>this.bookings.set(r.data.bookings||[]) });
  }

  // ── Hall form ──
  blankHall() { return { name:'', code:'', type:'conference', capacity:100, pricePerDay:0, pricePerHour:0, floor:1, building:'Main', description:'', amenities:[] }; }
  openHallForm()   { this.editHallId.set(null); this.hf = this.blankHall(); this.hallErr.set(''); this.hallImgPreviews = []; this.hallImgFiles = []; this.showHallForm.set(true); }
  openHallEdit(h: any) { this.editHallId.set(h._id); this.hf = { ...h, amenities:[...h.amenities||[]] }; this.hallErr.set(''); this.hallImgPreviews = []; this.hallImgFiles = []; this.showHallForm.set(true); }
  toggleAmenity(a: string) {
    const idx = this.hf.amenities.indexOf(a);
    if (idx>-1) this.hf.amenities = this.hf.amenities.filter((x:string)=>x!==a);
    else         this.hf.amenities = [...this.hf.amenities, a];
  }
  saveHall() {
    if (!this.hf.name.trim()) { this.hallErr.set('Hall name required'); return; }
    if (!this.hf.pricePerDay) { this.hallErr.set('Price per day required'); return; }
    this.saving.set(true);
    const eid = this.editHallId();
    const req = eid ? this.hallSvc.updateHall(eid, this.hf) : this.hallSvc.createHall(this.hf);
    req.subscribe({
      next: (r: any) => {
        const hallId = r.data.hall._id;
        if (this.hallImgFiles.length) {
          this.hallImgUploading.set(true);
          this.hallSvc.uploadHallImages(hallId, this.hallImgFiles).subscribe({
            next: () => { this.hallImgUploading.set(false); this.hallImgPreviews = []; this.hallImgFiles = []; this.loadHalls(); },
            error: () => { this.hallImgUploading.set(false); this.loadHalls(); },
          });
        } else { this.loadHalls(); }
        this.saving.set(false); this.showHallForm.set(false); this.loadDash();
      },
      error: () => this.saving.set(false),
    });
  }

  openBookingEdit(b: any) {
    this.editBookingId.set(b._id);
    this.bf = {
      hallId: b.hallId?._id || b.hallId,
      eventName: b.eventName, eventType: b.eventType,
      organizer: b.organizer, phone: b.phone, email: b.email||'',
      attendees: b.attendees, billingMode: b.billingMode||'per_day',
      startDate: new Date(b.startDate).toISOString().split('T')[0],
      endDate:   new Date(b.endDate).toISOString().split('T')[0],
      startTime: b.startTime||'09:00', endTime: b.endTime||'18:00',
      days: b.days, hours: b.hours||8,
      pricePerDay: b.pricePerDay, pricePerHour: b.pricePerHour||0,
      taxRate: b.taxRate||5, discountAmount: b.discountAmount||0,
      extraCharges: [...(b.extraCharges||[])],
      subtotal: b.subtotal, taxAmount: b.taxAmount, totalAmount: b.totalAmount,
      paymentMethod: b.paymentMethod||'cash', paidAmount: b.paidAmount||0,
      notes: b.notes||'',
    };
    this.bookingErr.set(''); this.showBookingForm.set(true);
  }

  // ── Hall image upload ──
  imgUrl(path: string): string { return path?.startsWith('http') ? path : 'http://localhost:5000' + path; }
  openImgLightbox(img: string) { this.lightboxImg.set(this.imgUrl(img)); }

  onHallImgSelect(e: Event) {
    const files = Array.from((e.target as HTMLInputElement).files || []);
    this.addHallImgs(files);
  }
  onHallImgDrop(e: DragEvent) {
    e.preventDefault(); this.hallDragOver = false;
    this.addHallImgs(Array.from(e.dataTransfer?.files || []));
  }
  addHallImgs(files: File[]) {
    files.forEach(f => {
      this.hallImgFiles.push(f);
      const r = new FileReader();
      r.onload = (ev) => this.hallImgPreviews = [...this.hallImgPreviews, { preview: ev.target?.result, file: f }];
      r.readAsDataURL(f);
    });
  }
  removeHallImg(i: number) {
    this.hallImgPreviews = this.hallImgPreviews.filter((_: any, idx: number) => idx !== i);
    this.hallImgFiles    = this.hallImgFiles.filter((_: any, idx: number) => idx !== i);
  }
  confirmDeleteHall(h: any) {
    this.showConfirm({ icon:'🗑', title:'Remove Hall?', message:`Remove "${h.name}"?`, label:'Remove', action:()=>this.hallSvc.deleteHall(h._id).subscribe(()=>{ this.loadHalls(); this.loadDash(); }) });
  }

  // ── Booking form ──
  blankBooking() {
    return { hallId:'', eventName:'', eventType:'conference', organizer:'', phone:'', email:'', attendees:1, billingMode:'per_day', startDate:'', endDate:'', startTime:'09:00', endTime:'18:00', days:1, hours:9, pricePerDay:0, pricePerHour:0, taxRate:5, discountAmount:0, extraCharges:[], subtotal:0, taxAmount:0, totalAmount:0, paymentMethod:'cash', paidAmount:0, notes:'' };
  }
  openBookingForm() { this.editBookingId.set(null); this.bf = this.blankBooking(); this.bookingErr.set(''); this.showBookingForm.set(true); }
  openBookingFormForHall(h: any) { this.openBookingForm(); this.bf.hallId = h._id; this.bf.pricePerDay = h.pricePerDay; this.bf.pricePerHour = h.pricePerHour||0; this.showBookingForm.set(true); }
  openView(b: any) { this.viewTarget.set(b); this.showView.set(true); }

  onHallSelect() {
    const h = this.halls().find((x:any)=>x._id===this.bf.hallId);
    if (h) { this.bf.pricePerDay = h.pricePerDay; this.bf.pricePerHour = h.pricePerHour||0; this.calcBookingTotal(); }
  }

  calcDays() {
    if (this.bf.startDate && this.bf.endDate) {
      const diff = new Date(this.bf.endDate).getTime() - new Date(this.bf.startDate).getTime();
      this.bf.days = Math.max(1, Math.ceil(diff / 86400000) + 1);
    }
    this.calcBookingTotal();
  }

  calcHours() {
    if (this.bf.startTime && this.bf.endTime) {
      const [sh,sm] = this.bf.startTime.split(':').map(Number);
      const [eh,em] = this.bf.endTime.split(':').map(Number);
      this.bf.hours = Math.max(1, (eh*60+em - sh*60-sm) / 60);
    }
    this.calcBookingTotal();
  }

  calcBookingTotal() {
    const base      = this.bf.billingMode === 'per_hour' ? this.bf.pricePerHour * this.bf.hours : this.bf.pricePerDay * this.bf.days;
    const extras    = (this.bf.extraCharges||[]).reduce((s:number,e:any)=>s+(e.amount||0),0);
    const subtotal  = base + extras;
    const taxAmount = +(subtotal * (this.bf.taxRate||0) / 100).toFixed(2);
    const total     = +(subtotal + taxAmount - (this.bf.discountAmount||0)).toFixed(2);
    this.bf.subtotal = +subtotal.toFixed(2); this.bf.taxAmount = taxAmount; this.bf.totalAmount = total;
  }

  addExtra()         { this.bf.extraCharges = [...this.bf.extraCharges, { description:'', amount:0 }]; }
  removeExtra(i: number) { this.bf.extraCharges = this.bf.extraCharges.filter((_:any,idx:number)=>idx!==i); this.calcBookingTotal(); }

  saveBooking() {
    if (!this.bf.hallId)        { this.bookingErr.set('Please select a hall'); return; }
    if (!this.bf.eventName.trim()){ this.bookingErr.set('Event name required'); return; }
    if (!this.bf.startDate)     { this.bookingErr.set('Start date required'); return; }
    if (!this.bf.endDate)       { this.bookingErr.set('End date required'); return; }
    this.calcBookingTotal();
    this.saving.set(true); this.bookingErr.set('');
    const eid = this.editBookingId();
    const req = eid ? this.hallSvc.updateBooking(eid, this.bf) : this.hallSvc.createBooking(this.bf);
    req.subscribe({
      next: () => { this.saving.set(false); this.showBookingForm.set(false); this.loadBookings(); this.loadDash(); },
      error: (e: any) => { this.saving.set(false); this.bookingErr.set(e.error?.message||'Failed to create booking'); },
    });
  }

  confirmBooking(id: string) { this.hallSvc.updateBooking(id,{status:'confirmed'}).subscribe(()=>{this.loadBookings();this.loadDash();}); }
  startUse(id: string) { this.hallSvc.updateBooking(id,{status:'in_use'}).subscribe(()=>{this.loadBookings();this.loadDash();}); }
  complete(id: string) { this.hallSvc.updateBooking(id,{status:'completed'}).subscribe(()=>{this.loadBookings();this.loadDash();}); }

  // ── Confirmation dialogs ──
  openCompleteConfirm(b: any) {
    this.completeTarget.set(b);
    this.completePayMethod = b.paymentStatus === 'paid' ? 'paid' : 'pending';
    this.completePaymentMethod = b.paymentMethod || 'cash';
    this.showCompleteConfirm.set(true);
  }

  submitComplete() {
    const b = this.completeTarget();
    if (!b) return;
    const update: any = { status: 'completed' };
    if (this.completePayMethod === 'paid') {
      update.paymentStatus  = 'paid';
      update.paymentMethod  = this.completePaymentMethod;
      update.paidAmount     = b.totalAmount;
    }
    this.hallSvc.updateBooking(b._id, update).subscribe(() => {
      this.showCompleteConfirm.set(false);
      this.loadBookings(); this.loadDash();
    });
  }

  openConfirmBookingDlg(b: any) { this.confirmBookingTarget.set(b); this.showConfirmBookingDlg.set(true); }
  doConfirmBooking() {
    const b = this.confirmBookingTarget();
    if (!b) return;
    this.hallSvc.updateBooking(b._id, { status:'confirmed' }).subscribe(() => {
      this.showConfirmBookingDlg.set(false);
      this.loadBookings(); this.loadDash();
    });
  }

  openMarkPaidDlg(b: any) { this.markPaidTarget.set(b); this.markPaidMethod = b.paymentMethod||'cash'; this.showMarkPaidDlg.set(true); }
  doMarkPaid() {
    const b = this.markPaidTarget();
    if (!b) return;
    this.hallSvc.updateBooking(b._id, {
      paymentStatus: 'paid',
      paymentMethod: this.markPaidMethod,
      paidAmount:    b.totalAmount,
    }).subscribe(() => {
      this.showMarkPaidDlg.set(false);
      this.loadBookings(); this.loadDash();
    });
  }
  cancelBooking(id: string) { this.showConfirm({ icon:'❌', title:'Cancel Booking?', message:'This will free up the hall.', label:'Cancel Booking', action:()=>this.hallSvc.cancelBooking(id,{}).subscribe(()=>{this.loadBookings();this.loadDash();}) }); }

  doPrintContract(b: any) {
    const hotel = JSON.parse(localStorage.getItem('hotelProfile')||'{}');
    const iUrl  = (p:string) => p?(p.startsWith('http')?p:'http://localhost:5000'+p):'';
    let html = `<html><head><title>Hall Booking - ${b.bookingRef}</title>
    <style>*{margin:0;padding:0;box-sizing:border-box;}body{font-family:Arial,sans-serif;font-size:13px;padding:30px;max-width:700px;margin:auto;}
    h2{color:#6d2a75;}.row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #eee;font-size:12.5px;}
    .total{font-size:18px;font-weight:900;color:#6d2a75;} .label{color:#888;font-size:12px;}
    @media print{button{display:none!important;}}</style></head><body>
    <div style="display:flex;justify-content:space-between;margin-bottom:24px">
      <div>${hotel.logoUrl?`<img src="${iUrl(hotel.logoUrl)}" style="height:50px"><br>`:''}
        <strong>${hotel.name||'Hotel'}</strong><br><span style="font-size:11px;color:#888">${hotel.contactPhone||''}</span>
      </div>
      <div style="text-align:right"><h2>HALL BOOKING</h2><strong>${b.bookingRef}</strong><br>
        <span style="font-size:11px;color:#888">${new Date(b.createdAt).toLocaleDateString()}</span>
      </div>
    </div>
    <div style="background:#f3e8ff;border-radius:8px;padding:12px;margin-bottom:16px">
      <strong style="font-size:16px">${b.eventName}</strong><br>
      <span style="color:#6d28d9">${b.eventType}</span>
    </div>
    <div class="row"><span class="label">Hall</span><strong>${b.hallId?.name}</strong></div>
    <div class="row"><span class="label">Organizer</span><strong>${b.organizer}</strong></div>
    <div class="row"><span class="label">Phone</span><span>${b.phone||'—'}</span></div>
    <div class="row"><span class="label">Attendees</span><span>${b.attendees} persons</span></div>
    <div class="row"><span class="label">Start Date</span><strong>${new Date(b.startDate).toLocaleDateString()}</strong></div>
    <div class="row"><span class="label">End Date</span><strong>${new Date(b.endDate).toLocaleDateString()}</strong></div>
    <div class="row"><span class="label">Time</span><span>${b.startTime||''} – ${b.endTime||''}</span></div>
    <div class="row"><span class="label">Duration</span><span>${b.days} day(s)</span></div>
    <div style="margin-top:16px">
      <div class="row"><span class="label">Subtotal</span><span>$${b.subtotal?.toFixed(2)}</span></div>
      <div class="row"><span class="label">Tax</span><span>$${b.taxAmount?.toFixed(2)}</span></div>
      ${b.discountAmount>0?`<div class="row"><span class="label">Discount</span><span style="color:orange">-$${b.discountAmount?.toFixed(2)}</span></div>`:''}
      <div class="row total"><span>TOTAL</span><span>$${b.totalAmount?.toFixed(2)}</span></div>
    </div>
    ${b.notes?`<div style="margin-top:16px;padding:10px;background:#f9fafb;border-radius:8px;font-size:12px;color:#666"><strong>Notes:</strong> ${b.notes}</div>`:''}
    <div style="display:flex;justify-content:space-between;margin-top:40px">
      ${hotel.signatureUrl?`<div><div style="font-size:10px;color:#aaa;margin-bottom:4px">Hotel Signature</div><img src="${iUrl(hotel.signatureUrl)}" style="max-height:40px"></div>`:'<div></div>'}
      ${hotel.stampUrl?`<div style="text-align:right"><div style="font-size:10px;color:#aaa;margin-bottom:4px">Official Stamp</div><img src="${iUrl(hotel.stampUrl)}" style="max-height:50px;max-width:50px"></div>`:''}
    </div>
    <button onclick="window.print()" style="margin-top:20px;padding:10px 24px;background:#6d2a75;color:#fff;border:none;border-radius:8px;cursor:pointer">🖨 Print</button>
    </body></html>`;
    const w = window.open('','_blank','width=750,height=950');
    if (!w) return;
    w.document.write(html); w.document.close(); setTimeout(()=>{ if(w) w.print(); },400);
  }

  // ── Calendar ──
  calMonthLabel(): string {
    return new Date(this.calYear(), this.calMonth()).toLocaleString('en', { month: 'long', year: 'numeric' });
  }
  calPrevMonth() { if (this.calMonth() === 0) { this.calMonth.set(11); this.calYear.update(y=>y-1); } else this.calMonth.update(m=>m-1); this.loadCalendar(); }
  calNextMonth() { if (this.calMonth() === 11) { this.calMonth.set(0); this.calYear.update(y=>y+1); } else this.calMonth.update(m=>m+1); this.loadCalendar(); }

  loadCalendar() {
    const from = new Date(this.calYear(), this.calMonth(), 1).toISOString().split('T')[0];
    const to   = new Date(this.calYear(), this.calMonth() + 1, 0).toISOString().split('T')[0];
    const f: any = { from, to };
    if (this.calHallFilter()) f.hallId = this.calHallFilter();
    this.hallSvc.getBookings(f).subscribe({
      next: (r: any) => this.calBookings.set(r.data.bookings || []),
    });
  }

  readonly calCells = computed(() => {
    const year = this.calYear(); const month = this.calMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date(); today.setHours(0,0,0,0);
    const cells: any[] = [];
    for (let i = 0; i < firstDay; i++) cells.push({ day: null, bookings: [] });
    for (let d = 1; d <= daysInMonth; d++) {
      const cellDate = new Date(year, month, d);
      const bookings = this.calBookings().filter((b: any) => {
        const parseUTC = (d: string) => { const [y,mo,dy] = d.split('T')[0].split('-').map(Number); return new Date(Date.UTC(y,mo-1,dy)); };
        const start = parseUTC(b.startDate);
        const end   = parseUTC(b.endDate);
        const cellUTC = new Date(Date.UTC(cellDate.getFullYear(), cellDate.getMonth(), cellDate.getDate()));
        return cellUTC >= start && cellUTC <= end && b.status !== 'cancelled';
      });
      const todayUTC = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
      const cellUTC2 = new Date(Date.UTC(year, month, d));
      cells.push({ day: d, date: cellDate, isToday: cellUTC2.getTime() === todayUTC.getTime(), bookings });
    }
    return cells;
  });

  setCalHallFilter(id: string) { this.calHallFilter.set(this.calHallFilter()===id?'':id); this.loadCalendar(); }
  openDayDetail(cell: any) { this.selectedDay.set(cell); this.showDayDetail.set(true); }
  statusColor(s: string): string { const m: Record<string,string>={reserved:'#3b82f6',confirmed:'#8b5cf6',in_use:'#22c55e',completed:'#94a3b8',cancelled:'#ef4444'}; return m[s]||'#94a3b8'; }
  statusColorSoft(s: string): string { const m: Record<string,string>={reserved:'#dbeafe',confirmed:'#ede9fe',in_use:'#dcfce7',completed:'#f1f5f9',cancelled:'#fee2e2'}; return m[s]||'#f1f5f9'; }

  hallIcon(t: string) { return HALL_ICONS[t]||'🏢'; }
  eventIcon(t: string) { return EVENT_ICONS[t]||'🎉'; }
  statusBadge(s: string) { const m:Record<string,string>={reserved:'b-blue',confirmed:'b-purple',in_use:'b-green',completed:'b-gray',cancelled:'b-red'}; return m[s]||'b-gray'; }
  payBadge(s: string) { const m:Record<string,string>={pending:'b-yellow',partial:'b-blue',paid:'b-green',refunded:'b-gray'}; return m[s]||'b-gray'; }

  showConfirm(opts: any) { this.confirmDlg.set({ show:true, icon:opts.icon||'⚠️', title:opts.title, message:opts.message, label:opts.label||'Confirm', action:opts.action }); }
  dismissConfirm() { this.confirmDlg.update(d => ({ ...d, show: false })); }
  acceptConfirm() { const fn = this.confirmDlg().action; this.dismissConfirm(); fn(); }
  bgClick(e: Event, t: string) {
    if (!(e.target as HTMLElement).classList.contains('overlay')) return;
    const m:Record<string,any>={hall:this.showHallForm, booking:this.showBookingForm, view:this.showView, day:this.showDayDetail, completeConfirm:this.showCompleteConfirm, confirmDlg:this.showConfirmBookingDlg, markPaid:this.showMarkPaidDlg};
    m[t]?.set(false);
  }
}
