import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FinanceService } from '../../core/services/api.service';

@Component({
  selector: 'app-invoices',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
<div class="page-content">
  <div class="sec-head mb20">
    <div><div style="font-family:'Syne',sans-serif;font-size:18px;font-weight:800">Invoices</div>
    <div style="font-size:12px;color:var(--muted);margin-top:2px">Billing and payment records</div></div>
    <div style="display:flex;gap:8px">
      <select class="tb-sel" [(ngModel)]="filterStatus" (change)="load()">
        <option value="">All Status</option>
        <option value="draft">Draft</option><option value="issued">Issued</option>
        <option value="paid">Paid</option><option value="void">Void</option>
      </select>
      <button class="btn btn-g btn-sm" (click)="openForm()">+ Create Invoice</button>
    </div>
  </div>
  <div class="g4 mb20">
    <div class="mc"><div class="mc-lbl">Total</div><div class="mc-val">{{ invoices().length }}</div></div>
    <div class="mc"><div class="mc-lbl">Paid</div><div class="mc-val" style="color:var(--success)">{{ count('paid') }}</div></div>
    <div class="mc"><div class="mc-lbl">Outstanding</div><div class="mc-val" style="color:var(--warn)">{{ count('issued') }}</div></div>
    <div class="mc"><div class="mc-lbl">Draft</div><div class="mc-val" style="color:var(--muted)">{{ count('draft') }}</div></div>
  </div>
  <div class="card">
    <div *ngIf="loading()" style="text-align:center;padding:20px;color:var(--muted)">Loading...</div>
    <table class="tbl-hover" *ngIf="!loading()">
      <thead><tr><th>Invoice #</th><th>Guest</th><th>Type</th><th>Total</th><th>Issued</th><th>Status</th><th>Actions</th></tr></thead>
      <tbody>
        <tr *ngFor="let inv of invoices()">
          <td style="font-family:monospace;font-size:11px;color:var(--purple)">{{ inv.invoiceNumber }}</td>
          <td style="font-weight:600">{{ inv.guestId?.firstName }} {{ inv.guestId?.lastName }}</td>
          <td><span class="tag">{{ inv.type | titlecase }}</span></td>
          <td style="font-weight:700">{{ inv.totalAmount | currency }}</td>
          <td style="font-size:11px;color:var(--muted)">{{ inv.issuedAt ? (inv.issuedAt | date:'MMM d, y') : '—' }}</td>
          <td><span class="badge" [ngClass]="statusBadge(inv.status)">{{ inv.status | titlecase }}</span></td>
          <td>
            <div style="display:flex;gap:4px">
              <button class="btn btn-o btn-sm" (click)="print(inv)">🖨 Print</button>
              <button *ngIf="inv.status==='issued'" class="btn btn-success btn-sm" (click)="markPaid(inv._id)">Mark Paid</button>
              <button *ngIf="inv.status==='draft'" class="btn btn-g btn-sm" (click)="issue(inv._id)">Issue</button>
            </div>
          </td>
        </tr>
        <tr *ngIf="!invoices().length"><td colspan="7" style="text-align:center;padding:20px;color:var(--muted)">No invoices found</td></tr>
      </tbody>
    </table>
  </div>
  <div class="overlay" [class.show]="showForm()" (click)="closeForm($event)">
    <div class="modal">
      <div class="modal-head"><div class="modal-title">Create Invoice</div><button class="modal-close" (click)="showForm.set(false)">✕</button></div>
      <div class="form-row">
        <div class="fg"><label>Type</label><select [(ngModel)]="form.type"><option value="room_booking">Room Booking</option><option value="restaurant">Restaurant</option><option value="combined">Combined</option></select></div>
        <div class="fg"><label>Currency</label><select [(ngModel)]="form.currency"><option value="USD">USD</option><option value="EUR">EUR</option><option value="GBP">GBP</option><option value="AED">AED</option></select></div>
      </div>
      <div class="fg"><label>Description</label><input [(ngModel)]="form.description" placeholder="e.g. Suite 1201 × 4 nights"></div>
      <div class="form-row">
        <div class="fg"><label>Amount</label><input type="number" [(ngModel)]="form.amount" placeholder="1920"></div>
        <div class="fg"><label>Tax Rate (%)</label><input type="number" [(ngModel)]="form.taxRate" value="5"></div>
      </div>
      <div class="fg"><label>Notes</label><textarea rows="2" [(ngModel)]="form.notes" placeholder="Optional notes..."></textarea></div>
      <div style="display:flex;gap:8px;margin-top:4px">
        <button class="btn btn-o btn-sm" style="flex:1" (click)="showForm.set(false)">Cancel</button>
        <button class="btn btn-g btn-sm" style="flex:2" (click)="createInvoice()" [disabled]="saving()">{{ saving() ? 'Saving...' : 'Create Invoice' }}</button>
      </div>
    </div>
  </div>
</div>`,
})
export class InvoicesComponent implements OnInit {
  invoices=signal<any[]>([]);loading=signal(true);saving=signal(false);showForm=signal(false);filterStatus='';
  form:any={type:'room_booking',currency:'USD',description:'',amount:0,taxRate:5,notes:''};
  constructor(private svc:FinanceService){}
  ngOnInit(){this.load();}
  load(){this.loading.set(true);const f:any={};if(this.filterStatus)f.status=this.filterStatus;
    this.svc.getInvoices(f).subscribe({next:r=>{this.invoices.set(r.data.invoices);this.loading.set(false);},error:()=>this.loading.set(false)});}
  count(s:string){return this.invoices().filter(i=>i.status===s).length;}
  openForm(){this.form={type:'room_booking',currency:'USD',description:'',amount:0,taxRate:5,notes:''};this.showForm.set(true);}
  createInvoice(){this.saving.set(true);
    const tax=this.form.amount*(this.form.taxRate/100);
    const payload={type:this.form.type,currency:this.form.currency,notes:this.form.notes,
      lineItems:[{description:this.form.description,qty:1,unitPrice:this.form.amount,total:this.form.amount}],
      subtotal:this.form.amount,taxAmount:tax,totalAmount:this.form.amount+tax,status:'draft'};
    this.svc.createInvoice(payload).subscribe({next:()=>{this.saving.set(false);this.showForm.set(false);this.load();},error:()=>this.saving.set(false)});}
  markPaid(id:string){this.svc.updateInvoice(id,{status:'paid',paidAt:new Date()}).subscribe(()=>this.load());}
  issue(id:string){this.svc.updateInvoice(id,{status:'issued',issuedAt:new Date()}).subscribe(()=>this.load());}
  print(inv:any){alert('Invoice '+inv.invoiceNumber+' — connect to PDF generator in production');}
  closeForm(e:Event){if((e.target as HTMLElement).classList.contains('overlay'))this.showForm.set(false);}
  statusBadge(s:string){const m:any={draft:'b-gray',issued:'b-yellow',paid:'b-green',void:'b-red'};return m[s]||'b-gray';}
}
