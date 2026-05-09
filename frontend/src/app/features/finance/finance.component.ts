import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FinanceService } from '../../core/services/api.service';

type FTab = 'overview'|'revenue'|'expenses'|'assets'|'liabilities';

const EXPENSE_CATS = ['salary','rent','utilities','supplies','maintenance','marketing','food_beverage','equipment','other'];
const EXPENSE_ICONS: Record<string,string> = { salary:'👥',rent:'🏠',utilities:'⚡',supplies:'📦',maintenance:'🔧',marketing:'📢',food_beverage:'🍽',equipment:'🖥',other:'📋' };
const ASSET_CATS = ['cash','bank','receivable','inventory','equipment','property','vehicle','other'];
const ASSET_ICONS: Record<string,string> = { cash:'💵',bank:'🏦',receivable:'📄',inventory:'📦',equipment:'🖥',property:'🏢',vehicle:'🚗',other:'💼' };
const LIAB_CATS = ['loan','payable','tax','salary','rent','utility','other'];
const LIAB_ICONS: Record<string,string> = { loan:'🏦',payable:'📄',tax:'🏛',salary:'👥',rent:'🏠',utility:'⚡',other:'📋' };
const SOURCES = [{ val:'hotel',icon:'🏨',label:'Hotel' },{ val:'restaurant',icon:'🍽',label:'Restaurant' },{ val:'coffee',icon:'☕',label:'Coffee Shop' },{ val:'general',icon:'🏢',label:'General' }];

