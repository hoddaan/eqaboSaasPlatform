import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FinanceService } from '../../core/services/api.service';

// Invoices are formal billing documents sent to corporate clients,
// travel agencies, or partners — NOT the same as a guest receipt.
// Example: A travel agency books 10 rooms → you send them Invoice #INV-2026-001
// for $5,400 due in 30 days. They pay by bank transfer → mark Paid.

@Component({
  selector: 'app-invoices',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `<div class="page-content">

  <div class="sec-head mb20">
    <div>
      <div style="font-size:18px;font-weight:800">🧾 Invoices</div>
      <div style="font-size:12px;color:var(--muted);margin-top:3px">
        Formal billing for corporate clients, travel agencies &amp; partners
      </div>
    </div>
    <button class="btn btn-g btn-sm" (click)="openForm()">+ Create Invoice</button>
  </div>

  <!-- What is this? Banner -->
  <div style="background:linear-gradient(135deg,#f3e8ff,#ede9fe);border-radius:12px;padding:14px 18px;margin-bottom:18px;display:flex;gap:14px;align-items:center;border:1px solid #ddd6fe">
    <div style="font-size:28px">📋</div>
    <div>
      <div style="font-weight:700;font-size:13px;color:#4c1d95">What are Invoices?</div>
      <div style="font-size:12px;color:#6d28d9;margin-top:2px">
        Invoices are formal billing documents for <strong>companies, travel agencies, and corporate accounts</strong> —
        not for individual guests. Use them when a client pays in 30/60 days by bank transfer instead of cash at checkout.
        Individual guest receipts are printed from the <strong>Bookings</strong> and <strong>Restaurant</strong> modules.
      </div>
    </div>
  </div>

  <!-- Stats -->
  <div class="g4 mb20">
    <div class="mc">
      <div class="mc-ico">🧾</div><div class="mc-lbl">Total Invoices</div>
      <div class="mc-val">{{ invoices().length }}</div>
    </div>
    <div class="mc">
      <div class="mc-ico">✅</div><div class="mc-lbl">Paid</div>
      <div class="mc-val" style="color:var(--success)">\${{ paidTotal() | number:'1.0-0' }}</div>
    </div>
    <div class="mc">
      <div class="mc-ico">⏳</div><div class="mc-lbl">Outstanding</div>
      <div class="mc-val" style="color:var(--warn)">\${{ outstandingTotal() | number:'1.0-0' }}</div>
    </div>
    <div class="mc">
      <div class="mc-ico">📝</div><div class="mc-lbl">Overdue</div>
      <div class="mc-val" style="color:var(--danger)">{{ overdueCount() }}</div>
    </div>
  </div>

  <!-- Filters -->
  <div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap">
    <select class="tb-sel" [(ngModel)]="filterStatus" (change)="load()">
      <option value="">All Status</option>
      <option value="draft">📝 Draft</option>
      <option value="issued">📤 Issued</option>
      <option value="paid">✅ Paid</option>
      <option value="void">❌ Void</option>
    </select>
    <select class="tb-sel" [(ngModel)]="filterType" (change)="load()">
      <option value="">All Types</option>
      <option value="room_booking">🏨 Room Booking</option>
      <option value="restaurant">🍽 Restaurant</option>
      <option value="combined">📋 Combined</option>
    </select>
  </div>

  <div class="card">
    <div *ngIf="loading()" style="text-align:center;padding:30px;color:var(--muted)">Loading...</div>
    <table class="tbl-hover" *ngIf="!loading()">
      <thead>
        <tr>
          <th>Invoice #</th><th>Bill To</th><th>Type</th><th>Line Items</th>
          <th>Subtotal</th><th>Tax</th><th>Total</th>
          <th>Due Date</th><th>Status</th><th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr *ngFor="let inv of invoices()"
          [style.background]="isOverdue(inv)?'#fff1f2':''">
          <td style="font-family:monospace;font-size:11px;color:var(--purple);font-weight:700">
            {{ inv.invoiceNumber }}
          </td>
          <td style="font-weight:600">
            <div>{{ inv.guestId?.firstName }} {{ inv.guestId?.lastName }}</div>
            <div style="font-size:10.5px;color:var(--muted)">{{ inv.guestId?.company || '' }}</div>
          </td>
          <td>
            <span style="font-size:11px">{{ typeIcon(inv.type) }}</span>
            <span style="font-size:11px;color:var(--muted)"> {{ inv.type | titlecase }}</span>
          </td>
          <td style="font-size:11.5px;max-width:200px">
            <div *ngFor="let li of inv.lineItems" style="color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
              × {{ li.qty }} {{ li.description }}
            </div>
          </td>
          <td style="font-size:12px">\${{ inv.subtotal | number:'1.2-2' }}</td>
          <td style="font-size:12px;color:var(--muted)">\${{ inv.taxAmount | number:'1.2-2' }}</td>
          <td style="font-weight:800;color:var(--purple)">\${{ inv.totalAmount | number:'1.2-2' }}</td>
          <td style="font-size:11.5px" [style.color]="isOverdue(inv)?'var(--danger)':'var(--muted)'">
            {{ inv.dueDate ? (inv.dueDate | date:'MMM d, y') : '—' }}
            <div *ngIf="isOverdue(inv)" style="font-size:9.5px;font-weight:700;color:var(--danger)">OVERDUE</div>
          </td>
          <td>
            <span class="badge" [ngClass]="statusBadge(inv.status)" style="font-size:9.5px">
              {{ statusIcon(inv.status) }} {{ inv.status | titlecase }}
            </span>
          </td>
          <td>
            <div style="display:flex;gap:4px;flex-wrap:wrap">
              <button *ngIf="inv.status==='draft'" class="btn btn-g btn-xs" (click)="issue(inv._id)">📤 Issue</button>
              <button *ngIf="inv.status==='issued'" class="btn btn-success btn-xs" (click)="markPaid(inv._id)">✅ Paid</button>
              <button *ngIf="['draft','issued'].includes(inv.status)" class="btn btn-o btn-xs" (click)="openEdit(inv)">✏</button>
              <button class="btn btn-o btn-xs" (click)="print(inv)">🖨</button>
              <button *ngIf="inv.status!=='paid'" class="btn btn-danger btn-xs" (click)="voidInvoice(inv._id)">Void</button>
            </div>
          </td>
        </tr>
        <tr *ngIf="!invoices().length">
          <td colspan="10" style="text-align:center;padding:40px;color:var(--muted)">
            <div style="font-size:32px;margin-bottom:8px">🧾</div>
            <div style="font-weight:600;margin-bottom:4px">No invoices yet</div>
            <div style="font-size:12px">Create an invoice to bill a corporate client or travel agency</div>
            <button class="btn btn-g btn-sm" style="margin-top:12px" (click)="openForm()">+ Create First Invoice</button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- ══ INVOICE FORM ══ -->
  <div class="overlay" [class.show]="showForm()" (click)="bgClose($event)">
    <div class="modal" style="width:580px;max-height:90vh;overflow-y:auto">
      <div class="modal-head">
        <div class="modal-title">{{ editId() ? 'Edit Invoice' : 'Create Invoice' }}</div>
        <button class="modal-close" (click)="showForm.set(false)">x</button>
      </div>

      <div style="background:#f3e8ff;border-radius:10px;padding:10px 14px;margin-bottom:14px;font-size:12px;color:#6d28d9">
        💡 Invoices are for billing <strong>corporate clients or agencies</strong> who pay later by bank transfer.
        For guest receipts at checkout, use the <strong>Bookings</strong> module instead.
      </div>

      <div class="form-row">
        <div class="fg"><label>Bill To — Guest / Client *</label>
          <input [(ngModel)]="f.guestName" placeholder="Client or company name">
        </div>
        <div class="fg"><label>Invoice Type *</label>
          <select [(ngModel)]="f.type">
            <option value="room_booking">🏨 Room Booking</option>
            <option value="restaurant">🍽 Restaurant</option>
            <option value="combined">📋 Combined (Hotel + Restaurant)</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="fg"><label>Due Date</label><input type="date" [(ngModel)]="f.dueDate"></div>
        <div class="fg"><label>Tax Rate (%)</label><input type="number" [(ngModel)]="f.taxRate" min="0" max="30" step="0.5"></div>
        <div class="fg"><label>Discount (\$)</label><input type="number" [(ngModel)]="f.discountAmount" min="0"></div>
      </div>

      <!-- Line Items -->
      <div style="font-size:12px;font-weight:700;margin-bottom:8px;color:var(--text2)">Line Items</div>
      <div *ngFor="let li of f.lineItems; let i=index" style="display:flex;gap:6px;margin-bottom:6px;align-items:center">
        <input [(ngModel)]="li.description" placeholder="Description" style="flex:3;font-size:12px">
        <input type="number" [(ngModel)]="li.qty" min="1" style="width:55px;font-size:12px" placeholder="Qty" (input)="calcTotals()">
        <input type="number" [(ngModel)]="li.unitPrice" min="0" style="width:80px;font-size:12px" placeholder="\$Price" (input)="calcTotals()">
        <span style="font-weight:700;min-width:65px;font-size:12.5px;color:var(--purple)">\${{ (li.qty * li.unitPrice) | number:'1.2-2' }}</span>
        <button class="btn btn-danger btn-xs" (click)="removeLine(i)" style="padding:2px 7px">✕</button>
      </div>
      <button class="btn btn-o btn-xs" (click)="addLine()" style="margin-bottom:14px">+ Add Line Item</button>

      <!-- Totals -->
      <div style="background:var(--bg);border-radius:10px;padding:12px 14px;margin-bottom:14px">
        <div class="rj" style="font-size:12.5px;margin-bottom:4px"><span style="color:var(--muted)">Subtotal</span><span>\${{ f.subtotal | number:'1.2-2' }}</span></div>
        <div class="rj" style="font-size:12.5px;margin-bottom:4px"><span style="color:var(--muted)">Tax ({{ f.taxRate }}%)</span><span>\${{ f.taxAmount | number:'1.2-2' }}</span></div>
        <div *ngIf="f.discountAmount>0" class="rj" style="font-size:12.5px;margin-bottom:4px"><span style="color:var(--warn)">Discount</span><span style="color:var(--warn)">-\${{ f.discountAmount | number:'1.2-2' }}</span></div>
        <div class="rj" style="font-size:15px;font-weight:800;color:var(--purple);border-top:1px solid var(--border);padding-top:8px;margin-top:4px">
          <span>Total Due</span><span>\${{ f.totalAmount | number:'1.2-2' }}</span>
        </div>
      </div>

      <div class="fg"><label>Notes</label><textarea rows="2" [(ngModel)]="f.notes" placeholder="Payment instructions, bank details, terms..."></textarea></div>
      <div *ngIf="err()" style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:10px;font-size:12.5px;color:#b91c1c;margin-bottom:10px">{{ err() }}</div>
      <div style="display:flex;gap:10px">
        <button class="btn btn-o" style="flex:1" (click)="showForm.set(false)">Cancel</button>
        <button class="btn btn-o" style="flex:1" (click)="save(false)" [disabled]="saving()">💾 Save Draft</button>
        <button class="btn btn-g" style="flex:2" (click)="save(true)" [disabled]="saving()">📤 Save &amp; Issue</button>
      </div>
    </div>
  </div>

</div>`,
})
export class InvoicesComponent implements OnInit {
  invoices    = signal<any[]>([]);
  loading     = signal(true);
  saving      = signal(false);
  showForm    = signal(false);
  editId      = signal<string|null>(null);
  err         = signal('');
  filterStatus = '';
  filterType   = '';

