import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StaffService } from '../../core/services/api.service';

type HTab = 'overview'|'staff'|'leaves'|'attendance'|'payroll';
const DEPTS = ['front_desk','housekeeping','restaurant','maintenance','security','finance','management','other'];
const DEPT_ICONS: Record<string,string> = { front_desk:'🛎',housekeeping:'🧹',restaurant:'🍽',maintenance:'🔧',security:'🔒',finance:'💰',management:'👔',other:'👤' };
const ROLES = ['Receptionist','RestaurantStaff','Technician','Finance','Manager','HotelAdmin'];
const SHIFTS = ['morning','afternoon','night','flexible'];
const SHIFT_ICONS: Record<string,string> = { morning:'🌅',afternoon:'☀️',night:'🌙',flexible:'⏰' };
const DAYS = ['sun','mon','tue','wed','thu','fri','sat'];

@Component({
  selector: 'app-staff',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `<div class="page-content">

  <div class="sec-head mb20">
    <div>
      <div style="font-size:18px;font-weight:800;letter-spacing:-.4px">👥 HR &amp; Staff</div>
      <div style="font-size:12.5px;color:var(--muted);margin-top:3px">Staff · Attendance · Leave Management · Payroll</div>
    </div>
    <div style="display:flex;gap:8px">
      <input style="width:180px" [(ngModel)]="search" (input)="filterStaff()" placeholder="Search staff...">
      <button *ngIf="tab()==='staff'" class="btn btn-g btn-sm" (click)="openForm()">+ Add Staff</button>
      <button *ngIf="tab()==='leaves'" class="btn btn-g btn-sm" (click)="openLeaveForm()">+ Leave Request</button>
      <button *ngIf="tab()==='attendance'" class="btn btn-g btn-sm" (click)="openBulkAttendance()">Mark Today</button>
    </div>
  </div>

  <div class="g4 mb20">
    <div class="mc"><div class="mc-ico">👥</div><div class="mc-lbl">Total Staff</div><div class="mc-val">{{ dash().totalStaff }}</div></div>
    <div class="mc"><div class="mc-ico">✅</div><div class="mc-lbl">Present Today</div><div class="mc-val" style="color:var(--success)">{{ dash().todayPresent }}</div></div>
    <div class="mc"><div class="mc-ico">❌</div><div class="mc-lbl">Absent Today</div><div class="mc-val" style="color:var(--danger)">{{ dash().todayAbsent }}</div></div>
    <div class="mc"><div class="mc-ico">📋</div><div class="mc-lbl">Pending Leaves</div><div class="mc-val" style="color:var(--warn)">{{ dash().pendingLeaves }}</div></div>
  </div>

  <div style="display:flex;gap:4px;margin-bottom:16px;background:var(--bg);border-radius:12px;padding:4px;width:fit-content;border:1px solid var(--border)">
    <button class="btn btn-sm" [ngClass]="tab()==='overview'?'btn-g':'btn-ghost'" (click)="tab.set('overview')">Overview</button>
    <button class="btn btn-sm" [ngClass]="tab()==='staff'?'btn-g':'btn-ghost'" (click)="tab.set('staff')">Staff ({{ filteredStaff().length }})</button>
    <button class="btn btn-sm" [ngClass]="tab()==='leaves'?'btn-g':'btn-ghost'" (click)="tab.set('leaves');loadLeaves()">Leaves ({{ pendingLeaves().length }})</button>
    <button class="btn btn-sm" [ngClass]="tab()==='attendance'?'btn-g':'btn-ghost'" (click)="tab.set('attendance');loadAttendance()">Attendance</button>
    <button class="btn btn-sm" [ngClass]="tab()==='payroll'?'btn-g':'btn-ghost'" (click)="tab.set('payroll');loadPayroll()">💰 Payroll</button>
  </div>

  <!-- OVERVIEW -->
  <div *ngIf="tab()==='overview'" style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
    <div class="card">
      <div style="font-size:13px;font-weight:700;margin-bottom:14px">By Department</div>
      <div *ngFor="let d of (dash().departments||[])" style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)">
        <span style="font-size:18px">{{ deptIcon(d._id) }}</span>
        <div style="flex:1;font-weight:600;font-size:13px">{{ d._id | titlecase }}</div>
        <div style="display:flex;align-items:center;gap:8px">
          <div style="height:6px;background:var(--border);border-radius:3px;width:80px;overflow:hidden">
            <div style="height:100%;background:var(--grad);border-radius:3px" [style.width.%]="dash().totalStaff>0?(d.count/dash().totalStaff*100):0"></div>
          </div>
          <span style="font-weight:700;font-size:13px">{{ d.count }}</span>
        </div>
      </div>
    </div>
    <div class="card">
      <div style="font-size:13px;font-weight:700;margin-bottom:14px">Today Attendance</div>
      <div *ngFor="let a of (dash().todayAttendance||[])" style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid var(--border)">
        <div class="av" style="width:34px;height:34px;font-size:11px;flex-shrink:0">{{ initial(a.userId?.name) }}</div>
        <div style="flex:1;min-width:0">
          <div style="font-weight:600;font-size:12.5px">{{ a.userId?.name }}</div>
          <div style="font-size:11px;color:var(--muted)">{{ deptIcon(a.userId?.department) }} {{ a.userId?.department | titlecase }}</div>
        </div>
        <span class="badge" [ngClass]="attendBadge(a.status)" style="font-size:9.5px">{{ a.status | titlecase }}</span>
      </div>
      <div *ngIf="!(dash().todayAttendance?.length)" style="text-align:center;padding:20px;color:var(--muted);font-size:12.5px">No attendance marked today</div>
    </div>
  </div>

  <!-- STAFF -->
  <div *ngIf="tab()==='staff'">
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px">
      <button *ngFor="let d of depts" class="btn btn-sm" [ngClass]="deptFilter()===d?'btn-g':'btn-o'" (click)="deptFilter.set(d)">{{ deptIcon(d) }} {{ d | titlecase }}</button>
      <button class="btn btn-sm" [ngClass]="deptFilter()===''?'btn-g':'btn-o'" (click)="deptFilter.set('')">All</button>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px">
      <div *ngFor="let m of filteredStaff()" style="background:var(--surface);border-radius:14px;padding:16px;border:1.5px solid var(--border);cursor:pointer"
        [style.border-color]="selectedMember()?._id===m._id?'var(--purple)':'var(--border)'"
        (click)="selectedMember.set(m._id===selectedMember()?._id?null:m)">
        <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:10px">
          <div class="av" style="width:44px;height:44px;font-size:14px;border-radius:12px;flex-shrink:0" [style.background]="roleColor(m.role)">{{ initial(m.name) }}</div>
          <div style="flex:1;min-width:0">
            <div style="font-weight:700;font-size:14px">{{ m.name }}</div>
            <div style="font-size:11.5px;color:var(--muted)">{{ m.position || m.role }}</div>
            <div style="display:flex;gap:5px;margin-top:4px;flex-wrap:wrap">
              <span style="background:var(--bg);font-size:10.5px;padding:2px 7px;border-radius:20px">{{ deptIcon(m.department) }} {{ m.department | titlecase }}</span>
              <span style="background:var(--bg);font-size:10.5px;padding:2px 7px;border-radius:20px">{{ shiftIcon(m.shiftType) }} {{ m.shiftType | titlecase }}</span>
            </div>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:11.5px;margin-bottom:10px">
          <div><span style="color:var(--muted)">ID: </span><span style="font-weight:600">{{ m.employeeId||'—' }}</span></div>
          <div><span style="color:var(--muted)">Joined: </span><span>{{ m.joinDate | date:'MMM y' }}</span></div>
          <div style="grid-column:1/-1"><span style="color:var(--muted)">📧 </span><span style="font-size:10.5px">{{ m.email }}</span></div>
        </div>
        <div *ngIf="m.salary" style="background:var(--bg);border-radius:8px;padding:5px 10px;font-size:11.5px;margin-bottom:8px;display:flex;justify-content:space-between">
          <span style="color:var(--muted)">Salary</span>
          <span style="font-weight:700;color:var(--purple)">\${{ m.salary | number:'1.0-0' }} / {{ m.salaryType }}</span>
        </div>
        <div style="display:flex;gap:6px">
          <button class="btn btn-o btn-xs" style="flex:1" (click)="openEdit(m);$event.stopPropagation()">Edit</button>
          <button class="btn btn-o btn-xs" (click)="openLeaveForMember(m);$event.stopPropagation()">Leave</button>
          <button class="btn btn-danger btn-xs" (click)="confirmDeactivate(m);$event.stopPropagation()">x</button>
        </div>
      </div>
      <div *ngIf="!filteredStaff().length" style="grid-column:1/-1;text-align:center;padding:40px;color:var(--muted)">
        <div style="font-size:28px;margin-bottom:8px">👤</div>No staff found.
      </div>
    </div>
  </div>

  <!-- LEAVES -->
  <div *ngIf="tab()==='leaves'">
    <div style="display:flex;gap:8px;margin-bottom:14px">
      <select class="tb-sel" [(ngModel)]="leaveStatusFilter" (change)="loadLeaves()">
        <option value="">All Status</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option>
      </select>
    </div>
    <div class="card">
      <table class="tbl-hover">
        <thead><tr><th>Employee</th><th>Dept</th><th>Type</th><th>From</th><th>To</th><th>Days</th><th>Reason</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>
          <tr *ngFor="let l of leaves()">
            <td style="font-weight:600">{{ l.userId?.name }}</td>
            <td style="font-size:11.5px;color:var(--muted)">{{ deptIcon(l.userId?.department) }} {{ l.userId?.department | titlecase }}</td>
            <td><span class="badge" [ngClass]="leaveTypeBadge(l.type)" style="font-size:9.5px">{{ l.type | titlecase }}</span></td>
            <td style="font-size:12px">{{ l.startDate | date:'MMM d, y' }}</td>
            <td style="font-size:12px">{{ l.endDate | date:'MMM d, y' }}</td>
            <td style="font-weight:700;text-align:center">{{ l.days }}</td>
            <td style="font-size:11.5px;color:var(--muted)">{{ l.reason||'—' }}</td>
            <td><span class="badge" [ngClass]="l.status==='approved'?'b-green':l.status==='rejected'?'b-red':'b-yellow'" style="font-size:9.5px">{{ l.status | titlecase }}</span></td>
            <td>
              <div *ngIf="l.status==='pending'" style="display:flex;gap:4px">
                <button class="btn btn-success btn-xs" (click)="updateLeave(l._id,'approved')">Approve</button>
                <button class="btn btn-danger btn-xs" (click)="updateLeave(l._id,'rejected')">Reject</button>
              </div>
              <span *ngIf="l.status!=='pending'" style="font-size:11px;color:var(--muted)">{{ l.approvedBy?.name }}</span>
            </td>
          </tr>
          <tr *ngIf="!leaves().length"><td colspan="9" style="text-align:center;padding:30px;color:var(--muted)">No leave requests</td></tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- ATTENDANCE -->
  <div *ngIf="tab()==='attendance'">
    <div style="display:flex;gap:8px;margin-bottom:14px;align-items:center">
      <input type="date" class="tb-sel" [(ngModel)]="attendDate" (change)="loadAttendance()">
      <select class="tb-sel" [(ngModel)]="attendDeptFilter" (change)="loadAttendance()">
        <option value="">All Departments</option>
        <option *ngFor="let d of depts" [value]="d">{{ deptIcon(d) }} {{ d | titlecase }}</option>
      </select>
    </div>
    <div class="card">
      <table class="tbl-hover">
        <thead><tr><th>Employee</th><th>Department</th><th>Shift</th><th>Status</th><th>In</th><th>Out</th><th>Hours</th><th>Notes</th><th>Edit</th></tr></thead>
        <tbody>
          <tr *ngFor="let a of attendance()">
            <td style="font-weight:600">{{ a.userId?.name }}</td>
            <td style="font-size:11.5px;color:var(--muted)">{{ deptIcon(a.userId?.department) }} {{ a.userId?.department | titlecase }}</td>
            <td style="font-size:11.5px">{{ shiftIcon(a.userId?.shiftType) }} {{ a.userId?.shiftType | titlecase }}</td>
            <td><span class="badge" [ngClass]="attendBadge(a.status)" style="font-size:9.5px">{{ a.status | titlecase }}</span></td>
            <td style="font-size:12px">{{ a.checkIn ? (a.checkIn | date:'HH:mm') : '—' }}</td>
            <td style="font-size:12px">{{ a.checkOut ? (a.checkOut | date:'HH:mm') : '—' }}</td>
            <td style="font-weight:700;text-align:center">{{ a.hoursWorked || '—' }}</td>
            <td style="font-size:11px;color:var(--muted)">{{ a.notes||'—' }}</td>
            <td><button class="btn btn-o btn-xs" (click)="openMarkAttendance(a)">Edit</button></td>
          </tr>
          <tr *ngIf="!attendance().length">
            <td colspan="9" style="text-align:center;padding:30px;color:var(--muted)">
              No records for this date.
              <div style="margin-top:8px"><button class="btn btn-g btn-sm" (click)="openBulkAttendance()">Mark Attendance</button></div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- PAYROLL -->
  <div *ngIf="tab()==='payroll'">
    <div style="display:flex;gap:8px;margin-bottom:14px;align-items:center;flex-wrap:wrap">
      <select class="tb-sel" [(ngModel)]="payrollPeriod" (change)="loadPayroll()">
        <option *ngFor="let p of availablePeriods()" [value]="p.val">{{ p.label }}</option>
      </select>
      <select class="tb-sel" [(ngModel)]="payrollStatusFilter" (change)="loadPayroll()">
        <option value="">All Status</option>
        <option value="draft">Draft</option><option value="approved">Approved</option><option value="paid">Paid</option>
      </select>
      <button class="btn btn-o btn-sm" (click)="generatePayroll()" [disabled]="genSaving()">
        {{ genSaving() ? 'Generating...' : 'Generate ' + payrollPeriod }}
      </button>
      <button *ngIf="selectedPayrollIds.length" class="btn btn-g btn-sm" (click)="approveSelected()">
        Approve ({{ selectedPayrollIds.length }})
      </button>
      <button *ngIf="selectedPayrollIds.length" class="btn btn-success btn-sm" (click)="paySelected()">
        Pay ({{ selectedPayrollIds.length }})
      </button>
    </div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px">
      <div class="mc"><div class="mc-ico">👤</div><div class="mc-lbl">Employees</div><div class="mc-val">{{ payrollRecords().length }}</div></div>
      <div class="mc"><div class="mc-ico">💵</div><div class="mc-lbl">Gross Total</div><div class="mc-val" style="color:var(--purple)">\${{ payrollGross() | number:'1.0-0' }}</div></div>
      <div class="mc"><div class="mc-ico">✅</div><div class="mc-lbl">Net Total</div><div class="mc-val" style="color:var(--success)">\${{ payrollNet() | number:'1.0-0' }}</div></div>
      <div class="mc"><div class="mc-ico">💳</div><div class="mc-lbl">Paid</div><div class="mc-val">{{ countPayrollStatus('paid') }}</div></div>
    </div>
    <div class="card">
      <table class="tbl-hover">
        <thead>
          <tr>
            <th style="width:36px"><input type="checkbox" (change)="toggleAllPayroll($event)"></th>
            <th>Employee</th><th>Department</th><th>Base Salary</th><th>Days</th>
            <th>Overtime</th><th>Bonuses</th><th>Deductions</th><th>Net Pay</th><th>Status</th><th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let p of payrollRecords()" [style.background]="isPayrollSelected(p._id)?'#f3e8ff':''">
            <td><input type="checkbox" [checked]="isPayrollSelected(p._id)" (change)="togglePayroll(p._id,$event)"></td>
            <td>
              <div style="font-weight:600">{{ p.userId?.name }}</div>
              <div style="font-size:11px;color:var(--muted)">{{ p.userId?.position }}</div>
            </td>
            <td style="font-size:11.5px;color:var(--muted)">{{ deptIcon(p.userId?.department) }} {{ p.userId?.department | titlecase }}</td>
            <td style="font-weight:600">\${{ p.baseSalary | number:'1.0-0' }}</td>
            <td style="text-align:center">
              <span style="color:var(--success)">{{ p.daysWorked }}✓</span>
              <span *ngIf="p.daysAbsent" style="color:var(--danger);margin-left:4px">{{ p.daysAbsent }}✗</span>
            </td>
            <td style="font-size:12px">
              <span *ngIf="p.overtimeHours>0" style="color:var(--purple)">+{{ p.overtimeHours }}h = \${{ p.overtimePay }}</span>
              <span *ngIf="!p.overtimeHours" style="color:var(--muted)">—</span>
            </td>
            <td style="font-size:12px">
              <span *ngIf="p.bonusTotal>0" style="color:var(--success)">+\${{ p.bonusTotal }}</span>
              <span *ngIf="!p.bonusTotal" style="color:var(--muted)">—</span>
            </td>
            <td style="font-size:12px">
              <span *ngIf="p.deductionTotal>0" style="color:var(--danger)">-\${{ p.deductionTotal }}</span>
              <span *ngIf="!p.deductionTotal" style="color:var(--muted)">—</span>
            </td>
            <td style="font-size:15px;font-weight:800;color:var(--purple)">\${{ p.netPay | number:'1.0-0' }}</td>
            <td>
              <span class="badge" [ngClass]="p.status==='paid'?'b-green':p.status==='approved'?'b-blue':'b-yellow'" style="font-size:9.5px">{{ p.status | titlecase }}</span>
            </td>
            <td>
              <button *ngIf="p.status==='draft'" class="btn btn-o btn-xs" (click)="openPayrollEdit(p)">Edit</button>
              <span *ngIf="p.paidAt" style="font-size:10.5px;color:var(--muted)">{{ p.paidAt | date:'MMM d' }}</span>
            </td>
          </tr>
          <tr *ngIf="!payrollRecords().length">
            <td colspan="11" style="text-align:center;padding:30px;color:var(--muted)">
              <div style="font-size:24px;margin-bottom:8px">💰</div>
              No payroll for {{ payrollPeriod }}. Click "Generate" to create payroll from attendance data.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
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

  <!-- ADD/EDIT STAFF MODAL -->
  <div class="overlay" [class.show]="showForm()" (click)="bgClick($event,'staff')">
    <div class="modal" style="width:600px;max-height:90vh;overflow-y:auto">
      <div class="modal-head">
        <div class="modal-title">{{ editingId() ? 'Edit Staff Member' : 'Add Staff Member' }}</div>
        <button class="modal-close" (click)="showForm.set(false)">x</button>
      </div>
      <div style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">Basic Info</div>
      <div class="form-row">
        <div class="fg"><label>Full Name *</label><input [(ngModel)]="sf.name" placeholder="John Smith"></div>
        <div class="fg"><label>Employee ID</label><input [(ngModel)]="sf.employeeId" placeholder="EMP-001"></div>
      </div>
      <div class="form-row">
        <div class="fg"><label>Email *</label><input type="email" [(ngModel)]="sf.email"></div>
        <div class="fg"><label>{{ editingId()?'New Password (optional)':'Password *' }}</label><input type="password" [(ngModel)]="sf.password"></div>
      </div>
      <div class="form-row">
        <div class="fg"><label>Phone</label><input [(ngModel)]="sf.phone"></div>
        <div class="fg"><label>Nationality</label><input [(ngModel)]="sf.nationality"></div>
      </div>
      <div style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin:12px 0 8px">Role &amp; Department</div>
      <div class="form-row">
        <div class="fg"><label>Role *</label>
          <select [(ngModel)]="sf.role">
            <option *ngFor="let r of roles" [value]="r">{{ r }}</option>
          </select>
        </div>
        <div class="fg"><label>Department *</label>
          <select [(ngModel)]="sf.department">
            <option *ngFor="let d of depts" [value]="d">{{ deptIcon(d) }} {{ d | titlecase }}</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="fg"><label>Position</label><input [(ngModel)]="sf.position" placeholder="Senior Receptionist"></div>
        <div class="fg"><label>Join Date</label><input type="date" [(ngModel)]="sf.joinDate"></div>
      </div>
      <div style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin:12px 0 8px">Schedule</div>
      <div class="form-row">
        <div class="fg"><label>Shift</label>
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:4px">
            <button *ngFor="let s of shifts" class="btn btn-sm" [ngClass]="sf.shiftType===s?'btn-g':'btn-o'" (click)="sf.shiftType=s" style="font-size:12px">{{ shiftIcon(s) }} {{ s | titlecase }}</button>
          </div>
        </div>
        <div class="fg"><label>Days Off</label>
          <div style="display:flex;gap:5px;flex-wrap:wrap;margin-top:4px">
            <button *ngFor="let d of allDays" class="btn btn-sm" [ngClass]="sf.daysOff?.includes(d)?'btn-g':'btn-o'" (click)="toggleDayOff(d)" style="font-size:11px;min-width:36px">{{ d | uppercase }}</button>
          </div>
        </div>
      </div>
      <div style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin:12px 0 8px">Compensation</div>
      <div class="form-row">
        <div class="fg"><label>Salary (\$)</label><input type="number" [(ngModel)]="sf.salary" min="0"></div>
        <div class="fg"><label>Type</label>
          <select [(ngModel)]="sf.salaryType"><option value="monthly">Monthly</option><option value="hourly">Hourly</option><option value="daily">Daily</option></select>
        </div>
        <div class="fg"><label>ID / Passport #</label><input [(ngModel)]="sf.idNumber"></div>
      </div>
      <div style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin:12px 0 8px">Emergency Contact</div>
      <div class="form-row">
        <div class="fg"><label>Name</label><input [(ngModel)]="sf.emergencyName"></div>
        <div class="fg"><label>Phone</label><input [(ngModel)]="sf.emergencyPhone"></div>
        <div class="fg"><label>Relation</label><input [(ngModel)]="sf.emergencyRelation"></div>
      </div>
      <div class="fg"><label>Address</label><input [(ngModel)]="sf.address"></div>
      <div class="fg"><label>Notes</label><textarea rows="2" [(ngModel)]="sf.notes"></textarea></div>
      <div *ngIf="formErr()" style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:10px;font-size:12.5px;color:#b91c1c;margin-bottom:10px">{{ formErr() }}</div>
      <div style="display:flex;gap:10px">
        <button class="btn btn-o" style="flex:1" (click)="showForm.set(false)">Cancel</button>
        <button class="btn btn-g" style="flex:2" (click)="save()" [disabled]="saving()">
          {{ saving()?(editingId()?'Updating...':'Adding...'):(editingId()?'Update':'Add Staff Member') }}
        </button>
      </div>
    </div>
  </div>

  <!-- LEAVE FORM -->
  <div class="overlay" [class.show]="showLeaveForm()" (click)="bgClick($event,'leave')">
    <div class="modal" style="width:480px">
      <div class="modal-head"><div class="modal-title">Leave Request</div><button class="modal-close" (click)="showLeaveForm.set(false)">x</button></div>
      <div class="fg"><label>Employee *</label>
        <select [(ngModel)]="lf.userId">
          <option value="">-- Select employee --</option>
          <option *ngFor="let m of staff()" [value]="m._id">{{ m.name }} — {{ m.department | titlecase }}</option>
        </select>
      </div>
      <div class="fg"><label>Leave Type *</label>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:4px">
          <button *ngFor="let t of leaveTypes" class="btn btn-sm" [ngClass]="lf.type===t.val?'btn-g':'btn-o'" (click)="lf.type=t.val" style="font-size:12px">{{ t.icon }} {{ t.label }}</button>
        </div>
      </div>
      <div class="form-row">
        <div class="fg"><label>From *</label><input type="date" [(ngModel)]="lf.startDate" (change)="calcLeaveDays()"></div>
        <div class="fg"><label>To *</label><input type="date" [(ngModel)]="lf.endDate" (change)="calcLeaveDays()"></div>
      </div>
      <div *ngIf="lf.days>0" style="background:var(--grad-soft);border-radius:8px;padding:8px 12px;font-size:12.5px;color:var(--purple);margin-bottom:10px">
        Duration: <strong>{{ lf.days }} day(s)</strong>
      </div>
      <div class="fg"><label>Reason</label><textarea rows="2" [(ngModel)]="lf.reason"></textarea></div>
      <div *ngIf="leaveErr()" style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:10px;font-size:12.5px;color:#b91c1c;margin-bottom:10px">{{ leaveErr() }}</div>
      <div style="display:flex;gap:10px">
        <button class="btn btn-o" style="flex:1" (click)="showLeaveForm.set(false)">Cancel</button>
        <button class="btn btn-g" style="flex:2" (click)="submitLeave()" [disabled]="leaveSaving()">{{ leaveSaving()?'Submitting...':'Submit Request' }}</button>
      </div>
    </div>
  </div>

  <!-- ATTENDANCE MODAL -->
  <div class="overlay" [class.show]="showAttendModal()" (click)="bgClick($event,'attend')">
    <div class="modal" style="width:500px">
      <div class="modal-head">
        <div class="modal-title">{{ bulkMode() ? 'Mark Today Attendance' : 'Edit Attendance' }}</div>
        <button class="modal-close" (click)="showAttendModal.set(false)">x</button>
      </div>
      <div *ngIf="bulkMode()">
        <div style="font-size:12.5px;color:var(--muted);margin-bottom:12px">{{ todayDate() | date:'EEE, MMM d, y' }}</div>
        <div style="max-height:360px;overflow-y:auto">
          <div *ngFor="let row of bulkRows" style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)">
            <div class="av" style="width:34px;height:34px;font-size:11px;flex-shrink:0">{{ initial(row.member.name) }}</div>
            <div style="flex:1;min-width:0">
              <div style="font-weight:600;font-size:12.5px">{{ row.member.name }}</div>
              <div style="font-size:10.5px;color:var(--muted)">{{ deptIcon(row.member.department) }} {{ row.member.department | titlecase }}</div>
            </div>
            <select [(ngModel)]="row.status" style="font-size:11.5px;padding:3px 6px;border-radius:6px;border:1px solid var(--border);width:120px">
              <option value="present">Present</option><option value="absent">Absent</option><option value="late">Late</option>
              <option value="half_day">Half Day</option><option value="holiday">Holiday</option><option value="off">Day Off</option>
            </select>
          </div>
        </div>
        <div style="display:flex;gap:10px;margin-top:14px">
          <button class="btn btn-o" style="flex:1" (click)="showAttendModal.set(false)">Cancel</button>
          <button class="btn btn-g" style="flex:2" (click)="submitBulkAttendance()" [disabled]="attendSaving()">{{ attendSaving()?'Saving...':'Save Attendance' }}</button>
        </div>
      </div>
      <div *ngIf="!bulkMode()&&attendTarget()">
        <div style="background:var(--bg);border-radius:10px;padding:10px 14px;margin-bottom:14px;font-size:12.5px">
          <span style="font-weight:700">{{ attendTarget().userId?.name }}</span> · {{ attendDate | date:'MMM d, y' }}
        </div>
        <div class="fg"><label>Status</label>
          <select [(ngModel)]="attendForm.status">
            <option value="present">Present</option><option value="absent">Absent</option><option value="late">Late</option>
            <option value="half_day">Half Day</option><option value="holiday">Holiday</option><option value="off">Day Off</option>
          </select>
        </div>
        <div class="form-row">
          <div class="fg"><label>Check In</label><input type="time" [(ngModel)]="attendForm.checkIn"></div>
          <div class="fg"><label>Check Out</label><input type="time" [(ngModel)]="attendForm.checkOut"></div>
        </div>
        <div class="fg"><label>Notes</label><input [(ngModel)]="attendForm.notes"></div>
        <div style="display:flex;gap:10px;margin-top:14px">
          <button class="btn btn-o" style="flex:1" (click)="showAttendModal.set(false)">Cancel</button>
          <button class="btn btn-g" style="flex:2" (click)="submitSingleAttendance()" [disabled]="attendSaving()">{{ attendSaving()?'Saving...':'Save' }}</button>
        </div>
      </div>
    </div>
  </div>

  <!-- PAYROLL EDIT MODAL -->
  <div class="overlay" [class.show]="showPayrollEdit()" (click)="bgClick($event,'payrolledit')">
    <div class="modal" style="width:520px">
      <div class="modal-head">
        <div class="modal-title">Edit Payroll — {{ editPayroll()?.userId?.name }}</div>
        <button class="modal-close" (click)="showPayrollEdit.set(false)">x</button>
      </div>
      <ng-container *ngIf="editPayroll()">
        <div style="background:var(--bg);border-radius:10px;padding:10px 14px;margin-bottom:14px;font-size:12.5px;display:flex;justify-content:space-between">
          <span>Base: <strong>\${{ editPayroll().baseSalary }}</strong></span>
          <span>Days: <strong>{{ editPayroll().daysWorked }}</strong></span>
          <span>OT: <strong>{{ editPayroll().overtimeHours }}h</strong></span>
        </div>
        <div class="form-row">
          <div class="fg"><label>Overtime Hours</label><input type="number" [(ngModel)]="pef.overtimeHours" min="0" step="0.5"></div>
        </div>
        <div style="font-size:11.5px;font-weight:700;color:var(--text2);margin:10px 0 6px">Bonuses</div>
        <div *ngFor="let b of pef.bonuses; let i=index" style="display:flex;gap:8px;margin-bottom:6px">
          <input [(ngModel)]="b.label" placeholder="Label" style="flex:2">
          <input type="number" [(ngModel)]="b.amount" min="0" style="flex:1">
          <button class="btn btn-danger btn-xs" (click)="removeBonus(i)">x</button>
        </div>
        <button class="btn btn-o btn-xs" (click)="addBonus()">+ Add Bonus</button>
        <div style="font-size:11.5px;font-weight:700;color:var(--text2);margin:10px 0 6px">Deductions</div>
        <div *ngFor="let d of pef.deductions; let i=index" style="display:flex;gap:8px;margin-bottom:6px">
          <input [(ngModel)]="d.label" placeholder="Label" style="flex:2">
          <input type="number" [(ngModel)]="d.amount" min="0" style="flex:1">
          <button class="btn btn-danger btn-xs" (click)="removeDeduction(i)">x</button>
        </div>
        <button class="btn btn-o btn-xs" (click)="addDeduction()">+ Add Deduction</button>
        <div style="background:var(--grad);color:#fff;border-radius:10px;padding:12px 14px;margin:12px 0;display:flex;justify-content:space-between;align-items:center">
          <span>Gross: \${{ calcGross() | number:'1.0-0' }}</span>
          <span>Deductions: -\${{ calcDeductions() | number:'1.0-0' }}</span>
          <span style="font-size:18px;font-weight:800">Net: \${{ calcNet() | number:'1.0-0' }}</span>
        </div>
        <div class="fg"><label>Notes</label><input [(ngModel)]="pef.notes"></div>
        <div style="display:flex;gap:10px">
          <button class="btn btn-o" style="flex:1" (click)="showPayrollEdit.set(false)">Cancel</button>
          <button class="btn btn-g" style="flex:2" (click)="savePayrollEdit()" [disabled]="saving()">{{ saving() ? 'Saving...' : 'Save Changes' }}</button>
        </div>
      </ng-container>
    </div>
  </div>

</div>`,
})
export class StaffComponent implements OnInit {
  tab             = signal<HTab>('overview');
  staff           = signal<any[]>([]);
  leaves          = signal<any[]>([]);
  attendance      = signal<any[]>([]);
  payrollRecords  = signal<any[]>([]);
  dash            = signal<any>({ totalStaff:0, todayPresent:0, todayAbsent:0, pendingLeaves:0, departments:[], todayAttendance:[] });
  saving          = signal(false);
  leaveSaving     = signal(false);
  attendSaving    = signal(false);
  genSaving       = signal(false);
  showForm        = signal(false);
  showLeaveForm   = signal(false);
  showAttendModal = signal(false);
  showPayrollEdit = signal(false);
  editingId       = signal<string|null>(null);
  selectedMember  = signal<any>(null);
  editPayroll     = signal<any>(null);
  formErr         = signal('');
  leaveErr        = signal('');
  bulkMode        = signal(false);
  attendTarget    = signal<any>(null);
  confirmDialog   = signal<any>({ show:false, icon:'⚠️', title:'', message:'', confirmLabel:'Confirm', danger:true, action:()=>{} });

