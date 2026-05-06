import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MaintenanceService, StaffService, RoomService } from '../../core/services/api.service';

const CATS = ['plumbing','electrical','hvac','furniture','appliance','structural','other'];
const CAT_ICONS: Record<string,string> = { plumbing:'🚿',electrical:'⚡',hvac:'❄️',furniture:'🪑',appliance:'📺',structural:'🏗',other:'🔧' };
const PRIORITIES = ['low','medium','high','urgent'];
const PRIORITY_COLORS: Record<string,string> = { low:'b-gray',medium:'b-blue',high:'b-yellow',urgent:'b-red' };

@Component({
  selector: 'app-maintenance',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `<div class="page-content">

  <div class="sec-head mb20">
    <div>
      <div style="font-size:18px;font-weight:800;letter-spacing:-.4px">🔧 Maintenance</div>
      <div style="font-size:12.5px;color:var(--muted);margin-top:3px">Requests · Assignments · Tracking</div>
    </div>
    <div style="display:flex;gap:8px">
      <input style="width:180px" [(ngModel)]="search" (input)="filterList()" placeholder="Search...">
      <button class="btn btn-g btn-sm" (click)="openForm()">+ New Request</button>
    </div>
  </div>

  <!-- Stats -->
  <div class="g4 mb20">
    <div class="mc"><div class="mc-ico">📋</div><div class="mc-lbl">Open</div><div class="mc-val" style="color:var(--warn)">{{ count("open") }}</div></div>
    <div class="mc"><div class="mc-ico">🔧</div><div class="mc-lbl">In Progress</div><div class="mc-val" style="color:var(--purple)">{{ count("in_progress") }}</div></div>
    <div class="mc"><div class="mc-ico">🚨</div><div class="mc-lbl">Urgent</div><div class="mc-val" style="color:var(--danger)">{{ urgent() }}</div></div>
    <div class="mc"><div class="mc-ico">✅</div><div class="mc-lbl">Completed Today</div><div class="mc-val" style="color:var(--success)">{{ completedToday() }}</div></div>
  </div>

  <!-- Filters -->
  <div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap">
    <select class="tb-sel" [(ngModel)]="statusFilter" (change)="load()">
      <option value="">All Status</option>
      <option value="open">Open</option><option value="assigned">Assigned</option>
      <option value="in_progress">In Progress</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option>
    </select>
    <select class="tb-sel" [(ngModel)]="priorityFilter" (change)="load()">
      <option value="">All Priority</option>
      <option *ngFor="let p of priorities" [value]="p">{{ p | titlecase }}</option>
    </select>
    <select class="tb-sel" [(ngModel)]="catFilter" (change)="load()">
      <option value="">All Categories</option>
      <option *ngFor="let c of cats" [value]="c">{{ catIcon(c) }} {{ c | titlecase }}</option>
    </select>
  </div>

  <!-- Active requests as cards -->
  <div *ngIf="!statusFilter||['open','assigned','in_progress'].includes(statusFilter)">
    <div style="font-size:11px;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:.5px;margin-bottom:12px">Active Requests</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px;margin-bottom:20px">
      <div *ngFor="let r of activeRequests()" class="card"
        style="border-left:4px solid"
        [style.border-left-color]="priorityBorderColor(r.priority)">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
          <div>
            <div style="font-size:16px;margin-bottom:3px">{{ catIcon(r.category) }}</div>
            <div style="font-weight:700;font-size:13.5px">{{ r.title }}</div>
            <div style="font-size:11.5px;color:var(--muted)">{{ r.location }}</div>
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
            <span class="badge" [ngClass]="PRIORITY_COLORS[r.priority]" style="font-size:9.5px">{{ r.priority | titlecase }}</span>
            <span class="badge b-gray" style="font-size:9.5px">{{ r.status | titlecase }}</span>
          </div>
        </div>
        <div *ngIf="r.description" style="font-size:12px;color:var(--muted);margin-bottom:8px">{{ r.description }}</div>
        <div style="display:flex;gap:6px;font-size:11.5px;margin-bottom:10px;flex-wrap:wrap">
          <span style="color:var(--muted)">By: {{ r.reportedByUserId?.name }}</span>
          <span *ngIf="r.assignedToUserId" style="color:var(--purple)">→ {{ r.assignedToUserId?.name }}</span>
          <span style="color:var(--muted)">{{ r.createdAt | date:"MMM d, HH:mm" }}</span>
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          <button *ngIf="r.status==='open'" class="btn btn-o btn-xs" (click)="openAssign(r)">Assign</button>
          <button *ngIf="r.status==='assigned'" class="btn btn-o btn-xs" (click)="updateStatus(r._id,'in_progress')">Start</button>
          <button *ngIf="r.status==='in_progress'" class="btn btn-success btn-xs" (click)="openComplete(r)">Complete</button>
          <button class="btn btn-o btn-xs" (click)="openEdit(r)">Edit</button>
          <button class="btn btn-danger btn-xs" (click)="confirmCancel(r)">Cancel</button>
        </div>
      </div>
      <div *ngIf="!activeRequests().length" style="grid-column:1/-1;text-align:center;padding:30px;color:var(--muted)">
        <div style="font-size:28px;margin-bottom:8px">✅</div>No active maintenance requests
      </div>
    </div>
  </div>

  <!-- All requests table -->
  <div class="card">
    <div style="font-size:11px;font-weight:700;color:var(--text2);margin-bottom:10px">All Requests</div>
    <table class="tbl-hover">
      <thead><tr><th>Title</th><th>Category</th><th>Location</th><th>Priority</th><th>Assigned To</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
      <tbody>
        <tr *ngFor="let r of filteredRequests()">
          <td style="font-weight:600">{{ catIcon(r.category) }} {{ r.title }}</td>
          <td style="font-size:11.5px;color:var(--muted)">{{ r.category | titlecase }}</td>
          <td style="font-size:12px">{{ r.location }}</td>
          <td><span class="badge" [ngClass]="PRIORITY_COLORS[r.priority]" style="font-size:9.5px">{{ r.priority | titlecase }}</span></td>
          <td style="font-size:11.5px">{{ r.assignedToUserId?.name || "Unassigned" }}</td>
          <td><span class="badge b-gray" style="font-size:9.5px">{{ r.status | titlecase }}</span></td>
          <td style="font-size:11.5px;color:var(--muted)">{{ r.createdAt | date:"MMM d" }}</td>
          <td>
            <div style="display:flex;gap:4px">
              <button *ngIf="r.status==='open'" class="btn btn-o btn-xs" (click)="openAssign(r)">Assign</button>
              <button *ngIf="r.status==='in_progress'" class="btn btn-success btn-xs" (click)="openComplete(r)">Done</button>
              <button *ngIf="r.status!=='completed'&&r.status!=='cancelled'" class="btn btn-danger btn-xs" (click)="confirmCancel(r)">Cancel</button>
            </div>
          </td>
        </tr>
        <tr *ngIf="!filteredRequests().length">
          <td colspan="8" style="text-align:center;padding:30px;color:var(--muted)">No requests found</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- CONFIRM -->
  <div class="overlay" [class.show]="confirmDialog().show" style="z-index:9999">
    <div class="modal" style="width:420px;text-align:center">
      <div style="font-size:36px;margin-bottom:12px">{{ confirmDialog().icon }}</div>
      <div style="font-size:16px;font-weight:800;margin-bottom:8px">{{ confirmDialog().title }}</div>
      <div style="font-size:13px;color:var(--muted);margin-bottom:22px;line-height:1.5">{{ confirmDialog().message }}</div>
      <div style="display:flex;gap:10px">
        <button class="btn btn-o" style="flex:1" (click)="dismissConfirm()">Cancel</button>
        <button class="btn" style="flex:2" [ngClass]="confirmDialog().danger?'btn-danger':'btn-g'" (click)="acceptConfirm()">{{ confirmDialog().confirmLabel }}</button>
      </div>
    </div>
  </div>

  <!-- REQUEST FORM -->
  <div class="overlay" [class.show]="showForm()" (click)="bgClick($event,'req')">
    <div class="modal" style="width:520px">
      <div class="modal-head">
        <div class="modal-title">{{ editingId() ? "Edit Request" : "New Maintenance Request" }}</div>
        <button class="modal-close" (click)="showForm.set(false)">x</button>
      </div>
      <div class="fg"><label>Title *</label><input [(ngModel)]="rf.title" placeholder="Leaking pipe in Room 101..."></div>
      <div class="form-row">
        <div class="fg"><label>Category *</label>
          <select [(ngModel)]="rf.category">
            <option *ngFor="let c of cats" [value]="c">{{ catIcon(c) }} {{ c | titlecase }}</option>
          </select>
        </div>
        <div class="fg"><label>Priority *</label>
          <div style="display:flex;gap:5px;margin-top:4px">
            <button *ngFor="let p of priorities" class="btn btn-xs" [ngClass]="rf.priority===p?'btn-g':'btn-o'" (click)="rf.priority=p" style="flex:1">{{ p | titlecase }}</button>
          </div>
        </div>
      </div>
      <div class="form-row">
        <div class="fg"><label>Location *</label><input [(ngModel)]="rf.location" placeholder="Room 101, Lobby, Pool..."></div>
        <div class="fg"><label>Room (optional)</label>
          <select [(ngModel)]="rf.roomId">
            <option value="">No specific room</option>
            <option *ngFor="let r of rooms()" [value]="r._id">Room {{ r.roomNumber }}</option>
          </select>
        </div>
      </div>
      <div class="fg"><label>Description</label><textarea rows="2" [(ngModel)]="rf.description" placeholder="Details of the issue..."></textarea></div>
      <div class="fg"><label>Estimated Time (minutes)</label><input type="number" [(ngModel)]="rf.estimatedMinutes" min="0" placeholder="30"></div>
      <div *ngIf="formErr()" style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:10px;font-size:12.5px;color:#b91c1c;margin-bottom:10px">{{ formErr() }}</div>
      <div style="display:flex;gap:10px">
        <button class="btn btn-o" style="flex:1" (click)="showForm.set(false)">Cancel</button>
        <button class="btn btn-g" style="flex:2" (click)="save()" [disabled]="saving()">
          {{ saving()?(editingId()?'Updating...':"Submitting..."):(editingId()?'Update Request':'Submit Request') }}
        </button>
      </div>
    </div>
  </div>

  <!-- ASSIGN MODAL -->
  <div class="overlay" [class.show]="showAssign()" (click)="bgClick($event,'assign')">
    <div class="modal" style="width:440px">
      <div class="modal-head"><div class="modal-title">Assign Technician</div><button class="modal-close" (click)="showAssign.set(false)">x</button></div>
      <div *ngIf="assignTarget()" style="background:var(--bg);border-radius:10px;padding:10px 14px;margin-bottom:14px;font-size:12.5px">
        <div style="font-weight:700">{{ catIcon(assignTarget().category) }} {{ assignTarget().title }}</div>
        <div style="color:var(--muted)">{{ assignTarget().location }}</div>
      </div>
      <div class="fg"><label>Assign to</label>
        <select [(ngModel)]="assignTo">
          <option value="">-- Select technician --</option>
          <option *ngFor="let m of technicians()" [value]="m._id">{{ m.name }} ({{ m.department | titlecase }})</option>
        </select>
      </div>
      <div style="display:flex;gap:10px">
        <button class="btn btn-o" style="flex:1" (click)="showAssign.set(false)">Cancel</button>
        <button class="btn btn-g" style="flex:2" (click)="submitAssign()" [disabled]="saving()">Assign</button>
      </div>
    </div>
  </div>

  <!-- COMPLETE MODAL -->
  <div class="overlay" [class.show]="showComplete()" (click)="bgClick($event,'complete')">
    <div class="modal" style="width:440px">
      <div class="modal-head"><div class="modal-title">Mark as Completed</div><button class="modal-close" (click)="showComplete.set(false)">x</button></div>
      <div class="fg"><label>Resolution Notes</label><textarea rows="3" [(ngModel)]="resolutionNotes" placeholder="What was done to fix the issue..."></textarea></div>
      <div style="display:flex;gap:10px">
        <button class="btn btn-o" style="flex:1" (click)="showComplete.set(false)">Cancel</button>
        <button class="btn btn-success" style="flex:2" (click)="submitComplete()" [disabled]="saving()">Mark Completed</button>
      </div>
    </div>
  </div>

</div>`,
})
export class MaintenanceComponent implements OnInit {
  requests       = signal<any[]>([]);
  staff          = signal<any[]>([]);
  rooms          = signal<any[]>([]);
  saving         = signal(false);
  showForm       = signal(false);
  showAssign     = signal(false);
  showComplete   = signal(false);
  editingId      = signal<string|null>(null);
  assignTarget   = signal<any>(null);
  completeTarget = signal<any>(null);
  formErr        = signal('');
  confirmDialog  = signal<any>({ show:false, icon:'⚠️', title:'', message:'', confirmLabel:'Confirm', danger:true, action:()=>{} });