  f: any = this.blank();

  readonly paidTotal       = computed(() => this.invoices().filter((i: any) => i.status==='paid').reduce((s: number, i: any) => s+i.totalAmount, 0));
  readonly outstandingTotal= computed(() => this.invoices().filter((i: any) => i.status==='issued').reduce((s: number, i: any) => s+i.totalAmount, 0));
  readonly overdueCount    = computed(() => this.invoices().filter((i: any) => this.isOverdue(i)).length);

  constructor(private svc: FinanceService) {}
  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    const f: any = {};
    if (this.filterStatus) f.status = this.filterStatus;
    if (this.filterType)   f.type   = this.filterType;
    this.svc.getInvoices(f).subscribe({
      next: (r: any) => { this.invoices.set(r.data.invoices||[]); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  blank() {
    const due = new Date(); due.setDate(due.getDate()+30);
    return { guestName:'', type:'room_booking', dueDate:due.toISOString().split('T')[0], taxRate:5, discountAmount:0, notes:'', lineItems:[{ description:'', qty:1, unitPrice:0 }], subtotal:0, taxAmount:0, totalAmount:0 };
  }

  openForm()    { this.editId.set(null); this.f = this.blank(); this.err.set(''); this.showForm.set(true); }
  openEdit(inv: any) {
    this.editId.set(inv._id);
    this.f = { guestName: inv.guestId?.firstName+' '+inv.guestId?.lastName, type:inv.type, dueDate:inv.dueDate?new Date(inv.dueDate).toISOString().split('T')[0]:'', taxRate:5, discountAmount:inv.discountAmount||0, notes:inv.notes||'', lineItems:[...inv.lineItems], subtotal:inv.subtotal, taxAmount:inv.taxAmount, totalAmount:inv.totalAmount };
    this.err.set(''); this.showForm.set(true);
  }

  addLine()     { this.f.lineItems = [...this.f.lineItems, { description:'', qty:1, unitPrice:0 }]; }
  removeLine(i: number) { this.f.lineItems = this.f.lineItems.filter((_: any, idx: number) => idx!==i); this.calcTotals(); }

  calcTotals() {
    const subtotal    = this.f.lineItems.reduce((s: number, li: any) => s + (li.qty||0)*(li.unitPrice||0), 0);
    const taxAmount   = +(subtotal * (this.f.taxRate||0) / 100).toFixed(2);
    const totalAmount = +(subtotal + taxAmount - (this.f.discountAmount||0)).toFixed(2);
    this.f = { ...this.f, subtotal: +subtotal.toFixed(2), taxAmount, totalAmount };
  }

  save(issue: boolean) {
    this.calcTotals();
    if (!this.f.guestName.trim()) { this.err.set('Client name required'); return; }
    if (!this.f.lineItems.some((li: any) => li.description && li.unitPrice>0)) { this.err.set('At least one line item required'); return; }
    this.saving.set(true); this.err.set('');
    const payload = { ...this.f, lineItems: this.f.lineItems.map((li: any) => ({ ...li, total:+(li.qty*li.unitPrice).toFixed(2) })), status: issue ? 'issued' : 'draft', issuedAt: issue ? new Date() : undefined };
    const eid = this.editId();
    const req = eid ? this.svc.updateInvoice(eid, payload) : this.svc.createInvoice(payload);
    req.subscribe({
      next: () => { this.saving.set(false); this.showForm.set(false); this.load(); },
      error: (e: any) => { this.saving.set(false); this.err.set(e.error?.message||'Save failed'); },
    });
  }

  markPaid(id: string) { this.svc.updateInvoice(id, { status:'paid', paidAt:new Date() }).subscribe(() => this.load()); }
  issue(id: string)    { this.svc.updateInvoice(id, { status:'issued', issuedAt:new Date() }).subscribe(() => this.load()); }
  voidInvoice(id: string) { if (confirm('Void this invoice?')) this.svc.updateInvoice(id, { status:'void' }).subscribe(() => this.load()); }

  print(inv: any) {
    const hotel = JSON.parse(localStorage.getItem('hotelProfile')||'{}');
    const iUrl  = (p: string) => p ? (p.startsWith('http') ? p : 'http://localhost:5000'+p) : '';
    let html = `<html><head><title>Invoice ${inv.invoiceNumber}</title>
    <style>*{margin:0;padding:0;box-sizing:border-box;}body{font-family:Arial,sans-serif;font-size:13px;padding:30px;max-width:700px;margin:auto;}
    .header{display:flex;justify-content:space-between;margin-bottom:30px;} .title{font-size:28px;font-weight:900;color:#6d2a75;}
    table{width:100%;border-collapse:collapse;margin:20px 0;} th{background:#f3e8ff;padding:8px;text-align:left;font-size:12px;}
    td{padding:8px;border-bottom:1px solid #eee;font-size:12px;} .total-row{font-weight:800;font-size:14px;}
    .badge{display:inline-block;padding:4px 12px;border-radius:20px;font-size:11px;font-weight:700;}
    .paid{background:#dcfce7;color:#166534;} .issued{background:#fef9c3;color:#854d0e;} .draft{background:#f1f5f9;color:#475569;}
    @media print{button{display:none!important;}}</style></head><body>`;

    html += `<div class="header">
      <div>${hotel.logoUrl ? `<img src="${iUrl(hotel.logoUrl)}" style="height:50px;object-fit:contain;margin-bottom:6px"><br>` : ''}
        <strong style="font-size:16px">${hotel.name||'Hotel'}</strong><br>
        <span style="font-size:11px;color:#666">${hotel.contactPhone||''} · ${hotel.contactEmail||''}</span>
      </div>
      <div style="text-align:right">
        <div class="title">INVOICE</div>
        <div style="font-size:13px;font-weight:700;color:#6d2a75">${inv.invoiceNumber}</div>
        <div style="margin-top:6px;font-size:12px;color:#666">
          Issued: ${inv.issuedAt ? new Date(inv.issuedAt).toLocaleDateString() : '—'}<br>
          Due: ${inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : '—'}<br>
          <span class="badge ${inv.status}">${inv.status.toUpperCase()}</span>
        </div>
      </div>
    </div>
    <div style="margin-bottom:20px"><strong>Bill To:</strong><br>
      ${inv.guestId?.firstName||''} ${inv.guestId?.lastName||''}<br>
      <span style="color:#666">${inv.guestId?.company||''}</span>
    </div>`;

    html += `<table><thead><tr><th>Description</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead><tbody>`;
    for (const li of inv.lineItems||[]) {
      html += `<tr><td>${li.description}</td><td>${li.qty}</td><td>$${li.unitPrice?.toFixed(2)}</td><td>$${li.total?.toFixed(2)}</td></tr>`;
    }
    html += `</tbody></table>
    <div style="text-align:right;max-width:260px;margin-left:auto">
      <div style="display:flex;justify-content:space-between;margin-bottom:4px"><span>Subtotal</span><span>$${inv.subtotal?.toFixed(2)}</span></div>
      <div style="display:flex;justify-content:space-between;margin-bottom:4px"><span>Tax</span><span>$${inv.taxAmount?.toFixed(2)}</span></div>
      ${inv.discountAmount>0 ? `<div style="display:flex;justify-content:space-between;margin-bottom:4px;color:orange"><span>Discount</span><span>-$${inv.discountAmount?.toFixed(2)}</span></div>` : ''}
      <div style="display:flex;justify-content:space-between;font-weight:800;font-size:15px;border-top:2px solid #6d2a75;padding-top:6px;margin-top:4px;color:#6d2a75"><span>TOTAL DUE</span><span>$${inv.totalAmount?.toFixed(2)}</span></div>
    </div>
    ${inv.notes ? `<div style="margin-top:24px;padding:12px;background:#f9fafb;border-radius:8px;font-size:12px;color:#666"><strong>Notes:</strong> ${inv.notes}</div>` : ''}`;

    if (hotel.signatureUrl || hotel.stampUrl) {
      html += `<div style="display:flex;justify-content:space-between;margin-top:40px">
        ${hotel.signatureUrl ? `<div><div style="font-size:10px;color:#aaa;margin-bottom:4px">Authorized Signature</div><img src="${iUrl(hotel.signatureUrl)}" style="max-height:40px;object-fit:contain"></div>` : '<div></div>'}
        ${hotel.stampUrl ? `<div style="text-align:right"><div style="font-size:10px;color:#aaa;margin-bottom:4px">Official Stamp</div><img src="${iUrl(hotel.stampUrl)}" style="max-height:50px;object-fit:contain"></div>` : ''}
      </div>`;
    }
    html += `<button onclick="window.print()" style="margin-top:20px;padding:10px 24px;background:#6d2a75;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:13px">🖨 Print Invoice</button>`;
    html += '</body></html>';

    const w = window.open('', '_blank', 'width=750,height:950');
    if (!w) return;
    w.document.write(html); w.document.close();
    setTimeout(() => w.print(), 400);
  }

  isOverdue(inv: any) { return inv.status==='issued' && inv.dueDate && new Date(inv.dueDate) < new Date(); }
  typeIcon(t: string)   { const m: Record<string,string>={room_booking:'🏨',restaurant:'🍽',combined:'📋'}; return m[t]||'📄'; }
  statusIcon(s: string) { const m: Record<string,string>={draft:'📝',issued:'📤',paid:'✅',void:'❌'}; return m[s]||''; }
  statusBadge(s: string){ const m: Record<string,string>={draft:'b-gray',issued:'b-yellow',paid:'b-green',void:'b-red'}; return m[s]||'b-gray'; }
  bgClose(e: Event) { if ((e.target as HTMLElement).classList.contains('overlay')) this.showForm.set(false); }
}
