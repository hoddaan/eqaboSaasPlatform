import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MenuService, OrderService, GuestService } from '../../core/services/api.service';

type RTab = 'pos'|'tables'|'orders'|'menu'|'store';
const DEFAULT_CATS = ['breakfast','lunch','dinner','salads','snacks','coffee','drinks','desserts','specials'];
const CAT_ICONS: Record<string,string> = {
  breakfast:'🌅',lunch:'☀️',dinner:'🌙',salads:'🥗',snacks:'🍟',
  coffee:'☕',drinks:'🥤',desserts:'🍰',specials:'⭐'
};
const STORE_CATS = ['beverages','food','supplies','cleaning','other'];
const TABLE_LOCS = ['indoor','outdoor','bar','terrace','private'];

@Component({
  selector: 'app-restaurant',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
<div class="page-content">

  <!-- Header -->
  <div class="sec-head mb20">
    <div>
      <div style="font-size:18px;font-weight:800;letter-spacing:-.4px">🍽 Restaurant & Café</div>
      <div style="font-size:12.5px;color:var(--muted);margin-top:3px">POS · Tables · Orders · Menu · Store</div>
    </div>
    <div style="display:flex;gap:8px;align-items:center">
      <input *ngIf="tab()!=='pos'&&tab()!=='tables'" style="width:180px" [(ngModel)]="search" (input)="onSearch()" placeholder="Search...">
      <button *ngIf="tab()==='menu'" class="btn btn-o btn-sm" (click)="openCatManager()" style="margin-right:4px">⚙️ Categories</button>
      <button *ngIf="tab()==='menu'" class="btn btn-g btn-sm" (click)="openMenuForm()">＋ Add Item</button>
      <button *ngIf="tab()==='store'" class="btn btn-g btn-sm" (click)="openStoreForm()">＋ Add Item</button>
      <button *ngIf="tab()==='tables'" class="btn btn-g btn-sm" (click)="openTableForm()">＋ Add Table</button>
    </div>
  </div>

  <!-- Dashboard stats -->
  <div class="g4 mb20">
    <div class="mc" (click)="tab.set('orders')" style="cursor:pointer">
      <div class="mc-ico">📦</div><div class="mc-lbl">Today Orders</div>
      <div class="mc-val">{{ dash().todayOrders }}</div>
    </div>
    <div class="mc" (click)="tab.set('pos')" style="cursor:pointer">
      <div class="mc-ico">⏳</div><div class="mc-lbl">Pending</div>
      <div class="mc-val" style="color:var(--warn)">{{ dash().pendingOrders }}</div>
    </div>
    <div class="mc" (click)="tab.set('tables')" style="cursor:pointer">
      <div class="mc-ico">🪑</div><div class="mc-lbl">Tables Occupied</div>
      <div class="mc-val" style="color:var(--danger)">{{ dash().tablesOccupied }}/{{ dash().totalTables }}</div>
    </div>
    <div class="mc">
      <div class="mc-ico">💰</div><div class="mc-lbl">Today Revenue</div>
      <div class="mc-val" style="color:var(--success)">\${{ (dash().todayRevenue||0) | number:'1.0-0' }}</div>
    </div>
  </div>

  <!-- Tabs -->
  <div style="display:flex;gap:4px;margin-bottom:16px;background:var(--bg);border-radius:12px;padding:4px;width:fit-content;border:1px solid var(--border)">
    <button class="btn btn-sm" [ngClass]="tab()==='pos'?'btn-g':'btn-ghost'" (click)="tab.set('pos')">💳 POS</button>
    <button class="btn btn-sm" [ngClass]="tab()==='tables'?'btn-g':'btn-ghost'" (click)="tab.set('tables')">🪑 Tables</button>
    <button class="btn btn-sm" [ngClass]="tab()==='orders'?'btn-g':'btn-ghost'" (click)="tab.set('orders')">📦 Orders ({{ activeOrders().length }})</button>
    <button class="btn btn-sm" [ngClass]="tab()==='menu'?'btn-g':'btn-ghost'" (click)="tab.set('menu')">📋 Menu</button>
    <button class="btn btn-sm" [ngClass]="tab()==='store'?'btn-g':'btn-ghost'" (click)="tab.set('store')">🏪 Store</button>
  </div>

  <!-- ══════════ POS TAB ══════════ -->
  <div *ngIf="tab()==='pos'" style="display:grid;grid-template-columns:1.4fr 1fr;gap:16px">

    <!-- Menu grid -->
    <div>
      <!-- Category filter -->
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px">
        <button *ngFor="let c of catNames()" class="btn btn-sm"
          [ngClass]="posCategory()===c?'btn-g':'btn-o'"
          (click)="posCategory.set(c)">
          {{ catIcon(c) }} {{ c | titlecase }}
        </button>
        <button class="btn btn-sm" [ngClass]="posCategory()===''?'btn-g':'btn-o'" (click)="posCategory.set('')">All</button>
      </div>
      <input style="width:100%;margin-bottom:12px" [(ngModel)]="posSearch" (input)="filterPosMenu()" placeholder="Search menu...">
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;max-height:calc(100vh - 320px);overflow-y:auto;padding-right:4px">
        <div *ngFor="let item of filteredPosMenu()"
          style="background:var(--surface);border-radius:12px;padding:12px;cursor:pointer;transition:all .15s;border:2px solid transparent;text-align:center"
          [style.border-color]="posCartHas(item._id)?'var(--purple)':'transparent'"
          [style.background]="posCartHas(item._id)?'#f3e8ff':'var(--surface)'"
          (click)="addToCart(item)">
          <div style="font-size:26px;margin-bottom:5px">{{ catIcon(item.category) }}</div>
          <div style="font-size:12px;font-weight:700;margin-bottom:3px;line-height:1.2">{{ item.name }}</div>
          <div *ngIf="item.preparationTime" style="font-size:10px;color:var(--muted)">⏱ {{ item.preparationTime }}min</div>
          <div style="font-size:14px;font-weight:800;color:var(--purple);margin-top:4px">\${{ item.price }}</div>
          <div *ngIf="posCartHas(item._id)" style="margin-top:4px">
            <span style="background:var(--grad);color:#fff;border-radius:20px;font-size:10px;font-weight:700;padding:2px 8px">
              × {{ cartQty(item._id) }}
            </span>
          </div>
        </div>
        <div *ngIf="!filteredPosMenu().length" style="grid-column:1/-1;text-align:center;padding:30px;color:var(--muted)">
          No items in this category
        </div>
      </div>
    </div>

    <!-- Cart / Order panel -->
    <div>
      <div class="card" style="height:calc(100vh - 220px);display:flex;flex-direction:column">
        <div style="font-size:13px;font-weight:800;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center">
          <span>🛒 Order</span>
          <button *ngIf="cart().length" class="btn btn-danger btn-xs" (click)="clearCart()">Clear</button>
        </div>

        <!-- Order type -->
        <div style="display:flex;gap:6px;margin-bottom:12px">
          <button *ngFor="let t of orderTypes" class="btn btn-xs"
            [ngClass]="posType()===t.val?'btn-g':'btn-o'"
            style="flex:1" (click)="posType.set(t.val)">{{ t.icon }} {{ t.label }}</button>
        </div>

        <!-- Table / Room selector -->
        <div *ngIf="posType()==='dine_in'" class="fg" style="margin-bottom:8px">
          <select [(ngModel)]="posTableId" (change)="onTableSelect()" style="font-size:12px">
            <option value="">-- Select table --</option>
            <option *ngFor="let t of availableTables()" [value]="t._id">
              Table {{ t.number }} ({{ t.capacity }}p) — {{ t.location }}
            </option>
          </select>
        </div>
        <div *ngIf="posType()==='room_service'" style="margin-bottom:8px">
          <div class="form-row" style="margin-bottom:6px">
            <div class="fg"><input [(ngModel)]="posGuestName" placeholder="Guest name" style="font-size:12px"></div>
            <div class="fg"><input [(ngModel)]="posRoomNumber" placeholder="Room number" style="font-size:12px"></div>
          </div>
        </div>
        <div *ngIf="posType()==='takeaway'" class="fg" style="margin-bottom:8px">
          <input [(ngModel)]="posGuestName" placeholder="Customer name (optional)" style="font-size:12px">
        </div>

        <!-- Cart items -->
        <div style="flex:1;overflow-y:auto;min-height:0;margin-bottom:10px">
          <div *ngIf="!cart().length" style="text-align:center;padding:30px;color:var(--muted);font-size:12.5px">
            <div style="font-size:28px;margin-bottom:6px">🛒</div>Tap menu items to add
          </div>
          <div *ngFor="let item of cart()" style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--border)">
            <div style="flex:1;min-width:0">
              <div style="font-size:12.5px;font-weight:600">{{ item.name }}</div>
              <div style="font-size:11px;color:var(--muted)">\${{ item.unitPrice }} each</div>
            </div>
            <div style="display:flex;align-items:center;gap:5px">
              <button class="btn btn-o btn-xs" style="width:24px;height:24px;padding:0;line-height:1" (click)="decrementCart(item)">−</button>
              <span style="font-size:13px;font-weight:700;min-width:20px;text-align:center">{{ item.qty }}</span>
              <button class="btn btn-o btn-xs" style="width:24px;height:24px;padding:0;line-height:1" (click)="incrementCart(item)">+</button>
            </div>
            <div style="font-size:13px;font-weight:800;color:var(--purple);min-width:44px;text-align:right">\${{ item.subtotal }}</div>
            <button class="btn btn-danger btn-xs" style="padding:2px 6px" (click)="removeFromCart(item)">✕</button>
          </div>
        </div>

        <!-- Totals + discount -->
        <div *ngIf="cart().length" style="border-top:1px solid var(--border);padding-top:10px;font-size:12.5px">
          <div class="rj mb5"><span style="color:var(--muted)">Subtotal</span><span>\${{ cartSubtotal() }}</span></div>
          <div class="rj mb5"><span style="color:var(--muted)">Tax (5%)</span><span>\${{ cartTax() }}</span></div>
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
            <span style="color:var(--muted);font-size:12px;flex:1">🏷 Discount %</span>
            <input type="number" [(ngModel)]="posDiscount" min="0" max="100"
              style="width:55px;text-align:center;font-size:12px;padding:3px 6px;border-radius:6px;border:1.5px solid var(--border)">
            <span *ngIf="cartDiscountAmt()>0" style="font-size:11px;color:var(--success)">-\${{ cartDiscountAmt() }}</span>
          </div>
          <div class="rj" style="font-size:15px;font-weight:800;color:var(--purple);margin-bottom:10px">
            <span>Total</span><span>\${{ cartTotal() }}</span>
          </div>
          <!-- Payment method -->
          <div style="display:flex;gap:5px;margin-bottom:10px">
            <button *ngFor="let m of payMethods" class="btn btn-xs" style="flex:1"
              [ngClass]="posPayMethod()===m.val?'btn-g':'btn-o'"
              (click)="posPayMethod.set(m.val)">{{ m.icon }} {{ m.label }}</button>
          </div>
          <!-- Room number for room charge -->
          <div *ngIf="posPayMethod()==='room_charge'" style="margin-bottom:8px">
            <div style="font-size:11px;color:var(--warn);font-weight:600;margin-bottom:4px">🛏 Bill to Room</div>
            <input [(ngModel)]="posRoomNumber" placeholder="Enter room number *" style="width:100%;font-size:12px;border:1.5px solid var(--warn)">
          </div>
          <!-- Notes -->
          <input [(ngModel)]="posNotes" placeholder="Order notes..." style="width:100%;font-size:11.5px;margin-bottom:10px">
          <button class="btn btn-g" style="width:100%;font-size:13px;font-weight:700;padding:12px"
            (click)="submitOrder()" [disabled]="orderSaving()">
            {{ orderSaving() ? 'Creating...' : '✓ Place Order — \$'+cartTotal() }}
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- ══════════ TABLES TAB ══════════ -->
  <!-- ══════════ TABLES TAB ══════════ -->
  <div *ngIf="tab()==='tables'">

    <!-- Summary strip -->
    <div style="display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap">
      <div *ngFor="let s of tableStats()" style="display:flex;align-items:center;gap:8px;background:var(--surface);border-radius:10px;padding:8px 14px;border:1.5px solid"
        [style.border-color]="s.border" [style.cursor]="'pointer'" (click)="tableFilter.set(s.filter)">
        <div style="width:12px;height:12px;border-radius:50%" [style.background]="s.color"></div>
        <span style="font-size:12.5px;font-weight:700">{{ s.label }}</span>
        <span style="font-size:18px;font-weight:900" [style.color]="s.color">{{ s.count }}</span>
      </div>
      <button class="btn btn-sm" style="margin-left:auto" [ngClass]="tableViewMode()==='floor'?'btn-g':'btn-o'" (click)="tableViewMode.set('floor')">🗺 Floor Plan</button>
      <button class="btn btn-sm" [ngClass]="tableViewMode()=='list'?'btn-g':'btn-o'" (click)="tableViewMode.set('list')">📋 List View</button>
    </div>

    <!-- Location filter tabs -->
    <div style="display:flex;gap:4px;margin-bottom:16px;background:var(--bg);border-radius:12px;padding:4px;width:fit-content;border:1px solid var(--border)">
      <button class="btn btn-sm" [ngClass]="tableFilter()===''?'btn-g':'btn-ghost'" (click)="tableFilter.set('')">All ({{ tables().length }})</button>
      <button *ngFor="let loc of tableLocs" class="btn btn-sm"
        [ngClass]="tableFilter()===loc?'btn-g':'btn-ghost'"
        (click)="tableFilter.set(loc)">
        {{ locIcon(loc) }} {{ loc | titlecase }} ({{ tableCountByLoc(loc) }})
      </button>
    </div>

    <!-- ── FLOOR PLAN VIEW ── -->
    <div *ngIf="tableViewMode()==='floor'">
      <div style="background:var(--surface);border-radius:16px;border:1.5px solid var(--border);padding:20px;min-height:420px;position:relative">

        <!-- Legend -->
        <div style="display:flex;gap:14px;margin-bottom:18px;flex-wrap:wrap">
          <div style="display:flex;align-items:center;gap:5px;font-size:11.5px"><div style="width:14px;height:14px;border-radius:3px;background:#22c55e"></div>Available</div>
          <div style="display:flex;align-items:center;gap:5px;font-size:11.5px"><div style="width:14px;height:14px;border-radius:3px;background:#ef4444"></div>Occupied</div>
          <div style="display:flex;align-items:center;gap:5px;font-size:11.5px"><div style="width:14px;height:14px;border-radius:3px;background:#eab308"></div>Reserved</div>
          <div style="display:flex;align-items:center;gap:5px;font-size:11.5px"><div style="width:14px;height:14px;border-radius:3px;background:#94a3b8"></div>Cleaning</div>
          <span style="font-size:11.5px;color:var(--muted);margin-left:auto">Click any table to manage</span>
        </div>

        <!-- Floor grid -->
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:14px">
          <div *ngFor="let t of filteredTables()"
            style="border-radius:14px;padding:14px 10px;text-align:center;cursor:pointer;transition:all .18s;border:2.5px solid;position:relative;box-shadow:0 2px 8px rgba(0,0,0,.06)"
            [style.background]="floorBg(t.status)"
            [style.border-color]="floorBorder(t.status)"
            [style.opacity]="selectedTable()?._id===t._id?'1':'0.92'"
            [style.transform]="selectedTable()?._id===t._id?'scale(1.04)':'scale(1)'"
            [style.box-shadow]="selectedTable()?._id===t._id?'0 0 0 3px var(--purple)':'0 2px 8px rgba(0,0,0,.06)'"
            (click)="selectTable(t)">

            <!-- Shape icon -->
            <div style="font-size:32px;margin-bottom:5px">{{ tableShapeIcon(t) }}</div>

            <!-- Table number -->
            <div style="font-size:14px;font-weight:900;margin-bottom:2px">{{ t.number }}</div>

            <!-- Capacity -->
            <div style="font-size:10.5px;color:var(--muted);margin-bottom:5px">
              <span *ngFor="let i of seatsArray(t.capacity)" style="font-size:9px">👤</span>
            </div>

            <!-- Status badge -->
            <div style="font-size:9.5px;font-weight:700;padding:2px 8px;border-radius:20px;display:inline-block"
              [style.background]="floorPillBg(t.status)"
              [style.color]="floorPillColor(t.status)">
              {{ t.status | titlecase }}
            </div>

            <!-- Order info on occupied -->
            <div *ngIf="t.currentOrderId&&t.status==='occupied'" style="margin-top:6px;background:rgba(0,0,0,.07);border-radius:8px;padding:5px 6px">
              <div style="font-size:9.5px;font-weight:700;color:var(--purple);font-family:monospace">{{ t.currentOrderId.orderNumber }}</div>
              <div style="font-size:11px;font-weight:800">\${{ t.currentOrderId.totalAmount }}</div>
              <div style="font-size:9px;color:var(--muted)">{{ t.currentOrderId.items?.length }} items</div>
            </div>

            <!-- Duration for occupied -->
            <div *ngIf="t.status==='occupied'&&t.currentOrderId?.createdAt" style="font-size:9px;color:var(--muted);margin-top:3px">
              ⏱ {{ orderAge(t.currentOrderId?.createdAt) }}
            </div>
          </div>

          <div *ngIf="!filteredTables().length" style="grid-column:1/-1;text-align:center;padding:40px;color:var(--muted)">
            <div style="font-size:32px;margin-bottom:8px">🪑</div>No tables in this section.
          </div>
        </div>
      </div>

      <!-- Selected table action panel -->
      <div *ngIf="selectedTable()" style="margin-top:16px;background:var(--surface);border-radius:14px;padding:18px;border:1.5px solid var(--purple)">
        <div style="display:flex;align-items:flex-start;gap:16px;flex-wrap:wrap">
          <div style="flex:1;min-width:200px">
            <div style="font-size:16px;font-weight:800;margin-bottom:4px">
              {{ tableShapeIcon(selectedTable()) }} Table {{ selectedTable().number }}
              <span style="font-size:11px;font-weight:400;color:var(--muted)"> · {{ selectedTable().location | titlecase }} · {{ selectedTable().capacity }} persons</span>
            </div>
            <div *ngIf="selectedTable().status==='occupied'&&selectedTable().currentOrderId" style="background:var(--bg);border-radius:10px;padding:10px 12px;margin-top:8px">
              <div style="display:flex;justify-content:space-between;font-size:12.5px;margin-bottom:4px">
                <span style="font-family:monospace;color:var(--purple);font-weight:700">{{ selectedTable().currentOrderId.orderNumber }}</span>
                <span style="font-weight:800">\${{ selectedTable().currentOrderId.totalAmount }}</span>
              </div>
              <div *ngFor="let item of (selectedTable().currentOrderId.items||[])" style="font-size:11.5px;color:var(--muted);display:flex;justify-content:space-between">
                <span>× {{ item.qty }} {{ item.name }}</span><span>\${{ item.subtotal }}</span>
              </div>
            </div>
            <div *ngIf="selectedTable().status==='available'" style="color:var(--success);font-size:12.5px;margin-top:6px">✅ Ready to seat guests</div>
            <div *ngIf="selectedTable().status==='cleaning'" style="color:var(--warn);font-size:12.5px;margin-top:6px">🧹 Being cleaned</div>
            <div *ngIf="selectedTable().status==='reserved'" style="color:var(--info,#3b82f6);font-size:12.5px;margin-top:6px">🔵 Reserved</div>
          </div>
          <div style="display:flex;flex-direction:column;gap:8px;min-width:160px">
            <button *ngIf="selectedTable().status==='available'" class="btn btn-g btn-sm"
              (click)="goToNewOrder(selectedTable())">➕ New Order</button>
            <button *ngIf="selectedTable().status==='occupied'&&selectedTable().currentOrderId" class="btn btn-g btn-sm"
              (click)="openPayOrder(selectedTable().currentOrderId)">💳 Pay Bill</button>
            <button *ngIf="selectedTable().status==='occupied'&&selectedTable().currentOrderId" class="btn btn-o btn-sm"
              (click)="openAddItems(selectedTable().currentOrderId)">＋ Add Items</button>
            <button *ngIf="selectedTable().status==='occupied'" class="btn btn-warn btn-sm"
              (click)="setTableStatus(selectedTable(),'cleaning')">🧹 Mark for Cleaning</button>
            <button *ngIf="selectedTable().status==='cleaning'" class="btn btn-success btn-sm"
              (click)="setTableStatus(selectedTable(),'available')">✅ Mark Available</button>
            <button *ngIf="selectedTable().status==='available'" class="btn btn-o btn-sm"
              (click)="setTableStatus(selectedTable(),'reserved')">🔵 Mark Reserved</button>
            <button *ngIf="selectedTable().status==='reserved'" class="btn btn-g btn-sm"
              (click)="setTableStatus(selectedTable(),'available')">✅ Free Up</button>
            <button class="btn btn-o btn-sm" (click)="openTableEdit(selectedTable())">✏ Edit Table</button>
            <button class="btn btn-danger btn-sm" (click)="confirmDeleteTable(selectedTable())">🗑 Remove Table</button>
          </div>
        </div>
      </div>
    </div>

    <!-- ── LIST VIEW ── -->
    <div *ngIf="tableViewMode()==='list'" class="card">
      <table class="tbl-hover">
        <thead>
          <tr><th>Table</th><th>Location</th><th>Shape</th><th>Capacity</th><th>Status</th><th>Current Order</th><th>Amount</th><th>Time</th><th>Actions</th></tr>
        </thead>
        <tbody>
          <tr *ngFor="let t of filteredTables()" style="cursor:pointer" (click)="selectTable(t)"
            [style.background]="selectedTable()?._id===t._id?'#f3e8ff':''">
            <td style="font-weight:800;font-size:14px">{{ tableShapeIcon(t) }} {{ t.number }}</td>
            <td style="font-size:12px">{{ locIcon(t.location) }} {{ t.location | titlecase }}</td>
            <td style="font-size:12px;color:var(--muted)">{{ t.shape | titlecase }}</td>
            <td style="text-align:center">
              <span *ngFor="let i of seatsArray(t.capacity)" style="font-size:9px">👤</span>
            </td>
            <td>
              <span style="font-size:10.5px;font-weight:700;padding:3px 10px;border-radius:20px"
                [style.background]="floorPillBg(t.status)"
                [style.color]="floorPillColor(t.status)">
                {{ t.status | titlecase }}
              </span>
            </td>
            <td style="font-size:11.5px;font-family:monospace;color:var(--purple)">{{ t.currentOrderId?.orderNumber||'—' }}</td>
            <td style="font-weight:700">{{ t.currentOrderId ? '\$'+t.currentOrderId.totalAmount : '—' }}</td>
            <td style="font-size:11px;color:var(--muted)">{{ t.currentOrderId?.createdAt ? orderAge(t.currentOrderId.createdAt) : '—' }}</td>
            <td>
              <div style="display:flex;gap:4px">
                <button *ngIf="t.status==='available'" class="btn btn-g btn-xs" (click)="goToNewOrder(t);$event.stopPropagation()">＋ Order</button>
                <button *ngIf="t.status==='occupied'&&t.currentOrderId" class="btn btn-success btn-xs" (click)="openPayOrder(t.currentOrderId);$event.stopPropagation()">Pay</button>
                <button *ngIf="t.status==='occupied'&&t.currentOrderId" class="btn btn-o btn-xs" (click)="openAddItems(t.currentOrderId);$event.stopPropagation()">＋</button>
                <button *ngIf="t.status==='occupied'" class="btn btn-warn btn-xs" (click)="setTableStatus(t,'cleaning');$event.stopPropagation()">Clean</button>
                <button *ngIf="t.status==='cleaning'" class="btn btn-g btn-xs" (click)="setTableStatus(t,'available');$event.stopPropagation()">Free</button>
                <button *ngIf="t.status==='available'" class="btn btn-o btn-xs" (click)="setTableStatus(t,'reserved');$event.stopPropagation()">Reserve</button>
                <button class="btn btn-danger btn-xs" (click)="confirmDeleteTable(t);$event.stopPropagation()">✕</button>
              </div>
            </td>
          </tr>
          <tr *ngIf="!filteredTables().length">
            <td colspan="9" style="text-align:center;padding:30px;color:var(--muted)">No tables found</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>


  <!-- ══════════ ORDERS TAB ══════════ -->
  <div *ngIf="tab()==='orders'">
    <div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap">
      <select class="tb-sel" [(ngModel)]="orderStatusFilter" (change)="loadOrders()">
        <option value="">All Status</option>
        <option value="pending">Pending</option>
        <option value="preparing">Preparing</option>
        <option value="served">Served</option>
        <option value="paid">Paid</option>
        <option value="cancelled">Cancelled</option>
      </select>
      <select class="tb-sel" [(ngModel)]="orderTypeFilter" (change)="loadOrders()">
        <option value="">All Types</option>
        <option value="dine_in">Dine-In</option>
        <option value="room_service">Room Service</option>
        <option value="takeaway">Takeaway</option>
      </select>
      <input type="date" class="tb-sel" [(ngModel)]="orderDateFilter" (change)="loadOrders()">
    </div>

    <!-- Active orders as KDS cards -->
    <div *ngIf="!orderStatusFilter||['pending','preparing','served'].includes(orderStatusFilter)">
      <div style="font-size:11px;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:.5px;margin-bottom:12px">Active Orders</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px;margin-bottom:20px">
        <div *ngFor="let o of activeOrders()" class="card"
          style="border-left:4px solid"
          [style.border-left-color]="orderStatusColor(o.status)">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
            <div>
              <div style="font-size:11px;font-family:monospace;color:var(--muted)">{{ o.orderNumber }}</div>
              <div style="font-weight:700;font-size:13.5px">
                {{ o.type==='dine_in'?'Table '+o.tableNumber:o.type==='room_service'?'Room '+o.roomNumber+' Service':'Takeaway' }}
                <span *ngIf="o.guestName" style="font-weight:400;color:var(--muted)"> · {{ o.guestName }}</span>
              </div>
            </div>
            <span style="font-size:10px;font-weight:700;padding:3px 9px;border-radius:20px"
              [style.background]="orderStatusBg(o.status)"
              [style.color]="orderStatusColor(o.status)">{{ o.status | titlecase }}</span>
          </div>
          <div *ngFor="let item of o.items" style="display:flex;justify-content:space-between;font-size:12px;padding:2px 0;color:var(--text2)">
            <span>× {{ item.qty }} {{ item.name }}</span>
            <span style="font-weight:600">\${{ item.subtotal }}</span>
          </div>
          <div class="rj" style="margin-top:8px;font-size:13px;font-weight:800;color:var(--purple)">
            <span>Total</span><span>\${{ o.totalAmount }}</span>
          </div>
          <div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap">
            <button *ngIf="o.status==='pending'" class="btn btn-o btn-xs" style="flex:1"
              (click)="updateOrderStatus(o._id,'preparing')">▶ Preparing</button>
            <button *ngIf="o.status==='preparing'" class="btn btn-success btn-xs" style="flex:1"
              (click)="updateOrderStatus(o._id,'served')">✓ Served</button>
            <button *ngIf="o.status==='served'" class="btn btn-g btn-xs" style="flex:1"
              (click)="openPayOrder(o)">💳 Pay</button>
            <button *ngIf="o.status!=='paid'&&o.status!=='cancelled'" class="btn btn-o btn-xs"
              (click)="openAddItems(o);$event.stopPropagation()" title="Add more items">＋</button>
            <button class="btn btn-danger btn-xs"
              (click)="confirmCancelOrder(o)">✕</button>
          </div>
          <div style="font-size:10px;color:var(--muted);margin-top:5px">{{ o.createdAt | date:'HH:mm' }} · {{ o.staffId?.name }}</div>
        </div>
        <div *ngIf="!activeOrders().length" style="grid-column:1/-1;text-align:center;padding:30px;color:var(--muted)">
          <div style="font-size:28px;margin-bottom:6px">✅</div>No active orders
        </div>
      </div>
    </div>

    <!-- All orders table -->
    <div style="font-size:11px;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">All Orders Today</div>
    <div class="card">
      <table class="tbl-hover">
        <thead><tr><th>Order #</th><th>Type</th><th>Table/Room</th><th>Items</th><th>Total</th><th>Status</th><th>Time</th><th>Staff</th><th>Actions</th></tr></thead>
        <tbody>
          <tr *ngFor="let o of filteredOrders()">
            <td style="font-family:monospace;font-size:11px;color:var(--muted)">{{ o.orderNumber }}</td>
            <td><span style="font-size:11px">{{ orderTypeIcon(o.type) }}</span> {{ o.type | titlecase }}</td>
            <td>{{ o.tableNumber || (o.roomNumber ? 'Room '+o.roomNumber : null) || o.guestName || '—' }}</td>
            <td style="font-size:12px;color:var(--muted)">{{ o.items.length }} items</td>
            <td style="font-weight:700">\${{ o.totalAmount }}</td>
            <td><span class="badge" [ngClass]="orderBadge(o.status)">{{ o.status | titlecase }}</span></td>
            <td style="font-size:11.5px;color:var(--muted)">{{ o.createdAt | date:'HH:mm' }}</td>
            <td style="font-size:11.5px">{{ o.staffId?.name }}</td>
            <td>
              <div style="display:flex;gap:4px">
                <button *ngIf="o.status==='served'" class="btn btn-g btn-xs" (click)="openPayOrder(o)">Pay</button>
                <button *ngIf="o.status!=='paid'&&o.status!=='cancelled'" class="btn btn-o btn-xs" (click)="openAddItems(o)">+ Add</button>
                <button *ngIf="o.status!=='paid'&&o.status!=='cancelled'" class="btn btn-danger btn-xs" (click)="confirmCancelOrder(o)">Cancel</button>
              </div>
            </td>
          </tr>
          <tr *ngIf="!filteredOrders().length">
            <td colspan="9" style="text-align:center;padding:30px;color:var(--muted)">No orders found</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- ══════════ MENU TAB ══════════ -->
  <div *ngIf="tab()==='menu'">
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px">
      <button *ngFor="let c of catNames()" class="btn btn-sm"
        [ngClass]="menuCatFilter()===c?'btn-g':'btn-o'"
        (click)="menuCatFilter.set(c)">
        {{ catIcon(c) }} {{ c | titlecase }}
      </button>
      <button class="btn btn-sm" [ngClass]="menuCatFilter()===''?'btn-g':'btn-o'" (click)="menuCatFilter.set('')">All</button>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px">
      <div *ngFor="let item of filteredMenu()"
        style="background:var(--surface);border-radius:12px;padding:14px;border:1.5px solid var(--border)"
        [style.opacity]="item.isAvailable?'1':'.5'">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px">
          <div>
            <div style="font-size:22px;margin-bottom:3px">{{ catIcon(item.category) }}</div>
            <div style="font-weight:700;font-size:13px">{{ item.name }}</div>
          </div>
          <div style="font-size:16px;font-weight:800;color:var(--purple)">\${{ item.price }}</div>
        </div>
        <div style="font-size:11px;color:var(--muted);margin-bottom:4px">{{ item.category | titlecase }}</div>
        <div *ngIf="item.description" style="font-size:11.5px;color:var(--muted);margin-bottom:6px">{{ item.description }}</div>
        <div *ngIf="item.preparationTime" style="font-size:10.5px;color:var(--muted);margin-bottom:6px">⏱ {{ item.preparationTime }} min prep</div>
        <div style="display:flex;gap:6px;align-items:center">
          <button class="btn btn-o btn-xs" (click)="openMenuEdit(item)">Edit</button>
          <button class="btn btn-xs" [ngClass]="item.isAvailable?'btn-warn':'btn-success'"
            (click)="toggleMenuAvail(item)">{{ item.isAvailable?'Hide':'Show' }}</button>
          <button class="btn btn-danger btn-xs" (click)="confirmDeleteMenu(item)">✕</button>
        </div>
      </div>
      <div *ngIf="!filteredMenu().length" style="grid-column:1/-1;text-align:center;padding:40px;color:var(--muted)">
        <div style="font-size:28px;margin-bottom:8px">📋</div>No menu items. Add your first item.
      </div>
    </div>
  </div>

  <!-- ══════════ STORE TAB ══════════ -->
  <div *ngIf="tab()=='store'">

    <!-- Store sub-tabs -->
    <div style="display:flex;gap:4px;margin-bottom:16px;background:var(--bg);border-radius:12px;padding:4px;width:fit-content;border:1px solid var(--border)">
      <button class="btn btn-sm" [ngClass]="storeSubTab()==='items'?'btn-g':'btn-ghost'" (click)="storeSubTab.set('items')">📦 Inventory</button>
      <button class="btn btn-sm" [ngClass]="storeSubTab()==='in'?'btn-g':'btn-ghost'" (click)="storeSubTab.set('in');loadMovements('in')">🟢 Stock In</button>
      <button class="btn btn-sm" [ngClass]="storeSubTab()==='out'?'btn-g':'btn-ghost'" (click)="storeSubTab.set('out');loadMovements('out')">🔴 Stock Out</button>
      <button class="btn btn-sm" [ngClass]="storeSubTab()==='log'?'btn-g':'btn-ghost'" (click)="storeSubTab.set('log');loadMovements()">📋 All Movements</button>
    </div>

    <!-- INVENTORY TAB -->
    <div *ngIf="storeSubTab()==='items'">
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">
        <span style="font-size:11px;color:var(--muted);font-weight:600;align-self:center">Category:</span>
        <button *ngFor="let c of storeCats" class="btn btn-sm"
          [ngClass]="storeCatFilter()===c?'btn-g':'btn-o'"
          (click)="storeCatFilter.set(c)">{{ c | titlecase }}</button>
        <button class="btn btn-sm" [ngClass]="storeCatFilter()===''?'btn-g':'btn-o'" (click)="storeCatFilter.set('')">All</button>
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px">
        <span style="font-size:11px;color:var(--muted);font-weight:600;align-self:center">Usage:</span>
        <button *ngFor="let u of usageTypes" class="btn btn-sm"
          [ngClass]="storeUsageFilter()===u.val?'btn-g':'btn-o'"
          (click)="storeUsageFilter.set(u.val)">{{ u.icon }} {{ u.label }}</button>
        <button class="btn btn-sm" [ngClass]="storeUsageFilter()===''?'btn-g':'btn-o'" (click)="storeUsageFilter.set('')">All</button>
      </div>
      <!-- Low stock alert -->
      <div *ngIf="lowStockItems().length" style="background:#fff7ed;border:1.5px solid #fed7aa;border-radius:10px;padding:10px 14px;margin-bottom:12px;display:flex;align-items:center;gap:10px">
        <span style="font-size:20px">⚠️</span>
        <div>
          <div style="font-weight:700;color:#c2410c;font-size:13px">{{ lowStockItems().length }} item(s) low on stock</div>
          <div style="font-size:11.5px;color:#9a3412">{{ lowStockNames() }}</div>
        </div>
        <button class="btn btn-warn btn-xs" style="margin-left:auto" (click)="openBulkIn()">Order Stock</button>
      </div>
      <div class="card">
        <table class="tbl-hover">
          <thead>
            <tr><th>Item</th><th>Category</th><th>Stock</th><th>Min</th><th>Unit</th><th>Cost/Unit</th><th>Supplier</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            <tr *ngFor="let s of filteredStore()" [style.background]="s.quantity<=s.minQuantity?'#fff7ed':''">
              <td style="font-weight:600">{{ s.name }}</td>
              <td style="font-size:11.5px;color:var(--muted)">{{ s.category | titlecase }}</td>
              <td>
                <span style="font-size:15px;font-weight:800"
                  [style.color]="s.quantity<=s.minQuantity?'var(--danger)':s.quantity<=s.minQuantity*2?'var(--warn)':'inherit'">
                  {{ s.quantity }}
                </span>
                <span style="font-size:10.5px;color:var(--muted)"> {{ s.unit }}</span>
              </td>
              <td style="font-size:12px;color:var(--muted)">{{ s.minQuantity }} {{ s.unit }}</td>
              <td style="font-size:12px">{{ s.unit }}</td>
              <td style="font-size:12px">\${{ s.costPrice }}</td>
              <td style="font-size:11.5px;color:var(--muted)">{{ s.supplier || '—' }}</td>
              <td>
                <span *ngIf="s.quantity<=s.minQuantity" class="badge b-red" style="font-size:9.5px">⚠ Low</span>
                <span *ngIf="s.quantity>s.minQuantity&&s.quantity<=s.minQuantity*2" class="badge b-yellow" style="font-size:9.5px">Watch</span>
                <span *ngIf="s.quantity>s.minQuantity*2" class="badge b-green" style="font-size:9.5px">OK</span>
              </td>
              <td>
                <div style="display:flex;gap:4px">
                  <button class="btn btn-success btn-xs" (click)="openStockIn(s)" title="Add stock">📥 In</button>
                  <button class="btn btn-warn btn-xs" (click)="openStockOut(s)" title="Issue to kitchen">📤 Out</button>
                  <button class="btn btn-o btn-xs" (click)="openStoreEdit(s)">✏</button>
                  <button class="btn btn-danger btn-xs" (click)="confirmDeleteStore(s)">✕</button>
                </div>
              </td>
            </tr>
            <tr *ngIf="!filteredStore().length">
              <td colspan="9" style="text-align:center;padding:30px;color:var(--muted)">
                <div style="font-size:24px;margin-bottom:6px">🏪</div>No store items yet.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- MOVEMENTS TABLE (in / out / all) -->
    <div *ngIf="storeSubTab()!=='items'" class="card">
      <div style="display:flex;gap:8px;align-items:center;margin-bottom:14px">
        <div style="font-size:13px;font-weight:700;flex:1">
          {{ storeSubTab()==='in'?'🟢 Incoming Stock (Purchases)':storeSubTab()==='out'?'🔴 Outgoing Stock (Kitchen Issues)':'📋 All Stock Movements' }}
        </div>
        <button *ngIf="storeSubTab()==='in'" class="btn btn-g btn-sm" (click)="openStockIn(null)">+ Receive Stock</button>
        <button *ngIf="storeSubTab()==='out'" class="btn btn-warn btn-sm" (click)="openStockOut(null)">+ Issue to Kitchen</button>
      </div>
      <table class="tbl-hover">
        <thead>
          <tr>
            <th>Date</th><th>Item</th>
            <th *ngIf="storeSubTab()==='log'">Type</th>
            <th>Reason</th><th>Qty</th><th>Unit Cost</th><th>Total</th>
            <th *ngIf="storeSubTab()==='in'">Supplier</th>
            <th *ngIf="storeSubTab()==='in'">Reference</th>
            <th>Destination</th><th>Balance After</th><th>By</th><th>Notes</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let m of movements()">
            <td style="font-size:11.5px;color:var(--muted);white-space:nowrap">{{ m.createdAt | date:'MMM d, HH:mm' }}</td>
            <td style="font-weight:600">{{ m.itemName }}</td>
            <td *ngIf="storeSubTab()==='log'">
              <span class="badge" [ngClass]="m.type==='in'?'b-green':'b-red'" style="font-size:9.5px">
                {{ m.type==='in'?'📥 IN':'📤 OUT' }}
              </span>
            </td>
            <td>
              <span class="badge" [ngClass]="reasonBadge(m.reason)" style="font-size:9.5px">{{ m.reason | titlecase }}</span>
            </td>
            <td>
              <span [style.color]="m.type==='in'?'var(--success)':'var(--danger)'" style="font-weight:700">
                {{ m.type==='in'?'+':'-' }}{{ m.quantity }} {{ m.itemId?.unit }}
              </span>
            </td>
            <td style="font-size:12px">{{ m.unitCost>0?'\$'+m.unitCost:'—' }}</td>
            <td style="font-size:12px;font-weight:600">{{ m.totalCost>0?'\$'+m.totalCost:'—' }}</td>
            <td *ngIf="storeSubTab()==='in'" style="font-size:11.5px;color:var(--muted)">{{ m.supplier||'—' }}</td>
            <td *ngIf="storeSubTab()==='in'" style="font-size:11.5px;font-family:monospace;color:var(--purple)">{{ m.reference||'—' }}</td>
            <td>
              <span *ngIf="m.destination" style="font-size:11px;font-weight:600;padding:2px 8px;border-radius:20px;background:#f3e8ff;color:var(--purple)">
                {{ usageIcon(m.destination) }} {{ m.destination | titlecase }}
              </span>
            </td>
            <td style="font-weight:700">{{ m.balanceAfter }} {{ m.itemId?.unit }}</td>
            <td style="font-size:11.5px;color:var(--muted)">{{ m.performedBy?.name||'—' }}</td>
            <td style="font-size:11.5px;color:var(--muted)">{{ m.notes||'—' }}</td>
          </tr>
          <tr *ngIf="!movements().length">
            <td colspan="12" style="text-align:center;padding:30px;color:var(--muted)">No movements recorded yet</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- ══ CATEGORY MANAGER ══ -->
  <div class="overlay" [class.show]="showCatManager()" (click)="bgClick($event,'catmgr')">
    <div class="modal" style="width:460px">
      <div class="modal-head">
        <div class="modal-title">⚙️ Manage Menu Categories</div>
        <button class="modal-close" (click)="showCatManager.set(false)">x</button>
      </div>
      <!-- Add new -->
      <div style="background:var(--bg);border-radius:10px;padding:12px;margin-bottom:16px">
        <div style="font-size:12px;font-weight:700;color:var(--text2);margin-bottom:8px">Add New Category</div>
        <div style="display:flex;gap:8px;align-items:flex-end">
          <div class="fg" style="flex:1;margin:0"><label style="font-size:11px">Name</label><input [(ngModel)]="catForm.name" placeholder="e.g. pizza, burgers..." style="text-transform:lowercase"></div>
          <div class="fg" style="width:70px;margin:0"><label style="font-size:11px">Icon</label><input [(ngModel)]="catForm.icon" placeholder="🍕" style="font-size:18px;text-align:center"></div>
          <button class="btn btn-g btn-sm" (click)="addCategory()" [disabled]="catSaving()" style="margin-bottom:0;flex-shrink:0">
            {{ catSaving() ? '...' : '+ Add' }}
          </button>
        </div>
        <div *ngIf="catErr()" style="font-size:12px;color:var(--danger);margin-top:5px">{{ catErr() }}</div>
      </div>
      <!-- Existing categories -->
      <div style="max-height:320px;overflow-y:auto">
        <div style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">Current Categories</div>
        <div *ngFor="let c of categories()" style="display:flex;align-items:center;gap:10px;padding:9px 12px;background:var(--bg);border-radius:9px;margin-bottom:5px">
          <span style="font-size:20px">{{ c.icon }}</span>
          <div style="flex:1">
            <div style="font-weight:600;font-size:13px">{{ c.name | titlecase }}</div>
            <div style="font-size:10.5px;color:var(--muted)">{{ catItemCount(c.name) }} items</div>
          </div>
          <button class="btn btn-o btn-xs" (click)="openMenuCatEdit(c)">Edit</button>
          <button class="btn btn-danger btn-xs" (click)="deleteCategory(c)">✕</button>
        </div>
        <div *ngIf="!categories().length" style="text-align:center;padding:20px;color:var(--muted)">No categories yet</div>
      </div>
      <button class="btn btn-g" style="width:100%;margin-top:14px" (click)="showCatManager.set(false)">Done</button>
    </div>
  </div>

  <!-- ══ STOCK IN MODAL ══ -->
  <div class="overlay" [class.show]="showStockIn()" (click)="bgClick($event,'stockin')">
    <div class="modal" style="width:480px">
      <div class="modal-head">
        <div class="modal-title">📥 Receive Stock (Purchase)</div>
        <button class="modal-close" (click)="showStockIn.set(false)">x</button>
      </div>
      <div *ngIf="movTarget()" style="background:var(--grad-soft);border-radius:10px;padding:10px 14px;margin-bottom:14px;font-size:12.5px;color:var(--purple)">
        <div style="font-weight:700">{{ movTarget().name }}</div>
        <div style="opacity:.7">Current stock: {{ movTarget().quantity }} {{ movTarget().unit }}</div>
      </div>
      <div *ngIf="!movTarget()" class="fg" style="margin-bottom:12px">
        <label>Select Item *</label>
        <select [(ngModel)]="movForm.itemId" (change)="onMovItemSelect()">
          <option value="">-- Select item --</option>
          <option *ngFor="let s of storeItems()" [value]="s._id">{{ usageIcon(s.usageType) }} {{ s.name }} ({{ s.quantity }} {{ s.unit }})</option>
        </select>
      </div>
      <div class="form-row">
        <div class="fg"><label>Quantity Received *</label><input type="number" [(ngModel)]="movForm.quantity" min="0.01" step="0.01" placeholder="0"></div>
        <div class="fg"><label>Unit Cost (\$)</label><input type="number" [(ngModel)]="movForm.unitCost" min="0" step="0.01" placeholder="0.00"></div>
      </div>
      <div *ngIf="movForm.quantity>0&&movForm.unitCost>0" style="background:#dcfce7;border-radius:8px;padding:8px 12px;margin-bottom:10px;font-size:12.5px;color:#15803d">
        Total purchase cost: <strong>\${{ (movForm.quantity * movForm.unitCost) | number:'1.2-2' }}</strong>
      </div>
      <div class="form-row">
        <div class="fg"><label>Supplier</label><input [(ngModel)]="movForm.supplier" placeholder="Supplier name"></div>
        <div class="fg"><label>Invoice / PO Ref</label><input [(ngModel)]="movForm.reference" placeholder="INV-001"></div>
      </div>
      <div class="fg"><label>Store Location / Destination</label>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:4px">
          <button *ngFor="let d of usageTypes" class="btn btn-sm"
            [ngClass]="movForm.destination===d.val?'btn-g':'btn-o'"
            (click)="movForm.destination=d.val"
            style="font-size:12px">{{ d.icon }} {{ d.label }}</button>
        </div>
      </div>
      <div class="fg"><label>Notes</label><input [(ngModel)]="movForm.notes" placeholder="Delivery notes..."></div>
      <div *ngIf="movErr()" style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:10px;font-size:12.5px;color:#b91c1c;margin-bottom:10px">{{ movErr() }}</div>
      <div style="display:flex;gap:10px">
        <button class="btn btn-o" style="flex:1" (click)="showStockIn.set(false)">Cancel</button>
        <button class="btn btn-success" style="flex:2" (click)="submitMovement('in')" [disabled]="movSaving()">
          {{ movSaving()?'Saving...':('📥 Receive +'+movForm.quantity+' '+movUnit()) }}
        </button>
      </div>
    </div>
  </div>

  <!-- ══ STOCK OUT MODAL ══ -->
  <div class="overlay" [class.show]="showStockOut()" (click)="bgClick($event,'stockout')">
    <div class="modal" style="width:480px">
      <div class="modal-head">
        <div class="modal-title">📤 Issue Stock to Kitchen</div>
        <button class="modal-close" (click)="showStockOut.set(false)">x</button>
      </div>
      <div *ngIf="movTarget()" style="background:#fff7ed;border:1.5px solid #fed7aa;border-radius:10px;padding:10px 14px;margin-bottom:14px;font-size:12.5px;color:#c2410c">
        <div style="font-weight:700">{{ movTarget().name }}</div>
        <div style="opacity:.7">Available: <strong>{{ movTarget().quantity }} {{ movTarget().unit }}</strong></div>
      </div>
      <div *ngIf="!movTarget()" class="fg" style="margin-bottom:12px">
        <label>Select Item *</label>
        <select [(ngModel)]="movForm.itemId" (change)="onMovItemSelect()">
          <option value="">-- Select item --</option>
          <option *ngFor="let s of storeItems()" [value]="s._id">{{ s.name }} ({{ s.quantity }} {{ s.unit }})</option>
        </select>
      </div>
      <div class="form-row">
        <div class="fg"><label>Quantity to Issue *</label><input type="number" [(ngModel)]="movForm.quantity" min="0.01" step="0.01" placeholder="0"></div>
        <div class="fg"><label>Reason</label>
          <select [(ngModel)]="movForm.reason">
            <option value="kitchen">🍳 To Kitchen</option>
            <option value="waste">🗑 Waste / Spoilage</option>
            <option value="return">↩ Return to Supplier</option>
            <option value="adjustment">📊 Adjustment</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>
      <div *ngIf="movForm.quantity>0&&movTarget()&&movForm.quantity>movTarget().quantity" style="background:#fef2f2;border-radius:8px;padding:8px 12px;margin-bottom:10px;font-size:12.5px;color:#b91c1c">
        ⚠ Quantity exceeds current stock ({{ movTarget().quantity }} {{ movTarget().unit }})
      </div>
      <div class="fg"><label>Issue To *</label>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:4px">
          <button *ngFor="let d of destinations" class="btn btn-sm"
            [ngClass]="movForm.destination===d.val?'btn-g':'btn-o'"
            (click)="movForm.destination=d.val"
            style="font-size:12px">{{ d.icon }} {{ d.label }}</button>
        </div>
      </div>
      <div class="fg"><label>Notes</label><input [(ngModel)]="movForm.notes" placeholder="Kitchen order, meal prep..."></div>
      <div *ngIf="movErr()" style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:10px;font-size:12.5px;color:#b91c1c;margin-bottom:10px">{{ movErr() }}</div>
      <div style="display:flex;gap:10px">
        <button class="btn btn-o" style="flex:1" (click)="showStockOut.set(false)">Cancel</button>
        <button class="btn btn-warn" style="flex:2" (click)="submitMovement('out')" [disabled]="movSaving()">
          {{ movSaving()?'Saving...':('📤 Issue -'+movForm.quantity+' '+movUnit()) }}
        </button>
      </div>
    </div>
  </div>

  <!-- ══ ADD ITEMS TO ORDER MODAL ══ -->
  <div class="overlay" [class.show]="showAddItems()" (click)="bgClick($event,'additems')">
    <div class="modal" style="width:560px;max-height:90vh;overflow-y:auto">
      <div class="modal-head">
        <div class="modal-title">＋ Add Items to {{ addItemsTarget()?.orderNumber }}</div>
        <button class="modal-close" (click)="showAddItems.set(false)">x</button>
      </div>
      <ng-container *ngIf="addItemsTarget()">
        <!-- Current items summary -->
        <div style="background:var(--bg);border-radius:10px;padding:10px 14px;margin-bottom:14px;font-size:12px">
          <div style="font-weight:700;margin-bottom:6px;color:var(--muted)">Current Order</div>
          <div *ngFor="let item of addItemsTarget().items" class="rj" style="font-size:11.5px;padding:2px 0">
            <span style="color:var(--muted)">× {{ item.qty }} {{ item.name }}</span>
            <span>\${{ item.subtotal }}</span>
          </div>
          <div class="rj" style="font-weight:700;color:var(--purple);border-top:1px solid var(--border);padding-top:6px;margin-top:4px">
            <span>Current Total</span><span>\${{ addItemsTarget().totalAmount }}</span>
          </div>
        </div>

        <!-- Category filter -->
        <div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:10px">
          <button *ngFor="let c of catNames()" class="btn btn-xs"
            [ngClass]="addItemsCat()===c?'btn-g':'btn-o'"
            (click)="addItemsCat.set(c)">{{ catIcon(c) }} {{ c | titlecase }}</button>
          <button class="btn btn-xs" [ngClass]="addItemsCat()===''?'btn-g':'btn-o'" (click)="addItemsCat.set('')">All</button>
        </div>
        <input [(ngModel)]="addItemsSearch" (input)="filterAddMenu()" placeholder="Search menu..." style="width:100%;margin-bottom:10px">

        <!-- Menu grid -->
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;max-height:260px;overflow-y:auto;margin-bottom:14px">
          <div *ngFor="let item of filteredAddMenu()"
            style="background:var(--surface);border-radius:10px;padding:10px;cursor:pointer;border:2px solid;text-align:center;transition:all .12s"
            [style.border-color]="addCartHas(item._id)?'var(--purple)':'var(--border)'"
            [style.background]="addCartHas(item._id)?'#f3e8ff':'var(--surface)'"
            (click)="addToAddCart(item)">
            <div style="font-size:20px;margin-bottom:3px">{{ catIcon(item.category) }}</div>
            <div style="font-size:11.5px;font-weight:700;margin-bottom:2px">{{ item.name }}</div>
            <div style="font-size:12px;font-weight:800;color:var(--purple)">\${{ item.price }}</div>
            <div *ngIf="addCartHas(item._id)" style="margin-top:3px">
              <span style="background:var(--grad);color:#fff;border-radius:20px;font-size:10px;font-weight:700;padding:1px 7px">× {{ addCartQty(item._id) }}</span>
            </div>
          </div>
          <div *ngIf="!filteredAddMenu().length" style="grid-column:1/-1;text-align:center;padding:20px;color:var(--muted)">No items found</div>
        </div>

        <!-- Added items cart -->
        <div *ngIf="addCart().length" style="background:var(--grad-soft);border-radius:10px;padding:12px;margin-bottom:14px">
          <div style="font-size:11.5px;font-weight:700;color:var(--purple);margin-bottom:8px">Items to Add</div>
          <div *ngFor="let item of addCart()" style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
            <div style="flex:1;font-size:12.5px;font-weight:600">{{ item.name }}</div>
            <div style="display:flex;align-items:center;gap:5px">
              <button class="btn btn-o btn-xs" style="width:22px;height:22px;padding:0" (click)="decAddCart(item)">−</button>
              <span style="font-size:13px;font-weight:700;min-width:18px;text-align:center">{{ item.qty }}</span>
              <button class="btn btn-o btn-xs" style="width:22px;height:22px;padding:0" (click)="incAddCart(item)">+</button>
            </div>
            <span style="font-size:13px;font-weight:700;color:var(--purple);min-width:50px;text-align:right">\${{ item.subtotal }}</span>
            <button class="btn btn-danger btn-xs" style="padding:1px 5px" (click)="removeAddCart(item)">✕</button>
          </div>
          <div class="rj" style="font-size:13px;font-weight:800;color:var(--purple);border-top:1px solid var(--border);padding-top:8px;margin-top:6px">
            <span>Adding</span><span>\${{ addCartTotal() | number:'1.2-2' }}</span>
          </div>
          <div class="rj" style="font-size:12px;color:var(--muted);margin-top:2px">
            <span>New order total</span><span style="font-weight:700">\${{ (addItemsTarget().totalAmount + addCartTotal()) | number:'1.2-2' }}</span>
          </div>
        </div>

        <div *ngIf="addItemsErr()" style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:8px;font-size:12.5px;color:#b91c1c;margin-bottom:10px">{{ addItemsErr() }}</div>
        <div style="display:flex;gap:10px">
          <button class="btn btn-o" style="flex:1" (click)="showAddItems.set(false)">Cancel</button>
          <button class="btn btn-g" style="flex:2" (click)="submitAddItems()" [disabled]="!addCart().length||addItemsSaving()">
            {{ addItemsSaving()?'Adding...':'+ Add ' + addCart().length + ' item(s) to Order' }}
          </button>
        </div>
      </ng-container>
    </div>
  </div>

  <!-- ══ CONFIRM DIALOG ══ -->
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

  <!-- ══ BILLING MODAL ══ -->
  <div class="overlay" [class.show]="showPayOrder()" (click)="bgClick($event,'payorder')">
    <div class="modal" style="width:520px;max-height:92vh;overflow-y:auto">
      <div class="modal-head">
        <div class="modal-title">💳 Settle Bill</div>
        <button class="modal-close" (click)="showPayOrder.set(false)">x</button>
      </div>
      <ng-container *ngIf="payTarget()">

        <!-- Order summary header -->
        <div style="background:var(--bg);border-radius:10px;padding:10px 14px;margin-bottom:12px;font-size:12px;display:flex;justify-content:space-between;align-items:center">
          <div>
            <div style="font-weight:700;font-family:monospace;color:var(--purple)">{{ payTarget().orderNumber }}</div>
            <div style="color:var(--muted)">{{ payTarget().type==='dine_in'?'Table '+payTarget().tableNumber:payTarget().type==='room_service'?'Room '+payTarget().roomNumber+' Service':'Takeaway' }}</div>
          </div>
          <div style="text-align:right">
            <div style="font-size:16px;font-weight:800;color:var(--purple)">\${{ payTarget().totalAmount }}</div>
            <div style="color:var(--muted)">{{ payTarget().items.length }} items</div>
          </div>
        </div>

        <!-- Items -->
        <div style="background:var(--bg);border-radius:10px;padding:10px 14px;margin-bottom:12px">
          <div *ngFor="let item of payTarget().items" style="display:flex;justify-content:space-between;font-size:12.5px;padding:4px 0;border-bottom:1px solid var(--border)">
            <span style="color:var(--muted)">× {{ item.qty }} {{ item.name }}</span>
            <span style="font-weight:600">\${{ item.subtotal }}</span>
          </div>
          <div class="rj mb4" style="padding-top:8px"><span style="color:var(--muted)">Subtotal</span><span>\${{ payTarget().subtotal }}</span></div>
          <div class="rj mb4"><span style="color:var(--muted)">Tax (5%)</span><span>\${{ payTarget().taxAmount }}</span></div>
          <div *ngIf="payTarget().discountAmt>0" class="rj mb4"><span style="color:var(--warn)">Discount</span><span style="color:var(--warn)">-\${{ payTarget().discountAmt }}</span></div>
          <div class="rj" style="font-size:14px;font-weight:800;color:var(--purple);border-top:2px solid var(--border);padding-top:6px;margin-top:4px">
            <span>Total</span><span>\${{ payTarget().totalAmount }}</span>
          </div>
        </div>

        <!-- Bill Mode selector -->
        <div style="margin-bottom:12px">
          <div style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">Bill Type</div>
          <div style="display:flex;gap:6px">
            <button class="btn btn-sm" style="flex:1" [ngClass]="billMode()==='full'?'btn-g':'btn-o'" (click)="billMode.set('full')">📄 Full Bill</button>
            <button class="btn btn-sm" style="flex:1" [ngClass]="billMode()==='split'?'btn-g':'btn-o'" (click)="billMode.set('split');initSplit()">✂️ Split Equally</button>
            <button class="btn btn-sm" style="flex:1" [ngClass]="billMode()==='custom'?'btn-g':'btn-o'" (click)="billMode.set('custom');initCustomSplit()">🧾 Custom Split</button>
          </div>
        </div>

        <!-- FULL BILL -->
        <div *ngIf="billMode()==='full'">
          <div style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">Payment Method</div>
          <div style="display:flex;gap:6px;margin-bottom:10px">
            <button *ngFor="let m of payMethods" class="btn btn-sm" style="flex:1"
              [ngClass]="payMethod()===m.val?'btn-g':'btn-o'"
              (click)="payMethod.set(m.val)">{{ m.icon }}<br><span style="font-size:10px">{{ m.label }}</span></button>
          </div>
          <div *ngIf="payMethod()==='room_charge'" style="background:#fff7ed;border-radius:8px;padding:8px 12px;margin-bottom:10px;font-size:12.5px;color:#c2410c">
            🛏 Billing to <strong>{{ payTarget().roomNumber ? 'Room '+payTarget().roomNumber : 'room charge' }}</strong>
            <div *ngIf="!payTarget().roomNumber" style="margin-top:4px"><input [(ngModel)]="billRoomNumber" placeholder="Enter room number" style="font-size:12px"></div>
          </div>
          <div style="display:flex;gap:8px">
            <button class="btn btn-o" style="flex:1" (click)="printReceipt(payTarget())">🖨 Print Receipt</button>
            <button class="btn btn-g" style="flex:2" (click)="confirmPayOrder()" [disabled]="payingSaving()">
              {{ payingSaving()?'Processing...':'✓ Settle \$'+payTarget().totalAmount }}
            </button>
          </div>
        </div>

        <!-- EQUAL SPLIT -->
        <div *ngIf="billMode()==='split'">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
            <span style="font-size:13px;font-weight:600">Split between</span>
            <button class="btn btn-o btn-xs" style="width:28px;height:28px;padding:0" (click)="splitCount.set(splitCount()>2?splitCount()-1:2)">−</button>
            <span style="font-size:18px;font-weight:800;min-width:20px;text-align:center">{{ splitCount() }}</span>
            <button class="btn btn-o btn-xs" style="width:28px;height:28px;padding:0" (click)="splitCount.set(splitCount()+1)">+</button>
            <span style="font-size:13px;font-weight:600">people</span>
          </div>
          <div style="background:var(--grad-soft);border-radius:10px;padding:12px 14px;margin-bottom:12px;text-align:center">
            <div style="font-size:11.5px;color:var(--muted)">Each person pays</div>
            <div style="font-size:28px;font-weight:900;color:var(--purple)">\${{ splitAmount() }}</div>
            <div style="font-size:11.5px;color:var(--muted)">({{ splitCount() }} × \${{ splitAmount() }} = \${{ (splitAmount()*splitCount()) | number:'1.2-2' }})</div>
          </div>
          <div style="display:flex;gap:8px">
            <button class="btn btn-o" style="flex:1" (click)="printSplitReceipt()">🖨 Print × {{ splitCount() }}</button>
            <button class="btn btn-g" style="flex:2" (click)="confirmPayOrder()" [disabled]="payingSaving()">
              {{ payingSaving()?'Processing...':'✓ Settle \$'+payTarget().totalAmount }}
            </button>
          </div>
        </div>

        <!-- CUSTOM SPLIT -->
        <div *ngIf="billMode()==='custom'">
          <div style="font-size:11.5px;color:var(--muted);margin-bottom:10px">Add each person's items to their bill portion:</div>
          <div *ngFor="let sp of customSplits(); let i=index" style="background:var(--bg);border-radius:10px;padding:10px;margin-bottom:8px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
              <input [(ngModel)]="sp.name" style="font-weight:600;font-size:12.5px;border:none;background:transparent;color:var(--text1)" placeholder="Guest {{ i+1 }}">
              <span style="font-size:14px;font-weight:800;color:var(--purple)">\${{ splitPersonTotal(sp) | number:'1.2-2' }}</span>
            </div>
            <div *ngFor="let item of payTarget().items" style="display:flex;align-items:center;gap:8px;padding:3px 0">
              <div style="flex:1;font-size:12px">× {{ item.qty }} {{ item.name }} (\${{ item.unitPrice }}/ea)</div>
              <div style="display:flex;align-items:center;gap:4px">
                <button class="btn btn-o btn-xs" style="padding:1px 6px" (click)="adjustSplitItem(sp,item,-1)">−</button>
                <span style="font-size:12px;font-weight:700;min-width:18px;text-align:center">{{ getPersonItemQty(sp,item) }}</span>
                <button class="btn btn-o btn-xs" style="padding:1px 6px" (click)="adjustSplitItem(sp,item,1)">+</button>
              </div>
            </div>
          </div>
          <button class="btn btn-o btn-xs" style="margin-bottom:10px" (click)="addSplitPerson()">+ Add Person</button>
          <div *ngIf="customSplitRemaining()!==0" style="background:#fff7ed;border-radius:8px;padding:6px 10px;font-size:12px;color:#c2410c;margin-bottom:8px">
            ⚠ \${{ customSplitRemaining() | number:'1.2-2' }} {{ customSplitRemaining()>0?'not yet assigned':'over-assigned' }}
          </div>
          <div style="display:flex;gap:8px">
            <button class="btn btn-o" style="flex:1" (click)="printCustomSplitReceipts()">🖨 Print All</button>
            <button class="btn btn-g" style="flex:2" (click)="confirmPayOrder()" [disabled]="payingSaving()||customSplitRemaining()!==0">
              {{ payingSaving()?'Processing...':'✓ Settle \$'+payTarget().totalAmount }}
            </button>
          </div>
        </div>

      </ng-container>
    </div>
  </div>

  <!-- ══ PRINT RECEIPT (hidden, used for printing) ══ -->
  <div id="receipt-print-area" style="display:none">
    <div style="width:80mm;font-family:'Courier New',monospace;font-size:12px;padding:10px" *ngIf="receiptOrder()">
      <div style="text-align:center;margin-bottom:8px">
        <div style="font-size:16px;font-weight:bold">{{ hotelName }}</div>
        <div style="font-size:11px;color:#666">Restaurant Receipt</div>
        <div style="border-bottom:1px dashed #000;margin:6px 0"></div>
      </div>
      <div style="font-size:11px;margin-bottom:6px">
        <div>Order: {{ receiptOrder().orderNumber }}</div>
        <div>Date: {{ receiptOrder().createdAt | date:"MMM d, y HH:mm" }}</div>
        <div *ngIf="receiptOrder().tableNumber">Table: {{ receiptOrder().tableNumber }}</div>
        <div *ngIf="receiptOrder().roomNumber">Room: {{ receiptOrder().roomNumber }}</div>
        <div *ngIf="receiptOrder().guestName">Guest: {{ receiptOrder().guestName }}</div>
      </div>
      <div style="border-bottom:1px dashed #000;margin:6px 0"></div>
      <div *ngFor="let item of receiptOrder().items" style="display:flex;justify-content:space-between;margin-bottom:3px;font-size:11px">
        <span>{{ item.qty }}x {{ item.name }}</span>
        <span>\${{ item.subtotal }}</span>
      </div>
      <div style="border-bottom:1px dashed #000;margin:6px 0"></div>
      <div style="display:flex;justify-content:space-between;font-size:11px"><span>Subtotal</span><span>\${{ receiptOrder().subtotal }}</span></div>
      <div style="display:flex;justify-content:space-between;font-size:11px"><span>Tax (5%)</span><span>\${{ receiptOrder().taxAmount }}</span></div>
      <div *ngIf="receiptOrder().discountAmt>0" style="display:flex;justify-content:space-between;font-size:11px"><span>Discount</span><span>-\${{ receiptOrder().discountAmt }}</span></div>
      <div style="border-bottom:2px solid #000;margin:6px 0"></div>
      <div style="display:flex;justify-content:space-between;font-size:14px;font-weight:bold"><span>TOTAL</span><span>\${{ receiptOrder().totalAmount }}</span></div>
      <div *ngIf="receiptOrder().paymentMethod" style="font-size:11px;margin-top:4px">Payment: {{ receiptOrder().paymentMethod | titlecase }}</div>
      <div style="text-align:center;margin-top:12px;font-size:11px;color:#666">
        <div>Thank you for dining with us!</div>
        <div>{{ receiptOrder().createdAt | date:"EEEE, MMMM d, y" }}</div>
      </div>
    </div>
  </div>

    <!-- ══ MENU ITEM FORM ══ -->
  <div class="overlay" [class.show]="showMenuForm()" (click)="bgClick($event,'menu')">
    <div class="modal" style="width:500px">
      <div class="modal-head">
        <div class="modal-title">{{ editMenuId() ? 'Edit Menu Item' : 'Add Menu Item' }}</div>
        <button class="modal-close" (click)="showMenuForm.set(false)">x</button>
      </div>
      <div class="form-row">
        <div class="fg" style="flex:2"><label>Item Name *</label><input [(ngModel)]="mf.name" placeholder="Grilled Salmon"></div>
        <div class="fg"><label>Price *</label><input type="number" [(ngModel)]="mf.price" min="0" placeholder="0.00"></div>
      </div>
      <div class="form-row">
        <div class="fg"><label>Category *</label>
          <select [(ngModel)]="mf.category">
            <option *ngFor="let c of catNames()" [value]="c">{{ catIcon(c) }} {{ c | titlecase }}</option>
          </select>
        </div>
        <div class="fg"><label>Prep Time (min)</label><input type="number" [(ngModel)]="mf.preparationTime" min="0" placeholder="15"></div>
      </div>
      <div class="fg"><label>Description</label><textarea rows="2" [(ngModel)]="mf.description" placeholder="Short description..."></textarea></div>
      <div class="fg"><label>Allergens (comma separated)</label><input [(ngModel)]="mf.allergensStr" placeholder="nuts, gluten, dairy"></div>
      <div *ngIf="menuErr()" style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:10px;font-size:12.5px;color:#b91c1c;margin-bottom:10px">{{ menuErr() }}</div>
      <div style="display:flex;gap:10px">
        <button class="btn btn-o" style="flex:1" (click)="showMenuForm.set(false)">Cancel</button>
        <button class="btn btn-g" style="flex:2" (click)="saveMenu()" [disabled]="menuSaving()">
          {{ menuSaving()?(editMenuId()?'Updating...':'Adding...'):(editMenuId()?'Update Item':'Add Item') }}
        </button>
      </div>
    </div>
  </div>

  <!-- ══ TABLE FORM ══ -->
  <div class="overlay" [class.show]="showTableForm()" (click)="bgClick($event,'tablef')">
    <div class="modal" style="width:440px">
      <div class="modal-head">
        <div class="modal-title">{{ editTableId() ? 'Edit Table' : 'Add Table' }}</div>
        <button class="modal-close" (click)="showTableForm.set(false)">x</button>
      </div>
      <div class="form-row">
        <div class="fg"><label>Table Number *</label><input [(ngModel)]="tf.number" placeholder="T1, Bar-1..."></div>
        <div class="fg"><label>Capacity</label><input type="number" [(ngModel)]="tf.capacity" min="1" placeholder="4"></div>
      </div>
      <div class="form-row">
        <div class="fg"><label>Location</label>
          <select [(ngModel)]="tf.location">
            <option *ngFor="let l of tableLocs" [value]="l">{{ l | titlecase }}</option>
          </select>
        </div>
        <div class="fg"><label>Shape</label>
          <select [(ngModel)]="tf.shape">
            <option value="round">Round</option><option value="square">Square</option><option value="rectangle">Rectangle</option>
          </select>
        </div>
      </div>
      <div *ngIf="tableErr()" style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:10px;font-size:12.5px;color:#b91c1c;margin-bottom:10px">{{ tableErr() }}</div>
      <div style="display:flex;gap:10px">
        <button class="btn btn-o" style="flex:1" (click)="showTableForm.set(false)">Cancel</button>
        <button class="btn btn-g" style="flex:2" (click)="saveTable()" [disabled]="tableSaving()">
          {{ tableSaving()?'Saving...':'Save Table' }}
        </button>
      </div>
    </div>
  </div>

  <!-- ══ STORE ITEM FORM ══ -->
  <div class="overlay" [class.show]="showStoreForm()" (click)="bgClick($event,'storef')">
    <div class="modal" style="width:500px">
      <div class="modal-head">
        <div class="modal-title">{{ editStoreId() ? 'Edit Store Item' : 'Add Store Item' }}</div>
        <button class="modal-close" (click)="showStoreForm.set(false)">x</button>
      </div>
      <div class="form-row">
        <div class="fg" style="flex:2"><label>Item Name *</label><input [(ngModel)]="sf.name" placeholder="Orange Juice 1L"></div>
        <div class="fg"><label>Category</label>
          <select [(ngModel)]="sf.category">
            <option *ngFor="let c of storeCats" [value]="c">{{ c | titlecase }}</option>
          </select>
        </div>
      </div>
      <div class="fg">
        <label>Usage Type (where this item is used)</label>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:4px">
          <button *ngFor="let u of usageTypes" class="btn btn-sm"
            [ngClass]="sf.usageType===u.val?'btn-g':'btn-o'"
            (click)="sf.usageType=u.val"
            style="font-size:12px">{{ u.icon }} {{ u.label }}</button>
        </div>
      </div>
      <div class="form-row">
        <div class="fg"><label>Quantity</label><input type="number" [(ngModel)]="sf.quantity" min="0"></div>
        <div class="fg"><label>Min Qty (alert)</label><input type="number" [(ngModel)]="sf.minQuantity" min="0"></div>
        <div class="fg"><label>Unit</label><input [(ngModel)]="sf.unit" placeholder="pcs, kg, L..."></div>
      </div>
      <div class="form-row">
        <div class="fg"><label>Cost Price (\$)</label><input type="number" [(ngModel)]="sf.costPrice" min="0"></div>
        <div class="fg"><label>Supplier</label><input [(ngModel)]="sf.supplier" placeholder="Supplier name"></div>
      </div>
      <div class="fg"><label>Notes</label><input [(ngModel)]="sf.notes" placeholder="Storage info, expiry..."></div>
      <div *ngIf="storeErr()" style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:10px;font-size:12.5px;color:#b91c1c;margin-bottom:10px">{{ storeErr() }}</div>
      <div style="display:flex;gap:10px">
        <button class="btn btn-o" style="flex:1" (click)="showStoreForm.set(false)">Cancel</button>
        <button class="btn btn-g" style="flex:2" (click)="saveStore()" [disabled]="storeSaving()">
          {{ storeSaving()?'Saving...':'Save Item' }}
        </button>
      </div>
    </div>
  </div>

</div>`,
})
export class RestaurantComponent implements OnInit {

  // ── State ──
  tab            = signal<RTab>('pos');
  search         = '';
  loading        = signal(true);

  // Data
  menuItems      = signal<any[]>([]);
  categories     = signal<any[]>([]);
  tables         = signal<any[]>([]);
  orders         = signal<any[]>([]);
  storeItems     = signal<any[]>([]);
  dash           = signal<any>({ todayRevenue:0, todayOrders:0, pendingOrders:0, tablesOccupied:0, totalTables:0, activeOrders:[] });

  // POS
  posCategory    = signal('');
  posSearch      = '';
  posType        = signal<string>('dine_in');
  posTableId     = '';
  posGuestName   = '';
  posRoomNumber  = '';
  posNotes       = '';
  posDiscount    = 0;
  posPayMethod   = signal('cash');
  cart           = signal<any[]>([]);
  orderSaving    = signal(false);

  // Filters
  tableFilter    = signal('');
  tableViewMode  = signal<'floor'|'list'>('floor');
  selectedTable  = signal<any>(null);
  menuCatFilter  = signal('');
  storeCatFilter = signal('');
  orderStatusFilter = '';
  orderTypeFilter   = '';
  orderDateFilter   = '';

  // Modals
  showMenuForm   = signal(false);
  showCatManager = signal(false);
  catForm: any   = { name:'', icon:'🍽' };
  catErr         = signal('');
  catSaving      = signal(false);
  showTableForm  = signal(false);
  showStoreForm  = signal(false);
  showPayOrder   = signal(false);
  showReceipt    = signal(false);
  billMode       = signal<'full'|'split'|'custom'>('full');
  splitCount     = signal(2);
  customSplits   = signal<any[]>([]);
  receiptOrder   = signal<any>(null);
  editMenuId     = signal<string|null>(null);
  editTableId    = signal<string|null>(null);
  editStoreId    = signal<string|null>(null);
  menuErr        = signal('');
  tableErr       = signal('');
  storeErr       = signal('');
  menuSaving     = signal(false);
  tableSaving    = signal(false);
  storeSaving    = signal(false);
  payingSaving   = signal(false);
  payTarget      = signal<any>(null);
  payMethod      = signal('cash');

  storeSubTab    = signal<'items'|'in'|'out'|'log'>('items');
  movements      = signal<any[]>([]);
  showStockIn    = signal(false);
  showStockOut   = signal(false);
  showAddItems   = signal(false);
  addItemsTarget = signal<any>(null);
  addItemsSaving = signal(false);
  addItemsErr    = signal('');
  addCart        = signal<any[]>([]);
  addItemsCat    = signal('');
  addItemsSearch = '';
  readonly filteredAddMenu = computed(() => {
    const cat = this.addItemsCat(); const q = this.addItemsSearch.toLowerCase();
    return this.menuItems().filter((i: any) => i.isAvailable && (!cat||i.category===cat) && (!q||i.name.toLowerCase().includes(q)));
  });
  movTarget      = signal<any>(null);
  movSaving      = signal(false);
  movErr         = signal('');
  movForm: any   = { itemId:'', quantity:0, unitCost:0, supplier:'', reference:'', notes:'', reason:'kitchen' };

  readonly lowStockItems = computed(() => this.storeItems().filter((s: any) => s.quantity <= s.minQuantity));
  lowStockNames(): string { return this.lowStockItems().map((s: any) => s.name).join(', '); }
  mf: any = this.blankMenu();
  tf: any = this.blankTable();
  sf: any = this.blankStore();

  confirmDialog  = signal<any>({ show:false, icon:'⚠️', title:'', message:'', confirmLabel:'Confirm', danger:true, action:()=>{} });

  // Constants
  catNames(): string[] { return this.categories().length ? this.categories().map((c:any) => c.name) : DEFAULT_CATS; }
  storeCats    = STORE_CATS;
  tableLocs    = TABLE_LOCS;
  usageTypes   = [
    { val:'kitchen', icon:'🍳', label:'Kitchen' },
    { val:'bar',     icon:'🍺', label:'Bar' },
    { val:'coffee',  icon:'☕', label:'Coffee Shop' },
    { val:'bakery',  icon:'🥐', label:'Bakery' },
    { val:'general', icon:'📦', label:'General' },
  ];
  destinations = [
    { val:'kitchen',  icon:'🍳', label:'Kitchen' },
    { val:'bar',      icon:'🍺', label:'Bar' },
    { val:'coffee',   icon:'☕', label:'Coffee Shop' },
    { val:'bakery',   icon:'🥐', label:'Bakery' },
    { val:'waste',    icon:'🗑', label:'Waste / Spoilage' },
    { val:'supplier', icon:'↩', label:'Return to Supplier' },
    { val:'general',  icon:'📦', label:'General' },
  ];
  storeUsageFilter = signal('');
  orderTypes   = [{ val:'dine_in', icon:'🪑', label:'Dine In' }, { val:'room_service', icon:'🛏', label:'Room' }, { val:'takeaway', icon:'🥡', label:'Takeaway' }];
  payMethods   = [{ val:'cash', icon:'💵', label:'Cash' }, { val:'card', icon:'💳', label:'Card' }, { val:'room_charge', icon:'🛏', label:'Room' }, { val:'mobile_pay', icon:'📱', label:'Mobile' }];

  // ── Computed ──
  readonly activeOrders = computed(() => this.orders().filter(o => ['pending','preparing','served'].includes(o.status)));

  readonly filteredPosMenu = computed(() => {
    const cat = this.posCategory();
    const q   = this.posSearch.toLowerCase();
    return this.menuItems().filter(i =>
      i.isAvailable && (!cat || i.category === cat) && (!q || i.name.toLowerCase().includes(q))
    );
  });

  readonly filteredTables = computed(() => {
    const loc = this.tableFilter();
    return this.tables().filter(t => !loc || t.location === loc);
  });

  readonly availableTables = computed(() =>
    this.tables().filter(t => t.status === 'available')
  );

  readonly filteredMenu = computed(() => {
    const cat = this.menuCatFilter();
    const q   = this.search.toLowerCase();
    return this.menuItems().filter(i =>
      (!cat || i.category === cat) && (!q || i.name.toLowerCase().includes(q))
    );
  });

  readonly filteredStore = computed(() => {
    const cat   = this.storeCatFilter();
    const usage = this.storeUsageFilter();
    const q     = this.search.toLowerCase();
    return this.storeItems().filter((i: any) =>
      (!cat   || i.category  === cat) &&
      (!usage || i.usageType === usage) &&
      (!q     || i.name.toLowerCase().includes(q))
    );
  });

  usageIcon(type: string): string {
    const m: Record<string,string> = { kitchen:'🍳', bar:'🍺', coffee:'☕', bakery:'🥐', general:'📦', waste:'🗑', supplier:'↩' };
    return m[type] || '📦';
  }


  readonly filteredOrders = computed(() => {
    const q = this.search.toLowerCase();
    return this.orders().filter(o =>
      !q || o.orderNumber?.toLowerCase().includes(q) || o.guestName?.toLowerCase().includes(q) || o.tableNumber?.toLowerCase().includes(q)
    );
  });

  // Cart computed
  cartSubtotal()   { return this.cart().reduce((s, i) => s + i.subtotal, 0); }
  cartTax()        { return +(this.cartSubtotal() * 0.05).toFixed(2); }
  cartDiscountAmt(){ return +(this.cartSubtotal() * (this.posDiscount / 100)).toFixed(2); }
  cartTotal()      { return +(this.cartSubtotal() + this.cartTax() - this.cartDiscountAmt()).toFixed(2); }

  posCartHas(id: string): boolean { return this.cart().some(i => i.menuItemId === id); }
  cartQty(id: string): number     { return this.cart().find(i => i.menuItemId === id)?.qty || 0; }

  constructor(private menuSvc: MenuService, private orderSvc: OrderService) {}

  ngOnInit() { this.loadAll(); }

  loadAll() {
    this.loadCategories();
    this.loadMenu();
    this.loadTables();
    this.loadOrders();
    this.loadStore();
    this.loadDashboard();
  }

  loadCategories() { this.orderSvc.getCategories().subscribe({ next: (r: any) => this.categories.set(r.data.categories||[]) }); }
  loadMenu()      { this.menuSvc.getAll({ all: true }).subscribe({ next: (r: any) => this.menuItems.set(r.data.items||[]) }); }
  loadTables()    { this.orderSvc.getTables().subscribe({ next: (r: any) => this.tables.set(r.data.tables||[]) }); }
  loadOrders()    {
    const f: any = {};
    if (this.orderStatusFilter) f.status = this.orderStatusFilter;
    if (this.orderTypeFilter)   f.type   = this.orderTypeFilter;
    if (this.orderDateFilter)   f.date   = this.orderDateFilter;
    this.orderSvc.getAll(f).subscribe({ next: (r: any) => this.orders.set(r.data.orders||[]) });
  }
  loadStore()     { this.orderSvc.getStore().subscribe({ next: (r: any) => this.storeItems.set(r.data.items||[]) }); }
  loadDashboard() { this.orderSvc.getDashboard().subscribe({ next: (r: any) => this.dash.set(r.data||{}) }); }

  onSearch() { /* computed */ }

  // ── POS ──
  filterPosMenu() { /* computed */ }

  addToCart(item: any) {
    const existing = this.cart().find(i => i.menuItemId === item._id);
    if (existing) {
      existing.qty++;
      existing.subtotal = +(existing.qty * existing.unitPrice).toFixed(2);
      this.cart.set([...this.cart()]);
    } else {
      this.cart.update(c => [...c, { menuItemId: item._id, name: item.name, qty: 1, unitPrice: item.price, subtotal: item.price }]);
    }
  }

  incrementCart(item: any) { item.qty++; item.subtotal = +(item.qty * item.unitPrice).toFixed(2); this.cart.set([...this.cart()]); }
  decrementCart(item: any) {
    if (item.qty <= 1) { this.removeFromCart(item); return; }
    item.qty--; item.subtotal = +(item.qty * item.unitPrice).toFixed(2); this.cart.set([...this.cart()]);
  }
  removeFromCart(item: any) { this.cart.update(c => c.filter(i => i.menuItemId !== item.menuItemId)); }
  clearCart() { this.cart.set([]); this.posTableId = ''; this.posGuestName = ''; this.posRoomNumber = ''; this.posNotes = ''; this.posDiscount = 0; }

  onTableSelect() { /* just update posTableId */ }

  submitOrder() {
    if (!this.cart().length) return;
    const items = this.cart().map(i => ({ menuItemId: i.menuItemId, name: i.name, qty: i.qty, unitPrice: i.unitPrice }));
    this.orderSaving.set(true);
    if (this.posPayMethod() === 'room_charge' && !this.posRoomNumber) {
      alert('Please enter the room number for room charge billing');
      this.orderSaving.set(false);
      return;
    }
    this.orderSvc.create({
      type: this.posType(),
      tableNumber: this.posTableId ? this.tables().find((t: any) => t._id === this.posTableId)?.number : undefined,
      tableId:     this.posTableId || undefined,
      guestName:   this.posGuestName || undefined,
      roomNumber:  this.posRoomNumber || undefined,
      paymentMethod: this.posPayMethod() === 'room_charge' ? 'room_charge' : undefined,
      items,
      notes:       this.posNotes,
      discountPct: this.posDiscount,
    }).subscribe({
      next: () => {
        this.orderSaving.set(false);
        this.clearCart();
        this.loadAll();
        this.tab.set('orders'); // switch to orders view
      },
      error: (e: any) => { this.orderSaving.set(false); alert(e.error?.message || 'Order failed'); },
    });
  }

  updateOrderStatus(id: string, status: string, method?: string) {
    this.orderSvc.updateStatus(id, { status, ...(method && { paymentMethod: method }) }).subscribe(() => { this.loadAll(); });
  }

  billRoomNumber = '';
  hotelName      = 'Hotel Restaurant';

  openPayOrder(o: any) { this.payTarget.set(o); this.payMethod.set(o.paymentMethod||'cash'); this.billMode.set('full'); this.billRoomNumber = o.roomNumber||''; this.showPayOrder.set(true); }

  // Split equally
  splitAmount() {
    const o = this.payTarget();
    if (!o) return 0;
    return +( o.totalAmount / this.splitCount() ).toFixed(2);
  }

  initSplit() { this.splitCount.set(2); }

  // Custom split
  initCustomSplit() {
    const o = this.payTarget();
    if (!o) return;
    this.customSplits.set([
      { name: 'Guest 1', items: {} },
      { name: 'Guest 2', items: {} },
    ]);
  }

  addSplitPerson() {
    const n = this.customSplits().length + 1;
    this.customSplits.update(s => [...s, { name: `Guest ${n}`, items: {} }]);
  }

  getPersonItemQty(sp: any, item: any): number {
    return sp.items[item.name] || 0;
  }

  adjustSplitItem(sp: any, item: any, delta: number) {
    const cur = sp.items[item.name] || 0;
    const newVal = Math.max(0, Math.min(item.qty, cur + delta));
    sp.items = { ...sp.items, [item.name]: newVal };
    this.customSplits.set([...this.customSplits()]);
  }

  splitPersonTotal(sp: any): number {
    if (!this.payTarget()) return 0;
    let subtotal = 0;
    for (const item of this.payTarget().items) {
      const qty = sp.items[item.name] || 0;
      subtotal += qty * item.unitPrice;
    }
    const tax  = subtotal * 0.05;
    return +(subtotal + tax).toFixed(2);
  }

  customSplitRemaining(): number {
    if (!this.payTarget()) return 0;
    const assigned = this.customSplits().reduce((s: number, sp: any) => s + this.splitPersonTotal(sp), 0);
    return +(this.payTarget().totalAmount - assigned).toFixed(2);
  }

  // Print receipt
  printReceipt(order: any) {
    this.receiptOrder.set(order);
    setTimeout(() => {
      const el = document.getElementById('receipt-print-area');
      if (!el) return;
      const w = window.open('', '_blank', 'width=400,height=600');
      if (!w) return;
      w.document.write(`<html><head><title>Receipt</title><style>*{margin:0;padding:0;box-sizing:border-box;}body{font-family:'Courier New',monospace;font-size:12px;}@media print{body{width:80mm;}}</style></head><body>${el.innerHTML}</body></html>`);
      w.document.close();
      setTimeout(() => { w.print(); }, 300);
    }, 100);
  }

  printSplitReceipt() {
    const o = this.payTarget();
    if (!o) return;
    const perPerson = this.splitAmount();
    let html = `<html><head><title>Split Receipt</title><style>*{margin:0;padding:0;box-sizing:border-box;}body{font-family:'Courier New',monospace;font-size:12px;}.receipt{width:80mm;padding:10px;page-break-after:always;}@media print{.receipt{width:80mm;}}</style></head><body>`;
    for (let i = 0; i < this.splitCount(); i++) {
      html += `<div class="receipt">
        <div style="text-align:center;font-size:14px;font-weight:bold;margin-bottom:6px">${this.hotelName}</div>
        <div style="text-align:center;font-size:11px;margin-bottom:6px">Split Receipt ${i+1} of ${this.splitCount()}</div>
        <div style="border-bottom:1px dashed #000;margin:4px 0"></div>
        <div style="font-size:11px">Order: ${o.orderNumber}</div>
        <div style="font-size:11px">Table: ${o.tableNumber||'—'}</div>
        <div style="border-bottom:1px dashed #000;margin:4px 0"></div>`;
      for (const item of o.items) {
        html += `<div style="display:flex;justify-content:space-between;font-size:11px"><span>${item.qty}x ${item.name}</span><span>$${item.subtotal}</span></div>`;
      }
      html += `<div style="border-bottom:1px dashed #000;margin:4px 0"></div>
        <div style="display:flex;justify-content:space-between;font-size:11px"><span>Total bill</span><span>$${o.totalAmount}</span></div>
        <div style="display:flex;justify-content:space-between;font-size:14px;font-weight:bold;margin-top:4px"><span>YOUR SHARE</span><span>$${perPerson}</span></div>
        <div style="text-align:center;font-size:10px;margin-top:8px;color:#666">Thank you!</div>
      </div>`;
    }
    html += '</body></html>';
    const w = window.open('', '_blank', 'width=500,height=700');
    if (!w) return;
    w.document.write(html); w.document.close();
    setTimeout(() => w.print(), 400);
  }

  printCustomSplitReceipts() {
    const o = this.payTarget();
    if (!o) return;
    const splits = this.customSplits();
    let html = `<html><head><title>Custom Split Receipts</title><style>*{margin:0;padding:0;box-sizing:border-box;}body{font-family:'Courier New',monospace;font-size:12px;}.receipt{width:80mm;padding:10px;page-break-after:always;}@media print{.receipt{width:80mm;}}</style></head><body>`;
    for (const sp of splits) {
      const total = this.splitPersonTotal(sp);
      if (total === 0) continue;
      html += `<div class="receipt">
        <div style="text-align:center;font-size:14px;font-weight:bold;margin-bottom:4px">${this.hotelName}</div>
        <div style="text-align:center;font-size:11px;margin-bottom:4px">${sp.name}'s Receipt</div>
        <div style="border-bottom:1px dashed #000;margin:4px 0"></div>
        <div style="font-size:11px">Order: ${o.orderNumber}</div>
        <div style="border-bottom:1px dashed #000;margin:4px 0"></div>`;
      for (const item of o.items) {
        const qty = sp.items[item.name] || 0;
        if (!qty) continue;
        html += `<div style="display:flex;justify-content:space-between;font-size:11px"><span>${qty}x ${item.name}</span><span>$${(qty*item.unitPrice).toFixed(2)}</span></div>`;
      }
      html += `<div style="border-bottom:2px solid #000;margin:4px 0"></div>
        <div style="display:flex;justify-content:space-between;font-size:14px;font-weight:bold"><span>TOTAL</span><span>$${total}</span></div>
        <div style="text-align:center;font-size:10px;margin-top:8px;color:#666">Thank you for dining with us!</div>
      </div>`;
    }
    html += '</body></html>';
    const w = window.open('', '_blank', 'width=500,height=700');
    if (!w) return;
    w.document.write(html); w.document.close();
    setTimeout(() => w.print(), 400);
  }

  confirmPayOrder() {
    const rn = this.billRoomNumber || this.payTarget()?.roomNumber;
    this.payingSaving.set(true);
    this.orderSvc.updateStatus(this.payTarget()._id, {
      status: 'paid',
      paymentMethod: this.payMethod(),
      ...(rn ? { roomNumber: rn } : {}),
    }).subscribe({
      next: () => {
        this.payingSaving.set(false);
        this.printReceipt({ ...this.payTarget(), paymentMethod: this.payMethod() });
        this.showPayOrder.set(false);
        this.loadAll();
      },
      error: () => this.payingSaving.set(false),
    });
  }

  confirmCancelOrder(o: any) {
    this.showConfirm({ icon:'❌', title:'Cancel Order?', message:`Cancel order ${o.orderNumber}?`, confirmLabel:'Cancel Order', danger:true,
      action: () => this.updateOrderStatus(o._id, 'cancelled')
    });
  }

  // ── TABLES ──
  onTableClick(t: any) {
    if (t.status === 'available') {
      this.posTableId = t._id; this.posType.set('dine_in'); this.tab.set('pos');
    }
  }

  setTableStatus(t: any, status: string) {
    this.orderSvc.updateTable(t._id, { status }).subscribe(() => {
      this.loadTables();
      // refresh selectedTable after status change
      if (this.selectedTable()?._id === t._id) {
        setTimeout(() => {
          const updated = this.tables().find((tb: any) => tb._id === t._id);
          if (updated) this.selectedTable.set(updated);
        }, 300);
      }
    });
  }

  quickPayTable(t: any) {
    if (t.currentOrderId) this.openPayOrder(t.currentOrderId);
  }

  // ── Table helpers ──
  selectTable(t: any) { this.selectedTable.set(this.selectedTable()?._id === t._id ? null : t); }

  goToNewOrder(t: any) { this.posTableId = t._id; this.posType.set('dine_in'); this.tab.set('pos'); }

  readonly tableStats = computed(() => {
    const ts = this.tables();
    return [
      { label:'Available', count: ts.filter(t=>t.status==='available').length,  color:'#22c55e', border:'#bbf7d0', filter:'available' },
      { label:'Occupied',  count: ts.filter(t=>t.status==='occupied').length,   color:'#ef4444', border:'#fecaca', filter:'occupied'  },
      { label:'Reserved',  count: ts.filter(t=>t.status==='reserved').length,   color:'#3b82f6', border:'#bfdbfe', filter:'reserved'  },
      { label:'Cleaning',  count: ts.filter(t=>t.status==='cleaning').length,   color:'#94a3b8', border:'#e2e8f0', filter:'cleaning'  },
    ];
  });

  tableCountByLoc(loc: string) { return this.tables().filter(t => t.location === loc).length; }

  seatsArray(n: number): any[] { return Array(Math.min(n, 8)).fill(0); }

  orderAge(createdAt: string): string {
    if (!createdAt) return '';
    const mins = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
    if (mins < 60) return `${mins}m`;
    return `${Math.floor(mins/60)}h ${mins%60}m`;
  }

  locIcon(loc: string): string {
    const m: Record<string,string> = { indoor:'🏠', outdoor:'🌿', bar:'🍺', terrace:'☀️', private:'🔒' };
    return m[loc] || '🪑';
  }

  tableShapeIcon(t: any): string {
    if (t.shape === 'round')     return '⭕';
    if (t.shape === 'rectangle') return '▬';
    return '⬜';
  }

  floorBg(s: string): string {
    return s==='occupied'?'#fff1f2':s==='cleaning'?'#fffbeb':s==='reserved'?'#eff6ff':'#f0fdf4';
  }
  floorBorder(s: string): string {
    return s==='occupied'?'#fca5a5':s==='cleaning'?'#fde047':s==='reserved'?'#93c5fd':'#86efac';
  }
  floorPillBg(s: string): string {
    return s==='occupied'?'#fee2e2':s==='cleaning'?'#fef9c3':s==='reserved'?'#dbeafe':'#dcfce7';
  }
  floorPillColor(s: string): string {
    return s==='occupied'?'#b91c1c':s==='cleaning'?'#854d0e':s==='reserved'?'#1d4ed8':'#15803d';
  }
  tableStatusBg(s: string)     { return s==='occupied'?'#fff1f2':s==='cleaning'?'#fffbeb':s==='reserved'?'#eff6ff':'#f0fdf4'; }
  tableStatusBorder(s: string) { return s==='occupied'?'#fecaca':s==='cleaning'?'#fef08a':s==='reserved'?'#bfdbfe':'#bbf7d0'; }
  tableStatusPill(s: string)   {
    const m: Record<string,{bg:string,color:string}> = {
      occupied:{bg:'#fecaca',color:'#b91c1c'}, cleaning:{bg:'#fef08a',color:'#854d0e'},
      reserved:{bg:'#bfdbfe',color:'#1d4ed8'}, available:{bg:'#bbf7d0',color:'#15803d'},
    };
    return m[s] || m['available'];
  }

  openTableForm()  { this.editTableId.set(null); this.tf = this.blankTable(); this.tableErr.set(''); this.showTableForm.set(true); }
  openTableEdit(t: any) { this.editTableId.set(t._id); this.tf = { number:t.number, capacity:t.capacity, location:t.location, shape:t.shape }; this.tableErr.set(''); this.showTableForm.set(true); }
  saveTable() {
    if (!this.tf.number.trim()) { this.tableErr.set('Table number required'); return; }
    this.tableSaving.set(true); this.tableErr.set('');
    const eid = this.editTableId();
    const req = eid ? this.orderSvc.updateTable(eid, this.tf) : this.orderSvc.createTable(this.tf);
    req.subscribe({
      next: () => { this.tableSaving.set(false); this.showTableForm.set(false); this.loadTables(); },
      error: (e: any) => { this.tableSaving.set(false); this.tableErr.set(e.error?.message||'Error'); },
    });
  }

  confirmDeleteTable(t: any) {
    this.showConfirm({ icon:'🗑️', title:'Delete Table?', message:`Delete Table ${t.number}?`, confirmLabel:'Delete', danger:true,
      action: () => this.orderSvc.deleteTable(t._id).subscribe(() => this.loadTables())
    });
  }

  // ── MENU ──
  openMenuForm()  { this.editMenuId.set(null); this.mf = this.blankMenu(); this.menuErr.set(''); this.showMenuForm.set(true); }
  openMenuEdit(item: any) {
    this.editMenuId.set(item._id);
    this.mf = { name:item.name, category:item.category, price:item.price, description:item.description||'', preparationTime:item.preparationTime||0, allergensStr:(item.allergens||[]).join(', ') };
    this.menuErr.set(''); this.showMenuForm.set(true);
  }

  saveMenu() {
    if (!this.mf.name.trim()) { this.menuErr.set('Name required'); return; }
    if (!this.mf.price)       { this.menuErr.set('Price required'); return; }
    this.menuSaving.set(true); this.menuErr.set('');
    const payload = { ...this.mf, allergens: this.mf.allergensStr?.split(',').map((s: string) => s.trim()).filter(Boolean) || [] };
    delete payload.allergensStr;
    const eid = this.editMenuId();
    const req = eid ? this.menuSvc.update(eid, payload) : this.menuSvc.create(payload);
    req.subscribe({
      next: () => { this.menuSaving.set(false); this.showMenuForm.set(false); this.loadMenu(); },
      error: (e: any) => { this.menuSaving.set(false); this.menuErr.set(e.error?.message||'Error'); },
    });
  }

  toggleMenuAvail(item: any) {
    this.menuSvc.update(item._id, { isAvailable: !item.isAvailable }).subscribe(() => this.loadMenu());
  }

  confirmDeleteMenu(item: any) {
    this.showConfirm({ icon:'🗑️', title:'Remove Menu Item?', message:`Remove "${item.name}" from the menu?`, confirmLabel:'Remove', danger:true,
      action: () => this.menuSvc.remove(item._id).subscribe(() => this.loadMenu())
    });
  }

  // ── Add Items to Existing Order ──
  openAddItems(o: any) {
    this.addItemsTarget.set(o); this.addCart.set([]);
    this.addItemsCat.set(''); this.addItemsSearch = ''; this.addItemsErr.set('');
    this.showAddItems.set(true);
  }
  addCartHas(id: string)  { return this.addCart().some((i: any) => i.menuItemId === id); }
  addCartQty(id: string)  { return this.addCart().find((i: any) => i.menuItemId === id)?.qty || 0; }
  addCartTotal()          { return this.addCart().reduce((s: number, i: any) => s + i.subtotal, 0); }
  filterAddMenu()         { /* computed */ }
  addToAddCart(item: any) {
    const ex = this.addCart().find((i: any) => i.menuItemId === item._id);
    if (ex) { ex.qty++; ex.subtotal = +(ex.qty * ex.unitPrice).toFixed(2); this.addCart.set([...this.addCart()]); }
    else this.addCart.update(c => [...c, { menuItemId: item._id, name: item.name, qty: 1, unitPrice: item.price, subtotal: item.price }]);
  }
  incAddCart(item: any) { item.qty++; item.subtotal = +(item.qty * item.unitPrice).toFixed(2); this.addCart.set([...this.addCart()]); }
  decAddCart(item: any) {
    if (item.qty <= 1) { this.removeAddCart(item); return; }
    item.qty--; item.subtotal = +(item.qty * item.unitPrice).toFixed(2); this.addCart.set([...this.addCart()]);
  }
  removeAddCart(item: any) { this.addCart.update(c => c.filter((i: any) => i.menuItemId !== item.menuItemId)); }
  submitAddItems() {
    if (!this.addCart().length) return;
    this.addItemsSaving.set(true); this.addItemsErr.set('');
    const items = this.addCart().map((i: any) => ({ menuItemId: i.menuItemId, qty: i.qty, unitPrice: i.unitPrice }));
    this.orderSvc.addItems(this.addItemsTarget()._id, { items }).subscribe({
      next: () => { this.addItemsSaving.set(false); this.showAddItems.set(false); this.addCart.set([]); this.loadAll(); },
      error: (e: any) => { this.addItemsSaving.set(false); this.addItemsErr.set(e.error?.message||'Failed to add items'); },
    });
  }

  // ── STORE ──
  loadMovements(type?: string) {
    const f: any = {};
    if (type) f.type = type;
    this.orderSvc.getMovements(f).subscribe({ next: (r: any) => this.movements.set(r.data.movements||[]) });
  }

  openStockIn(item: any) {
    this.movTarget.set(item);
    this.movForm = { itemId: item?._id||'', quantity:0, unitCost: item?.costPrice||0, supplier: item?.supplier||'', reference:'', notes:'', reason:'purchase', destination: item?.usageType||'kitchen' };
    this.movErr.set(''); this.showStockIn.set(true);
  }

  openStockOut(item: any) {
    this.movTarget.set(item);
    this.movForm = { itemId: item?._id||'', quantity:0, unitCost:0, supplier:'', reference:'', notes:'', reason:'kitchen', destination: item?.usageType||'kitchen' };
    this.movErr.set(''); this.showStockOut.set(true);
  }

  openBulkIn() { this.openStockIn(null); this.storeSubTab.set('in'); }

  onMovItemSelect() {
    const item = this.storeItems().find((s: any) => s._id === this.movForm.itemId);
    if (item) { this.movTarget.set(item); this.movForm.unitCost = item.costPrice||0; this.movForm.supplier = item.supplier||''; }
  }

  movUnit(): string {
    const item = this.movTarget() || this.storeItems().find((s: any) => s._id === this.movForm.itemId);
    return item?.unit || '';
  }

  submitMovement(type: string) {
    const itemId = this.movTarget()?._id || this.movForm.itemId;
    if (!itemId) { this.movErr.set('Select an item'); return; }
    if (!this.movForm.quantity || this.movForm.quantity <= 0) { this.movErr.set('Enter quantity'); return; }
    this.movSaving.set(true); this.movErr.set('');
    this.orderSvc.addMovement({
      itemId, type, reason: type === 'in' ? 'purchase' : this.movForm.reason,
      quantity: this.movForm.quantity, unitCost: this.movForm.unitCost||0,
      supplier: this.movForm.supplier, reference: this.movForm.reference, notes: this.movForm.notes,
    }).subscribe({
      next: () => {
        this.movSaving.set(false);
        type === 'in' ? this.showStockIn.set(false) : this.showStockOut.set(false);
        this.movTarget.set(null); this.loadStore(); this.loadMovements(type); this.storeSubTab.set(type as any);
      },
      error: (e: any) => { this.movSaving.set(false); this.movErr.set(e.error?.message||'Error'); },
    });
  }

  reasonBadge(r: string): string {
    const m: Record<string,string> = { purchase:'b-green', return:'b-blue', kitchen:'b-purple', waste:'b-red', adjustment:'b-yellow', other:'b-gray' };
    return m[r] || 'b-gray';
  }

  openStoreForm() { this.editStoreId.set(null); this.sf = this.blankStore(); this.storeErr.set(''); this.showStoreForm.set(true); }
  openStoreEdit(s: any) {
    this.editStoreId.set(s._id);
    this.sf = { name:s.name, category:s.category, usageType:s.usageType||'kitchen', quantity:s.quantity, minQuantity:s.minQuantity, unit:s.unit, costPrice:s.costPrice, supplier:s.supplier||'', notes:s.notes||'' };
    this.storeErr.set(''); this.showStoreForm.set(true);
  }

  saveStore() {
    if (!this.sf.name.trim()) { this.storeErr.set('Name required'); return; }
    this.storeSaving.set(true); this.storeErr.set('');
    const eid = this.editStoreId();
    const req = eid ? this.orderSvc.updateStoreItem(eid, this.sf) : this.orderSvc.createStoreItem(this.sf);
    req.subscribe({
      next: () => { this.storeSaving.set(false); this.showStoreForm.set(false); this.loadStore(); },
      error: (e: any) => { this.storeSaving.set(false); this.storeErr.set(e.error?.message||'Error'); },
    });
  }

  adjustStock(item: any, delta: number) {
    const qty = Math.max(0, (item.quantity||0) + delta);
    this.orderSvc.updateStoreItem(item._id, { quantity: qty }).subscribe(() => this.loadStore());
  }

  confirmDeleteStore(item: any) {
    this.showConfirm({ icon:'🗑️', title:'Delete Store Item?', message:`Delete "${item.name}" from inventory?`, confirmLabel:'Delete', danger:true,
      action: () => this.orderSvc.deleteStoreItem(item._id).subscribe(() => this.loadStore())
    });
  }

  // ── Helpers ──
  catIcon(cat: string): string {
    const dbCat = this.categories().find((c:any) => c.name === cat);
    return dbCat?.icon || CAT_ICONS[cat] || '🍽';
  }
  orderTypeIcon(t: string)     { return t==='dine_in'?'🪑':t==='room_service'?'🛏':'🥡'; }
  orderStatusColor(s: string)  { return s==='pending'?'#f59e0b':s==='preparing'?'#8b5cf6':s==='served'?'#10b981':'#6b7280'; }
  orderStatusBg(s: string)     { return s==='pending'?'#fef9c3':s==='preparing'?'#f3e8ff':s==='served'?'#dcfce7':'#f3f4f6'; }
  orderBadge(s: string)        { return s==='paid'?'b-green':s==='cancelled'?'b-red':s==='served'?'b-green':s==='preparing'?'b-purple':'b-yellow'; }

  blankMenu()  { return { name:'', category:'breakfast', price:0, description:'', preparationTime:0, allergensStr:'' }; }
  blankTable() { return { number:'', capacity:4, location:'indoor', shape:'round' }; }
  blankStore() { return { name:'', category:'food', quantity:0, minQuantity:5, unit:'pcs', costPrice:0, supplier:'', notes:'', usageType:'kitchen' }; }

  // Confirm dialog
  showConfirm(opts: any) {
    this.confirmDialog.set({ show:true, icon:opts.icon||'⚠️', title:opts.title, message:opts.message, confirmLabel:opts.confirmLabel||'Confirm', danger:opts.danger!==false, action:opts.action });
  }
  acceptConfirm()  { const fn = this.confirmDialog().action; this.confirmDialog.update(d=>({...d,show:false})); fn(); }
  dismissConfirm() { this.confirmDialog.update(d=>({...d,show:false})); }

  openCatManager() { this.catForm = { name:'', icon:'🍽' }; this.catErr.set(''); this.showCatManager.set(true); }

  catItemCount(catName: string): number {
    return this.menuItems().filter((m: any) => m.category === catName).length;
  }

  addCategory() {
    if (!this.catForm.name.trim()) { this.catErr.set('Category name required'); return; }
    this.catSaving.set(true); this.catErr.set('');
    this.orderSvc.createCategory({ name: this.catForm.name.toLowerCase().trim(), icon: this.catForm.icon||'🍽' }).subscribe({
      next: () => { this.catSaving.set(false); this.catForm = { name:'', icon:'🍽' }; this.loadCategories(); },
      error: (e: any) => { this.catSaving.set(false); this.catErr.set(e.error?.message||'Already exists'); },
    });
  }

  deleteCategory(cat: any) {
    this.showConfirm({ icon:'🗑️', title:'Delete Category?', message:'Delete "'+cat.name+'" category?', confirmLabel:'Delete', danger:true,
      action: () => this.orderSvc.deleteCategory(cat._id).subscribe(() => this.loadCategories())
    });
  }

  openMenuCatEdit(cat: any) {
    // Quick inline edit - update icon
    const newIcon = prompt('New icon for ' + cat.name + ':', cat.icon);
    if (newIcon !== null) this.orderSvc.updateCategory(cat._id, { icon: newIcon }).subscribe(() => this.loadCategories());
  }

  bgClick(e: Event, t: string) {
    if (!(e.target as HTMLElement).classList.contains('overlay')) return;
    const map: Record<string,any> = { menu:this.showMenuForm, tablef:this.showTableForm, storef:this.showStoreForm, payorder:this.showPayOrder, catmgr:this.showCatManager, stockin:this.showStockIn, stockout:this.showStockOut, additems:this.showAddItems };
    map[t]?.set(false);
  }
}
