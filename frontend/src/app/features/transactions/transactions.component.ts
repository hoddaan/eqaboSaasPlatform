import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FinanceService } from '../../core/services/api.service';

const TYPE_ICONS: Record<string,string>   = { payment:'💵', refund:'↩️', room_charge:'🛏', adjustment:'🔧' };
const TYPE_COLORS: Record<string,string>  = { payment:'b-green', refund:'b-red', room_charge:'b-purple', adjustment:'b-yellow' };
const METHOD_ICONS: Record<string,string> = { cash:'💵', visa:'💳', mastercard:'💳', amex:'💳', mobile_pay:'📱', room_charge:'🛏', bank_transfer:'🏦' };

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `<div class="page-content">

  <div class="sec-head mb20">
    <div>
      <div style="font-size:18px;font-weight:800;letter-spacing:-.4px">💳 Transactions</div>
      <div style="font-size:12.5px;color:var(--muted);margin-top:3px">Immutable payment records — Hotel · Restaurant · Hall Rentals</div>
    </div>
    <div style="display:flex;gap:8px">
      <button class="btn btn-o btn-sm" (click)="openAddForm()">+ Manual Entry</button>
      <button class="btn btn-o btn-sm" (click)="exportCSV()">⬇ Export CSV</button>
    </div>
  </div>

  <!-- KPI cards -->
  <div class="g4 mb20">
    <div class="mc">
      <div class="mc-ico">💳</div><div class="mc-lbl">Total Records</div>
      <div class="mc-val">{{ txns().length }}</div>
    </div>
    <div class="mc">
      <div class="mc-ico">💵</div><div class="mc-lbl">Total In</div>
      <div class="mc-val" style="color:var(--success)">\${{ totalIn() | number:'1.0-0' }}</div>
    </div>
    <div class="mc">
      <div class="mc-ico">↩️</div><div class="mc-lbl">Refunded</div>
      <div class="mc-val" style="color:var(--danger)">\${{ totalOut() | number:'1.0-0' }}</div>
    </div>
    <div class="mc">
      <div class="mc-ico">📊</div><div class="mc-lbl">Net</div>
      <div class="mc-val" style="color:var(--purple)">\${{ (totalIn()-totalOut()) | number:'1.0-0' }}</div>
    </div>
  </div>

  <!-- Filters -->
  <div style="background:var(--surface);border-radius:12px;padding:14px 16px;margin-bottom:16px;display:flex;gap:10px;flex-wrap:wrap;border:1px solid var(--border)">
    <input [(ngModel)]="search" (input)="load()" placeholder="🔍 Search ref, notes..." style="width:200px">
    <select class="tb-sel" [(ngModel)]="filterType" (change)="load()">
      <option value="">All Types</option>
      <option value="payment">💵 Payment</option>
      <option value="refund">↩️ Refund</option>
      <option value="room_charge">🛏 Room Charge</option>
      <option value="adjustment">🔧 Adjustment</option>
    </select>
    <select class="tb-sel" [(ngModel)]="filterMethod" (change)="load()">
      <option value="">All Methods</option>
      <option value="cash">💵 Cash</option>
      <option value="visa">💳 Visa</option>
      <option value="mastercard">💳 Mastercard</option>
      <option value="bank_transfer">🏦 Bank Transfer</option>
      <option value="mobile_pay">📱 Mobile Pay</option>
      <option value="room_charge">🛏 Room Charge</option>
    </select>
    <div style="display:flex;align-items:center;gap:5px">
      <input type="date" class="tb-sel" [(ngModel)]="fromDate" (change)="load()" style="width:135px">
      <span style="color:var(--muted);font-size:12px">to</span>
      <input type="date" class="tb-sel" [(ngModel)]="toDate" (change)="load()" style="width:135px">
    </div>
    <div style="display:flex;gap:5px">
      <button class="btn btn-o btn-xs" (click)="setPreset('today')">Today</button>
      <button class="btn btn-o btn-xs" (click)="setPreset('week')">7 Days</button>
      <button class="btn btn-o btn-xs" (click)="setPreset('month')">Month</button>
      <button class="btn btn-o btn-xs" (click)="clearFilters()">Clear</button>
    </div>
    <div style="margin-left:auto;font-size:12.5px;color:var(--muted);font-weight:600;align-self:center">{{ txns().length }} records</div>
  </div>

  <div *ngIf="loading()" style="text-align:center;padding:40px;color:var(--muted)">
    <div style="font-size:24px;margin-bottom:8px">⏳</div>Loading transactions...
  </div>

  <!-- Transaction list -->
  <div *ngIf="!loading()" class="card">
    <table class="tbl-hover">
      <thead>
        <tr>
          <th>Date & Time</th>
          <th>Type</th>
          <th>Source</th>
          <th>Guest / Reference</th>
          <th>Method</th>
          <th>Notes</th>
          <th>Staff</th>
          <th style="text-align:right">Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr *ngFor="let t of txns()">
          <td style="white-space:nowrap">
            <div style="font-size:12.5px;font-weight:600">{{ t.createdAt | date:'MMM d, y' }}</div>
            <div style="font-size:11px;color:var(--muted)">{{ t.createdAt | date:'HH:mm' }}</div>
          </td>
          <td>
            <span class="badge" [ngClass]="typeColor(t.type)" style="font-size:10px">
              {{ typeIcon(t.type) }} {{ t.type | titlecase }}
            </span>
          </td>
          <td style="font-size:11.5px">
            <div *ngIf="t.bookingId" style="color:var(--purple);font-family:monospace">🏨 {{ t.bookingId.bookingRef }}</div>
            <div *ngIf="t.orderId"   style="color:var(--warn);font-family:monospace">🍽 {{ t.orderId.orderNumber }}</div>
            <div *ngIf="t.invoiceId" style="color:var(--info,#3b82f6);font-family:monospace">🧾 {{ t.invoiceId.invoiceNumber }}</div>
            <div *ngIf="!t.bookingId&&!t.orderId&&!t.invoiceId" style="color:var(--muted)">—</div>
          </td>
          <td>
            <div *ngIf="t.guestId" style="font-size:12.5px;font-weight:600">
              👤 {{ t.guestId.firstName }} {{ t.guestId.lastName }}
            </div>
            <div style="font-size:11px;color:var(--muted);font-family:monospace">{{ t.reference || '—' }}</div>
          </td>
          <td style="font-size:12px">
            {{ methodIcon(t.paymentMethod) }} {{ t.paymentMethod | titlecase }}
          </td>
          <td style="font-size:11.5px;color:var(--muted);max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
            {{ t.notes || '—' }}
          </td>
          <td style="font-size:11.5px;color:var(--muted)">{{ t.processedByUserId?.name || '—' }}</td>
          <td style="text-align:right">
            <span style="font-size:14px;font-weight:800" [style.color]="t.amount>=0?'var(--success)':'var(--danger)'">
              {{ t.amount>=0?'+':'' }}\${{ (t.amount | number:'1.2-2') }}
            </span>
          </td>
        </tr>
        <tr *ngIf="!txns().length">
          <td colspan="8" style="text-align:center;padding:50px;color:var(--muted)">
            <div style="font-size:40px;margin-bottom:10px">💳</div>
            <div style="font-weight:700;font-size:15px;margin-bottom:6px">No transactions yet</div>
            <div style="font-size:12.5px;margin-bottom:12px">Transactions are created automatically when:<br>
              guests check out · restaurant orders are paid · manual entries added</div>
            <button class="btn btn-g btn-sm" (click)="openAddForm()">+ Add Manual Transaction</button>
          </td>
        </tr>
      </tbody>
      <tfoot *ngIf="txns().length">
        <tr style="background:var(--bg);font-weight:700">
          <td colspan="7" style="text-align:right;padding:10px 14px;font-size:13px">Total</td>
          <td style="text-align:right;padding:10px 14px;font-size:15px;font-weight:900"
            [style.color]="(totalIn()-totalOut())>=0?'var(--success)':'var(--danger)'">
            \${{ (totalIn()-totalOut()) | number:'1.2-2' }}
          </td>
        </tr>
      </tfoot>
    </table>
  </div>

  <!-- ══ ADD MANUAL TRANSACTION ══ -->
  <div class="overlay" [class.show]="showForm()" (click)="bgClose($event)">
    <div class="modal" style="width:480px">
      <div class="modal-head">
        <div class="modal-title">+ Manual Transaction Entry</div>
        <button class="modal-close" (click)="showForm.set(false)">x</button>
      </div>
      <div style="background:#fef9c3;border-radius:10px;padding:10px 14px;font-size:12px;color:#854d0e;margin-bottom:14px">
        ⚠️ Manual entries are for corrections and adjustments only. Normal payments are auto-recorded.
      </div>
      <div class="form-row">
        <div class="fg"><label>Type *</label>
          <select [(ngModel)]="nf.type">
            <option value="payment">💵 Payment</option>
            <option value="refund">↩️ Refund</option>
            <option value="adjustment">🔧 Adjustment</option>
            <option value="room_charge">🛏 Room Charge</option>
          </select>
        </div>
        <div class="fg"><label>Amount (\$) *</label>
          <input type="number" [(ngModel)]="nf.amount" min="0" step="0.01" placeholder="0.00">
          <div style="font-size:10.5px;color:var(--muted);margin-top:3px">Enter positive — refunds will be stored as negative automatically</div>
        </div>
      </div>
      <div class="fg"><label>Payment Method *</label>
        <select [(ngModel)]="nf.paymentMethod">
          <option value="cash">💵 Cash</option>
          <option value="visa">💳 Visa</option>
          <option value="mastercard">💳 Mastercard</option>
          <option value="bank_transfer">🏦 Bank Transfer</option>
          <option value="mobile_pay">📱 Mobile Pay</option>
          <option value="room_charge">🛏 Room Charge</option>
        </select>
      </div>
      <div class="fg"><label>Reference / Receipt #</label>
        <input [(ngModel)]="nf.reference" placeholder="e.g. RCPT-001">
      </div>
      <div class="fg"><label>Notes *</label>
        <textarea rows="2" [(ngModel)]="nf.notes" placeholder="Reason for this manual entry..."></textarea>
      </div>
      <div *ngIf="formErr()" style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:10px;font-size:12.5px;color:#b91c1c;margin-bottom:10px">{{ formErr() }}</div>
      <div style="display:flex;gap:10px">
        <button class="btn btn-o" style="flex:1" (click)="showForm.set(false)">Cancel</button>
        <button class="btn btn-g" style="flex:2" (click)="save()" [disabled]="saving()">{{ saving()?'Saving...':'Save Transaction' }}</button>
      </div>
    </div>
  </div>

</div>`,
})
export class TransactionsComponent implements OnInit {
  txns      = signal<any[]>([]);
  loading   = signal(true);
  saving    = signal(false);
  showForm  = signal(false);
  formErr   = signal('');

