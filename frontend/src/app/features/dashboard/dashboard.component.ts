import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DashboardService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
<div class="page-content">
  <!-- Hero Banner -->
  <div class="hero">
    <div style="display:flex;align-items:flex-start;justify-content:space-between;position:relative;z-index:1">
      <div>
        <div class="hero-label">Good Morning, {{ user()?.name }}</div>
        <div class="hero-title">Welcome back 👋</div>
        <div class="hero-sub">{{ today | date:'fullDate' }} · {{ hotelName() }}</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:11px;opacity:.6;margin-bottom:4px">Today's Revenue</div>
        <div style="font-family:'Syne',sans-serif;font-size:34px;font-weight:800;line-height:1">
          {{ data()?.todayRevenue | currency:'USD':'symbol':'1.0-0' }}
        </div>
        <div style="font-size:11px;opacity:.7;margin-top:4px">↑ Live data</div>
      </div>
    </div>
  </div>

  <!-- Metrics -->
  <div class="metrics">
    <div class="mc" [routerLink]="'/rooms'">
      <div class="mc-glow" style="background:#8b5cf6"></div>
      <div class="mc-lbl">Total Rooms</div>
      <div class="mc-val">{{ data()?.rooms?.total || 0 }}</div>
      <div class="mc-sub">{{ data()?.rooms?.available || 0 }} available now</div>
    </div>
    <div class="mc" [routerLink]="'/bookings'">
      <div class="mc-glow" style="background:#ec4899"></div>
      <div class="mc-lbl">Occupancy Rate</div>
      <div class="mc-val">{{ data()?.occupancyRate || 0 }}%</div>
      <div class="prog" style="margin-top:8px">
        <div class="prog-fill" [style.width.%]="data()?.occupancyRate || 0"></div>
      </div>
    </div>
    <div class="mc" [routerLink]="'/bookings'">
      <div class="mc-glow" style="background:#10b981"></div>
      <div class="mc-lbl">Active Bookings</div>
      <div class="mc-val">{{ data()?.activeBookings || 0 }}</div>
      <div class="mc-sub">checked in now</div>
    </div>
    <div class="mc card-hover">
      <div class="mc-ico">👥</div>
      <div class="mc-lbl">In-House Guests</div>
      <div class="mc-val" style="color:var(--success)">{{ data()?.stayingGuests || 0 }}</div>
      <div class="mc-sub">currently staying</div>
    </div>
    <div class="mc card-hover">
      <div class="mc-ico">📋</div>
      <div class="mc-lbl">Total Guests</div>
      <div class="mc-val">{{ data()?.totalGuests || 0 }}</div>
      <div class="mc-sub">{{ data()?.todayCheckIns || 0 }} checked in today</div>
    </div>
    <div class="mc" [routerLink]="'/finance'">
      <div class="mc-glow" style="background:#f59e0b"></div>
      <div class="mc-lbl">Monthly Revenue</div>
      <div class="mc-val">{{ data()?.monthRevenue | currency:'USD':'symbol':'1.0-0' }}</div>
      <div class="mc-sub">This month</div>
    </div>
  </div>

  <div class="g65">
    <!-- Recent Bookings -->
    <div class="card">
      <div class="sec-head mb16">
        <div class="sec-title" style="margin:0">Recent Bookings</div>
        <a class="btn btn-o btn-sm" [routerLink]="'/bookings'">View All →</a>
      </div>
      <table class="tbl-hover">
        <thead><tr><th>Guest</th><th>Room</th><th>Dates</th><th>Status</th><th>Amount</th></tr></thead>
        <tbody>
          <tr *ngFor="let b of data()?.recentBookings">
            <td>
              <div style="font-weight:600">{{ b.guestId?.firstName }} {{ b.guestId?.lastName }}</div>
            </td>
            <td><span class="tag">{{ b.roomId?.roomNumber }}</span></td>
            <td style="font-size:11px">{{ b.checkIn | date:'MMM d' }} – {{ b.checkOut | date:'MMM d' }}</td>
            <td><span class="badge" [ngClass]="statusBadge(b.status)">{{ b.status | titlecase }}</span></td>
            <td style="font-weight:700;color:var(--purple)">{{ b.totalAmount | currency }}</td>
          </tr>
          <tr *ngIf="!data()?.recentBookings?.length">
            <td colspan="5" style="text-align:center;color:var(--muted);padding:20px">
              No bookings found. <a [routerLink]="'/bookings'" style="color:var(--purple)">Create one →</a>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Side panels -->
    <div style="display:flex;flex-direction:column;gap:14px">
      <div class="card card-sm">
        <div class="sec-title">Today's Activity</div>
        <div class="stat-row">
          <div class="stat-item"><span>🏨 Check-ins</span><span class="stat-val" style="color:var(--success)">{{ data()?.todayCheckIns || 0 }}</span></div>
          <div class="stat-item"><span>🚪 Check-outs</span><span class="stat-val" style="color:var(--danger)">{{ data()?.todayCheckOuts || 0 }}</span></div>
          <div class="stat-item"><span>🍽 POS Orders</span><span class="stat-val" style="color:var(--purple)">{{ data()?.todayOrders || 0 }}</span></div>
          <div class="stat-item"><span>🔧 Maintenance</span><span class="stat-val" style="color:var(--warn)">{{ data()?.openMaintenance || 0 }}</span></div>
        </div>
      </div>
      <div class="card card-sm">
        <div class="sec-title">Room Status</div>
        <div class="stat-row">
          <div class="stat-item"><span>✅ Available</span><span class="stat-val" style="color:var(--success)">{{ data()?.rooms?.available || 0 }}</span></div>
          <div class="stat-item"><span>🔴 Occupied</span><span class="stat-val" style="color:var(--danger)">{{ data()?.rooms?.occupied || 0 }}</span></div>
          <div class="stat-item"><span>🔵 Reserved</span><span class="stat-val" style="color:var(--info)">{{ data()?.rooms?.reserved || 0 }}</span></div>
          <div class="stat-item"><span>🟡 Maintenance</span><span class="stat-val" style="color:var(--warn)">{{ data()?.rooms?.maintenance || 0 }}</span></div>
        </div>
      </div>
    </div>
  </div>
</div>
  `,
})
export class DashboardComponent implements OnInit {
  data    = signal<any>(null);
  loading = signal(true);
  today   = new Date();

  readonly user      = this.auth.user;
  readonly hotelName = () => {
    const u = this.user();
    if (!u) return '';
    return typeof u.hotelId === 'object' ? u.hotelId?.name : 'Grand Palace Hotel';
  };

  constructor(
    private dashSvc: DashboardService,
    private auth: AuthService,
  ) {}

  ngOnInit() {
    this.dashSvc.get().subscribe({
      next: (res) => { this.data.set(res.data); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  statusBadge(status: string): string {
    const map: Record<string, string> = {
      checked_in:  'b-green',
      reserved:    'b-blue',
      pending:     'b-yellow',
      checked_out: 'b-gray',
      cancelled:   'b-red',
    };
    return map[status] || 'b-gray';
  }
}
