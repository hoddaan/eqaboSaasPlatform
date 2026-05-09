import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MaintenanceService, StaffService, RoomService } from '../../core/services/api.service';

const CATS    = ['plumbing','electrical','hvac','furniture','appliance','structural','other'];
const CAT_ICONS: Record<string,string> = { plumbing:'🚿',electrical:'⚡',hvac:'❄️',furniture:'🪑',appliance:'📺',structural:'🏗',other:'🔧' };
const PRIORITIES = ['low','medium','high','urgent'];
const PRI_COLORS: Record<string,string> = { low:'#94a3b8',medium:'#3b82f6',high:'#f59e0b',urgent:'#ef4444' };
const PRI_BADGES: Record<string,string> = { low:'b-gray',medium:'b-blue',high:'b-yellow',urgent:'b-red' };
const STATUS_FLOW = ['open','assigned','in_progress','completed'];

type MTab = 'board'|'list'|'overview';

@Component({
  selector: 'app-maintenance',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `<div class="page-content">

  <div class="sec-head mb20">
    <div>
      <div style="font-size:18px;font-weight:800;letter-spacing:-.4px">🔧 Maintenance</div>
      <div style="font-size:12.5px;color:var(--muted);margin-top:3px">Requests · Assignments · Tracking · Costs</div>
    </div>
    <div style="display:flex;gap:8px">
      <input style="width:180px" [(ngModel)]="search" (input)="filterList()" placeholder="Search...">
      <button class="btn btn-g btn-sm" (click)="openForm()">+ New Request</button>
    </div>
  </div>

  <!-- Stats -->
  <div class="g4 mb20">
    <div class="mc" style="cursor:pointer" (click)="statusFilter='open';tab.set('list');load()">
      <div class="mc-ico">📋</div><div class="mc-lbl">Open</div>
      <div class="mc-val" style="color:var(--warn)">{{ dash().open }}</div>
    </div>
    <div class="mc" style="cursor:pointer" (click)="statusFilter='in_progress';tab.set('list');load()">
      <div class="mc-ico">🔧</div><div class="mc-lbl">In Progress</div>
      <div class="mc-val" style="color:var(--purple)">{{ dash().inProgress }}</div>
    </div>
    <div class="mc" style="cursor:pointer" (click)="priorityFilter='urgent';tab.set('list');load()">
      <div class="mc-ico">🚨</div><div class="mc-lbl">Urgent</div>
      <div class="mc-val" style="color:var(--danger)">{{ dash().urgent }}</div>
    </div>
    <div class="mc">
      <div class="mc-ico">✅</div><div class="mc-lbl">Done Today</div>
      <div class="mc-val" style="color:var(--success)">{{ dash().completedToday }}</div>
    </div>
  </div>

  <!-- Tabs -->
  <div style="display:flex;gap:4px;margin-bottom:16px;background:var(--bg);border-radius:12px;padding:4px;width:fit-content;border:1px solid var(--border)">
    <button class="btn btn-sm" [ngClass]="tab()==='board'?'btn-g':'btn-ghost'" (click)="tab.set('board')">📌 Board</button>
    <button class="btn btn-sm" [ngClass]="tab()==='list'?'btn-g':'btn-ghost'" (click)="tab.set('list')">📋 List</button>
    <button class="btn btn-sm" [ngClass]="tab()==='overview'?'btn-g':'btn-ghost'" (click)="tab.set('overview')">📊 Overview</button>
  </div>

  <!-- ══ BOARD TAB (Kanban) ══ -->
  <div *ngIf="tab()==='board'" style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;align-items:start">
    <div *ngFor="let col of boardColumns" style="background:var(--bg);border-radius:14px;padding:12px;border:1px solid var(--border)">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
        <div style="width:10px;height:10px;border-radius:50%" [style.background]="col.color"></div>
        <span style="font-weight:700;font-size:13px">{{ col.label }}</span>
        <span style="background:var(--border);border-radius:20px;padding:1px 8px;font-size:11px;font-weight:700;margin-left:auto">{{ boardCount(col.status) }}</span>
      </div>
      <div *ngFor="let r of boardCards(col.status)"
        class="card"
        style="margin-bottom:10px;padding:12px;border-left:3.5px solid;cursor:pointer"
        [style.border-left-color]="PRI_COLORS[r.priority]"
        (click)="openView(r)">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px">
          <div style="font-size:16px">{{ catIcon(r.category) }}</div>
          <span class="badge" [ngClass]="PRI_BADGES[r.priority]" style="font-size:9px">{{ r.priority | titlecase }}</span>
        </div>
        <div style="font-weight:700;font-size:12.5px;margin-bottom:3px;line-height:1.3">{{ r.title }}</div>
        <div style="font-size:11px;color:var(--muted);margin-bottom:6px">📍 {{ r.location }}</div>
        <div *ngIf="r.roomId" style="font-size:11px;color:var(--purple);margin-bottom:4px">🛏 Room {{ r.roomId.roomNumber }}</div>
        <div style="font-size:10.5px;color:var(--muted);display:flex;gap:6px;flex-wrap:wrap">
          <span *ngIf="r.assignedToUserId">👤 {{ r.assignedToUserId.name }}</span>
          <span>{{ r.createdAt | date:'MMM d' }}</span>
          <span *ngIf="r.estimatedMinutes">⏱ {{ r.estimatedMinutes }}min</span>
        </div>
        <div style="display:flex;gap:4px;margin-top:8px">
          <button *ngIf="r.status==='open'" class="btn btn-o btn-xs" style="flex:1" (click)="openAssign(r);$event.stopPropagation()">Assign</button>
          <button *ngIf="r.status==='assigned'" class="btn btn-o btn-xs" style="flex:1" (click)="quickStatus(r._id,'in_progress');$event.stopPropagation()">▶ Start</button>
          <button *ngIf="r.status==='in_progress'" class="btn btn-success btn-xs" style="flex:1" (click)="openComplete(r);$event.stopPropagation()">✓ Done</button>
          <button class="btn btn-danger btn-xs" (click)="confirmCancel(r);$event.stopPropagation()">✕</button>
        </div>
      </div>
      <div *ngIf="boardCount(col.status)===0" style="text-align:center;padding:20px 10px;color:var(--muted);font-size:12px">
        <div style="font-size:22px;margin-bottom:4px">{{ col.icon }}</div>Empty
      </div>
    </div>
  </div>

  <!-- ══ LIST TAB ══ -->
  <div *ngIf="tab()==='list'">
    <div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap">
      <select class="tb-sel" [(ngModel)]="statusFilter" (change)="load()">
        <option value="">All Status</option>
        <option value="open">Open</option><option value="assigned">Assigned</option>
        <option value="in_progress">In Progress</option><option value="completed">Completed</option>
        <option value="cancelled">Cancelled</option>
      </select>
      <select class="tb-sel" [(ngModel)]="priorityFilter" (change)="load()">
        <option value="">All Priority</option>
        <option *ngFor="let p of priorities" [value]="p">{{ p | titlecase }}</option>
      </select>
      <select class="tb-sel" [(ngModel)]="catFilter" (change)="load()">
        <option value="">All Categories</option>
        <option *ngFor="let c of cats" [value]="c">{{ catIcon(c) }} {{ c | titlecase }}</option>
      </select>
      <input type="date" class="tb-sel" [(ngModel)]="fromDate" (change)="load()" placeholder="From">
      <input type="date" class="tb-sel" [(ngModel)]="toDate" (change)="load()" placeholder="To">
    </div>
    <div class="card">
      <table class="tbl-hover">
        <thead>
          <tr><th>Title</th><th>Category</th><th>Location/Room</th><th>Priority</th><th>Assigned</th><th>Status</th><th>Cost</th><th>Date</th><th>Actions</th></tr>
        </thead>
        <tbody>
          <tr *ngFor="let r of filteredRequests()" style="cursor:pointer" (click)="openView(r)">
            <td style="font-weight:600">{{ catIcon(r.category) }} {{ r.title }}</td>
            <td style="font-size:11.5px;color:var(--muted)">{{ r.category | titlecase }}</td>
            <td style="font-size:12px">
              {{ r.location }}
              <div *ngIf="r.roomId" style="font-size:10.5px;color:var(--purple)">🛏 Room {{ r.roomId.roomNumber }}</div>
            </td>
            <td><span class="badge" [ngClass]="PRI_BADGES[r.priority]" style="font-size:9.5px">{{ r.priority | titlecase }}</span></td>
            <td style="font-size:11.5px">{{ r.assignedToUserId?.name || '—' }}</td>
            <td><span class="badge b-gray" style="font-size:9.5px">{{ r.status | titlecase }}</span></td>
            <td style="font-size:12px;font-weight:600">{{ r.actualCost ? '\$'+r.actualCost : '—' }}</td>
            <td style="font-size:11.5px;color:var(--muted)">{{ r.createdAt | date:'MMM d' }}</td>
            <td>
              <div style="display:flex;gap:3px" (click)="$event.stopPropagation()">
                <button *ngIf="r.status==='open'" class="btn btn-o btn-xs" (click)="openAssign(r)">Assign</button>
                <button *ngIf="r.status==='assigned'" class="btn btn-o btn-xs" (click)="quickStatus(r._id,'in_progress')">Start</button>
                <button *ngIf="r.status==='in_progress'" class="btn btn-success btn-xs" (click)="openComplete(r)">Done</button>
                <button *ngIf="!['completed','cancelled'].includes(r.status)" class="btn btn-danger btn-xs" (click)="confirmCancel(r)">✕</button>
              </div>
            </td>
          </tr>
          <tr *ngIf="!filteredRequests().length">
            <td colspan="9" style="text-align:center;padding:30px;color:var(--muted)">No requests found</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- ══ OVERVIEW TAB ══ -->
  <div *ngIf="tab()==='overview'" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px">
    <div class="card">
      <div style="font-size:13px;font-weight:700;margin-bottom:12px">By Status</div>
      <div *ngFor="let s of statusBreakdown()" style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
        <div style="width:10px;height:10px;border-radius:2px" [style.background]="s.color"></div>
        <span style="flex:1;font-size:12.5px">{{ s.label }}</span>
        <div style="height:6px;background:var(--border);border-radius:3px;flex:2;overflow:hidden">
          <div style="height:100%;border-radius:3px" [style.background]="s.color" [style.width.%]="s.pct"></div>
        </div>
        <span style="font-weight:700;font-size:12.5px;min-width:24px;text-align:right">{{ s.count }}</span>
      </div>
    </div>
    <div class="card">
      <div style="font-size:13px;font-weight:700;margin-bottom:12px">By Category</div>
      <div *ngFor="let c of catBreakdown()" style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
        <span style="font-size:16px">{{ catIcon(c.key) }}</span>
        <span style="flex:1;font-size:12.5px">{{ c.key | titlecase }}</span>
        <div style="height:6px;background:var(--border);border-radius:3px;flex:2;overflow:hidden">
          <div style="height:100%;background:var(--purple);border-radius:3px" [style.width.%]="c.pct"></div>
        </div>
        <span style="font-weight:700;font-size:12.5px;min-width:24px;text-align:right">{{ c.count }}</span>
      </div>
    </div>
    <div class="card">
      <div style="font-size:13px;font-weight:700;margin-bottom:12px">By Priority</div>
      <div *ngFor="let p of priorityBreakdown()" style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
        <div style="width:10px;height:10px;border-radius:50%" [style.background]="p.color"></div>
        <span style="flex:1;font-size:12.5px">{{ p.key | titlecase }}</span>
        <div style="height:6px;background:var(--border);border-radius:3px;flex:2;overflow:hidden">
          <div style="height:100%;border-radius:3px" [style.background]="p.color" [style.width.%]="p.pct"></div>
        </div>
        <span style="font-weight:700;font-size:12.5px;min-width:24px;text-align:right">{{ p.count }}</span>
      </div>
      <div style="border-top:1px solid var(--border);padding-top:10px;margin-top:6px">
        <div class="rj" style="font-size:12px"><span style="color:var(--muted)">Total maintenance cost</span><span style="font-weight:700;color:var(--purple)">\${{ dash().totalCost | number:'1.0-0' }}</span></div>
        <div class="rj" style="font-size:12px;margin-top:4px"><span style="color:var(--muted)">Avg completion time</span><span style="font-weight:700">{{ dash().avgMinutes }}min</span></div>
      </div>
    </div>
  </div>

  <!-- ══ LIGHTBOX ══ -->
  <div *ngIf="lightboxUrl()" style="position:fixed;inset:0;background:rgba(0,0,0,.92);z-index:99999;display:flex;align-items:center;justify-content:center"
    (click)="lightboxUrl.set(null)">
    <img [src]="lightboxUrl()" style="max-width:92vw;max-height:92vh;border-radius:10px;box-shadow:0 20px 60px rgba(0,0,0,.5)">
    <button style="position:absolute;top:20px;right:24px;background:rgba(255,255,255,.15);color:#fff;border:none;border-radius:50%;width:40px;height:40px;font-size:20px;cursor:pointer" (click)="lightboxUrl.set(null)">✕</button>
  </div>

  <!-- ══ CONFIRM ══ -->
  <div class="overlay" [class.show]="confirmDialog().show" style="z-index:9999">
    <div class="modal" style="width:400px;text-align:center">
      <div style="font-size:36px;margin-bottom:12px">{{ confirmDialog().icon }}</div>
      <div style="font-size:16px;font-weight:800;margin-bottom:8px">{{ confirmDialog().title }}</div>
      <div style="font-size:13px;color:var(--muted);margin-bottom:22px">{{ confirmDialog().message }}</div>
      <div style="display:flex;gap:10px">
        <button class="btn btn-o" style="flex:1" (click)="dismissConfirm()">Cancel</button>
        <button class="btn btn-danger" style="flex:2" (click)="acceptConfirm()">{{ confirmDialog().confirmLabel }}</button>
      </div>
    </div>
  </div>

  <!-- ══ VIEW / DETAIL MODAL ══ -->
  <div class="overlay" [class.show]="showView()" (click)="bgClick($event,'view')">
    <div class="modal" style="width:560px;max-height:92vh;overflow-y:auto">
      <div class="modal-head">
        <div class="modal-title">{{ catIcon(viewTarget()?.category) }} {{ viewTarget()?.title }}</div>
        <button class="modal-close" (click)="showView.set(false)">x</button>
      </div>
      <ng-container *ngIf="viewTarget()">
        <!-- Status pipeline -->
        <div style="display:flex;align-items:center;gap:0;margin-bottom:16px">
          <div *ngFor="let s of STATUS_FLOW; let i=index" style="display:flex;align-items:center;flex:1">
            <div style="flex:1;text-align:center">
              <div style="width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto;font-size:12px;font-weight:700;border:2px solid"
                [style.background]="statusPassed(viewTarget().status,s)?'var(--purple)':'var(--bg)'"
                [style.border-color]="statusPassed(viewTarget().status,s)?'var(--purple)':'var(--border)'"
                [style.color]="statusPassed(viewTarget().status,s)?'#fff':'var(--muted)'">
                {{ i+1 }}
              </div>
              <div style="font-size:10px;margin-top:3px;color:var(--muted)">{{ s | titlecase }}</div>
            </div>
            <div *ngIf="i<STATUS_FLOW.length-1" style="height:2px;background:var(--border);flex:0.5;margin-bottom:16px"
              [style.background]="statusPassed(viewTarget().status,STATUS_FLOW[i+1])?'var(--purple)':'var(--border)'">
            </div>
          </div>
        </div>

        <!-- Details grid -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">
          <div style="background:var(--bg);border-radius:10px;padding:10px 12px">
            <div style="font-size:10.5px;color:var(--muted);margin-bottom:2px">Priority</div>
            <span class="badge" [ngClass]="PRI_BADGES[viewTarget().priority]">{{ viewTarget().priority | titlecase }}</span>
          </div>
          <div style="background:var(--bg);border-radius:10px;padding:10px 12px">
            <div style="font-size:10.5px;color:var(--muted);margin-bottom:2px">Category</div>
            <div style="font-size:13px;font-weight:600">{{ catIcon(viewTarget().category) }} {{ viewTarget().category | titlecase }}</div>
          </div>
          <div style="background:var(--bg);border-radius:10px;padding:10px 12px">
            <div style="font-size:10.5px;color:var(--muted);margin-bottom:2px">Location</div>
            <div style="font-size:13px;font-weight:600">{{ viewTarget().location }}</div>
          </div>
          <div style="background:var(--bg);border-radius:10px;padding:10px 12px">
            <div style="font-size:10.5px;color:var(--muted);margin-bottom:2px">Room</div>
            <div style="font-size:13px;font-weight:600">{{ viewTarget().roomId ? '🛏 Room '+viewTarget().roomId.roomNumber : '—' }}</div>
          </div>
          <div style="background:var(--bg);border-radius:10px;padding:10px 12px">
            <div style="font-size:10.5px;color:var(--muted);margin-bottom:2px">Reported by</div>
            <div style="font-size:13px;font-weight:600">{{ viewTarget().reportedByUserId?.name }}</div>
          </div>
          <div style="background:var(--bg);border-radius:10px;padding:10px 12px">
            <div style="font-size:10.5px;color:var(--muted);margin-bottom:2px">Assigned to</div>
            <div style="font-size:13px;font-weight:600">{{ viewTarget().assignedToUserId?.name || '—' }}</div>
          </div>
          <div style="background:var(--bg);border-radius:10px;padding:10px 12px">
            <div style="font-size:10.5px;color:var(--muted);margin-bottom:2px">Estimated</div>
            <div style="font-size:13px;font-weight:600">{{ viewTarget().estimatedMinutes ? viewTarget().estimatedMinutes+'min' : '—' }}</div>
          </div>
          <div style="background:var(--bg);border-radius:10px;padding:10px 12px">
            <div style="font-size:10.5px;color:var(--muted);margin-bottom:2px">Cost Estimate</div>
            <div style="font-size:13px;font-weight:600">\${{ viewTarget().costEstimate || 0 }}</div>
          </div>
        </div>

        <div *ngIf="viewTarget().description" style="background:var(--bg);border-radius:10px;padding:10px 12px;margin-bottom:12px">
          <div style="font-size:10.5px;color:var(--muted);margin-bottom:4px">Description</div>
          <div style="font-size:12.5px">{{ viewTarget().description }}</div>
        </div>

        <div *ngIf="viewTarget().resolutionNotes" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:10px 12px;margin-bottom:12px">
          <div style="font-size:10.5px;color:var(--success);margin-bottom:4px">✅ Resolution Notes</div>
          <div style="font-size:12.5px">{{ viewTarget().resolutionNotes }}</div>
          <div *ngIf="viewTarget().actualCost" style="font-size:12px;color:var(--muted);margin-top:4px">Actual cost: <strong>\${{ viewTarget().actualCost }}</strong></div>
        </div>

        <!-- Parts used -->
        <div *ngIf="viewTarget().partsUsed?.length" style="background:var(--bg);border-radius:10px;padding:10px 12px;margin-bottom:12px">
          <div style="font-size:10.5px;color:var(--muted);margin-bottom:6px">Parts Used</div>
          <div *ngFor="let p of viewTarget().partsUsed" class="rj" style="font-size:12px;margin-bottom:3px">
            <span>{{ p.name }} × {{ p.quantity }}</span><span style="font-weight:600">\${{ p.cost }}</span>
          </div>
        </div>

        <!-- Issue Images gallery -->
        <div *ngIf="viewTarget().issueImages?.length && canSeeIssueImages(viewTarget())" style="margin-bottom:12px">
          <div style="font-size:10.5px;color:var(--muted);margin-bottom:6px">📸 Issue Photos</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <img *ngFor="let img of viewTarget().issueImages"
              [src]="getImageUrl(img)" alt="Issue photo"
              style="width:90px;height:90px;object-fit:cover;border-radius:8px;border:1.5px solid var(--border);cursor:pointer"
              (click)="openLightbox(img)">
          </div>
        </div>

        <!-- Proof Images gallery -->
        <div *ngIf="viewTarget().proofImages?.length && canSeeProofImages(viewTarget())" style="margin-bottom:12px">
          <div style="font-size:10.5px;color:var(--success);margin-bottom:6px;font-weight:700">✅ Proof of Completion</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <img *ngFor="let img of viewTarget().proofImages"
              [src]="getImageUrl(img)" alt="Proof photo"
              style="width:90px;height:90px;object-fit:cover;border-radius:8px;border:2px solid #bbf7d0;cursor:pointer"
              (click)="openLightbox(img)">
          </div>
        </div>

        <!-- Restricted image notice -->
        <div *ngIf="viewTarget().issueImages?.length && !canSeeIssueImages(viewTarget())"
          style="background:#f1f5f9;border-radius:8px;padding:8px 12px;font-size:12px;color:var(--muted);margin-bottom:10px">
          🔒 Issue photos visible to assigned technician and managers only
        </div>
        <div *ngIf="viewTarget().proofImages?.length && !canSeeProofImages(viewTarget())"
          style="background:#f1f5f9;border-radius:8px;padding:8px 12px;font-size:12px;color:var(--muted);margin-bottom:10px">
          🔒 Proof photos visible to assigned technician and managers only
        </div>

        <!-- Actions -->
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button *ngIf="viewTarget().status==='open'" class="btn btn-o btn-sm" (click)="openAssign(viewTarget());showView.set(false)">Assign Technician</button>
          <button *ngIf="viewTarget().status==='assigned'" class="btn btn-o btn-sm" (click)="quickStatus(viewTarget()._id,'in_progress');showView.set(false)">▶ Start Work</button>
          <button *ngIf="viewTarget().status==='in_progress'" class="btn btn-success btn-sm" (click)="openComplete(viewTarget());showView.set(false)">✓ Mark Complete</button>
          <button class="btn btn-o btn-sm" (click)="openEdit(viewTarget());showView.set(false)">✏ Edit</button>
          <button *ngIf="!['completed','cancelled'].includes(viewTarget().status)" class="btn btn-danger btn-sm" (click)="confirmCancel(viewTarget());showView.set(false)">Cancel</button>
        </div>
      </ng-container>
    </div>
  </div>

  <!-- ══ NEW/EDIT REQUEST FORM ══ -->
  <div class="overlay" [class.show]="showForm()" (click)="bgClick($event,'req')">
    <div class="modal" style="width:560px;max-height:90vh;overflow-y:auto">
      <div class="modal-head">
        <div class="modal-title">{{ editingId() ? 'Edit Request' : 'New Maintenance Request' }}</div>
        <button class="modal-close" (click)="showForm.set(false)">x</button>
      </div>
      <div class="fg"><label>Title *</label><input [(ngModel)]="rf.title" placeholder="e.g. Leaking tap in bathroom..."></div>
      <div class="form-row">
        <div class="fg"><label>Category *</label>
          <select [(ngModel)]="rf.category">
            <option *ngFor="let c of cats" [value]="c">{{ catIcon(c) }} {{ c | titlecase }}</option>
          </select>
        </div>
        <div class="fg"><label>Priority *</label>
          <div style="display:flex;gap:5px;margin-top:4px">
            <button *ngFor="let p of priorities" class="btn btn-xs"
              [ngClass]="rf.priority===p?'btn-g':'btn-o'"
              (click)="rf.priority=p" style="flex:1"
              [style.border-color]="rf.priority===p?'':PRI_COLORS[p]"
              [style.color]="rf.priority===p?'':PRI_COLORS[p]">{{ p | titlecase }}</button>
          </div>
        </div>
      </div>
      <div class="form-row">
        <div class="fg"><label>Location *</label><input [(ngModel)]="rf.location" placeholder="Room 101, Lobby, Pool area..."></div>
        <div class="fg"><label>Specific Room (optional)</label>
          <select [(ngModel)]="rf.roomId" (change)="onRoomSelect()">
            <option value="">No specific room</option>
            <option *ngFor="let r of rooms()" [value]="r._id">Room {{ r.roomNumber }} ({{ r.type | titlecase }}) — {{ r.status | titlecase }}</option>
          </select>
        </div>
      </div>

      <!-- Room status alert -->
      <div *ngIf="rf.roomId" style="background:#fff7ed;border:1.5px solid #fed7aa;border-radius:10px;padding:10px 14px;margin-bottom:12px">
        <div style="font-size:12.5px;font-weight:700;color:#c2410c;margin-bottom:6px">🛏 Room Status</div>
        <div style="font-size:12px;color:var(--muted);margin-bottom:8px">Should this room be taken out of service during maintenance?</div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-xs" [ngClass]="rf.affectsRoom?'btn-danger':'btn-o'" (click)="rf.affectsRoom=true">
            ⚠ Yes — Mark room as maintenance
          </button>
          <button class="btn btn-xs" [ngClass]="!rf.affectsRoom?'btn-g':'btn-o'" (click)="rf.affectsRoom=false">
            ✓ No — Room stays available
          </button>
        </div>
        <div *ngIf="rf.affectsRoom" style="margin-top:6px;font-size:11.5px;color:#b45309">
          Room will be set to <strong>Maintenance</strong> status until this request is completed.
        </div>
      </div>

      <div class="fg"><label>Description</label><textarea rows="2" [(ngModel)]="rf.description" placeholder="Details of the issue..."></textarea></div>

      <!-- Issue Images -->
      <div class="fg">
        <label>Issue Photos (optional)</label>
        <div style="border:2px dashed var(--border);border-radius:10px;padding:14px;text-align:center;cursor:pointer;transition:all .15s"
          [style.border-color]="dragOver?'var(--purple)':'var(--border)'"
          [style.background]="dragOver?'#f3e8ff':'var(--bg)'"
          (dragover)="$event.preventDefault();dragOver=true"
          (dragleave)="dragOver=false"
          (drop)="onIssueDrop($event)"
          (click)="issueFileInput.click()">
          <div style="font-size:24px;margin-bottom:4px">📸</div>
          <div style="font-size:12.5px;color:var(--muted)">Click or drag &amp; drop images here</div>
          <div style="font-size:11px;color:var(--muted)">JPG, PNG, WEBP up to 10MB each</div>
        </div>
        <input #issueFileInput type="file" accept="image/*" multiple style="display:none" (change)="onIssueFileSelect($event)">
        <!-- Preview -->
        <div *ngIf="issueImagePreviews.length" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">
          <div *ngFor="let img of issueImagePreviews; let i=index"
            style="position:relative;width:80px;height:80px;border-radius:8px;overflow:hidden;border:1.5px solid var(--border)">
            <img [src]="img.preview" style="width:100%;height:100%;object-fit:cover">
            <button (click)="removeIssuePreview(i)"
              style="position:absolute;top:2px;right:2px;background:rgba(0,0,0,.6);color:#fff;border:none;border-radius:50%;width:18px;height:18px;font-size:10px;cursor:pointer;display:flex;align-items:center;justify-content:center">✕</button>
          </div>
        </div>
        <div *ngIf="issueUploadProgress()" style="font-size:11.5px;color:var(--purple);margin-top:4px">📤 Uploading images...</div>
      </div>

      <div class="form-row">
        <div class="fg"><label>Estimated Time (min)</label><input type="number" [(ngModel)]="rf.estimatedMinutes" min="0" placeholder="30"></div>
        <div class="fg"><label>Cost Estimate (\$)</label><input type="number" [(ngModel)]="rf.costEstimate" min="0" placeholder="0"></div>
        <div class="fg"><label>Scheduled Date</label><input type="datetime-local" [(ngModel)]="rf.scheduledDate"></div>
      </div>
      <div *ngIf="formErr()" style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:10px;font-size:12.5px;color:#b91c1c;margin-bottom:10px">{{ formErr() }}</div>
      <div style="display:flex;gap:10px">
        <button class="btn btn-o" style="flex:1" (click)="showForm.set(false)">Cancel</button>
        <button class="btn btn-g" style="flex:2" (click)="save()" [disabled]="saving()">
          {{ saving()?(editingId()?'Updating...':'Submitting...'):(editingId()?'Update Request':'Submit Request') }}
        </button>
      </div>
    </div>
  </div>

  <!-- ══ ASSIGN MODAL ══ -->
  <div class="overlay" [class.show]="showAssign()" (click)="bgClick($event,'assign')">
    <div class="modal" style="width:440px">
      <div class="modal-head"><div class="modal-title">👤 Assign Technician</div><button class="modal-close" (click)="showAssign.set(false)">x</button></div>
      <div *ngIf="assignTarget()" style="background:var(--bg);border-radius:10px;padding:10px 14px;margin-bottom:14px">
        <div style="font-weight:700">{{ catIcon(assignTarget().category) }} {{ assignTarget().title }}</div>
        <div style="font-size:11.5px;color:var(--muted)">{{ assignTarget().location }}</div>
      </div>
      <div class="fg"><label>Select Technician *</label>
        <select [(ngModel)]="assignTo">
          <option value="">-- Select --</option>
          <option *ngFor="let m of technicians()" [value]="m._id">{{ m.name }} ({{ m.department | titlecase }}) — {{ m.role }}</option>
        </select>
      </div>
      <div *ngIf="!technicians().length" style="font-size:12px;color:var(--warn);margin-bottom:10px">No technicians found. Go to Staff and add a staff member with the role "Technician".</div>
      <div style="display:flex;gap:10px">
        <button class="btn btn-o" style="flex:1" (click)="showAssign.set(false)">Cancel</button>
        <button class="btn btn-g" style="flex:2" (click)="submitAssign()" [disabled]="saving()||!assignTo">Assign &amp; Start</button>
      </div>
    </div>
  </div>

  <!-- ══ COMPLETE MODAL ══ -->
  <div class="overlay" [class.show]="showComplete()" (click)="bgClick($event,'complete')">
    <div class="modal" style="width:500px">
      <div class="modal-head"><div class="modal-title">✅ Mark as Completed</div><button class="modal-close" (click)="showComplete.set(false)">x</button></div>
      <div *ngIf="completeTarget()" style="background:var(--bg);border-radius:10px;padding:10px 14px;margin-bottom:14px">
        <div style="font-weight:700">{{ catIcon(completeTarget().category) }} {{ completeTarget().title }}</div>
        <div *ngIf="completeTarget().roomId" style="font-size:12px;color:var(--purple);margin-top:4px">
          🛏 Room {{ completeTarget().roomId.roomNumber }} — will be set back to <strong>Available</strong>
        </div>
      </div>
      <div class="fg"><label>Resolution Notes *</label><textarea rows="3" [(ngModel)]="completionNotes" placeholder="What was done to fix the issue, parts replaced..."></textarea></div>
      <div class="form-row">
        <div class="fg"><label>Actual Cost (\$)</label><input type="number" [(ngModel)]="completionCost" min="0" placeholder="0"></div>
        <div class="fg"><label>Time Taken (min)</label><input type="number" [(ngModel)]="completionMinutes" min="0"></div>
      </div>
      <!-- Parts used -->
      <div style="font-size:11.5px;font-weight:700;color:var(--text2);margin:8px 0 6px">Parts Used (optional)</div>
      <div *ngFor="let p of completionParts; let i=index" style="display:flex;gap:6px;margin-bottom:6px">
        <input [(ngModel)]="p.name" placeholder="Part name" style="flex:2">
        <input type="number" [(ngModel)]="p.quantity" min="1" style="width:60px" placeholder="Qty">
        <input type="number" [(ngModel)]="p.cost" min="0" style="width:70px" placeholder="\$Cost">
        <button class="btn btn-danger btn-xs" (click)="removePart(i)">x</button>
      </div>
      <button class="btn btn-o btn-xs" (click)="addPart()">+ Add Part</button>

      <!-- Proof Images -->
      <div style="margin-top:12px">
        <label style="font-size:11.5px;font-weight:700;color:var(--text2)">Proof of Completion Photos *</label>
        <div style="border:2px dashed var(--border);border-radius:10px;padding:12px;text-align:center;cursor:pointer;margin-top:5px;transition:all .15s"
          [style.border-color]="dragOverProof?'var(--success)':'var(--border)'"
          [style.background]="dragOverProof?'#f0fdf4':'var(--bg)'"
          (dragover)="$event.preventDefault();dragOverProof=true"
          (dragleave)="dragOverProof=false"
          (drop)="onProofDrop($event)"
          (click)="proofFileInput.click()">
          <div style="font-size:22px;margin-bottom:3px">✅📷</div>
          <div style="font-size:12.5px;color:var(--muted)">Upload photos showing work is done</div>
          <div style="font-size:11px;color:var(--muted)">Click or drag &amp; drop</div>
        </div>
        <input #proofFileInput type="file" accept="image/*" multiple style="display:none" (change)="onProofFileSelect($event)">
        <div *ngIf="proofImagePreviews.length" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">
          <div *ngFor="let img of proofImagePreviews; let i=index"
            style="position:relative;width:80px;height:80px;border-radius:8px;overflow:hidden;border:2px solid #bbf7d0">
            <img [src]="img.preview" style="width:100%;height:100%;object-fit:cover">
            <button (click)="removeProofPreview(i)"
              style="position:absolute;top:2px;right:2px;background:rgba(0,0,0,.6);color:#fff;border:none;border-radius:50%;width:18px;height:18px;font-size:10px;cursor:pointer;display:flex;align-items:center;justify-content:center">✕</button>
          </div>
        </div>
        <div *ngIf="proofUploadProgress()" style="font-size:11.5px;color:var(--success);margin-top:4px">📤 Uploading proof images...</div>
      </div>

      <div style="display:flex;gap:10px;margin-top:14px">
        <button class="btn btn-o" style="flex:1" (click)="showComplete.set(false)">Cancel</button>
        <button class="btn btn-success" style="flex:2" (click)="submitComplete()" [disabled]="saving()||!completionNotes.trim()">✅ Mark Completed</button>
      </div>
    </div>
  </div>

</div>`,
})
export class MaintenanceComponent implements OnInit {
  tab         = signal<MTab>('board');
  requests    = signal<any[]>([]);
  staff       = signal<any[]>([]);
  rooms       = signal<any[]>([]);
  dash        = signal<any>({ open:0,inProgress:0,urgent:0,completedToday:0,totalCost:0,avgMinutes:0,byStatus:{},byPriority:{},byCategory:{} });
  saving      = signal(false);
  showForm    = signal(false);
  showAssign  = signal(false);
  showComplete = signal(false);
  showView    = signal(false);
  editingId   = signal<string|null>(null);
  assignTarget   = signal<any>(null);
  completeTarget = signal<any>(null);
  viewTarget     = signal<any>(null);
  formErr     = signal('');
  confirmDialog = signal<any>({ show:false,icon:'⚠️',title:'',message:'',confirmLabel:'Confirm',action:()=>{} });

