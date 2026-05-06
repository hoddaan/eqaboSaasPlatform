import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BookingService } from '../../core/services/api.service';

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
<div class="page-content">
  <div class="sec-head mb20">
    <div style="font-family:'Syne',sans-serif;font-size:18px;font-weight:800">Availability Calendar</div>
    <div style="display:flex;gap:8px;align-items:center">
      <button class="btn btn-o btn-sm" (click)="prevMonth()">← Prev</button>
      <span style="font-family:'Syne',sans-serif;font-weight:700;font-size:14px;min-width:120px;text-align:center">{{ monthLabel() }}</span>
      <button class="btn btn-o btn-sm" (click)="nextMonth()">Next →</button>
    </div>
  </div>
  <div class="g65">
    <div class="card">
      <div class="cal-grid">
        <div *ngFor="let d of dayNames" class="cal-head">{{ d }}</div>
        <div *ngFor="let cell of calCells()" class="cal-day"
             [class.today]="cell.isToday"
             [class.has-booking]="cell.bookings?.length"
             [style.opacity]="cell.day?1:.3"
             (click)="cell.day && selectDay(cell)">
          <span *ngIf="cell.day">{{ cell.day }}</span>
          <div *ngFor="let b of (cell.bookings||[]).slice(0,2)"
               style="width:100%;font-size:9px;font-weight:600;padding:1px 3px;border-radius:3px;background:var(--light);color:var(--purple);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
            {{ b.guestId?.firstName }} · {{ b.roomId?.roomNumber }}
          </div>
          <div *ngIf="(cell.bookings||[]).length>2" style="font-size:9px;color:var(--muted)">+{{ cell.bookings.length-2 }} more</div>
        </div>
      </div>
    </div>
    <div class="card">
      <div class="sec-title">{{ selectedDay() ? 'Bookings on ' + selectedDayLabel() : 'Upcoming Bookings' }}</div>
      <div *ngIf="loading()" style="text-align:center;padding:20px;color:var(--muted)">Loading...</div>
      <div *ngFor="let b of displayBookings()" style="background:var(--bg);border-radius:9px;padding:10px;margin-bottom:8px;cursor:pointer" (click)="viewBooking(b)">
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <div>
            <div style="font-size:13px;font-weight:600">{{ b.guestId?.firstName }} {{ b.guestId?.lastName }}</div>
            <div style="font-size:11px;color:var(--muted)">Room {{ b.roomId?.roomNumber }} · {{ b.nights }} nights</div>
            <div style="font-size:11px;color:var(--muted)">{{ b.checkIn | date:'MMM d' }} → {{ b.checkOut | date:'MMM d' }}</div>
          </div>
          <span class="badge" [ngClass]="statusBadge(b.status)">{{ b.status | titlecase }}</span>
        </div>
      </div>
      <div *ngIf="!loading() && !displayBookings().length" style="text-align:center;padding:20px;color:var(--muted)">No bookings {{ selectedDay() ? 'on this day' : 'found' }}</div>
    </div>
  </div>
</div>`,
})
export class CalendarComponent implements OnInit {
  bookings=signal<any[]>([]);loading=signal(true);selectedDay=signal<any>(null);
  year=new Date().getFullYear();month=new Date().getMonth();
  dayNames=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  constructor(private svc:BookingService){}
  ngOnInit(){this.load();}
  load(){this.loading.set(true);
    const from=new Date(this.year,this.month,1).toISOString();
    const to=new Date(this.year,this.month+1,0).toISOString();
    this.svc.getAll({from,to,limit:100}).subscribe({next:r=>{this.bookings.set(r.data.bookings);this.loading.set(false);},error:()=>this.loading.set(false)});}
  monthLabel(){return new Date(this.year,this.month).toLocaleString('default',{month:'long',year:'numeric'});}
  prevMonth(){if(this.month===0){this.month=11;this.year--;}else this.month--;this.selectedDay.set(null);this.load();}
  nextMonth(){if(this.month===11){this.month=0;this.year++;}else this.month++;this.selectedDay.set(null);this.load();}
  calCells(){
    const firstDay=new Date(this.year,this.month,1).getDay();
    const daysInMonth=new Date(this.year,this.month+1,0).getDate();
    const today=new Date();
    const cells:any[]=Array(firstDay).fill({});
    for(let d=1;d<=daysInMonth;d++){
      const date=new Date(this.year,this.month,d);
      const bks=this.bookings().filter(b=>{
        const ci=new Date(b.checkIn);const co=new Date(b.checkOut);
        return date>=new Date(ci.getFullYear(),ci.getMonth(),ci.getDate()) && date<=new Date(co.getFullYear(),co.getMonth(),co.getDate());
      });
      cells.push({day:d,isToday:date.toDateString()===today.toDateString(),bookings:bks,date});
    }
    return cells;
  }
  selectDay(cell:any){this.selectedDay.set(cell);}
  selectedDayLabel(){const c=this.selectedDay();return c?new Date(this.year,this.month,c.day).toLocaleDateString('default',{month:'short',day:'numeric'}):'';} 
  displayBookings(){const c=this.selectedDay();if(c)return c.bookings||[];return this.bookings().slice(0,8);}
  viewBooking(b:any){alert('Booking '+b.bookingRef+' — '+b.guestId?.firstName+' '+b.guestId?.lastName);}
  statusBadge(s:string){const m:any={checked_in:'b-green',reserved:'b-blue',pending:'b-yellow',checked_out:'b-gray',cancelled:'b-red'};return m[s]||'b-gray';}
}
