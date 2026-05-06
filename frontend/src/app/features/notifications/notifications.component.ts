import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
<div class="page-content">
  <div class="sec-head mb20">
    <div style="font-family:'Syne',sans-serif;font-size:18px;font-weight:800">Notifications</div>
    <button class="btn btn-o btn-sm" (click)="markAllRead()">Mark all read</button>
  </div>
  <div class="g2">
    <div class="card">
      <div class="sec-title">Recent Notifications ({{ unreadCount() }} unread)</div>
      <div *ngFor="let n of notifs()" class="notif-item" [class.unread]="!n.read" (click)="markRead(n)">
        <div class="notif-ico-wrap" [style.background]="n.bg">{{ n.icon }}</div>
        <div style="flex:1">
          <div class="notif-title">{{ n.title }}</div>
          <div class="notif-sub">{{ n.message }}</div>
          <div class="notif-time">{{ n.time }}</div>
        </div>
        <div *ngIf="!n.read" style="width:8px;height:8px;border-radius:50%;background:var(--pink);flex-shrink:0;margin-top:4px"></div>
      </div>
    </div>
    <div class="card">
      <div class="sec-title">Notification Settings</div>
      <div style="display:flex;flex-direction:column;gap:10px">
        <div *ngFor="let s of settings()" style="display:flex;align-items:center;justify-content:space-between;padding:10px;background:var(--bg);border-radius:9px">
          <div>
            <div style="font-size:12.5px;font-weight:500">{{ s.label }}</div>
            <div style="font-size:11px;color:var(--muted)">{{ s.desc }}</div>
          </div>
          <div style="position:relative;width:40px;height:22px;flex-shrink:0;cursor:pointer" (click)="s.enabled=!s.enabled">
            <div style="position:absolute;inset:0;border-radius:20px;transition:.2s" [style.background]="s.enabled?'var(--purple)':'var(--border)'"></div>
            <div style="position:absolute;top:3px;width:16px;height:16px;background:#fff;border-radius:50%;transition:.2s;box-shadow:0 1px 3px rgba(0,0,0,.2)" [style.left]="s.enabled?'21px':'3px'"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>`,
})
export class NotificationsComponent implements OnInit {
  notifs = signal<any[]>([
    {icon:'📅',bg:'#ede9fe',title:'New booking confirmed',message:'James Okafor — Suite 1201, May 1–5',time:'2 min ago',read:false},
    {icon:'💳',bg:'#dcfce7',title:'Payment received',message:'$1,920 from James Okafor · Visa',time:'5 min ago',read:false},
    {icon:'🔧',bg:'#fef3c7',title:'Maintenance request opened',message:'Shower leak — Room 305 · High priority',time:'1h ago',read:false},
    {icon:'🚪',bg:'#fce7f3',title:'Guest checked out',message:'Tom Wilson — Room 610 · Invoice generated',time:'2h ago',read:true},
    {icon:'⚠️',bg:'#fee2e2',title:'AC malfunction reported',message:'Room 208 — Guest complaint',time:'4h ago',read:true},
    {icon:'📊',bg:'#e0f2fe',title:'Daily revenue summary',message:'$18,420 today — 115% of daily target',time:'6h ago',read:true},
  ]);
  settings = signal<any[]>([
    {label:'Booking Confirmations',desc:'New reservation alerts',enabled:true},
    {label:'Check-in / Check-out Alerts',desc:'Guest arrival and departure',enabled:true},
    {label:'Payment Notifications',desc:'Successful payments received',enabled:true},
    {label:'Maintenance Updates',desc:'Status changes on tickets',enabled:true},
    {label:'Low Occupancy Warning',desc:'Alert when below 50%',enabled:false},
    {label:'Daily Revenue Summary',desc:'End-of-day report',enabled:true},
    {label:'VIP Guest Arrivals',desc:'Gold and VIP tier guests',enabled:true},
  ]);
  ngOnInit(){}
  unreadCount(){return this.notifs().filter(n=>!n.read).length;}
  markRead(n:any){n.read=true;this.notifs.set([...this.notifs()]);}
  markAllRead(){this.notifs.set(this.notifs().map(n=>({...n,read:true})));}
}