  search         = '';
  statusFilter   = '';
  priorityFilter = '';
  catFilter      = '';
  fromDate       = '';
  toDate         = '';
  assignTo       = '';
  completionNotes   = '';
  completionCost    = 0;
  completionMinutes = 0;
  completionParts: any[] = [];
  issueImagePreviews: any[]  = [];
  proofImagePreviews: any[]  = [];
  issueImageFiles: File[]    = [];
  proofImageFiles: File[]    = [];
  issueUploadProgress        = signal(false);
  proofUploadProgress        = signal(false);
  lightboxUrl                = signal<string|null>(null);
  dragOver                   = false;
  dragOverProof              = false;
  currentUser: any           = JSON.parse(localStorage.getItem('user') || '{}');

  rf: any = this.blankReq();

  cats       = CATS;
  priorities = PRIORITIES;
  PRI_COLORS = PRI_COLORS;
  PRI_BADGES = PRI_BADGES;
  STATUS_FLOW = STATUS_FLOW;

  boardColumns = [
    { status:'open',        label:'Open',        color:'#f59e0b', icon:'📋' },
    { status:'assigned',    label:'Assigned',    color:'#3b82f6', icon:'👤' },
    { status:'in_progress', label:'In Progress', color:'#8b5cf6', icon:'🔧' },
    { status:'completed',   label:'Completed',   color:'#22c55e', icon:'✅' },
  ];

