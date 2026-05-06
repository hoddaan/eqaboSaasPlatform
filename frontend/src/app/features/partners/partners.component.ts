import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PartnerService } from '../../core/services/api.service';

type PTab = 'partners' | 'payments';

@Component({
  selector: 'app-partners',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
<div class="page-content">

  <div class="sec-head mb20">
    <div>
      <div style="font-size:18px;font-weight:800;letter-spacing:-.4px">Partner Companies</div>
      <div style="font-size:12.5px;color:var(--muted);margin-top:3px">Corporate partners · invoices · payment tracking</div>
    </div>
    <div style="display:flex;gap:8px">
      <input style="width:200px" [(ngModel)]="search" (input)="filterData()" placeholder="Search...">
      <button *ngIf="tab()==='partners'" class="btn btn-g btn-sm" (click)="openForm()">+ Add Partner</button>
    </div>
  </div>

  <div class="g4 mb20">
    <div class="mc"><div class="mc-ico">🏢</div><div class="mc-lbl">Partners</div><div class="mc-val">{{ partners().length }}</div></div>
    <div class="mc"><div class="mc-ico">📄</div><div class="mc-lbl">Total Invoices</div><div class="mc-val">{{ payments().length }}</div></div>
    <div class="mc"><div class="mc-ico">⏳</div><div class="mc-lbl">Pending</div><div class="mc-val" style="color:var(--warn)">\${{ stats().pendingTotal | number:'1.0-0' }}</div></div>
    <div class="mc"><div class="mc-ico">✅</div><div class="mc-lbl">Collected</div><div class="mc-val" style="color:var(--success)">\${{ stats().paidTotal | number:'1.0-0' }}</div></div>
  </div>

  <div style="display:flex;gap:4px;margin-bottom:16px;background:var(--bg);border-radius:12px;padding:4px;width:fit-content;border:1px solid var(--border)">
    <button class="btn btn-sm" [ngClass]="tab()==='partners'?'btn-g':'btn-ghost'" (click)="tab.set('partners')">🏢 Partners ({{ partners().length }})</button>
    <button class="btn btn-sm" [ngClass]="tab()==='payments'?'btn-g':'btn-ghost'" (click)="tab.set('payments')">📄 Invoices ({{ filteredPayments().length }})</button>
  </div>

  <div *ngIf="tab()==='partners'" class="card">
    <div *ngIf="loading()" style="text-align:center;padding:30px;color:var(--muted)">Loading...</div>
    <div *ngFor="let p of filteredPartners()"
      style="display:flex;align-items:center;gap:14px;padding:12px 14px;border-radius:10px;margin-bottom:6px;background:var(--bg);border:1.5px solid var(--border);transition:all .15s;cursor:pointer"
      [style.border-color]="selectedPartner()?._id===p._id?'var(--purple)':'var(--border)'"
      [style.background]="selectedPartner()?._id===p._id?'#f3e8ff':'var(--bg)'"
      (click)="selectedPartner.set(p)">
      <div style="width:40px;height:40px;border-radius:10px;background:var(--grad);display:flex;align-items:center;justify-content:center;color:#fff;font-size:16px;font-weight:700;flex-shrink:0">
        {{ p.companyName[0] }}
      </div>
      <div style="flex:1;min-width:0">
        <div style="font-weight:700;font-size:13.5px">{{ p.companyName }}</div>
        <div style="font-size:11.5px;color:var(--muted)">{{ p.contactName }} · {{ p.contactEmail }}</div>
        <div *ngIf="p.contactPhone" style="font-size:11px;color:var(--muted)">{{ p.contactPhone }}</div>
      </div>
      <div style="display:flex;gap:6px">
        <button class="btn btn-o btn-xs" (click)="openEdit(p);$event.stopPropagation()">Edit</button>
        <button class="btn btn-danger btn-xs" (click)="confirmRemove(p);$event.stopPropagation()">x</button>
      </div>
    </div>
    <div *ngIf="!filteredPartners().length && !loading()" style="text-align:center;padding:40px;color:var(--muted)">
      <div style="font-size:28px;margin-bottom:8px">🏢</div>No partners yet. Add your first corporate partner.
    </div>
  </div>

  <div *ngIf="tab()==='payments'" class="card">
    <div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap">
      <select class="tb-sel" [(ngModel)]="filterStatus" (change)="loadPayments()">
        <option value="">All Status</option>
        <option value="pending">Pending</option>
        <option value="sent">Sent</option>
        <option value="paid">Paid</option>
      </select>
      <select class="tb-sel" [(ngModel)]="filterPartner" (change)="loadPayments()">
        <option value="">All Partners</option>
        <option *ngFor="let p of partners()" [value]="p._id">{{ p.companyName }}</option>
      </select>
    </div>
    <table class="tbl-hover">
      <thead><tr><th>Receipt</th><th>Partner</th><th>Guest</th><th>Room</th><th>Amount</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
      <tbody>
        <tr *ngFor="let p of filteredPayments()">
          <td style="font-family:monospace;font-size:11px;color:var(--purple)">{{ p.receiptRef }}</td>
          <td style="font-weight:600">{{ p.partnerId?.companyName }}</td>
          <td>{{ p.guestName }}</td>
          <td><span class="tag">{{ p.roomNumber }}</span></td>
          <td style="font-weight:700">\${{ p.totalAmount }}</td>
          <td><span class="badge" [ngClass]="p.status==='paid'?'b-green':p.status==='sent'?'b-blue':'b-yellow'">{{ p.status | titlecase }}</span></td>
          <td style="font-size:11.5px;color:var(--muted)">{{ p.createdAt | date:'MMM d, y' }}</td>
          <td>
            <div style="display:flex;gap:4px">
              <button *ngIf="p.status!=='paid'" class="btn btn-o btn-xs" (click)="openSendModal(p)">Send</button>
              <button *ngIf="p.status!=='paid'" class="btn btn-success btn-xs" (click)="confirmMarkPaid(p)">Paid</button>
              <button *ngIf="p.status==='paid'" class="btn btn-o btn-xs" (click)="openSendModal(p)">Re-send</button>
            </div>
          </td>
        </tr>
        <tr *ngIf="!filteredPayments().length">
          <td colspan="8" style="text-align:center;padding:40px;color:var(--muted)"><div style="font-size:28px;margin-bottom:8px">📄</div>No invoices yet.</td>
        </tr>
      </tbody>
    </table>
  </div>


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

  <div class="overlay" [class.show]="showForm()" (click)="bgClick($event,'form')">
    <div class="modal" style="width:500px">
      <div class="modal-head">
        <div class="modal-title">{{ editingId() ? 'Edit Partner' : 'Add Partner Company' }}</div>
        <button class="modal-close" (click)="showForm.set(false)">x</button>
      </div>
      <div class="form-row">
        <div class="fg"><label>Company Name *</label><input [(ngModel)]="pf.companyName" placeholder="Acme Corp"></div>
      </div>
      <div class="form-row">
        <div class="fg"><label>Contact Person</label><input [(ngModel)]="pf.contactName" placeholder="John Smith"></div>
        <div class="fg"><label>Contact Email *</label><input type="email" [(ngModel)]="pf.contactEmail" placeholder="billing@acme.com"></div>
      </div>
      <div class="form-row">
        <div class="fg"><label>Phone</label><input [(ngModel)]="pf.contactPhone" placeholder="+971 4 000 0000"></div>
      </div>
      <div class="fg"><label>Address</label><input [(ngModel)]="pf.address" placeholder="Business Bay, Dubai"></div>
      <div class="fg"><label>Notes</label><textarea rows="2" [(ngModel)]="pf.notes"></textarea></div>
      <div *ngIf="formErr()" style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:10px;font-size:12.5px;color:#b91c1c;margin-bottom:10px">{{ formErr() }}</div>
      <div style="display:flex;gap:10px">
        <button class="btn btn-o" style="flex:1" (click)="showForm.set(false)">Cancel</button>
        <button class="btn btn-g" style="flex:2" (click)="save()" [disabled]="saving()">
          {{ saving()?(editingId()?'Updating...':'Adding...'):(editingId()?'Update Partner':'Add Partner') }}
        </button>
      </div>
    </div>
  </div>

  <div class="overlay" [class.show]="showSendModal()" (click)="bgClick($event,'send')">
    <div class="modal" style="width:460px">
      <div class="modal-head">
        <div class="modal-title">Send Receipt to Partner</div>
        <button class="modal-close" (click)="showSendModal.set(false)">x</button>
      </div>
      <ng-container *ngIf="sendTarget()">
        <div style="background:var(--grad-soft);border-radius:10px;padding:12px 14px;margin-bottom:16px;font-size:12.5px;color:var(--purple)">
          <div style="font-weight:700;margin-bottom:2px">{{ sendTarget().partnerId?.companyName }}</div>
          <div style="opacity:.7">Invoice {{ sendTarget().receiptRef }} · \${{ sendTarget().totalAmount }}</div>
        </div>
        <div class="fg">
          <label>Send to Email</label>
          <input [(ngModel)]="sendEmail" [placeholder]="sendTarget().partnerId?.contactEmail||'partner@company.com'">
          <div style="font-size:11px;color:var(--muted);margin-top:3px">Leave blank to use partner's registered email</div>
        </div>
        <div *ngIf="sendResult()" style="border-radius:9px;padding:10px 13px;font-size:12.5px;margin-bottom:12px"
          [style.background]="sendResult().emailSent?'#dcfce7':'#fef9c3'"
          [style.color]="sendResult().emailSent?'#15803d':'#854d0e'">
          {{ sendResult().message }}
          <div *ngIf="sendResult().emailError" style="font-size:10.5px;margin-top:4px;opacity:.7">{{ sendResult().emailError }}</div>
        </div>
        <div *ngIf="!sendResult()" style="display:flex;gap:10px">
          <button class="btn btn-o" style="flex:1" (click)="showSendModal.set(false)">Cancel</button>
          <button class="btn btn-g" style="flex:2" (click)="submitSend()" [disabled]="sending()">
            {{ sending() ? 'Sending...' : 'Send Receipt' }}
          </button>
        </div>
        <button *ngIf="sendResult()" class="btn btn-g" style="width:100%" (click)="showSendModal.set(false);loadPayments()">Done</button>
      </ng-container>
    </div>
  </div>

</div>`,
})
export class PartnersComponent implements OnInit {
  partners      = signal<any[]>([]);
  payments      = signal<any[]>([]);
  loading       = signal(true);
  saving        = signal(false);
  sending       = signal(false);
  showForm      = signal(false);
  showSendModal = signal(false);
  editingId     = signal<string|null>(null);
  selectedPartner = signal<any>(null);
  sendTarget    = signal<any>(null);
  sendResult    = signal<any>(null);
  formErr       = signal('');
  stats         = signal<any>({ pendingTotal:0, paidTotal:0 });
  tab           = signal<PTab>('partners');

  search        = '';
  filterStatus  = '';
  filterPartner = '';
  sendEmail     = '';

  pf: any = this.blank();
  confirmDialog = signal<{show:boolean;icon:string;title:string;message:string;confirmLabel:string;danger:boolean;action:()=>void}>({
    show:false, icon:'⚠️', title:'', message:'', confirmLabel:'Confirm', danger:true, action:()=>{}
  });
  showConfirm(opts: {icon?:string;title:string;message:string;confirmLabel?:string;danger?:boolean;action:()=>void}) {
    this.confirmDialog.set({ show:true, icon:opts.icon||'⚠️', title:opts.title, message:opts.message, confirmLabel:opts.confirmLabel||'Confirm', danger:opts.danger!==false, action:opts.action });
  }
  acceptConfirm()  { const fn = this.confirmDialog().action; this.confirmDialog.update(d=>({...d,show:false})); fn(); }
  dismissConfirm() { this.confirmDialog.update(d=>({...d,show:false})); }

  readonly filteredPartners = computed(() => {
    const s = this.search.toLowerCase();
    return !s ? this.partners() : this.partners().filter((p: any) =>
      p.companyName?.toLowerCase().includes(s) || p.contactEmail?.toLowerCase().includes(s)
    );
  });

  readonly filteredPayments = computed(() => {
    const s = this.search.toLowerCase();
    return !s ? this.payments() : this.payments().filter((p: any) =>
      p.guestName?.toLowerCase().includes(s) || p.receiptRef?.toLowerCase().includes(s) ||
      p.partnerId?.companyName?.toLowerCase().includes(s)
    );
  });

  constructor(private partnerSvc: PartnerService) {}
  ngOnInit() { this.loadAll(); }

  loadAll() {
    this.loading.set(true);
    this.partnerSvc.getAll().subscribe({ next: (r: any) => { this.partners.set(r.data.partners||[]); this.loading.set(false); } });
    this.loadPayments();
  }

  loadPayments() {
    const f: any = {};
    if (this.filterStatus)  f.status    = this.filterStatus;
    if (this.filterPartner) f.partnerId = this.filterPartner;
    this.partnerSvc.getPayments(f).subscribe({ next: (r: any) => { this.payments.set(r.data.payments||[]); this.stats.set(r.data.stats||{}); } });
  }

  filterData() { /* search reactive via computed */ }
  blank() { return { companyName:'', contactName:'', contactEmail:'', contactPhone:'', taxId:'', creditLimit:0, address:'', notes:'' }; }

  openForm() { this.editingId.set(null); this.pf = this.blank(); this.formErr.set(''); this.showForm.set(true); }
  openEdit(p: any) {
    this.editingId.set(p._id);
    this.pf = { companyName:p.companyName, contactName:p.contactName||'', contactEmail:p.contactEmail, contactPhone:p.contactPhone||'', taxId:p.taxId||'', creditLimit:p.creditLimit||0, address:p.address||'', notes:p.notes||'' };
    this.formErr.set(''); this.showForm.set(true);
  }

  save() {
    if (!this.pf.companyName.trim()) { this.formErr.set('Company name required'); return; }
    if (!this.pf.contactEmail.trim()) { this.formErr.set('Contact email required'); return; }
    this.saving.set(true); this.formErr.set('');
    const eid = this.editingId();
    const req = eid ? this.partnerSvc.update(eid, this.pf) : this.partnerSvc.create(this.pf);
    req.subscribe({
      next: () => { this.saving.set(false); this.showForm.set(false); this.loadAll(); },
      error: (e: any) => { this.saving.set(false); this.formErr.set(e.error?.message||'Error'); },
    });
  }

  confirmRemove(p: any) {
    this.showConfirm({ icon:'🗑️', title:'Remove Partner?', message:`Remove ${p.companyName} from your partner list? Their invoices will remain.`, confirmLabel:'Remove', danger:true,
      action: () => this.removePartner(p._id)
    });
  }
  removePartner(id: string) {
    this.partnerSvc.remove(id).subscribe(() => { this.selectedPartner.set(null); this.loadAll(); });
  }

  openSendModal(p: any) { this.sendTarget.set(p); this.sendEmail=''; this.sendResult.set(null); this.showSendModal.set(true); }

  submitSend() {
    this.sending.set(true);
    this.partnerSvc.sendReceipt(this.sendTarget()._id, { overrideEmail: this.sendEmail||undefined }).subscribe({
      next: (r: any) => { this.sending.set(false); this.sendResult.set(r.data); },
      error: (e: any) => { this.sending.set(false); this.sendResult.set({ emailSent:false, message: e.error?.message||'Send failed' }); },
    });
  }

  confirmMarkPaid(p: any) {
    this.showConfirm({ icon:'✅', title:'Mark Invoice as Paid?', message:`Mark invoice ${p.receiptRef} ($${p.totalAmount}) from ${p.partnerId?.companyName} as paid?`, confirmLabel:'Mark Paid', danger:false,
      action: () => this.markPaid(p._id)
    });
  }
  markPaid(id: string) { this.partnerSvc.markPaid(id).subscribe(() => this.loadPayments()); }

  bgClick(e: Event, t: string) {
    if (!(e.target as HTMLElement).classList.contains('overlay')) return;
    if (t==='form') this.showForm.set(false);
    if (t==='send') this.showSendModal.set(false);
  }
}