  search            = '';
  deptFilter        = signal('');
  leaveStatusFilter = '';
  attendDate        = new Date().toISOString().split('T')[0];
  attendDeptFilter  = '';
  payrollPeriod     = new Date().toISOString().slice(0,7);
  payrollStatusFilter = '';
  selectedPayrollIds: string[] = [];

  sf: any  = this.blankStaff();
  lf: any  = this.blankLeave();
  pef: any = { overtimeHours:0, bonuses:[] as any[], deductions:[] as any[], notes:'' };
  attendForm: any = { status:'present', checkIn:'', checkOut:'', notes:'' };
  bulkRows: any[] = [];

  depts      = DEPTS;
  roles      = ROLES;
  shifts     = SHIFTS;
  allDays    = DAYS;
  leaveTypes = [
    { val:'annual', icon:'🌴', label:'Annual' }, { val:'sick', icon:'🤒', label:'Sick' },
    { val:'emergency', icon:'🚨', label:'Emergency' }, { val:'unpaid', icon:'💸', label:'Unpaid' },
    { val:'maternity', icon:'👶', label:'Maternity' }, { val:'other', icon:'📋', label:'Other' },
  ];

  readonly filteredStaff = computed(() => {
    const dept = this.deptFilter(); const q = this.search.toLowerCase();
    return this.staff().filter((m: any) => (!dept || m.department === dept) && (!q || m.name.toLowerCase().includes(q) || m.email?.toLowerCase().includes(q)));
  });
  readonly pendingLeaves = computed(() => this.leaves().filter((l: any) => l.status === 'pending'));