  readonly technicians = computed(() =>
    this.staff().filter((m: any) => m.role === 'Technician')
  );

  readonly filteredRequests = computed(() => {
    const q = this.search.toLowerCase();
    return this.requests().filter((r: any) =>
      !q || r.title.toLowerCase().includes(q) || r.location.toLowerCase().includes(q) ||
      r.roomId?.roomNumber?.includes(q)
    );
  });

  boardCards(status: string) { return this.requests().filter((r: any) => r.status === status); }
  boardCount(status: string) { return this.requests().filter((r: any) => r.status === status).length; }

  statusPassed(current: string, check: string): boolean {
    return STATUS_FLOW.indexOf(current) >= STATUS_FLOW.indexOf(check);
  }

  statusBreakdown() {
    const d = this.dash().byStatus; const total: number = (Object.values(d).reduce((s: number,v: any)=>s+Number(v), 0) as number)||1;
    const colors: Record<string,string> = { open:'#f59e0b',assigned:'#3b82f6',in_progress:'#8b5cf6',completed:'#22c55e',cancelled:'#94a3b8' };
    return Object.entries(d).map(([k,v]: any) => ({ label:k.replace('_',' '), count:v, pct:Math.round(Number(v)/total*100), color:colors[k]||'#94a3b8' }));
  }

