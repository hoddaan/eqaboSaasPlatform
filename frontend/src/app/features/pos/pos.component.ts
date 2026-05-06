import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MenuService, OrderService } from '../../core/services/api.service';

@Component({
  selector: 'app-pos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
<div class="page-content" style="padding-bottom:0">
  <div class="sec-head mb16">
    <div><div style="font-family:'Syne',sans-serif;font-size:18px;font-weight:800">Restaurant POS</div></div>
    <div style="display:flex;gap:8px;align-items:center">
      <select class="tb-sel" [(ngModel)]="orderType"><option value="dine_in">Dine-In</option><option value="takeaway">Takeaway</option><option value="room_service">Room Service</option></select>
      <input style="width:120px" [(ngModel)]="tableNumber" placeholder="Table / Room">
    </div>
  </div>
  <div class="pos-wrap">
    <div style="display:flex;flex-direction:column;gap:10px;overflow:hidden">
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        <button *ngFor="let c of categories" class="btn btn-sm" [ngClass]="activeCategory===c?'btn-g':'btn-o'" (click)="setCategory(c)">{{ c==='all'?'All':c | titlecase }}</button>
      </div>
      <div class="menu-grid">
        <div *ngFor="let item of filteredMenu()" class="mi" [class.incart]="cartQty(item._id)>0" (click)="addToCart(item)">
          <div class="mi-cat">{{ item.category }}</div>
          <div class="mi-name">{{ item.name }}</div>
          <div class="mi-price">\${{ item.price }}</div>
          <div *ngIf="cartQty(item._id)>0" style="font-size:10px;color:var(--purple);font-weight:700;margin-top:3px">× {{ cartQty(item._id) }} in order</div>
        </div>
        <div *ngIf="!filteredMenu().length&&!loading()" style="grid-column:1/-1;text-align:center;padding:30px;color:var(--muted)">No items in this category</div>
        <div *ngIf="loading()" style="grid-column:1/-1;text-align:center;padding:30px;color:var(--muted)">Loading menu...</div>
      </div>
    </div>
    <div class="order-panel">
      <div class="op-head">
        <div class="op-title">🛒 Current Order</div>
        <div class="op-sub">{{ tableNumber || 'No table' }} · {{ orderType | titlecase }}</div>
      </div>
      <div class="op-items">
        <div *ngIf="!cart().length" style="text-align:center;padding:30px;color:rgba(255,255,255,.6)">
          <div style="font-size:28px;margin-bottom:8px">🍽</div><div style="font-size:12px">No items yet</div>
        </div>
        <div *ngFor="let item of cart()" class="oi">
          <div style="font-size:16px">🍴</div>
          <div class="oi-name">{{ item.name }}<div style="font-size:10px;color:var(--muted)">\${{ item.unitPrice }} each</div></div>
          <div class="qty-wrap">
            <button class="qty-btn" (click)="changeQty(item,-1)">−</button>
            <span class="qty-num">{{ item.qty }}</span>
            <button class="qty-btn" (click)="changeQty(item,1)">+</button>
          </div>
          <div class="oi-price">\${{ (item.unitPrice*item.qty) | number:'1.2-2' }}</div>
        </div>
      </div>
      <div class="op-foot">
        <div class="tot-row"><span>Subtotal</span><span>\${{ subtotal() | number:'1.2-2' }}</span></div>
        <div class="tot-row"><span>Tax (5%)</span><span>\${{ tax() | number:'1.2-2' }}</span></div>
        <div class="tot-row grand"><span>Total</span><span>\${{ total() | number:'1.2-2' }}</span></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px">
          <button class="btn btn-o btn-sm" (click)="clearCart()">✕ Clear</button>
          <button class="btn btn-g btn-sm" (click)="checkout('card')" [disabled]="!cart().length||placing()">{{ placing()?'Placing...':'💳 Pay' }}</button>
        </div>
        <button class="btn btn-o btn-sm" style="width:100%;margin-top:7px;font-size:11px" (click)="checkout('room_charge')" [disabled]="!cart().length">🏨 Charge to Room</button>
      </div>
    </div>
  </div>
</div>`,
})
export class PosComponent implements OnInit {
  menu=signal<any[]>([]);cart=signal<any[]>([]);loading=signal(true);placing=signal(false);
  activeCategory='all';orderType='dine_in';tableNumber='Table 1';
  categories=['all','breakfast','lunch','dinner','salads','coffee','drinks','desserts','specials'];
  constructor(private menuSvc:MenuService,private orderSvc:OrderService){}
  ngOnInit(){this.loadMenu();}
  loadMenu(){this.loading.set(true);this.menuSvc.getAll().subscribe({next:(r:any)=>{this.menu.set(r.data.items);this.loading.set(false);},error:()=>this.loading.set(false)});}
  setCategory(c:string){this.activeCategory=c;}
  filteredMenu(){return this.activeCategory==='all'?this.menu():this.menu().filter(i=>i.category===this.activeCategory);}
  cartQty(id:string){return this.cart().find(i=>i.menuItemId===id)?.qty||0;}
  addToCart(item:any){
    const existing=this.cart().find(i=>i.menuItemId===item._id);
    if(existing){this.cart.set(this.cart().map(i=>i.menuItemId===item._id?{...i,qty:i.qty+1}:i));}
    else{this.cart.set([...this.cart(),{menuItemId:item._id,name:item.name,qty:1,unitPrice:item.price}]);}
  }
  changeQty(item:any,d:number){
    const updated=this.cart().map(i=>i.menuItemId===item.menuItemId?{...i,qty:i.qty+d}:i).filter(i=>i.qty>0);
    this.cart.set(updated);
  }
  clearCart(){this.cart.set([]);}
  subtotal(){return this.cart().reduce((s,i)=>s+i.unitPrice*i.qty,0);}
  tax(){return this.subtotal()*0.05;}
  total(){return this.subtotal()+this.tax();}
  checkout(method:string){
    if(!this.cart().length)return;
    this.placing.set(true);
    const payload={type:this.orderType,tableNumber:this.tableNumber,items:this.cart(),paymentMethod:method};
    this.orderSvc.create(payload).subscribe({
      next:()=>{this.placing.set(false);alert('Order placed! Total: $'+this.total().toFixed(2));this.clearCart();},
      error:(e:any)=>{this.placing.set(false);alert('Error: '+(e.error?.message||'Order failed'));}
    });
  }
}
