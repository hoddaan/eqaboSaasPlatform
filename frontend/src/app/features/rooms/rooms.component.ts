import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RoomService, HotelService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-rooms',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
<div class="page-content">
  <div class="sec-head mb20">
    <div>
      <div style="font-size:18px;font-weight:800;letter-spacing:-.4px">Unit Management</div>
      <div style="font-size:12.5px;color:var(--muted);margin-top:3px">Floor plan · manage rooms by floor</div>
    </div>
    <div style="display:flex;gap:8px">
      <button class="btn btn-o btn-sm" (click)="view.set(view()==='floor'?'list':'floor')">
        {{ view()==='floor' ? '☰ List View' : '⊞ Floor Plan' }}
      </button>
      <button class="btn btn-g btn-sm" (click)="openBulkForm()">＋ Add Units</button>
    </div>
  </div>

  <!-- Hotel Selector -->
  <div *ngIf="hotels().length > 1" class="mb20">
    <div style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">Select Property</div>
    <div style="display:flex;gap:10px;flex-wrap:wrap">
      <div *ngFor="let h of hotels()"
        style="background:var(--surface);border-radius:12px;padding:14px 18px;cursor:pointer;transition:all .15s;border:2px solid transparent;min-width:200px"
        [style.border-color]="selectedHotelId()===h._id?'var(--purple)':'var(--border)'"
        [style.background]="selectedHotelId()===h._id?'#f3e8ff':'var(--surface)'"
        (click)="selectHotel(h)">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
          <span style="font-size:20px">{{ h.propertyType==='villa'?'🏡':'🏨' }}</span>
          <div>
            <div style="font-weight:700;font-size:13.5px" [style.color]="selectedHotelId()===h._id?'var(--purple)':'var(--text)'">{{ h.name }}</div>
            <div style="font-size:11px;color:var(--muted)">{{ h.floors||1 }} floor{{ (h.floors||1)!==1?'s':'' }} · {{ hotelRoomCount(h._id) }} units</div>
          </div>
        </div>
        <div style="display:flex;gap:8px;font-size:10.5px">
          <span style="color:var(--danger);font-weight:600">Occupied: {{ hotelOccupied(h._id) }}</span>
          <span style="color:var(--success);font-weight:600">Available: {{ hotelAvailable(h._id) }}</span>
        </div>
        <div style="margin-top:8px">
          <div style="height:4px;background:var(--border);border-radius:3px;overflow:hidden">
            <div style="height:100%;background:var(--grad);border-radius:3px" [style.width.%]="hotelOccupancy(h._id)"></div>
          </div>
          <div style="font-size:10px;color:var(--muted);margin-top:3px;text-align:right">Occupancy: {{ hotelOccupancy(h._id) }}%</div>
        </div>
      </div>
    </div>
  </div>

  <!-- Stats -->
  <div class="g4 mb20" *ngIf="selectedHotel()">
    <div class="mc"><div class="mc-ico">🏢</div><div class="mc-lbl">Total Units</div><div class="mc-val">{{ floorRooms().length }}</div></div>
    <div class="mc"><div class="mc-ico">✅</div><div class="mc-lbl">Available</div><div class="mc-val" style="color:var(--success)">{{ countSt('available') }}</div></div>
    <div class="mc"><div class="mc-ico">🔴</div><div class="mc-lbl">Occupied</div><div class="mc-val" style="color:var(--danger)">{{ countSt('occupied') }}</div></div>
    <div class="mc"><div class="mc-ico">🔧</div><div class="mc-lbl">Maintenance</div><div class="mc-val" style="color:var(--warn)">{{ countSt('maintenance') }}</div></div>
  </div>

  <!-- ══ FLOOR PLAN VIEW ══ -->
  <ng-container *ngIf="view()==='floor' && selectedHotel()">
    <div class="card">
      <div class="sec-head">
        <div class="sec-title" style="margin:0">{{ selectedHotel().name }} — Floor Plan</div>
        <div style="display:flex;gap:12px;font-size:11px;align-items:center">
          <span style="display:flex;align-items:center;gap:5px"><span style="width:12px;height:12px;border-radius:3px;background:#dcfce7;border:1.5px solid #6ee7b7;display:inline-block"></span>Available</span>
          <span style="display:flex;align-items:center;gap:5px"><span style="width:12px;height:12px;border-radius:3px;background:#fee2e2;border:1.5px solid #fca5a5;display:inline-block"></span>Occupied</span>
          <span style="display:flex;align-items:center;gap:5px"><span style="width:12px;height:12px;border-radius:3px;background:#dbeafe;border:1.5px solid #93c5fd;display:inline-block"></span>Reserved</span>
          <span style="display:flex;align-items:center;gap:5px"><span style="width:12px;height:12px;border-radius:3px;background:#fef3c7;border:1.5px solid #fcd34d;display:inline-block"></span>Maintenance</span>
        </div>
      </div>
      <div *ngFor="let floorNum of floorNumbers()" style="margin-bottom:16px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
          <div style="display:flex;align-items:center;gap:10px">
            <div style="background:var(--grad);color:#fff;font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px">Floor {{ floorNum }}</div>
            <div style="font-size:12px;color:var(--muted)">{{ roomsOnFloor(floorNum).length }} unit{{ roomsOnFloor(floorNum).length!==1?'s':'' }}</div>
          </div>
          <button class="btn btn-o btn-xs" (click)="addToFloor(floorNum)">＋ Add Unit</button>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;padding:12px;background:var(--bg);border-radius:10px;min-height:64px">
          <div *ngFor="let r of roomsOnFloor(floorNum)"
            style="border-radius:10px;padding:8px 10px;text-align:center;cursor:pointer;transition:all .18s;border:2px solid transparent;min-width:70px"
            [ngClass]="getRoomClass(r.status)"
            [style.border-color]="selectedRoom()?._id===r._id?'var(--purple)':''"
            (click)="selectedRoom.set(r); activeImg.set(0)">
            <div style="font-size:14px;font-weight:800;letter-spacing:-.3px">{{ r.roomNumber }}</div>
            <div style="font-size:9px;margin-top:2px;opacity:.7;font-weight:700;text-transform:uppercase;letter-spacing:.4px">{{ r.type }}</div>
            <div style="font-size:11px;margin-top:2px" [style.color]="getStatusColor(r.status)">
              {{ r.status==='available'?'✓':r.status==='occupied'?'●':r.status==='reserved'?'◈':'⚙' }}
            </div>
          </div>
          <div *ngIf="!roomsOnFloor(floorNum).length" style="display:flex;align-items:center;justify-content:center;width:100%;color:var(--muted);font-size:12px;cursor:pointer" (click)="addToFloor(floorNum)">
            — No units on this floor · click to add —
          </div>
        </div>
      </div>
      <div *ngIf="!floorNumbers().length" style="text-align:center;padding:40px;color:var(--muted)">
        <div style="font-size:28px;margin-bottom:8px">🏢</div>No units yet. Click "Add Units" to get started.
      </div>
    </div>
  </ng-container>

  <!-- ══ LIST VIEW ══ -->
  <div class="card" *ngIf="view()==='list' && selectedHotel()">
    <div class="sec-head mb16">
      <div class="sec-title" style="margin:0">All Units</div>
      <div style="display:flex;gap:8px">
        <select class="tb-sel" [(ngModel)]="filterFloor">
          <option value="">All Floors</option>
          <option *ngFor="let f of floorNumbers()" [value]="f">Floor {{ f }}</option>
        </select>
        <select class="tb-sel" [(ngModel)]="filterStatus">
          <option value="">All Status</option>
          <option value="available">Available</option>
          <option value="occupied">Occupied</option>
          <option value="reserved">Reserved</option>
          <option value="maintenance">Maintenance</option>
        </select>
      </div>
    </div>
    <table class="tbl-hover">
      <thead><tr><th>Unit</th><th>Floor</th><th>Type</th><th>Status</th><th>Price/Night</th><th>Max Guests</th><th>Actions</th></tr></thead>
      <tbody>
        <tr *ngFor="let r of listRooms()">
          <td><strong>{{ r.roomNumber }}</strong></td>
          <td><span class="tag">Floor {{ r.floor }}</span></td>
          <td style="text-transform:capitalize">{{ r.type }}</td>
          <td><span class="badge" [ngClass]="getStatusBadge(r.status)">{{ r.status | titlecase }}</span></td>
          <td style="font-weight:700">\${{ r.pricePerNight }}</td>
          <td>{{ r.maxGuests }}</td>
          <td>
            <div style="display:flex;gap:5px">
              <button class="btn btn-o btn-xs" (click)="openEditRoom(r)">Edit</button>
              <select class="tb-sel" style="height:28px;font-size:11px;padding:3px 6px" [ngModel]="r.status" (ngModelChange)="quickStatus(r, $event)">
                <option value="available">Available</option>
                <option value="occupied">Occupied</option>
                <option value="reserved">Reserved</option>
                <option value="maintenance">Maintenance</option>
              </select>
              <button class="btn btn-danger btn-xs" (click)="deleteRoom(r._id)">✕</button>
            </div>
          </td>
        </tr>
        <tr *ngIf="!listRooms().length"><td colspan="7" style="text-align:center;padding:20px;color:var(--muted)">No units found</td></tr>
      </tbody>
    </table>
  </div>

  <!-- Room Detail Panel -->
  <div *ngIf="selectedRoom()" style="position:fixed;bottom:22px;right:22px;background:var(--surface);border:1.5px solid var(--border);border-radius:16px;padding:18px;width:290px;box-shadow:var(--shadow-lg);z-index:200;max-height:80vh;overflow-y:auto">
    <div class="rj mb12">
      <div style="font-weight:800;font-size:15px;letter-spacing:-.3px">Unit {{ selectedRoom().roomNumber }}</div>
      <button class="btn btn-o btn-xs" (click)="selectedRoom.set(null)">✕</button>
    </div>

    <!-- Room images slideshow -->
    <div *ngIf="selectedRoom().images?.length" style="margin-bottom:12px">
      <div style="border-radius:10px;overflow:hidden;height:140px;background:var(--bg);position:relative">
        <img [src]="selectedRoom().images[activeImg()]" style="width:100%;height:100%;object-fit:cover">
        <div *ngIf="selectedRoom().images.length > 1" style="position:absolute;bottom:6px;left:50%;transform:translateX(-50%);display:flex;gap:4px">
          <div *ngFor="let img of selectedRoom().images; let i=index"
            style="width:6px;height:6px;border-radius:50%;cursor:pointer;transition:all .15s"
            [style.background]="activeImg()===i?'#fff':'rgba(255,255,255,.5)'"
            (click)="activeImg.set(i)"></div>
        </div>
        <button *ngIf="selectedRoom().images.length > 1 && activeImg() > 0" type="button"
          style="position:absolute;left:6px;top:50%;transform:translateY(-50%);background:rgba(0,0,0,.4);color:#fff;border:none;border-radius:50%;width:24px;height:24px;cursor:pointer;font-size:12px"
          (click)="activeImg.set(activeImg()-1)">‹</button>
        <button *ngIf="selectedRoom().images.length > 1 && activeImg() < selectedRoom().images.length-1" type="button"
          style="position:absolute;right:6px;top:50%;transform:translateY(-50%);background:rgba(0,0,0,.4);color:#fff;border:none;border-radius:50%;width:24px;height:24px;cursor:pointer;font-size:12px"
          (click)="activeImg.set(activeImg()+1)">›</button>
      </div>
    </div>
    <div style="display:flex;flex-direction:column;gap:6px;font-size:12.5px;margin-bottom:14px">
      <div class="rj" style="padding:6px 10px;background:var(--bg);border-radius:8px">
        <span style="color:var(--muted)">Type</span><span style="font-weight:600;text-transform:capitalize">{{ selectedRoom().type }}</span>
      </div>
      <div class="rj" style="padding:6px 10px;background:var(--bg);border-radius:8px">
        <span style="color:var(--muted)">Floor</span><span style="font-weight:600">{{ selectedRoom().floor }}</span>
      </div>
      <div class="rj" style="padding:6px 10px;background:var(--bg);border-radius:8px">
        <span style="color:var(--muted)">Price</span><span style="font-weight:700">\${{ selectedRoom().pricePerNight }}/night</span>
      </div>
      <div class="rj" style="padding:6px 10px;background:var(--bg);border-radius:8px">
        <span style="color:var(--muted)">Status</span>
        <span class="badge" [ngClass]="getStatusBadge(selectedRoom().status)">{{ selectedRoom().status }}</span>
      </div>

      <!-- Current Tenant -->
      <div *ngIf="selectedRoom().currentBookingId" style="padding:10px;background:var(--grad-soft);border-radius:8px;border:1.5px solid rgba(109,42,117,.2)">
        <div style="font-size:10px;font-weight:700;color:var(--purple);text-transform:uppercase;letter-spacing:.5px;margin-bottom:7px">👤 Current Tenant</div>
        <div style="font-weight:700;font-size:13px">{{ selectedRoom().currentBookingId?.guestId?.firstName }} {{ selectedRoom().currentBookingId?.guestId?.lastName }}</div>
        <div style="font-size:11px;color:var(--muted);margin-top:2px">{{ selectedRoom().currentBookingId?.guestId?.phone }}</div>
        <div style="font-size:11px;color:var(--muted);margin-top:2px">
          Check-in: {{ selectedRoom().currentBookingId?.checkIn | date:'MMM d' }} ·
          Check-out: {{ selectedRoom().currentBookingId?.checkOut | date:'MMM d' }}
        </div>
        <div style="font-size:11px;margin-top:3px">
          <span class="tag" style="font-size:10px">{{ selectedRoom().currentBookingId?.nights }} nights</span>
          <span class="tag" style="font-size:10px;margin-left:4px">{{ selectedRoom().currentBookingId?.adults }} adults</span>
        </div>
        <div style="font-size:11px;color:var(--muted);margin-top:3px;font-family:monospace">{{ selectedRoom().currentBookingId?.bookingRef }}</div>
      </div>

      <div *ngIf="!selectedRoom().currentBookingId && selectedRoom().status === 'available'" style="padding:8px 10px;background:#f0fdf4;border-radius:8px;color:var(--success);font-size:12px;font-weight:600;text-align:center">
        ✓ Room is available
      </div>

      <div *ngIf="selectedRoom().amenities?.length" style="padding:8px 10px;background:var(--bg);border-radius:8px">
        <div style="color:var(--muted);margin-bottom:5px;font-size:11.5px">Amenities ({{ selectedRoom().amenities.length }})</div>
        <div style="display:flex;flex-wrap:wrap;gap:4px">
          <span *ngFor="let a of selectedRoom().amenities" class="tag" style="font-size:10px">{{ a }}</span>
        </div>
      </div>
    </div>
    <div style="display:flex;gap:6px">
      <button class="btn btn-g btn-sm" style="flex:1" (click)="openEditRoom(selectedRoom())">✏️ Edit</button>
      <button class="btn btn-danger btn-sm" (click)="deleteRoom(selectedRoom()._id)">✕</button>
    </div>
  </div>

  <!-- ══ BULK ADD MODAL ══ -->
  <div class="overlay" [class.show]="showBulkForm()" (click)="bgClick($event,'bulk')">
    <div class="modal">
      <div class="modal-head">
        <div class="modal-title">Add Units — Floor Setup</div>
        <button class="modal-close" (click)="showBulkForm.set(false)">✕</button>
      </div>
      <div style="background:var(--grad-soft);border-radius:10px;padding:12px 14px;margin-bottom:16px;font-size:12.5px;color:var(--purple)">
        🏢 Configure each floor. All units on a floor share type and price — edit individually later.
      </div>
      <div *ngFor="let fl of bulkFloors(); let i=index" style="background:var(--bg);border-radius:12px;padding:14px;margin-bottom:10px;border:1.5px solid var(--border)">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
          <div style="background:var(--grad);color:#fff;font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px">Floor {{ fl.floor }}</div>
          <button class="btn btn-danger btn-xs" (click)="removeBulkFloor(i)" *ngIf="bulkFloors().length>1">Remove</button>
        </div>
        <div class="form-row" style="margin-bottom:10px">
          <div class="fg" style="margin-bottom:0">
            <label>Units on this floor</label>
            <div style="display:flex;align-items:center;gap:8px">
              <button type="button" class="btn btn-o btn-xs" style="width:28px;padding:0" (click)="fl.count=fl.count>1?fl.count-1:1">−</button>
              <input type="number" [(ngModel)]="fl.count" min="1" max="50" style="text-align:center;font-weight:700;font-size:16px;width:60px">
              <button type="button" class="btn btn-g btn-xs" style="width:28px;padding:0" (click)="fl.count=fl.count+1">+</button>
            </div>
          </div>
          <div class="fg" style="margin-bottom:0">
            <label>Start unit number</label>
            <input type="text" [(ngModel)]="fl.startNum" placeholder="e.g. 101">
          </div>
        </div>
        <div class="form-row" style="margin-bottom:10px">
          <div class="fg" style="margin-bottom:0">
            <label>Unit Type</label>
            <select [(ngModel)]="fl.type">
              <option value="single">Single</option><option value="double">Double</option>
              <option value="twin">Twin</option><option value="suite">Suite</option><option value="penthouse">Penthouse</option>
            </select>
          </div>
          <div class="fg" style="margin-bottom:0">
            <label>Price/Night (\$)</label>
            <input type="number" [(ngModel)]="fl.price" min="0">
          </div>
        </div>
        <div style="margin-top:8px">
          <div style="font-size:10.5px;color:var(--muted);margin-bottom:5px;font-weight:600">Preview:</div>
          <div style="display:flex;gap:5px;flex-wrap:wrap">
            <span *ngFor="let n of previewUnits(fl)" style="background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:2px 8px;font-size:11px;font-weight:600;color:var(--text2)">{{ n }}</span>
            <span *ngIf="fl.count>8" style="font-size:11px;color:var(--muted)">+{{ fl.count-8 }} more</span>
          </div>
        </div>
      </div>
      <button class="btn btn-o btn-sm" style="width:100%;margin-bottom:14px" (click)="addBulkFloor()">＋ Add Another Floor</button>
      <div style="background:var(--bg);border-radius:10px;padding:12px;margin-bottom:14px;font-size:12px">
        <div class="rj"><span style="color:var(--muted)">Total units to create</span><span style="font-weight:800;font-size:15px;color:var(--purple)">{{ totalBulkUnits() }}</span></div>
      </div>
      <div *ngIf="bulkErr()" style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:10px 13px;font-size:12.5px;color:#b91c1c;margin-bottom:12px">⚠️ {{ bulkErr() }}</div>
      <div style="display:flex;gap:10px">
        <button class="btn btn-o" style="flex:1" (click)="showBulkForm.set(false)">Cancel</button>
        <button class="btn btn-g" style="flex:2" (click)="saveBulk()" [disabled]="bulkSaving()">
          {{ bulkSaving() ? 'Creating '+bulkProgress()+'/'+totalBulkUnits()+'...' : 'Create '+totalBulkUnits()+' Units' }}
        </button>
      </div>
    </div>
  </div>

  <!-- ══ SINGLE ROOM MODAL ══ -->
  <div class="overlay" [class.show]="showRoomForm()" (click)="bgClick($event,'room')">
    <div class="modal" style="width:580px">
      <div class="modal-head">
        <div class="modal-title">{{ editingRoomId() ? 'Edit Unit '+rf.roomNumber : 'Add Unit to Floor '+rf.floor }}</div>
        <button class="modal-close" (click)="showRoomForm.set(false)">✕</button>
      </div>

      <!-- Room Images -->
      <div style="margin-bottom:18px">
        <div style="font-size:10px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:10px">Room Photos</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <!-- Existing images -->
          <div *ngFor="let img of rf.images; let i=index" style="position:relative;width:80px;height:80px;border-radius:10px;overflow:hidden;border:1.5px solid var(--border)">
            <img [src]="img" style="width:100%;height:100%;object-fit:cover">
            <button type="button" (click)="removeImage(i)"
              style="position:absolute;top:3px;right:3px;width:18px;height:18px;border-radius:50%;background:rgba(0,0,0,.6);color:#fff;border:none;cursor:pointer;font-size:10px;display:flex;align-items:center;justify-content:center;line-height:1">✕</button>
          </div>
          <!-- Add photo button -->
          <label *ngIf="(rf.images||[]).length < 8"
            class="img-add-btn">
            <input type="file" accept="image/*" multiple style="display:none" (change)="addImages($event)">
            <span style="font-size:22px">📷</span>
            <span style="font-size:9px;color:var(--muted);font-weight:600">Add Photo</span>
          </label>
        </div>
        <div style="font-size:11px;color:var(--muted);margin-top:6px">Up to 8 photos. Click × to remove.</div>
      </div>

      <div class="div"></div>
      <div class="form-row">
        <div class="fg"><label>Unit Number</label><input [(ngModel)]="rf.roomNumber" placeholder="e.g. 204"></div>
        <div class="fg"><label>Floor</label><input type="number" [(ngModel)]="rf.floor" min="1"></div>
      </div>
      <div class="form-row">
        <div class="fg">
          <label>Unit Type</label>
          <select [(ngModel)]="rf.type">
            <option value="single">🛏 Single</option>
            <option value="double">🛏🛏 Double</option>
            <option value="twin">🛏🛏 Twin</option>
            <option value="suite">👑 Suite</option>
            <option value="penthouse">🏙 Penthouse</option>
            <option value="studio">🏠 Studio</option>
            <option value="villa">🏡 Villa Unit</option>
          </select>
        </div>
        <div class="fg">
          <label>Max Guests</label>
          <select [(ngModel)]="rf.maxGuests">
            <option [value]="1">1 Guest</option><option [value]="2">2 Guests</option>
            <option [value]="3">3 Guests</option><option [value]="4">4 Guests</option>
            <option [value]="5">5 Guests</option><option [value]="6">6 Guests</option>
            <option [value]="8">8 Guests</option><option [value]="10">10 Guests</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="fg"><label>Price/Night (\$)</label><input type="number" [(ngModel)]="rf.pricePerNight" min="0"></div>
        <div class="fg"><label>Building / Wing</label><input [(ngModel)]="rf.building" placeholder="Main Tower"></div>
      </div>

      <div class="div"></div>
      <div style="font-size:10px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:10px">Unit Status</div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:4px">
        <label *ngFor="let s of statusOpts"
          style="display:flex;flex-direction:column;align-items:center;gap:5px;padding:10px 6px;border-radius:10px;cursor:pointer;transition:all .15s;text-align:center;border:2px solid transparent"
          [style.border-color]="rf.status===s.value ? s.color : 'var(--border)'"
          [style.background]="rf.status===s.value ? s.bg : 'var(--bg)'">
          <input type="radio" [(ngModel)]="rf.status" [value]="s.value" style="display:none">
          <span style="font-size:20px">{{ s.icon }}</span>
          <span style="font-size:11px;font-weight:700" [style.color]="rf.status===s.value ? s.color : 'var(--text2)'">{{ s.label }}</span>
        </label>
      </div>

      <div class="div"></div>
      <div style="font-size:10px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:10px">Views & Features</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:4px">
        <label *ngFor="let v of viewOpts"
          style="display:flex;align-items:center;gap:6px;padding:7px 12px;border-radius:8px;cursor:pointer;transition:all .15s;font-size:12.5px;font-weight:500"
          [style.border]="rf.amenities.includes(v.value) ? '1.5px solid var(--purple)' : '1.5px solid var(--border)'"
          [style.background]="rf.amenities.includes(v.value) ? '#f3e8ff' : 'var(--bg)'"
          [style.color]="rf.amenities.includes(v.value) ? 'var(--purple)' : 'var(--text2)'">
          <input type="checkbox" [checked]="rf.amenities.includes(v.value)" (change)="toggleAmenity(v.value)" style="display:none">
          <span>{{ v.icon }}</span>{{ v.label }}
        </label>
      </div>

      <div class="div"></div>
      <div style="font-size:10px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:12px">Amenities & Services</div>
      <div *ngFor="let cat of amenityCats" style="margin-bottom:14px">
        <div style="font-size:11px;font-weight:700;color:var(--text2);margin-bottom:7px;display:flex;align-items:center;gap:6px">
          <span>{{ cat.icon }}</span>{{ cat.label }}
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:6px">
          <label *ngFor="let a of cat.items"
            style="display:flex;align-items:center;gap:5px;padding:5px 11px;border-radius:7px;cursor:pointer;transition:all .12s;font-size:12px;font-weight:500"
            [style.border]="rf.amenities.includes(a.value) ? '1.5px solid var(--purple)' : '1.5px solid var(--border)'"
            [style.background]="rf.amenities.includes(a.value) ? '#f3e8ff' : 'var(--bg)'"
            [style.color]="rf.amenities.includes(a.value) ? 'var(--purple)' : 'var(--text2)'">
            <input type="checkbox" [checked]="rf.amenities.includes(a.value)" (change)="toggleAmenity(a.value)" style="width:12px;height:12px;accent-color:var(--purple)">
            <span style="font-size:13px">{{ a.icon }}</span>{{ a.label }}
          </label>
        </div>
      </div>

      <div *ngIf="rf.amenities.length" style="background:var(--grad-soft);border-radius:10px;padding:10px 14px;margin-bottom:14px">
        <div style="font-size:10.5px;font-weight:700;color:var(--purple);margin-bottom:6px">Selected ({{ rf.amenities.length }})</div>
        <div style="display:flex;flex-wrap:wrap;gap:4px">
          <span *ngFor="let a of rf.amenities" style="background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:2px 8px;font-size:11px;color:var(--text2);font-weight:500">{{ a }}</span>
        </div>
      </div>

      <div style="display:flex;gap:10px;margin-top:4px">
        <button class="btn btn-o" style="flex:1" (click)="showRoomForm.set(false)">Cancel</button>
        <button class="btn btn-g" style="flex:2" (click)="saveRoom()" [disabled]="roomSaving()">
          {{ roomSaving() ? 'Saving...' : (editingRoomId() ? 'Update Unit' : 'Add Unit') }}
        </button>
      </div>
    </div>
  </div>