  search = ''; filterType = ''; filterMethod = ''; fromDate = ''; toDate = '';

  nf = { type:'payment', amount:0, paymentMethod:'cash', reference:'', notes:'' };

  readonly totalIn  = computed(() => this.txns().filter(t=>t.amount>0).reduce((s:number,t:any)=>s+t.amount,0));
  readonly totalOut = computed(() => this.txns().filter(t=>t.amount<0).reduce((s:number,t:any)=>s+Math.abs(t.amount),0));

  constructor(private svc: FinanceService) {}
  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    const f: any = {};
    if (this.filterType)   f.type   = this.filterType;
    if (this.filterMethod) f.method = this.filterMethod;
    if (this.fromDate)     f.from   = this.fromDate;
    if (this.toDate)       f.to     = this.toDate;
    if (this.search)       f.search = this.search;
    this.svc.getTransactions(f).subscribe({
      next:(r:any)=>{ this.txns.set(r.data.transactions||[]); this.loading.set(false); },
      error:()=>this.loading.set(false),
    });
  }

  setPreset(p: string) {
    const today = new Date().toISOString().split('T')[0];
    if (p==='today') { this.fromDate=today; this.toDate=today; }
    else if (p==='week') { const d=new Date(); d.setDate(d.getDate()-7); this.fromDate=d.toISOString().split('T')[0]; this.toDate=today; }
    else if (p==='month') { const d=new Date(); d.setDate(1); this.fromDate=d.toISOString().split('T')[0]; this.toDate=today; }
    this.load();
  }
  clearFilters() { this.search=''; this.filterType=''; this.filterMethod=''; this.fromDate=''; this.toDate=''; this.load(); }

  openAddForm() { this.nf={type:'payment',amount:0,paymentMethod:'cash',reference:'',notes:''}; this.formErr.set(''); this.showForm.set(true); }
  save() {
    if (!this.nf.notes.trim()) { this.formErr.set('Notes required for manual entries'); return; }
    if (!this.nf.amount)       { this.formErr.set('Amount required'); return; }
    this.saving.set(true);
    const amount = this.nf.type === 'refund' ? -Math.abs(this.nf.amount) : Math.abs(this.nf.amount);
    this.svc.createTransaction({ ...this.nf, amount }).subscribe({
      next:()=>{ this.saving.set(false); this.showForm.set(false); this.load(); },
      error:(e:any)=>{ this.saving.set(false); this.formErr.set(e.error?.message||'Failed'); },
    });
  }

  exportCSV() {
    const rows = [['Date','Type','Method','Reference','Guest','Source','Notes','Amount']];
    for (const t of this.txns()) {
      rows.push([
        new Date(t.createdAt).toLocaleString(),
        t.type, t.paymentMethod, t.reference||'',
        t.guestId ? t.guestId.firstName+' '+t.guestId.lastName : '',
        t.bookingId?.bookingRef || t.orderId?.orderNumber || t.invoiceId?.invoiceNumber || '',
        (t.notes||'').replace(/,/g,' '),
        t.amount.toFixed(2),
      ]);
    }
    const csv  = rows.map(r=>r.join(',')).join('\n');
    const blob = new Blob([csv], { type:'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }

  typeIcon(t: string)   { return TYPE_ICONS[t]  || '💳'; }
  typeColor(t: string)  { return TYPE_COLORS[t] || 'b-gray'; }
  methodIcon(m: string) { return METHOD_ICONS[m] || '💳'; }
  bgClose(e: Event)     { if ((e.target as HTMLElement).classList.contains('overlay')) this.showForm.set(false); }
}