@Component({
  selector: 'app-finance',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `<div class="page-content">

  <div class="sec-head mb20">
    <div>
      <div style="font-size:18px;font-weight:800;letter-spacing:-.4px">💰 Finance</div>
      <div style="font-size:12.5px;color:var(--muted);margin-top:3px">Revenue · Expenses · Assets · Liabilities · P&amp;L</div>
    </div>
    <div style="display:flex;gap:8px;align-items:center">
      <select class="tb-sel" [(ngModel)]="period" (change)="loadReport()">
        <option value="today">Today</option>
        <option value="week">Last 7 Days</option>
        <option value="month">This Month</option>
        <option value="quarter">This Quarter</option>
        <option value="year">This Year</option>
      </select>
      <button *ngIf="tab()==='expenses'" class="btn btn-g btn-sm" (click)="openExpenseForm()">+ Add Expense</button>
      <button *ngIf="tab()==='assets'" class="btn btn-g btn-sm" (click)="openAssetForm()">+ Add Asset</button>
      <button *ngIf="tab()==='liabilities'" class="btn btn-g btn-sm" (click)="openLiabForm()">+ Add Liability</button>
    </div>
  </div>

  <!-- KPI Cards -->
  <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin-bottom:20px">
    <div class="mc" style="cursor:pointer" (click)="tab.set('revenue')">
      <div class="mc-ico">💵</div><div class="mc-lbl">Total Revenue</div>
      <div class="mc-val" style="color:var(--success)">\${{ rpt().revenue?.total | number:'1.0-0' }}</div>
    </div>
    <div class="mc" style="cursor:pointer" (click)="tab.set('expenses')">
      <div class="mc-ico">📤</div><div class="mc-lbl">Total Expenses</div>
      <div class="mc-val" style="color:var(--danger)">\${{ rpt().expenses?.total | number:'1.0-0' }}</div>
    </div>
    <div class="mc">
      <div class="mc-ico">📊</div><div class="mc-lbl">Net Profit</div>
      <div class="mc-val" [style.color]="rpt().profit>=0?'var(--success)':'var(--danger)'">\${{ rpt().profit | number:'1.0-0' }}</div>
      <div style="font-size:10.5px;margin-top:2px" [style.color]="rpt().profit>=0?'var(--success)':'var(--danger)'">{{ rpt().profitMargin }}%</div>
    </div>
    <div class="mc" style="cursor:pointer" (click)="tab.set('assets')">
      <div class="mc-ico">🏛</div><div class="mc-lbl">Total Assets</div>
      <div class="mc-val" style="color:var(--purple)">\${{ rpt().balance?.assets | number:'1.0-0' }}</div>
    </div>
    <div class="mc" style="cursor:pointer" (click)="tab.set('liabilities')">
      <div class="mc-ico">⚠️</div><div class="mc-lbl">Liabilities</div>
      <div class="mc-val" style="color:var(--warn)">\${{ rpt().balance?.liabilities | number:'1.0-0' }}</div>
    </div>
  </div>

  <!-- Tabs -->
  <div style="display:flex;gap:4px;margin-bottom:16px;background:var(--bg);border-radius:12px;padding:4px;width:fit-content;border:1px solid var(--border)">
    <button class="btn btn-sm" [ngClass]="tab()==='overview'?'btn-g':'btn-ghost'" (click)="tab.set('overview')">📊 Overview</button>
    <button class="btn btn-sm" [ngClass]="tab()==='revenue'?'btn-g':'btn-ghost'" (click)="tab.set('revenue')">💵 Revenue</button>
    <button class="btn btn-sm" [ngClass]="tab()==='expenses'?'btn-g':'btn-ghost'" (click)="tab.set('expenses');loadExpenses()">📤 Expenses</button>
    <button class="btn btn-sm" [ngClass]="tab()==='assets'?'btn-g':'btn-ghost'" (click)="tab.set('assets');loadAssets()">🏛 Assets</button>
    <button class="btn btn-sm" [ngClass]="tab()==='liabilities'?'btn-g':'btn-ghost'" (click)="tab.set('liabilities');loadLiabilities()">⚠️ Liabilities</button>
  </div>

  <!-- ══ OVERVIEW ══ -->
  <div *ngIf="tab()==='overview'" style="display:grid;grid-template-columns:1.2fr 1fr;gap:16px">

    <!-- Revenue breakdown -->
    <div style="display:flex;flex-direction:column;gap:14px">
      <div class="card">
        <div style="font-size:13px;font-weight:700;margin-bottom:14px">💵 Revenue Breakdown</div>
        <div *ngFor="let src of revenueSources()" style="margin-bottom:10px">
          <div style="display:flex;justify-content:space-between;font-size:12.5px;margin-bottom:4px">
            <span>{{ src.icon }} {{ src.label }}</span>
            <span style="font-weight:700">\${{ src.amount | number:'1.2-2' }}</span>
          </div>
          <div style="height:8px;background:var(--border);border-radius:4px;overflow:hidden">
            <div style="height:100%;border-radius:4px;transition:width .4s" [style.background]="src.color" [style.width.%]="src.pct"></div>
          </div>
          <div style="font-size:10.5px;color:var(--muted);margin-top:2px">{{ src.pct }}% of total revenue</div>
        </div>
      </div>

      <!-- Expense breakdown -->
      <div class="card">
        <div style="font-size:13px;font-weight:700;margin-bottom:14px">📤 Expense Breakdown</div>
        <div *ngFor="let e of expenseSources()" style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
          <span style="font-size:16px;min-width:20px">{{ expIcon(e.key) }}</span>
          <div style="flex:1;min-width:0">
            <div style="font-size:12px;font-weight:600;text-transform:capitalize">{{ e.key | titlecase }}</div>
            <div style="height:5px;background:var(--border);border-radius:3px;margin-top:3px;overflow:hidden">
              <div style="height:100%;background:var(--danger);border-radius:3px" [style.width.%]="e.pct"></div>
            </div>
          </div>
          <span style="font-size:12.5px;font-weight:700;color:var(--danger);min-width:70px;text-align:right">\${{ e.amount | number:'1.0-0' }}</span>
        </div>
      </div>
    </div>

    <!-- Right column -->
    <div style="display:flex;flex-direction:column;gap:14px">

      <!-- P&L Summary -->
      <div class="card" style="background:var(--grad);color:#fff">
        <div style="font-size:13px;font-weight:700;margin-bottom:14px;opacity:.8">📋 P&amp;L Summary — {{ period | titlecase }}</div>
        <div style="display:flex;justify-content:space-between;margin-bottom:8px">
          <span style="opacity:.8">Total Revenue</span>
          <span style="font-weight:700">\${{ rpt().revenue?.total | number:'1.2-2' }}</span>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:8px">
          <span style="opacity:.8">Total Expenses</span>
          <span style="font-weight:700">-\${{ rpt().expenses?.total | number:'1.2-2' }}</span>
        </div>
        <div style="border-top:1px solid rgba(255,255,255,.3);padding-top:10px;margin-top:4px;display:flex;justify-content:space-between">
          <span style="font-size:16px;font-weight:800">Net Profit</span>
          <span style="font-size:20px;font-weight:900">\${{ rpt().profit | number:'1.2-2' }}</span>
        </div>
        <div style="font-size:11.5px;opacity:.7;margin-top:4px;text-align:right">Profit margin: {{ rpt().profitMargin }}%</div>
      </div>

      <!-- Balance Sheet mini -->
      <div class="card">
        <div style="font-size:13px;font-weight:700;margin-bottom:14px">🏛 Balance Sheet</div>
        <div style="display:flex;justify-content:space-between;font-size:12.5px;margin-bottom:6px">
          <span style="color:var(--muted)">Total Assets</span>
          <span style="font-weight:700;color:var(--purple)">\${{ rpt().balance?.assets | number:'1.2-2' }}</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:12.5px;margin-bottom:6px">
          <span style="color:var(--muted)">Total Liabilities</span>
          <span style="font-weight:700;color:var(--danger)">-\${{ rpt().balance?.liabilities | number:'1.2-2' }}</span>
        </div>
        <div style="border-top:1px solid var(--border);padding-top:8px;margin-top:4px;display:flex;justify-content:space-between">
          <span style="font-weight:700">Net Worth (Equity)</span>
          <span style="font-weight:800;font-size:15px" [style.color]="rpt().balance?.netWorth>=0?'var(--success)':'var(--danger)'">\${{ rpt().balance?.netWorth | number:'1.0-0' }}</span>
        </div>
      </div>

      <!-- Trend (last 6 months) -->
      <div class="card">
        <div style="font-size:13px;font-weight:700;margin-bottom:14px">📈 6-Month Trend</div>
        <div *ngFor="let t of (rpt().trend||[])" style="margin-bottom:8px">
          <div style="display:flex;justify-content:space-between;font-size:11.5px;margin-bottom:2px">
            <span style="color:var(--muted)">{{ t.month }}</span>
            <span style="font-weight:600;color:var(--success)">\${{ t.revenue | number:'1.0-0' }}</span>
          </div>
          <div style="display:flex;gap:4px;height:6px">
            <div style="flex:1;background:#dcfce7;border-radius:3px;overflow:hidden">
              <div style="height:100%;background:#22c55e;border-radius:3px" [style.width.%]="trendPct(t.revenue,'revenue')"></div>
            </div>
            <div style="flex:1;background:#fee2e2;border-radius:3px;overflow:hidden">
              <div style="height:100%;background:#ef4444;border-radius:3px" [style.width.%]="trendPct(t.expenses,'expenses')"></div>
            </div>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--muted);margin-top:1px">
            <span>Revenue</span><span style="color:var(--danger)">\${{ t.expenses | number:'1.0-0' }} exp</span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- ══ REVENUE TAB ══ -->
  <div *ngIf="tab()==='revenue'">
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px">
      <div class="card" style="border-left:4px solid #22c55e">
        <div style="font-size:11px;color:var(--muted);margin-bottom:4px">🏨 HOTEL ROOMS</div>
        <div style="font-size:24px;font-weight:800;color:var(--success)">\${{ rpt().revenue?.rooms | number:'1.2-2' }}</div>
        <div style="font-size:11px;color:var(--muted)">Guest payments &amp; checkouts</div>
      </div>
      <div class="card" style="border-left:4px solid var(--purple)">
        <div style="font-size:11px;color:var(--muted);margin-bottom:4px">🛎 GUEST SERVICES</div>
        <div style="font-size:24px;font-weight:800;color:var(--purple)">\${{ rpt().revenue?.services | number:'1.2-2' }}</div>
        <div style="font-size:11px;color:var(--muted)">Room services, laundry, spa...</div>
      </div>
      <div class="card" style="border-left:4px solid #f59e0b">
        <div style="font-size:11px;color:var(--muted);margin-bottom:4px">🍽 RESTAURANT & CAFÉ</div>
        <div style="font-size:24px;font-weight:800;color:#f59e0b">\${{ rpt().revenue?.restaurant | number:'1.2-2' }}</div>
        <div style="font-size:11px;color:var(--muted)">All paid food &amp; beverage orders</div>
      </div>
      <div class="card" style="border-left:4px solid #6d28d9">
        <div style="font-size:11px;color:var(--muted);margin-bottom:4px">🏛 HALL RENTALS</div>
        <div style="font-size:24px;font-weight:800;color:#6d28d9">\${{ rpt().revenue?.halls | number:'1.2-2' }}</div>
        <div style="font-size:11px;color:var(--muted)">Conference, banquet &amp; event spaces</div>
      </div>
    </div>
    <div class="card">
      <div style="font-size:13px;font-weight:700;margin-bottom:14px">🍽 Restaurant Breakdown by Order Type</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px">
        <div *ngFor="let rt of restaurantTypes()" style="text-align:center;background:var(--bg);border-radius:10px;padding:14px">
          <div style="font-size:24px;margin-bottom:4px">{{ rt.icon }}</div>
          <div style="font-size:12px;color:var(--muted)">{{ rt.label }}</div>
          <div style="font-size:18px;font-weight:800;color:var(--purple);margin-top:4px">\${{ rt.amount | number:'1.2-2' }}</div>
          <div style="font-size:10.5px;color:var(--muted)">{{ rt.pct }}%</div>
        </div>
      </div>
    </div>
  </div>

  <!-- ══ EXPENSES TAB ══ -->
  <div *ngIf="tab()==='expenses'">
    <div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap">
      <select class="tb-sel" [(ngModel)]="expCatFilter" (change)="loadExpenses()">
        <option value="">All Categories</option>
        <option *ngFor="let c of expCats" [value]="c">{{ expIcon(c) }} {{ c | titlecase }}</option>
      </select>
      <select class="tb-sel" [(ngModel)]="expSourceFilter" (change)="loadExpenses()">
        <option value="">All Sources</option>
        <option *ngFor="let s of sources" [value]="s.val">{{ s.icon }} {{ s.label }}</option>
      </select>
      <input type="date" class="tb-sel" [(ngModel)]="expFrom" (change)="loadExpenses()">
      <input type="date" class="tb-sel" [(ngModel)]="expTo" (change)="loadExpenses()">
    </div>
    <div class="card">
      <div class="rj" style="font-size:13px;font-weight:700;margin-bottom:12px;padding-bottom:10px;border-bottom:1px solid var(--border)">
        <span>{{ filteredExpenses().length }} expenses</span>
        <span style="color:var(--danger);font-size:16px;font-weight:800">\${{ expenseTotal() | number:'1.2-2' }}</span>
      </div>
      <table class="tbl-hover">
        <thead><tr><th>Date</th><th>Title</th><th>Category</th><th>Source</th><th>Amount</th><th>Recorded By</th><th>Notes</th><th>Actions</th></tr></thead>
        <tbody>
          <tr *ngFor="let e of filteredExpenses()">
            <td style="font-size:11.5px;color:var(--muted)">{{ e.date | date:'MMM d, y' }}</td>
            <td style="font-weight:600">{{ e.title }}</td>
            <td><span style="font-size:11px">{{ expIcon(e.category) }}</span> {{ e.category | titlecase }}</td>
            <td><span style="font-size:11px">{{ srcIcon(e.source) }}</span> {{ e.source | titlecase }}</td>
            <td style="font-weight:800;color:var(--danger)">\${{ e.amount | number:'1.2-2' }}</td>
            <td style="font-size:11.5px;color:var(--muted)">{{ e.recordedBy?.name || '—' }}</td>
            <td style="font-size:11.5px;color:var(--muted)">{{ e.notes || '—' }}</td>
            <td>
              <div style="display:flex;gap:4px">
                <button class="btn btn-o btn-xs" (click)="openExpenseEdit(e)">Edit</button>
                <button class="btn btn-danger btn-xs" (click)="deleteExpense(e._id)">✕</button>
              </div>
            </td>
          </tr>
          <tr *ngIf="!filteredExpenses().length">
            <td colspan="8" style="text-align:center;padding:30px;color:var(--muted)">No expenses found</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- ══ ASSETS TAB ══ -->
  <div *ngIf="tab()==='assets'">
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px">
      <div *ngFor="let cat of assetCatTotals()" class="mc" style="cursor:default">
        <div class="mc-ico">{{ assetIcon(cat.key) }}</div>
        <div class="mc-lbl">{{ cat.key | titlecase }}</div>
        <div class="mc-val" style="color:var(--purple)">\${{ cat.total | number:'1.0-0' }}</div>
      </div>
    </div>
    <div class="card">
      <div class="rj" style="font-size:13px;font-weight:700;margin-bottom:12px;padding-bottom:10px;border-bottom:1px solid var(--border)">
        <span>{{ assets().length }} assets</span>
        <span style="color:var(--purple);font-size:16px;font-weight:800">Total: \${{ totalAssets() | number:'1.2-2' }}</span>
      </div>
      <table class="tbl-hover">
        <thead><tr><th>Asset</th><th>Category</th><th>Value</th><th>Purchase Date</th><th>Description</th><th>Actions</th></tr></thead>
        <tbody>
          <tr *ngFor="let a of assets()">
            <td style="font-weight:600">{{ a.name }}</td>
            <td>{{ assetIcon(a.category) }} {{ a.category | titlecase }}</td>
            <td style="font-weight:800;color:var(--purple)">\${{ a.value | number:'1.2-2' }}</td>
            <td style="font-size:11.5px;color:var(--muted)">{{ a.purchaseDate ? (a.purchaseDate | date:'MMM d, y') : '—' }}</td>
            <td style="font-size:11.5px;color:var(--muted)">{{ a.description || '—' }}</td>
            <td>
              <div style="display:flex;gap:4px">
                <button class="btn btn-o btn-xs" (click)="openAssetEdit(a)">Edit</button>
                <button class="btn btn-danger btn-xs" (click)="deleteAsset(a._id)">✕</button>
              </div>
            </td>
          </tr>
          <tr *ngIf="!assets().length">
            <td colspan="6" style="text-align:center;padding:30px;color:var(--muted)">
              <div style="font-size:24px;margin-bottom:8px">🏛</div>No assets added yet
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- ══ LIABILITIES TAB ══ -->
  <div *ngIf="tab()==='liabilities'">
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:14px">
      <div class="mc"><div class="mc-ico">⚠️</div><div class="mc-lbl">Outstanding</div><div class="mc-val" style="color:var(--danger)">\${{ outstandingLiab() | number:'1.0-0' }}</div></div>
      <div class="mc"><div class="mc-ico">✅</div><div class="mc-lbl">Paid Off</div><div class="mc-val" style="color:var(--success)">\${{ paidLiab() | number:'1.0-0' }}</div></div>
      <div class="mc"><div class="mc-ico">📋</div><div class="mc-lbl">Total Count</div><div class="mc-val">{{ liabilities().length }}</div></div>
    </div>
    <div class="card">
      <table class="tbl-hover">
        <thead><tr><th>Liability</th><th>Category</th><th>Amount</th><th>Due Date</th><th>Status</th><th>Description</th><th>Actions</th></tr></thead>
        <tbody>
          <tr *ngFor="let l of liabilities()" [style.background]="!l.isPaid&&l.dueDate&&isOverdue(l.dueDate)?'#fff1f2':''">
            <td style="font-weight:600">{{ l.name }}</td>
            <td>{{ liabIcon(l.category) }} {{ l.category | titlecase }}</td>
            <td style="font-weight:800;color:var(--danger)">\${{ l.amount | number:'1.2-2' }}</td>
            <td style="font-size:11.5px" [style.color]="!l.isPaid&&isOverdue(l.dueDate)?'var(--danger)':'var(--muted)'">
              {{ l.dueDate ? (l.dueDate | date:'MMM d, y') : '—' }}
              <span *ngIf="!l.isPaid&&isOverdue(l.dueDate)" style="font-size:9.5px;font-weight:700"> OVERDUE</span>
            </td>
            <td>
              <span *ngIf="l.isPaid" class="badge b-green" style="font-size:9.5px">✅ Paid</span>
              <span *ngIf="!l.isPaid" class="badge b-red" style="font-size:9.5px">⚠ Outstanding</span>
            </td>
            <td style="font-size:11.5px;color:var(--muted)">{{ l.description || '—' }}</td>
            <td>
              <div style="display:flex;gap:4px">
                <button *ngIf="!l.isPaid" class="btn btn-success btn-xs" (click)="markLiabPaid(l._id)">Mark Paid</button>
                <button class="btn btn-o btn-xs" (click)="openLiabEdit(l)">Edit</button>
                <button class="btn btn-danger btn-xs" (click)="deleteLiability(l._id)">✕</button>
              </div>
            </td>
          </tr>
          <tr *ngIf="!liabilities().length">
            <td colspan="7" style="text-align:center;padding:30px;color:var(--muted)">
              <div style="font-size:24px;margin-bottom:8px">✅</div>No liabilities recorded
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- ══ EXPENSE FORM ══ -->
  <div class="overlay" [class.show]="showExpenseForm()" (click)="bgClick($event,'exp')">
    <div class="modal" style="width:480px">
      <div class="modal-head">
        <div class="modal-title">{{ editExpId() ? 'Edit Expense' : 'Add Expense' }}</div>
        <button class="modal-close" (click)="showExpenseForm.set(false)">x</button>
      </div>
      <div class="form-row">
        <div class="fg" style="flex:2"><label>Title *</label><input [(ngModel)]="ef.title" placeholder="e.g. Electricity bill"></div>
        <div class="fg"><label>Amount (\$) *</label><input type="number" [(ngModel)]="ef.amount" min="0"></div>
      </div>
      <div class="form-row">
        <div class="fg"><label>Category *</label>
          <select [(ngModel)]="ef.category">
            <option *ngFor="let c of expCats" [value]="c">{{ expIcon(c) }} {{ c | titlecase }}</option>
          </select>
        </div>
        <div class="fg"><label>Source</label>
          <select [(ngModel)]="ef.source">
            <option *ngFor="let s of sources" [value]="s.val">{{ s.icon }} {{ s.label }}</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="fg"><label>Date *</label><input type="date" [(ngModel)]="ef.date"></div>
      </div>
      <div class="fg"><label>Notes</label><textarea rows="2" [(ngModel)]="ef.notes"></textarea></div>
      <div *ngIf="formErr()" style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:10px;font-size:12.5px;color:#b91c1c;margin-bottom:10px">{{ formErr() }}</div>
      <div style="display:flex;gap:10px">
        <button class="btn btn-o" style="flex:1" (click)="showExpenseForm.set(false)">Cancel</button>
        <button class="btn btn-g" style="flex:2" (click)="saveExpense()" [disabled]="saving()">{{ saving()?'Saving...':'Save Expense' }}</button>
      </div>
    </div>
  </div>

  <!-- ══ ASSET FORM ══ -->
  <div class="overlay" [class.show]="showAssetForm()" (click)="bgClick($event,'asset')">
    <div class="modal" style="width:480px">
      <div class="modal-head">
        <div class="modal-title">{{ editAssetId() ? 'Edit Asset' : 'Add Asset' }}</div>
        <button class="modal-close" (click)="showAssetForm.set(false)">x</button>
      </div>
      <div class="form-row">
        <div class="fg" style="flex:2"><label>Asset Name *</label><input [(ngModel)]="af.name" placeholder="e.g. Reception Computer"></div>
        <div class="fg"><label>Value (\$) *</label><input type="number" [(ngModel)]="af.value" min="0"></div>
      </div>
      <div class="form-row">
        <div class="fg"><label>Category</label>
          <select [(ngModel)]="af.category">
            <option *ngFor="let c of assetCats" [value]="c">{{ assetIcon(c) }} {{ c | titlecase }}</option>
          </select>
        </div>
        <div class="fg"><label>Purchase Date</label><input type="date" [(ngModel)]="af.purchaseDate"></div>
      </div>
      <div class="fg"><label>Description</label><input [(ngModel)]="af.description"></div>
      <div style="display:flex;gap:10px">
        <button class="btn btn-o" style="flex:1" (click)="showAssetForm.set(false)">Cancel</button>
        <button class="btn btn-g" style="flex:2" (click)="saveAsset()" [disabled]="saving()">{{ saving()?'Saving...':'Save Asset' }}</button>
      </div>
    </div>
  </div>

  <!-- ══ LIABILITY FORM ══ -->
  <div class="overlay" [class.show]="showLiabForm()" (click)="bgClick($event,'liab')">
    <div class="modal" style="width:480px">
      <div class="modal-head">
        <div class="modal-title">{{ editLiabId() ? 'Edit Liability' : 'Add Liability' }}</div>
        <button class="modal-close" (click)="showLiabForm.set(false)">x</button>
      </div>
      <div class="form-row">
        <div class="fg" style="flex:2"><label>Name *</label><input [(ngModel)]="lf.name" placeholder="e.g. Bank Loan"></div>
        <div class="fg"><label>Amount (\$) *</label><input type="number" [(ngModel)]="lf.amount" min="0"></div>
      </div>
      <div class="form-row">
        <div class="fg"><label>Category</label>
          <select [(ngModel)]="lf.category">
            <option *ngFor="let c of liabCats" [value]="c">{{ liabIcon(c) }} {{ c | titlecase }}</option>
          </select>
        </div>
        <div class="fg"><label>Due Date</label><input type="date" [(ngModel)]="lf.dueDate"></div>
      </div>
      <div class="fg"><label>Description</label><input [(ngModel)]="lf.description"></div>
      <div style="display:flex;gap:10px">
        <button class="btn btn-o" style="flex:1" (click)="showLiabForm.set(false)">Cancel</button>
        <button class="btn btn-g" style="flex:2" (click)="saveLiability()" [disabled]="saving()">{{ saving()?'Saving...':'Save Liability' }}</button>
      </div>
    </div>
  </div>

</div>`,
})
export class FinanceComponent implements OnInit {
  tab         = signal<FTab>('overview');
  rpt         = signal<any>({ revenue:{total:0,rooms:0,services:0,restaurant:0,restaurantBreakdown:{}}, expenses:{total:0,byCategory:{}}, profit:0, profitMargin:0, balance:{assets:0,liabilities:0,netWorth:0}, trend:[], assets:[], liabilities:[] });
  expenses    = signal<any[]>([]);
  assets      = signal<any[]>([]);
  liabilities = signal<any[]>([]);
  saving      = signal(false);
  formErr     = signal('');
  showExpenseForm = signal(false);
  showAssetForm   = signal(false);
  showLiabForm    = signal(false);
  editExpId       = signal<string|null>(null);
  editAssetId     = signal<string|null>(null);
  editLiabId      = signal<string|null>(null);