  search         = '';
  statusFilter   = '';
  priorityFilter = '';
  catFilter      = '';
  assignTo       = '';
  resolutionNotes = '';
  rf: any        = this.blankReq();

  cats       = CATS;
  priorities = PRIORITIES;
  PRIORITY_COLORS = PRIORITY_COLORS;

  readonly activeRequests   = computed(() => this.requests().filter(r => ['open','assigned','in_progress'].includes(r.status)));
  readonly filteredRequests = computed(() => {
    const q = this.search.toLowerCase();
    return this.requests().filter(r => !q || r.title.toLowerCase().includes(q) || r.location.toLowerCase().includes(q));
  });
  readonly technicians = computed(() => this.staff().filter(m => ['Technician','Manager','HotelAdmin'].includes(m.role)));

  count(status: string): number { return this.requests().filter(r => r.status === status).length; }
  urgent(): number { return this.requests().filter(r => r.priority === 'urgent' && r.status !== 'completed' && r.status !== 'cancelled').length; }
  completedToday(): number {
    const d = new Date(); d.setHours(0,0,0,0);
    return this.requests().filter(r => r.status === 'completed' && r.completedAt && new Date(r.completedAt) >= d).length;
  }

  constructor(private maintSvc: MaintenanceService, private staffSvc: StaffService, private roomSvc: RoomService) {}