  catBreakdown() {
    const d = this.dash().byCategory; const total: number = (Object.values(d).reduce((s: number,v: any)=>s+Number(v), 0) as number)||1;
    return Object.entries(d).map(([k,v]: any) => ({ key:k, count:v, pct:Math.round(Number(v)/total*100) })).sort((a,b)=>b.count-a.count);
  }

  priorityBreakdown() {
    const d = this.dash().byPriority; const total: number = (Object.values(d).reduce((s: number,v: any)=>s+Number(v), 0) as number)||1;
    return Object.entries(d).map(([k,v]: any) => ({ key:k, count:v, pct:Math.round(Number(v)/total*100), color:PRI_COLORS[k]||'#94a3b8' }));
  }

  constructor(private maintSvc: MaintenanceService, private staffSvc: StaffService, private roomSvc: RoomService) {}

  ngOnInit() {
    this.load();
    this.loadDash();
    this.staffSvc.getAll().subscribe({ next: (r: any) => this.staff.set(r.data.staff||[]) });
    this.roomSvc.getAll({}).subscribe({ next: (r: any) => this.rooms.set(r.data.rooms||[]) });
  }

  load() {
    const f: any = {};
    if (this.statusFilter)   f.status   = this.statusFilter;
    if (this.priorityFilter) f.priority = this.priorityFilter;
    if (this.catFilter)      f.category = this.catFilter;
    if (this.fromDate)       f.from     = this.fromDate;
    if (this.toDate)         f.to       = this.toDate;
    this.maintSvc.getAll(f).subscribe({ next: (r: any) => this.requests.set(r.data.requests||[]) });
  }