  todayDate() { return new Date(); }
  payrollGross()  { return this.payrollRecords().reduce((s: number, r: any) => s+(r.grossPay||0), 0); }
  payrollNet()    { return this.payrollRecords().reduce((s: number, r: any) => s+(r.netPay||0), 0); }
  countPayrollStatus(s: string) { return this.payrollRecords().filter((r: any) => r.status===s).length; }
  isPayrollSelected(id: string) { return this.selectedPayrollIds.includes(id); }
  calcGross()     { const ep = this.editPayroll(); if (!ep) return 0; const bt = this.pef.bonuses.reduce((s: number, b: any) => s+(b.amount||0), 0); return +(ep.baseSalary + (this.pef.overtimeHours * ep.overtimeRate) + bt).toFixed(2); }
  calcDeductions(){ return this.pef.deductions.reduce((s: number, d: any) => s+(d.amount||0), 0); }
  calcNet()       { return +(this.calcGross() - this.calcDeductions()).toFixed(2); }

  availablePeriods() {
    const periods = []; const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      periods.push({ val: d.toISOString().slice(0,7), label: d.toLocaleDateString('en-US', { month:'long', year:'numeric' }) });
    }
    return periods;
  }

  constructor(private staffSvc: StaffService) {}
  ngOnInit() { this.loadDashboard(); this.loadStaff(); }

  loadDashboard()  { this.staffSvc.getDashboard().subscribe({ next: (r: any) => this.dash.set(r.data||{}) }); }
  loadStaff()      { this.staffSvc.getAll().subscribe({ next: (r: any) => this.staff.set(r.data.staff||[]) }); }
  loadLeaves()     { const f: any = {}; if (this.leaveStatusFilter) f.status = this.leaveStatusFilter; this.staffSvc.getLeaves(f).subscribe({ next: (r: any) => this.leaves.set(r.data.leaves||[]) }); }
  loadAttendance() { this.staffSvc.getAttendance({ date: this.attendDate }).subscribe({ next: (r: any) => this.attendance.set(r.data.records||[]) }); }
  filterStaff()    { /* computed */ }

  loadPayroll() {
    const f: any = { period: this.payrollPeriod };
    if (this.payrollStatusFilter) f.status = this.payrollStatusFilter;
    this.staffSvc.getPayroll(f).subscribe({ next: (r: any) => { this.payrollRecords.set(r.data.records||[]); this.selectedPayrollIds = []; } });
  }

  generatePayroll() {
    this.genSaving.set(true);
    this.staffSvc.generatePayroll({ period: this.payrollPeriod }).subscribe({
      next: (r: any) => { this.genSaving.set(false); this.loadPayroll(); alert(r.message); },
      error: (e: any) => { this.genSaving.set(false); alert(e.error?.message||'Error generating payroll'); },
    });
  }

  togglePayroll(id: string, e: Event) {
    const checked = (e.target as HTMLInputElement).checked;
    if (checked) { if (!this.selectedPayrollIds.includes(id)) this.selectedPayrollIds = [...this.selectedPayrollIds, id]; }
    else this.selectedPayrollIds = this.selectedPayrollIds.filter(i => i !== id);
  }

  toggleAllPayroll(e: Event) {
    this.selectedPayrollIds = (e.target as HTMLInputElement).checked ? this.payrollRecords().map((r: any) => r._id) : [];
  }

  approveSelected() { this.staffSvc.approvePayroll({ ids: this.selectedPayrollIds }).subscribe(() => this.loadPayroll()); }
  paySelected()     { this.staffSvc.markPayrollPaid({ ids: this.selectedPayrollIds, paymentMethod: 'bank' }).subscribe(() => this.loadPayroll()); }

  openPayrollEdit(p: any) {
    this.editPayroll.set(p);
    this.pef = { overtimeHours: p.overtimeHours||0, bonuses: (p.bonuses||[]).map((b: any) => ({...b})), deductions: (p.deductions||[]).map((d: any) => ({...d})), notes: p.notes||'' };
    this.showPayrollEdit.set(true);
  }

  addBonus()          { this.pef.bonuses = [...this.pef.bonuses, { label:'', amount:0 }]; }
  removeBonus(i: number)     { this.pef.bonuses = this.pef.bonuses.filter((_: any, idx: number) => idx !== i); }
  addDeduction()      { this.pef.deductions = [...this.pef.deductions, { label:'', amount:0 }]; }
  removeDeduction(i: number) { this.pef.deductions = this.pef.deductions.filter((_: any, idx: number) => idx !== i); }

  savePayrollEdit() {
    this.saving.set(true);
    this.staffSvc.updatePayroll(this.editPayroll()._id, { overtimeHours: this.pef.overtimeHours, bonuses: this.pef.bonuses, deductions: this.pef.deductions, notes: this.pef.notes })
      .subscribe({ next: () => { this.saving.set(false); this.showPayrollEdit.set(false); this.loadPayroll(); }, error: () => this.saving.set(false) });
  }

  blankStaff() { return { name:'', email:'', password:'', phone:'', role:'Receptionist', department:'front_desk', position:'', employeeId:'', salary:0, salaryType:'monthly', joinDate: new Date().toISOString().split('T')[0], shiftType:'morning', daysOff:[] as string[], nationality:'', idNumber:'', emergencyName:'', emergencyPhone:'', emergencyRelation:'', address:'', notes:'' }; }
  blankLeave() { return { userId:'', type:'annual', startDate:'', endDate:'', days:0, reason:'' }; }

  openForm()   { this.editingId.set(null); this.sf = this.blankStaff(); this.formErr.set(''); this.showForm.set(true); }
  openEdit(m: any) {
    this.editingId.set(m._id);
    this.sf = { ...m, password:'', daysOff: m.daysOff||[], emergencyName: m.emergencyContact?.name||'', emergencyPhone: m.emergencyContact?.phone||'', emergencyRelation: m.emergencyContact?.relation||'', joinDate: m.joinDate ? new Date(m.joinDate).toISOString().split('T')[0] : '' };
    this.formErr.set(''); this.showForm.set(true);
  }
  toggleDayOff(d: string) { const idx = this.sf.daysOff.indexOf(d); if (idx>-1) this.sf.daysOff.splice(idx,1); else this.sf.daysOff.push(d); this.sf = { ...this.sf }; }

  save() {
    if (!this.sf.name.trim()) { this.formErr.set('Name required'); return; }
    if (!this.sf.email.trim()) { this.formErr.set('Email required'); return; }
    if (!this.editingId() && !this.sf.password) { this.formErr.set('Password required'); return; }
    this.saving.set(true); this.formErr.set('');
    const payload = { ...this.sf, emergencyContact: { name:this.sf.emergencyName, phone:this.sf.emergencyPhone, relation:this.sf.emergencyRelation } };
    delete payload.emergencyName; delete payload.emergencyPhone; delete payload.emergencyRelation;
    if (!payload.password) delete payload.password;
    const eid = this.editingId();
    const req = eid ? this.staffSvc.update(eid, payload) : this.staffSvc.create(payload);
    req.subscribe({ next: () => { this.saving.set(false); this.showForm.set(false); this.loadStaff(); this.loadDashboard(); }, error: (e: any) => { this.saving.set(false); this.formErr.set(e.error?.message||'Error'); } });
  }

  confirmDeactivate(m: any) {
    this.showConfirm({ icon:'⚠️', title:'Deactivate Staff?', message:'Remove '+m.name+' from active staff?', confirmLabel:'Deactivate', danger:true,
      action: () => this.staffSvc.deactivate(m._id).subscribe(() => { this.loadStaff(); this.loadDashboard(); })
    });
  }

  openLeaveForm()            { this.lf = this.blankLeave(); this.leaveErr.set(''); this.showLeaveForm.set(true); }
  openLeaveForMember(m: any) { this.lf = { ...this.blankLeave(), userId: m._id }; this.leaveErr.set(''); this.showLeaveForm.set(true); }
  calcLeaveDays() { if (this.lf.startDate && this.lf.endDate) this.lf.days = Math.max(1, Math.ceil((new Date(this.lf.endDate).getTime() - new Date(this.lf.startDate).getTime()) / 86400000) + 1); }

  submitLeave() {
    if (!this.lf.userId) { this.leaveErr.set('Select employee'); return; }
    if (!this.lf.startDate||!this.lf.endDate) { this.leaveErr.set('Select dates'); return; }
    this.leaveSaving.set(true); this.leaveErr.set('');
    this.staffSvc.createLeave(this.lf).subscribe({ next: () => { this.leaveSaving.set(false); this.showLeaveForm.set(false); this.loadLeaves(); this.loadDashboard(); }, error: (e: any) => { this.leaveSaving.set(false); this.leaveErr.set(e.error?.message||'Error'); } });
  }

  updateLeave(id: string, status: string) { this.staffSvc.updateLeave(id, { status }).subscribe(() => { this.loadLeaves(); this.loadDashboard(); }); }

  openBulkAttendance() { this.bulkMode.set(true); this.bulkRows = this.staff().map((m: any) => ({ member: m, status: 'present' })); this.showAttendModal.set(true); }
  openMarkAttendance(a: any) { this.bulkMode.set(false); this.attendTarget.set(a); this.attendForm = { status:a.status, checkIn: a.checkIn?new Date(a.checkIn).toTimeString().substring(0,5):'', checkOut: a.checkOut?new Date(a.checkOut).toTimeString().substring(0,5):'', notes:a.notes||'' }; this.showAttendModal.set(true); }

  submitBulkAttendance() {
    this.attendSaving.set(true);
    this.staffSvc.bulkAttendance({ records: this.bulkRows.map((r: any) => ({ userId:r.member._id, status:r.status })) })
      .subscribe({ next: () => { this.attendSaving.set(false); this.showAttendModal.set(false); this.loadAttendance(); this.loadDashboard(); }, error: () => this.attendSaving.set(false) });
  }

  submitSingleAttendance() {
    const a = this.attendTarget(); this.attendSaving.set(true); const d = this.attendDate;
    this.staffSvc.markAttendance({ userId: a.userId?._id||a.userId, date: d, status: this.attendForm.status, checkIn: this.attendForm.checkIn?d+'T'+this.attendForm.checkIn:undefined, checkOut: this.attendForm.checkOut?d+'T'+this.attendForm.checkOut:undefined, notes: this.attendForm.notes })
      .subscribe({ next: () => { this.attendSaving.set(false); this.showAttendModal.set(false); this.loadAttendance(); this.loadDashboard(); }, error: () => this.attendSaving.set(false) });
  }

  deptIcon(d: string): string   { return DEPT_ICONS[d]||'👤'; }
  shiftIcon(s: string): string  { return SHIFT_ICONS[s]||'⏰'; }
  initial(name: string): string { return (name||'')[0]?.toUpperCase()||'?'; }
  roleColor(r: string): string  { const m: Record<string,string>={HotelAdmin:'#6d2a75',Manager:'#2563eb',Receptionist:'#059669',RestaurantStaff:'#d97706',Finance:'#dc2626',Technician:'#7c3aed'}; return m[r]||'#64748b'; }
  attendBadge(s: string): string { const m: Record<string,string>={present:'b-green',absent:'b-red',late:'b-yellow',half_day:'b-blue',holiday:'b-purple',off:'b-gray'}; return m[s]||'b-gray'; }
  leaveTypeBadge(t: string): string { const m: Record<string,string>={annual:'b-green',sick:'b-red',emergency:'b-red',unpaid:'b-yellow',maternity:'b-purple',other:'b-gray'}; return m[t]||'b-gray'; }

  showConfirm(opts: any) { this.confirmDialog.set({ show:true, icon:opts.icon||'⚠️', title:opts.title, message:opts.message, confirmLabel:opts.confirmLabel||'Confirm', danger:opts.danger!==false, action:opts.action }); }
  acceptConfirm()  { const fn = this.confirmDialog().action; this.confirmDialog.update(d=>({...d,show:false})); fn(); }
  dismissConfirm() { this.confirmDialog.update(d=>({...d,show:false})); }
  bgClick(e: Event, t: string) { if (!(e.target as HTMLElement).classList.contains('overlay')) return; const map: Record<string,any>={staff:this.showForm,leave:this.showLeaveForm,attend:this.showAttendModal,payrolledit:this.showPayrollEdit}; map[t]?.set(false); }
}