  period = 'month';
  expCatFilter = ''; expSourceFilter = ''; expFrom = ''; expTo = '';
  ef: any = { title:'', amount:0, category:'other', source:'general', date:new Date().toISOString().split('T')[0], notes:'' };
  af: any = { name:'', value:0, category:'equipment', purchaseDate:'', description:'' };
  lf: any = { name:'', amount:0, category:'other', dueDate:'', description:'' };

  expCats   = EXPENSE_CATS;
  assetCats = ASSET_CATS;
  liabCats  = LIAB_CATS;
  sources   = SOURCES;

  readonly filteredExpenses = computed(() => this.expenses());
  readonly totalAssets      = computed(() => this.assets().reduce((s: number, a: any) => s+(a.value||0), 0));
  readonly outstandingLiab  = computed(() => this.liabilities().filter((l: any)=>!l.isPaid).reduce((s: number,l: any)=>s+(l.amount||0),0));
  readonly paidLiab         = computed(() => this.liabilities().filter((l: any)=>l.isPaid).reduce((s: number,l: any)=>s+(l.amount||0),0));

  expenseTotal() { return this.filteredExpenses().reduce((s: number, e: any) => s+(e.amount||0), 0); }

  readonly assetCatTotals = computed(() => {
    const m: Record<string,number> = {};
    this.assets().forEach((a: any) => { m[a.category]=(m[a.category]||0)+(a.value||0); });
    return Object.entries(m).map(([k,v])=>({ key:k, total:v })).sort((a,b)=>b.total-a.total).slice(0,4);
  });