  loadDash() { this.maintSvc.getDashboard().subscribe({ next: (r: any) => this.dash.set(r.data||{}) }); }
  filterList() { /* computed */ }

  blankReq() { return { title:'', category:'plumbing', priority:'medium', location:'', roomId:'', description:'', estimatedMinutes:0, costEstimate:0, scheduledDate:'', affectsRoom:false }; }

  openForm()   { this.editingId.set(null); this.rf = this.blankReq(); this.formErr.set(''); this.issueImagePreviews = []; this.issueImageFiles = []; this.showForm.set(true); }
  openEdit(r: any) {
    this.editingId.set(r._id);
    this.rf = { title:r.title, category:r.category, priority:r.priority, location:r.location, roomId:r.roomId?._id||r.roomId||'', description:r.description||'', estimatedMinutes:r.estimatedMinutes||0, costEstimate:r.costEstimate||0, scheduledDate:r.scheduledDate?new Date(r.scheduledDate).toISOString().slice(0,16):'', affectsRoom:r.affectsRoom||false };
    this.issueImagePreviews = []; this.issueImageFiles = [];
    this.formErr.set(''); this.showForm.set(true);
  }
  openView(r: any) { this.viewTarget.set(r); this.showView.set(true); }

  onRoomSelect() {
    if (!this.rf.roomId) { this.rf.affectsRoom = false; return; }
    // Auto-suggest affecting room for high/urgent
    if (['high','urgent'].includes(this.rf.priority)) this.rf.affectsRoom = true;
  }

