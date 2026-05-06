import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FinanceService } from '../../core/services/api.service';

@Component({
  selector: 'app-finance',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
<div class="page-content">
  <div class="hero">
    <div style="position:relative;z-index:1">
      <div class="hero-label">Financial Dashboard</div>
      <div class="hero-title">Revenue &amp; Expenses Overview 💰</div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:16px">
        <div style="background:rgba(255,255,255,.12);border-radius:10px;padding:12px">
          <div style="font-size:10px;opacity:.6;margin-bottom:4px;text-transform:uppercase;letter-spacing:1px">Total Revenue</div>
          <div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800">{{ report()?.income | currency:'USD':'symbol':'1.0-0' }}</div>
          <div style="font-size:10px;opacity:.7;margin-top:2px">{{ period }} period</div>
        </div>
        <div style="background:rgba(255,255,255,.12);border-radius:10px;padding:12px">
          <div style="font-size:10px;opacity:.6;margin-bottom:4px;text-transform:uppercase;letter-spacing:1px">Room Income</div>
          <div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800">{{ report()?.byType?.rooms | currency:'USD':'symbol':'1.0-0' }}</div>
        </div>
        <div style="background:rgba(255,255,255,.12);border-radius:10px;padding:12px">
          <div style="font-size:10px;opacity:.6;margin-bottom:4px;text-transform:uppercase;letter-spacing:1px">Restaurant</div>
          <div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800">{{ report()?.byType?.restaurant | currency:'USD':'symbol':'1.0-0' }}</div>
        </div>
        <div style="background:rgba(255,255,255,.12);border-radius:10px;padding:12px">
          <div style="font-size:10px;opacity:.6;margin-bottom:4px;text-transform:uppercase;letter-spacing:1px">Net (after refunds)</div>
          <div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800">{{ report()?.net | currency:'USD':'symbol':'1.0-0' }}</div>
        </div>
      </div>
    </div>
  </div>

  <div style="display:flex;gap:8px;margin-bottom:20px">
    <button class="btn" [ngClass]="period==='today'?'btn-g':'btn-o'" (click)="setPeriod('today')">Today</button>
    <button class="btn" [ngClass]="period==='week'?'btn-g':'btn-o'" (click)="setPeriod('week')">This Week</button>
    <button class="btn" [ngClass]="period==='month'?'btn-g':'btn-o'" (click)="setPeriod('month')">This Month</button>
    <button class="btn" [ngClass]="period==='year'?'btn-g':'btn-o'" (click)="setPeriod('year')">This Year</button>
  </div>

  <div class="g65">
    <div class="card">
      <div class="sec-title">Daily Revenue</div>
      <div *ngIf="loading()" style="text-align:center;padding:20px;color:var(--muted)">Loading...</div>
      <div *ngIf="!loading() && report()?.dailyRevenue?.length">
        <div class="chart-wrap">
          <div *ngFor="let d of report()?.dailyRevenue" class="bar-g">
            <div class="bar" style="background:var(--g)" [style.height.%]="barHeight(d.total)" [title]="d._id + ': ' + (d.total | currency)"></div>
            <div class="bar-lbl">{{ d._id | slice:-5 }}</div>
          </div>
        </div>
      </div>
      <div *ngIf="!loading() && !report()?.dailyRevenue?.length" style="text-align:center;padding:30px;color:var(--muted)">No revenue data for this period</div>
    </div>
    <div style="display:flex;flex-direction:column;gap:14px">
      <div class="card card-sm">
        <div class="sec-title">Summary</div>
        <div class="stat-row">
          <div class="stat-item"><span>💰 Total Income</span><span class="stat-val" style="color:var(--success)">{{ report()?.income | currency:'USD':'symbol':'1.0-0' }}</span></div>
          <div class="stat-item"><span>↩️ Refunds</span><span class="stat-val" style="color:var(--danger)">{{ report()?.refunds | currency:'USD':'symbol':'1.0-0' }}</span></div>
          <div class="stat-item"><span>✅ Net Revenue</span><span class="stat-val" style="color:var(--purple)">{{ report()?.net | currency:'USD':'symbol':'1.0-0' }}</span></div>
        </div>
      </div>
      <div class="card card-sm" style="text-align:center;padding:20px">
        <div style="font-size:11px;color:var(--muted);margin-bottom:4px">Period</div>
        <div style="font-family:'Syne',sans-serif;font-size:28px;font-weight:800;background:var(--g);-webkit-background-clip:text;-webkit-text-fill-color:transparent">{{ period | titlecase }}</div>
        <button class="btn btn-g btn-sm" style="margin-top:12px;width:100%" (click)="exportReport()">📄 Export Report</button>
      </div>
    </div>
  </div>
</div>`,
})
export class FinanceComponent implements OnInit {
  report=signal<any>(null);loading=signal(true);period='month';
  constructor(private svc:FinanceService){}
  ngOnInit(){this.load();}
  load(){this.loading.set(true);this.svc.getReport(this.period).subscribe({next:r=>{this.report.set(r.data);this.loading.set(false);},error:()=>this.loading.set(false)});}
  setPeriod(p:string){this.period=p;this.load();}
  barHeight(v:number){const max=Math.max(...(this.report()?.dailyRevenue||[]).map((d:any)=>d.total),1);return Math.round((v/max)*90);}
  exportReport(){alert('Finance report exported (connect to PDF generator in production)');}
}