  readonly revenueSources = computed(() => {
    const r = this.rpt().revenue||{};
    const total = r.total || 1;
    return [
      { icon:'🏨', label:'Hotel Rooms',    amount: r.rooms||0,      color:'#22c55e', pct: Math.round((r.rooms||0)/total*100) },
      { icon:'🛎', label:'Guest Services', amount: r.services||0,   color:'#8b5cf6', pct: Math.round((r.services||0)/total*100) },
      { icon:'🍽', label:'Restaurant',     amount: r.restaurant||0, color:'#f59e0b', pct: Math.round((r.restaurant||0)/total*100) },
      { icon:'🏛', label:'Hall Rentals',      amount: r.halls||0,      color:'#6d28d9', pct: Math.round((r.halls||0)/total*100) },
    ];
  });

  readonly expenseSources = computed(() => {
    const d = this.rpt().expenses?.byCategory || {};
    const total = Object.values(d).reduce((s: number, v: any) => s + Number(v), 0) || 1;
    return Object.entries(d).map(([k,v]) => ({ key:k, amount: Number(v), pct: Math.round(Number(v)/total*100) })).sort((a,b)=>b.amount-a.amount).slice(0,6);
  });

  readonly restaurantTypes = computed(() => {
    const b = this.rpt().revenue?.restaurantBreakdown || {};
    const total = this.rpt().revenue?.restaurant || 1;
    return [
      { icon:'🪑', label:'Dine In',      amount: b.dine_in||0,      pct: Math.round((b.dine_in||0)/total*100) },
      { icon:'🛏', label:'Room Service', amount: b.room_service||0,  pct: Math.round((b.room_service||0)/total*100) },
      { icon:'🥡', label:'Takeaway',     amount: b.takeaway||0,      pct: Math.round((b.takeaway||0)/total*100) },
    ];
  });