  save() {
    if (!this.rf.title.trim()) { this.formErr.set('Title required'); return; }
    if (!this.rf.location.trim()) { this.formErr.set('Location required'); return; }
    this.saving.set(true); this.formErr.set('');
    const payload = { ...this.rf, roomId: this.rf.roomId||undefined, scheduledDate: this.rf.scheduledDate||undefined };
    const eid = this.editingId();
    const req = eid ? this.maintSvc.update(eid, payload) : this.maintSvc.create(payload);
    req.subscribe({
      next: (r: any) => {
        const id = r.data.request._id;
        // Upload issue images if any
        if (this.issueImageFiles.length && !eid) {
          this.issueUploadProgress.set(true);
          this.maintSvc.uploadImages(id, this.issueImageFiles, 'issue').subscribe({
            next: () => { this.issueUploadProgress.set(false); this.issueImagePreviews = []; this.issueImageFiles = []; },
            error: () => this.issueUploadProgress.set(false),
          });
        }
        this.saving.set(false); this.showForm.set(false); this.load(); this.loadDash();
      },
      error: (e: any) => { this.saving.set(false); this.formErr.set(e.error?.message||'Error'); },
    });
  }

  quickStatus(id: string, status: string) {
    this.maintSvc.update(id, { status }).subscribe(() => { this.load(); this.loadDash(); });
  }

