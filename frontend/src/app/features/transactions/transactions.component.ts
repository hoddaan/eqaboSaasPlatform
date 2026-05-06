import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FinanceService } from '../../core/services/api.service';

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
<div class="page-content">
  <div class="sec-head mb20">
    <div><div style="font-family:'Syne',sans-serif;font-size:18px;font-weight:800">Transactions &amp; Audit Log</div>
    <div style="font-size:12px;color:var(--muted);margin-top:2px">Immutable payment records</div></div>
    <div style="display:flex;gap:8px">
      <select class="tb-sel" [(ngModel)]="filterType" (change)="load()">
        <option value="">All Types</option>
        <option value="payment">Payment</option><option value="refund">Refund</option>
        <option value="room_charge">Room Charge</option><option value="adjustment">Adjustment</option>
      </select>
      <button class="btn btn-o btn-sm" (click)="export()">⬇ Export CSV</button>
    </div>
  </div>
  <div class="g4 mb20">
    <div class="mc"><div class="mc-lbl">Total Transactions</div><div class="mc-val">{{ txns().length }}</div></div>
    <div class="mc"><div class="mc-lbl">Total Received</div><div class="mc-val" style="color:var(--success)">{{ totalIn() | currency:'USD':'symbol':'1.0-0' }}</div></div>
    <div class="mc"><div class="mc-lbl">Total Refunded</div><div class="mc-val" style="color:var(--danger)">{{ totalOut() | currency:'USD':'symbol':'1.0-0' }}</div></div>
    <div class="mc"><div class="mc-lbl">Net</div><div class="mc-val" style="color:var(--purple)">{{ (totalIn()-totalOut()) | currency:'USD':'symbol':'1.0-0' }}</div></div>
  </div>
  <div class="card">
    <div *ngIf="loading()" style="text-align:center;padding:20px;color:var(--muted)">Loading...</div>
    <table class="tbl-hover" *ngIf="!loading()">
      <thead><tr><th>Date</th><th>Guest</th><th>Type</th><th>Method</th><th>Reference</th><th>Amount</th><th>Staff</th></tr></thead>
      <tbody>
        <tr *ngFor="let t of txns()">
          <td style="font-size:11px;color:var(--muted)">{{ t.createdAt | date:'MMM d, y HH:mm' }}</td>
          <td style="font-weight:500">{{ t.guestId ? (t.guestId.firstName + ' ' + t.guestId.lastName) : '—' }}</td>
          <td><span class="tag">{{ t.type | titlecase }}</span></td>
          <td style="font-size:12px">{{ t.paymentMethod | titlecase }}</td>
          <td style="font-family:monospace;font-size:11px;color:var(--muted)">{{ t.reference || '—' }}</td>
          <td style="font-weight:700" [style.color]="t.amount<0?'var(--danger)':'var(--success)'">{{ t.amount | currency }}</td>
          <td style="font-size:11px;color:var(--muted)">{{ t.processedByUserId?.name || '—' }}</td>
        </tr>
        <tr *ngIf="!txns().length"><td colspan="7" style="text-align:center;padding:20px;color:var(--muted)">No transactions found</td></tr>
      </tbody>
    </table>
  </div>
</div>`,
})
export class TransactionsComponent implements OnInit {
  txns=signal<any[]>([]);loading=signal(true);filterType='';
  constructor(private svc:FinanceService){}
  ngOnInit(){this.load();}
  load(){this.loading.set(true);const f:any={};if(this.filterType)f.type=this.filterType;
    this.svc.getTransactions(f).subscribe({next:r=>{this.txns.set(r.data.transactions);this.loading.set(false);},error:()=>this.loading.set(false)});}
  totalIn(){return this.txns().filter(t=>t.amount>0).reduce((s,t)=>s+t.amount,0);}
  totalOut(){return Math.abs(this.txns().filter(t=>t.amount<0).reduce((s,t)=>s+t.amount,0));}
  export(){alert('CSV export — connect to a download service in production');}
}