  trendPct(v: number, type: string): number {
    const trend = this.rpt().trend || [];
    const max = Math.max(...trend.map((t: any) => type==='revenue' ? t.revenue : t.expenses), 1);
    return Math.round(v / max * 100);
  }

  isOverdue(d: string): boolean { return !!d && new Date(d) < new Date(); }

  expIcon(c: string)  { return EXPENSE_ICONS[c] || '📋'; }
  assetIcon(c: string){ return ASSET_ICONS[c]   || '💼'; }
  liabIcon(c: string) { return LIAB_ICONS[c]    || '📄'; }
  srcIcon(s: string)  { return SOURCES.find(x=>x.val===s)?.icon || '🏢'; }

  constructor(private finSvc: FinanceService) {}

  ngOnInit() { this.loadReport(); }

  loadReport() {
    this.finSvc.getReport({ period: this.period }).subscribe({
      next: (r: any) => this.rpt.set(r.data||{}),
    });
  }

  loadExpenses() {
    const f: any = {};
    if (this.expCatFilter)    f.category = this.expCatFilter;
    if (this.expSourceFilter) f.source   = this.expSourceFilter;
    if (this.expFrom) f.from = this.expFrom;
    if (this.expTo)   f.to   = this.expTo;
    this.finSvc.getExpenses(f).subscribe({ next: (r: any) => this.expenses.set(r.data.expenses||[]) });
  }