</div>`,
})
export class RoomsComponent implements OnInit {

  view            = signal<'floor'|'list'>('floor');
  hotels          = signal<any[]>([]);
  allRooms        = signal<any[]>([]);
  selectedHotelId = signal<string>('');
  selectedRoom    = signal<any>(null);
  activeImg       = signal(0);
  showBulkForm    = signal(false);
  showRoomForm    = signal(false);
  editingRoomId   = signal<string|null>(null);
  bulkSaving      = signal(false);
  roomSaving      = signal(false);
  bulkErr         = signal('');
  bulkProgress    = signal(0);
  bulkFloors      = signal<any[]>([]);

  filterStatus = '';
  filterFloor: number | '' = '';

  rf: any = { roomNumber:'', floor:1, type:'double', maxGuests:2, pricePerNight:150, building:'Main', status:'available', amenities:[] as string[], images:[] as string[] };

  // ── Status options ──
  statusOpts = [
    { value:'available',   label:'Available',   icon:'✅', color:'#15803d', bg:'#dcfce7' },
    { value:'occupied',    label:'Occupied',    icon:'🔴', color:'#b91c1c', bg:'#fee2e2' },
    { value:'reserved',    label:'Reserved',    icon:'🔵', color:'#1d4ed8', bg:'#dbeafe' },
    { value:'maintenance', label:'Maintenance', icon:'🔧', color:'#92400e', bg:'#fef3c7' },
  ];

  // ── Views ──
  viewOpts = [
    { value:'city_view',     icon:'🏙', label:'City View'     },
    { value:'sea_view',      icon:'🌊', label:'Sea View'      },
    { value:'pool_view',     icon:'🏊', label:'Pool View'     },
    { value:'garden_view',   icon:'🌿', label:'Garden View'   },
    { value:'mountain_view', icon:'⛰', label:'Mountain View' },
    { value:'balcony',       icon:'🏗', label:'Balcony'       },
    { value:'terrace',       icon:'☀️', label:'Terrace'       },
    { value:'corner_room',   icon:'🔲', label:'Corner Room'   },
  ];

  // ── Amenity categories ──
  amenityCats = [
    { label:'Connectivity', icon:'📡', items:[
      {value:'wifi',           icon:'📶', label:'Free WiFi'      },
      {value:'highspeed_wifi', icon:'⚡', label:'High-Speed WiFi' },
      {value:'smart_tv',       icon:'📺', label:'Smart TV'        },
      {value:'cable_tv',       icon:'📡', label:'Cable TV'        },
      {value:'phone',          icon:'📞', label:'Phone'           },
      {value:'work_desk',      icon:'💼', label:'Work Desk'       },
    ]},
    { label:'Bathroom', icon:'🚿', items:[
      {value:'private_bathroom', icon:'🚿', label:'Private Bathroom'},
      {value:'bathtub',          icon:'🛁', label:'Bathtub'          },
      {value:'jacuzzi',          icon:'♨️', label:'Jacuzzi'          },
      {value:'rain_shower',      icon:'🚿', label:'Rain Shower'      },
      {value:'hot_tub',          icon:'🛁', label:'Hot Tub'          },
      {value:'bidet',            icon:'🚽', label:'Bidet'            },
      {value:'hairdryer',        icon:'💨', label:'Hair Dryer'       },
      {value:'toiletries',       icon:'🧴', label:'Toiletries'       },
      {value:'towels',           icon:'🧻', label:'Towels & Robes'   },
    ]},
    { label:'Bedroom & Comfort', icon:'🛏', items:[
      {value:'king_bed',          icon:'👑', label:'King Bed'         },
      {value:'queen_bed',         icon:'🛏', label:'Queen Bed'        },
      {value:'extra_bed',         icon:'🛏', label:'Extra Bed'        },
      {value:'sofa_bed',          icon:'🛋', label:'Sofa Bed'         },
      {value:'air_conditioning',  icon:'❄️', label:'Air Conditioning' },
      {value:'heating',           icon:'🔥', label:'Heating'          },
      {value:'blackout_curtains', icon:'🪟', label:'Blackout Curtains'},
      {value:'wardrobe',          icon:'🚪', label:'Wardrobe'         },
      {value:'safe',              icon:'🔐', label:'In-Room Safe'     },
      {value:'iron',              icon:'👔', label:'Iron & Board'     },
    ]},
    { label:'Food & Drinks', icon:'🍽', items:[
      {value:'minibar',       icon:'🍾', label:'Minibar'        },
      {value:'nespresso',     icon:'☕', label:'Coffee Machine' },
      {value:'kettle',        icon:'🫖', label:'Kettle & Tea'   },
      {value:'refrigerator',  icon:'🧊', label:'Refrigerator'   },
      {value:'kitchenette',   icon:'🍳', label:'Kitchenette'    },
      {value:'dining_table',  icon:'🍽', label:'Dining Area'    },
      {value:'room_service',  icon:'🛎', label:'Room Service'   },
      {value:'welcome_fruit', icon:'🍎', label:'Welcome Fruit'  },
    ]},
    { label:'Recreation & Fitness', icon:'🏋', items:[
      {value:'gym_access',    icon:'🏋', label:'Gym Access'    },
      {value:'swimming_pool', icon:'🏊', label:'Swimming Pool' },
      {value:'private_pool',  icon:'🏊', label:'Private Pool'  },
      {value:'spa_access',    icon:'💆', label:'Spa Access'    },
      {value:'sauna',         icon:'🧖', label:'Sauna'         },
      {value:'tennis',        icon:'🎾', label:'Tennis Court'  },
      {value:'games_room',    icon:'🎮', label:'Games Room'    },
      {value:'kids_club',     icon:'🧒', label:'Kids Club'     },
    ]},
    { label:'Accessibility & Extra', icon:'♿', items:[
      {value:'wheelchair',       icon:'♿', label:'Wheelchair Access'},
      {value:'elevator',         icon:'🛗', label:'Elevator Access'  },
      {value:'smoking',          icon:'🚬', label:'Smoking Room'     },
      {value:'non_smoking',      icon:'🚭', label:'Non-Smoking'      },
      {value:'pet_friendly',     icon:'🐾', label:'Pet Friendly'     },
      {value:'connecting_rooms', icon:'🚪', label:'Connecting Rooms' },
      {value:'butler',           icon:'🛎', label:'Butler Service'   },
      {value:'parking',          icon:'🅿️', label:'Parking'         },
    ]},
  ];

  // ── Computed ──
  readonly selectedHotel = computed(() => this.hotels().find(h => h._id === this.selectedHotelId()) || null);

  readonly floorRooms = computed(() =>
    this.allRooms().filter(r => (typeof r.hotelId==='object' ? r.hotelId?._id : r.hotelId) === this.selectedHotelId())
  );

  readonly floorNumbers = computed(() => {
    const floors = this.selectedHotel()?.floors || 1;
    const nums: number[] = [];
    for (let i = floors; i >= 1; i--) nums.push(i);
    return nums;
  });

  readonly listRooms = computed(() => {
    let r = this.floorRooms();
    if (this.filterStatus) r = r.filter(x => x.status === this.filterStatus);
    if (this.filterFloor !== '') r = r.filter(x => x.floor === Number(this.filterFloor));
    return r;
  });

  constructor(private roomSvc: RoomService, private hotelSvc: HotelService, private auth: AuthService) {}

  ngOnInit() { this.loadHotels(); }

  loadHotels() {
    const user = this.auth.user();
    const hid = typeof user?.hotelId === 'object' ? (user?.hotelId as any)?._id : user?.hotelId;
    if (hid && !['SuperAdmin','CompanyAdmin'].includes(user?.role || '')) {
      this.hotelSvc.getOne(hid).subscribe({
        next: r => { this.hotels.set([r.data.hotel]); this.selectHotel(r.data.hotel); },
        error: () => this.loadAllHotels(),
      });
    } else {
      this.loadAllHotels();
    }
  }

  loadAllHotels() {
    this.hotelSvc.getAll().subscribe({
      next: r => { const list = r.data.hotels||[]; this.hotels.set(list); if (list.length) this.selectHotel(list[0]); },
    });
  }

  selectHotel(h: any) {
    this.selectedHotelId.set(h._id);
    this.selectedRoom.set(null);
    this.loadRooms(h._id);
  }

  loadRooms(hotelId: string) {
    this.roomSvc.getAll({ hotelId }).subscribe({
      next: r => {
        const others = this.allRooms().filter(rm => (typeof rm.hotelId==='object' ? rm.hotelId?._id : rm.hotelId) !== hotelId);
        this.allRooms.set([...others, ...r.data.rooms]);
      },
    });
  }

  roomsOnFloor(floor: number) { return this.floorRooms().filter(r => r.floor === floor); }
  countSt(s: string)  { return this.floorRooms().filter(r => r.status === s).length; }
  hotelRoomCount(id: string)  { return this.allRooms().filter(r => (r.hotelId?._id||r.hotelId)===id).length; }
  hotelOccupied(id: string)   { return this.allRooms().filter(r => (r.hotelId?._id||r.hotelId)===id && r.status==='occupied').length; }
  hotelAvailable(id: string)  { return this.allRooms().filter(r => (r.hotelId?._id||r.hotelId)===id && r.status==='available').length; }
  hotelOccupancy(id: string) {
    const tot = this.hotelRoomCount(id);
    return tot ? Math.round(((this.hotelOccupied(id) + this.allRooms().filter(r=>(r.hotelId?._id||r.hotelId)===id&&r.status==='reserved').length)/tot)*100) : 0;
  }

  getRoomClass(s: string) { return {'rm-av':s==='available','rm-oc':s==='occupied','rm-rs':s==='reserved','rm-mt':s==='maintenance'||s==='housekeeping'}; }
  getStatusColor(s: string) { const m:Record<string,string>={available:'var(--success)',occupied:'var(--danger)',reserved:'var(--info)',maintenance:'var(--warn)'}; return m[s]||'var(--muted)'; }
  getStatusBadge(s: string) { const m:Record<string,string>={available:'b-green',occupied:'b-red',reserved:'b-blue',maintenance:'b-yellow',housekeeping:'b-gray'}; return m[s]||'b-gray'; }

  // ── Bulk ──
  openBulkForm() {
    const floors = this.selectedHotel()?.floors || 1;
    const configs: any[] = [];
    for (let f = 1; f <= Math.min(floors, 4); f++) {
      const ex = this.roomsOnFloor(f);
      configs.push({ floor:f, count: ex.length||5, startNum:`${f}01`, type:'double', price:150 });
    }
    this.bulkFloors.set(configs.length ? configs : [{ floor:1, count:5, startNum:'101', type:'double', price:150 }]);
    this.bulkErr.set('');
    this.showBulkForm.set(true);
  }

  addBulkFloor() {
    const mx = Math.max(...this.bulkFloors().map(f => f.floor), 0);
    const n = mx + 1;
    this.bulkFloors.set([...this.bulkFloors(), { floor:n, count:5, startNum:`${n}01`, type:'double', price:150 }]);
  }

  removeBulkFloor(i: number) { const f=[...this.bulkFloors()]; f.splice(i,1); this.bulkFloors.set(f); }

  previewUnits(fl: any): string[] {
    const nums: string[] = [];
    const base = parseInt(String(fl.startNum));
    for (let i = 0; i < Math.min(fl.count,8); i++) nums.push(!isNaN(base) ? String(base+i) : `${fl.startNum}${i>0?'-'+(i+1):''}`);
    return nums;
  }

  totalBulkUnits() { return this.bulkFloors().reduce((s:number,f:any)=>s+(Number(f.count)||0),0); }

  async saveBulk() {
    if (!this.selectedHotelId()) { this.bulkErr.set('No hotel selected'); return; }
    this.bulkSaving.set(true); this.bulkProgress.set(0); this.bulkErr.set('');
    const hid = this.selectedHotelId();
    let created = 0; const errors: string[] = [];
    for (const fl of this.bulkFloors()) {
      const base = parseInt(String(fl.startNum));
      for (let i = 0; i < fl.count; i++) {
        const rn = !isNaN(base) ? String(base+i) : `${fl.startNum}${i>0?'-'+(i+1):''}`;
        try {
          await this.roomSvc.create({ hotelId:hid, roomNumber:rn, floor:fl.floor, type:fl.type, pricePerNight:fl.price, maxGuests:fl.type==='single'?1:fl.type==='suite'?3:2, status:'available' }).toPromise();
          created++; this.bulkProgress.set(created);
        } catch(e:any) { errors.push(`${rn}: ${e?.error?.message||'error'}`); }
      }
    }
    this.bulkSaving.set(false);
    if (errors.length) this.bulkErr.set(`${created} created. ${errors.length} failed: ${errors[0]}`);
    else { this.showBulkForm.set(false); this.loadRooms(hid); }
  }

  // ── Single room ──
  addToFloor(floor: number) {
    this.editingRoomId.set(null);
    this.rf = { roomNumber:'', floor, type:'double', maxGuests:2, pricePerNight:150, building:'Main', status:'available', amenities:[], images:[] };
    this.showRoomForm.set(true);
  }

  openEditRoom(r: any) {
    this.editingRoomId.set(r._id);
    this.rf = { ...r, amenities: Array.isArray(r.amenities) ? [...r.amenities] : [], images: Array.isArray(r.images) ? [...r.images] : [] };
    this.showRoomForm.set(true);
  }

  addImages(event: Event) {
    const files = (event.target as HTMLInputElement).files;
    if (!files) return;
    const remaining = 8 - (this.rf.images?.length || 0);
    Array.from(files).slice(0, remaining).forEach(file => {
      if (file.size > 5 * 1024 * 1024) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        this.rf.images = [...(this.rf.images || []), e.target?.result as string];
      };
      reader.readAsDataURL(file);
    });
  }

  removeImage(i: number) {
    this.rf.images = this.rf.images.filter((_: any, idx: number) => idx !== i);
  }

  toggleAmenity(val: string) {
    const idx = this.rf.amenities.indexOf(val);
    if (idx > -1) this.rf.amenities.splice(idx, 1);
    else this.rf.amenities.push(val);
    this.rf.amenities = [...this.rf.amenities];
  }

  saveRoom() {
    if (!this.rf.roomNumber) return;
    this.roomSaving.set(true);
    const payload = {
      hotelId: this.selectedHotelId(), roomNumber: this.rf.roomNumber,
      floor: this.rf.floor, type: this.rf.type, maxGuests: this.rf.maxGuests,
      pricePerNight: this.rf.pricePerNight, building: this.rf.building,
      status: this.rf.status, amenities: this.rf.amenities||[],
      images: this.rf.images||[],
    };
    const eid = this.editingRoomId();
    const req = eid ? this.roomSvc.update(eid, payload) : this.roomSvc.create(payload);
    req.subscribe({
      next: () => { this.roomSaving.set(false); this.showRoomForm.set(false); this.loadRooms(this.selectedHotelId()); },
      error: () => this.roomSaving.set(false),
    });
  }

  quickStatus(r: any, status: string) {
    this.roomSvc.update(r._id, { status }).subscribe(() => this.loadRooms(this.selectedHotelId()));
  }

  deleteRoom(id: string) {
    if (!confirm('Remove this unit?')) return;
    this.roomSvc.delete(id).subscribe(() => { this.selectedRoom.set(null); this.loadRooms(this.selectedHotelId()); });
  }

  bgClick(e: Event, type: string) {
    if ((e.target as HTMLElement).classList.contains('overlay')) {
      if (type === 'bulk') this.showBulkForm.set(false);
      else this.showRoomForm.set(false);
    }
  }
}