  ngOnInit() { this.load(); this.staffSvc.getAll().subscribe({ next: (r: any) => this.staff.set(r.data.staff||[]) }); this.roomSvc.getAll({}).subscribe({ next: (r: any) => this.rooms.set(r.data.rooms||[]) }); }

  load() {
    const f: any = {};
    if (this.statusFilter)   f.status   = this.statusFilter;
    if (this.priorityFilter) f.priority = this.priorityFilter;
    if (this.catFilter)      f.category = this.catFilter;
    this.maintSvc.getAll(f).subscribe({ next: (r: any) => this.requests.set(r.data.requests||[]) });
  }

  filterList() { /* computed */ }

  blankReq() { return { title:'', category:'plumbing', priority:'medium', location:'', roomId:'', description:'', estimatedMinutes:0 }; }
  openForm()   { this.editingId.set(null); this.rf = this.blankReq(); this.formErr.set(''); this.showForm.set(true); }
  openEdit(r: any) { this.editingId.set(r._id); this.rf = { ...r, roomId: r.roomId?._id||r.roomId||'' }; this.formErr.set(''); this.showForm.set(true); }

  save() {
    if (!this.rf.title.trim()) { this.formErr.set('Title required'); return; }
    if (!this.rf.location.trim()) { this.formErr.set('Location required'); return; }
    this.saving.set(true); this.formErr.set('');
    const payload = { ...this.rf, roomId: this.rf.roomId||undefined };
    const eid = this.editingId();
    const req = eid ? this.maintSvc.update(eid, payload) : this.maintSvc.create(payload);
    req.subscribe({ next: () => { this.saving.set(false); this.showForm.set(false); this.load(); }, error: (e: any) => { this.saving.set(false); this.formErr.set(e.error?.message||'Error'); } });
  }