  loadAssets()      { this.finSvc.getAssets().subscribe({ next: (r: any) => this.assets.set(r.data.assets||[]) }); }
  loadLiabilities() { this.finSvc.getLiabilities().subscribe({ next: (r: any) => this.liabilities.set(r.data.liabilities||[]) }); }

  // Expenses
  openExpenseForm()   { this.editExpId.set(null); this.ef = { title:'', amount:0, category:'other', source:'general', date:new Date().toISOString().split('T')[0], notes:'' }; this.formErr.set(''); this.showExpenseForm.set(true); }
  openExpenseEdit(e: any) { this.editExpId.set(e._id); this.ef = { title:e.title, amount:e.amount, category:e.category, source:e.source, date:new Date(e.date).toISOString().split('T')[0], notes:e.notes||'' }; this.formErr.set(''); this.showExpenseForm.set(true); }
  saveExpense() {
    if (!this.ef.title.trim()) { this.formErr.set('Title required'); return; }
    if (!this.ef.amount)       { this.formErr.set('Amount required'); return; }
    this.saving.set(true); this.formErr.set('');
    const eid = this.editExpId();
    const req = eid ? this.finSvc.updateExpense(eid, this.ef) : this.finSvc.createExpense(this.ef);
    req.subscribe({ next: () => { this.saving.set(false); this.showExpenseForm.set(false); this.loadExpenses(); this.loadReport(); }, error: () => this.saving.set(false) });
  }
  deleteExpense(id: string) { if (confirm('Delete this expense?')) this.finSvc.deleteExpense(id).subscribe(() => { this.loadExpenses(); this.loadReport(); }); }