  openAssign(r: any) { this.assignTarget.set(r); this.assignTo = r.assignedToUserId?._id||''; this.showAssign.set(true); }
  submitAssign() {
    if (!this.assignTo) return;
    this.saving.set(true);
    this.maintSvc.update(this.assignTarget()._id, { status:'assigned', assignedToUserId: this.assignTo }).subscribe({
      next: () => { this.saving.set(false); this.showAssign.set(false); this.load(); this.loadDash(); },
      error: () => this.saving.set(false),
    });
  }

  openComplete(r: any) { this.completeTarget.set(r); this.completionNotes = ''; this.completionCost = 0; this.completionMinutes = 0; this.completionParts = []; this.proofImagePreviews = []; this.proofImageFiles = []; this.showComplete.set(true); }
  submitComplete() {
    if (!this.completionNotes.trim()) return;
    this.saving.set(true);
    this.maintSvc.update(this.completeTarget()._id, {
      status: 'completed',
      resolutionNotes: this.completionNotes,
      actualCost: this.completionCost,
      estimatedMinutes: this.completionMinutes || this.completeTarget().estimatedMinutes,
      partsUsed: this.completionParts.filter((p: any) => p.name.trim()),
    }).subscribe({
      next: () => {
        const id = this.completeTarget()._id;
        if (this.proofImageFiles.length) {
          this.proofUploadProgress.set(true);
          this.maintSvc.uploadImages(id, this.proofImageFiles, 'proof').subscribe({
            next: () => { this.proofUploadProgress.set(false); this.proofImagePreviews = []; this.proofImageFiles = []; },
            error: () => this.proofUploadProgress.set(false),
          });
        }
        this.saving.set(false); this.showComplete.set(false); this.load(); this.loadDash();
      },
      error: () => this.saving.set(false),
    });
  }