  updateStatus(id: string, status: string, extra?: any) {
    this.maintSvc.update(id, { status, ...extra }).subscribe(() => this.load());
  }

  openAssign(r: any) { this.assignTarget.set(r); this.assignTo = r.assignedToUserId?._id||''; this.showAssign.set(true); }
  submitAssign() {
    if (!this.assignTo) return;
    this.saving.set(true);
    this.maintSvc.update(this.assignTarget()._id, { status:'assigned', assignedToUserId: this.assignTo }).subscribe({ next: () => { this.saving.set(false); this.showAssign.set(false); this.load(); }, error: () => this.saving.set(false) });
  }

  openComplete(r: any) { this.completeTarget.set(r); this.resolutionNotes = ''; this.showComplete.set(true); }
  submitComplete() {
    this.saving.set(true);
    this.maintSvc.update(this.completeTarget()._id, { status:'completed', completedAt: new Date().toISOString(), resolutionNotes: this.resolutionNotes }).subscribe({ next: () => { this.saving.set(false); this.showComplete.set(false); this.load(); }, error: () => this.saving.set(false) });
  }

  confirmCancel(r: any) {
    this.showConfirm({ icon:'❌', title:'Cancel Request?', message:`Cancel "${r.title}"?`, confirmLabel:'Cancel Request', danger:true,
      action: () => this.maintSvc.update(r._id, { status:'cancelled' }).subscribe(() => this.load())
    });
  }

  priorityBorderColor(p: string): string { const m: Record<string,string>={low:'#94a3b8',medium:'#3b82f6',high:'#f59e0b',urgent:'#ef4444'}; return m[p]||'#94a3b8'; }
  catIcon(c: string): string { return CAT_ICONS[c]||'🔧'; }

  showConfirm(opts: any) { this.confirmDialog.set({ show:true, icon:opts.icon||'⚠️', title:opts.title, message:opts.message, confirmLabel:opts.confirmLabel||'Confirm', danger:opts.danger!==false, action:opts.action }); }
  acceptConfirm()  { const fn = this.confirmDialog().action; this.confirmDialog.update(d=>({...d,show:false})); fn(); }
  dismissConfirm() { this.confirmDialog.update(d=>({...d,show:false})); }
  bgClick(e: Event, t: string) { if (!(e.target as HTMLElement).classList.contains('overlay')) return; const map: Record<string,any>={req:this.showForm,assign:this.showAssign,complete:this.showComplete}; map[t]?.set(false); }
}