  // Assets
  openAssetForm()   { this.editAssetId.set(null); this.af = { name:'', value:0, category:'equipment', purchaseDate:'', description:'' }; this.showAssetForm.set(true); }
  openAssetEdit(a: any) { this.editAssetId.set(a._id); this.af = { name:a.name, value:a.value, category:a.category, purchaseDate:a.purchaseDate?new Date(a.purchaseDate).toISOString().split('T')[0]:'', description:a.description||'' }; this.showAssetForm.set(true); }
  saveAsset() {
    if (!this.af.name.trim()) return;
    this.saving.set(true);
    const eid = this.editAssetId();
    const req = eid ? this.finSvc.updateAsset(eid, this.af) : this.finSvc.createAsset(this.af);
    req.subscribe({ next: () => { this.saving.set(false); this.showAssetForm.set(false); this.loadAssets(); this.loadReport(); }, error: () => this.saving.set(false) });
  }
  deleteAsset(id: string) { if (confirm('Delete this asset?')) this.finSvc.deleteAsset(id).subscribe(() => { this.loadAssets(); this.loadReport(); }); }

  // Liabilities
  openLiabForm()   { this.editLiabId.set(null); this.lf = { name:'', amount:0, category:'other', dueDate:'', description:'' }; this.showLiabForm.set(true); }
  openLiabEdit(l: any) { this.editLiabId.set(l._id); this.lf = { name:l.name, amount:l.amount, category:l.category, dueDate:l.dueDate?new Date(l.dueDate).toISOString().split('T')[0]:'', description:l.description||'' }; this.showLiabForm.set(true); }
  saveLiability() {
    if (!this.lf.name.trim()) return;
    this.saving.set(true);
    const eid = this.editLiabId();
    const req = eid ? this.finSvc.updateLiability(eid, this.lf) : this.finSvc.createLiability(this.lf);
    req.subscribe({ next: () => { this.saving.set(false); this.showLiabForm.set(false); this.loadLiabilities(); this.loadReport(); }, error: () => this.saving.set(false) });
  }
  markLiabPaid(id: string) { this.finSvc.updateLiability(id, { isPaid:true }).subscribe(() => { this.loadLiabilities(); this.loadReport(); }); }
  deleteLiability(id: string) { if (confirm('Delete this liability?')) this.finSvc.deleteLiability(id).subscribe(() => { this.loadLiabilities(); this.loadReport(); }); }

  bgClick(e: Event, t: string) {
    if (!(e.target as HTMLElement).classList.contains('overlay')) return;
    const m: Record<string,any> = { exp:this.showExpenseForm, asset:this.showAssetForm, liab:this.showLiabForm };
    m[t]?.set(false);
  }
}