  confirmCancel(r: any) {
    this.showConfirm({ icon:'❌', title:'Cancel Request?', message:'Cancel "'+r.title+'"?', confirmLabel:'Cancel Request',
      action: () => this.maintSvc.remove(r._id).subscribe(() => { this.load(); this.loadDash(); })
    });
  }

  addPart()          { this.completionParts = [...this.completionParts, { name:'', quantity:1, cost:0 }]; }
  removePart(i: number) { this.completionParts = this.completionParts.filter((_: any, idx: number) => idx !== i); }

  // ── Image Visibility ──
  canSeeIssueImages(r: any): boolean {
    if (!r) return false;
    const u = this.currentUser;
    const managRoles = ['SuperAdmin','CompanyAdmin','HotelAdmin','Manager'];
    if (managRoles.includes(u.role)) return true;
    // Reporter can see their own issue images
    if (r.reportedByUserId?._id === u._id || r.reportedByUserId === u._id) return true;
    // Assigned technician can also see
    if (r.assignedToUserId?._id === u._id || r.assignedToUserId === u._id) return true;
    return false;
  }

  canSeeProofImages(r: any): boolean {
    if (!r) return false;
    const u = this.currentUser;
    const managRoles = ['SuperAdmin','CompanyAdmin','HotelAdmin','Manager'];
    if (managRoles.includes(u.role)) return true;
    // Only the assigned technician and managers can see proof images
    if (r.assignedToUserId?._id === u._id || r.assignedToUserId === u._id) return true;
    return false;
  }

  // ── Image Upload ──
  getImageUrl(path: string): string {
    return `http://localhost:5000${path}`;
  }

  openLightbox(img: string) { this.lightboxUrl.set(this.getImageUrl(img)); }

  onIssueFileSelect(e: Event) {
    const files = Array.from((e.target as HTMLInputElement).files || []);
    this.addIssueFiles(files);
  }
  onIssueDrop(e: DragEvent) {
    e.preventDefault(); this.dragOver = false;
    const files = Array.from(e.dataTransfer?.files || []);
    this.addIssueFiles(files);
  }
  addIssueFiles(files: File[]) {
    files.forEach(f => {
      this.issueImageFiles.push(f);
      const reader = new FileReader();
      reader.onload = (ev) => this.issueImagePreviews = [...this.issueImagePreviews, { preview: ev.target?.result, file: f }];
      reader.readAsDataURL(f);
    });
  }
  removeIssuePreview(i: number) {
    this.issueImagePreviews = this.issueImagePreviews.filter((_: any, idx: number) => idx !== i);
    this.issueImageFiles = this.issueImageFiles.filter((_: any, idx: number) => idx !== i);
  }

  onProofFileSelect(e: Event) {
    const files = Array.from((e.target as HTMLInputElement).files || []);
    this.addProofFiles(files);
  }
  onProofDrop(e: DragEvent) {
    e.preventDefault(); this.dragOverProof = false;
    const files = Array.from(e.dataTransfer?.files || []);
    this.addProofFiles(files);
  }
  addProofFiles(files: File[]) {
    files.forEach(f => {
      this.proofImageFiles.push(f);
      const reader = new FileReader();
      reader.onload = (ev) => this.proofImagePreviews = [...this.proofImagePreviews, { preview: ev.target?.result, file: f }];
      reader.readAsDataURL(f);
    });
  }
  removeProofPreview(i: number) {
    this.proofImagePreviews = this.proofImagePreviews.filter((_: any, idx: number) => idx !== i);
    this.proofImageFiles = this.proofImageFiles.filter((_: any, idx: number) => idx !== i);
  }

  catIcon(c: string): string { return CAT_ICONS[c]||'🔧'; }

  showConfirm(opts: any) { this.confirmDialog.set({ show:true, icon:opts.icon||'⚠️', title:opts.title, message:opts.message, confirmLabel:opts.confirmLabel||'Confirm', action:opts.action }); }
  acceptConfirm()  { const fn = this.confirmDialog().action; this.confirmDialog.update(d=>({...d,show:false})); fn(); }
  dismissConfirm() { this.confirmDialog.update(d=>({...d,show:false})); }
  bgClick(e: Event, t: string) { if (!(e.target as HTMLElement).classList.contains('overlay')) return; const map: Record<string,any>={req:this.showForm,assign:this.showAssign,complete:this.showComplete,view:this.showView}; map[t]?.set(false); }
}
