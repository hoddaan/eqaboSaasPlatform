import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';

const BASE = environment.apiUrl;

// ── Generic API helper ─────────────────────────────────
@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(protected http: HttpClient) {}

  protected buildParams(obj: Record<string, any>): HttpParams {
    let params = new HttpParams();
    Object.entries(obj).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        params = params.set(k, String(v));
      }
    });
    return params;
  }
}

// ── Dashboard ──────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class DashboardService extends ApiService {
  get(hotelId?: string) {
    const params = hotelId ? this.buildParams({ hotelId }) : {};
    return this.http.get<any>(`${BASE}/dashboard`, { params });
  }
}

// ── Hotels ─────────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class HotelService extends ApiService {
  getProfile(id: string)           { return this.http.get<any>(`${BASE}/hotels/${id}`); }
  updateProfile(id: string, d: any){ return this.http.put<any>(`${BASE}/hotels/${id}/profile`, d); }
  uploadImage(id: string, field: string, file: File) {
    const fd = new FormData(); fd.append('image', file);
    return this.http.post<any>(`${BASE}/hotels/${id}/images/${field}`, fd);
  }
  getAll(filters?: any)     { return this.http.get<any>(`${BASE}/hotels`, { params: this.buildParams(filters || {}) }); }
  getOne(id: string)        { return this.http.get<any>(`${BASE}/hotels/${id}`); }
  create(data: any)         { return this.http.post<any>(`${BASE}/hotels`, data); }
  update(id: string, d: any){ return this.http.put<any>(`${BASE}/hotels/${id}`, d); }
  toggle(id: string)        { return this.http.patch<any>(`${BASE}/hotels/${id}/toggle`, {}); }
  updatePlan(id: string, d: any){ return this.http.patch<any>(`${BASE}/hotels/${id}/subscription`, d); }
  getStats()                { return this.http.get<any>(`${BASE}/hotels/platform-stats`); }
}

// ── Rooms ──────────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class RoomService extends ApiService {
  getAll(filters?: any)     { return this.http.get<any>(`${BASE}/rooms`, { params: this.buildParams(filters || {}) }); }
  getStats()                { return this.http.get<any>(`${BASE}/rooms/stats`); }
  getOne(id: string)        { return this.http.get<any>(`${BASE}/rooms/${id}`); }
  create(data: any)         { return this.http.post<any>(`${BASE}/rooms`, data); }
  update(id: string, d: any){ return this.http.put<any>(`${BASE}/rooms/${id}`, d); }
  delete(id: string)        { return this.http.delete<any>(`${BASE}/rooms/${id}`); }
}

// ── Bookings ────────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class BookingService extends ApiService {
  getAll(filters?: any)      { return this.http.get<any>(`${BASE}/bookings`, { params: this.buildParams(filters || {}) }); }
  getOne(id: string)         { return this.http.get<any>(`${BASE}/bookings/${id}`); }
  create(data: any)          { return this.http.post<any>(`${BASE}/bookings`, data); }
  update(id: string, d: any) { return this.http.put<any>(`${BASE}/bookings/${id}`, d); }
}

@Injectable({ providedIn: 'root' })
export class GuestService extends ApiService {
  getAll(filters?: any)     { return this.http.get<any>(`${BASE}/guests`, { params: this.buildParams(filters || {}) }); }
  getOne(id: string)        { return this.http.get<any>(`${BASE}/guests/${id}`); }
  create(data: any)         { return this.http.post<any>(`${BASE}/guests`, data); }
  update(id: string, d: any){ return this.http.put<any>(`${BASE}/guests/${id}`, d); }
  delete(id: string)        { return this.http.delete<any>(`${BASE}/guests/${id}`); }
  addService(id: string, d: any)                   { return this.http.post<any>(`${BASE}/guests/${id}/services`, d); }
  updateService(id: string, sid: string, d: any)   { return this.http.put<any>(`${BASE}/guests/${id}/services/${sid}`, d); }
  removeService(id: string, sid: string)            { return this.http.delete<any>(`${BASE}/guests/${id}/services/${sid}`); }
  checkout(id: string, d: any)                      { return this.http.post<any>(`${BASE}/guests/${id}/checkout`, d); }
  pay(id: string, d: any)                           { return this.http.post<any>(`${BASE}/guests/${id}/pay`, d); }
}

// ── Menu & Orders ───────────────────────────────────────





// ── Finance ─────────────────────────────────────────────


// ── Users/Staff ─────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class UserService extends ApiService {
  getAll(filters?: any)     { return this.http.get<any>(`${BASE}/users`, { params: this.buildParams(filters||{}) }); }
  create(data: any)         { return this.http.post<any>(`${BASE}/users`, data); }
  update(id: string, d: any){ return this.http.put<any>(`${BASE}/users/${id}`, d); }
  deactivate(id: string)    { return this.http.delete<any>(`${BASE}/users/${id}`); }
}

// ── Countries ────────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class CountryService extends ApiService {
  getAll()                  { return this.http.get<any>(`${BASE}/countries`); }
  create(data: any)         { return this.http.post<any>(`${BASE}/countries`, data); }
  update(id: string, d: any){ return this.http.put<any>(`${BASE}/countries/${id}`, d); }
  remove(id: string)        { return this.http.delete<any>(`${BASE}/countries/${id}`); }
}

// ── Cities ────────────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class CityService extends ApiService {
  getAll(countryId?: string) { return this.http.get<any>(`${BASE}/cities`, { params: countryId ? { countryId } : {} }); }
  create(data: any)          { return this.http.post<any>(`${BASE}/cities`, data); }
  update(id: string, d: any) { return this.http.put<any>(`${BASE}/cities/${id}`, d); }
  remove(id: string)         { return this.http.delete<any>(`${BASE}/cities/${id}`); }
}

// ── Companies ────────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class CompanyService extends ApiService {
  getAll(filters?: any)          { return this.http.get<any>(`${BASE}/companies`, { params: this.buildParams(filters||{}) }); }
  getOne(id: string)             { return this.http.get<any>(`${BASE}/companies/${id}`); }
  create(data: any)              { return this.http.post<any>(`${BASE}/companies`, data); }
  update(id: string, d: any)     { return this.http.put<any>(`${BASE}/companies/${id}`, d); }
  toggle(id: string)             { return this.http.patch<any>(`${BASE}/companies/${id}/toggle`, {}); }
  getStats()                     { return this.http.get<any>(`${BASE}/companies/stats`); }
  getHotels(id: string)          { return this.http.get<any>(`${BASE}/companies/${id}/hotels`); }
  getUsers(id: string)           { return this.http.get<any>(`${BASE}/companies/${id}/users`); }
}

@Injectable({ providedIn: 'root' })
export class PartnerService extends ApiService {
  getAll()                          { return this.http.get<any>(`${BASE}/partners`); }
  create(d: any)                    { return this.http.post<any>(`${BASE}/partners`, d); }
  update(id: string, d: any)        { return this.http.put<any>(`${BASE}/partners/${id}`, d); }
  remove(id: string)                { return this.http.delete<any>(`${BASE}/partners/${id}`); }
  getPayments(f?: any)              { return this.http.get<any>(`${BASE}/partners/payments`, { params: this.buildParams(f||{}) }); }
  createPayment(d: any)             { return this.http.post<any>(`${BASE}/partners/payments`, d); }
  markPaid(id: string)              { return this.http.patch<any>(`${BASE}/partners/payments/${id}/paid`, {}); }
  sendReceipt(id: string, d: any)   { return this.http.post<any>(`${BASE}/partners/payments/${id}/send`, d); }
}

@Injectable({ providedIn: 'root' })
export class MenuService extends ApiService {
  getAll(f?: any)           { return this.http.get<any>(`${BASE}/menu`, { params: this.buildParams(f||{}) }); }
  create(d: any)            { return this.http.post<any>(`${BASE}/menu`, d); }
  update(id: string, d: any){ return this.http.put<any>(`${BASE}/menu/${id}`, d); }
  remove(id: string)        { return this.http.delete<any>(`${BASE}/menu/${id}`); }
}

@Injectable({ providedIn: 'root' })
export class OrderService extends ApiService {
  getDashboard()               { return this.http.get<any>(`${BASE}/orders/dashboard`); }
  getAll(f?: any)              { return this.http.get<any>(`${BASE}/orders`, { params: this.buildParams(f||{}) }); }
  getHistory(f?: any)          { return this.http.get<any>(`${BASE}/orders`, { params: this.buildParams({...f||{}, history:true, limit:1000}) }); }
  getOne(id: string)           { return this.http.get<any>(`${BASE}/orders/${id}`); }
  create(d: any)               { return this.http.post<any>(`${BASE}/orders`, d); }
  updateStatus(id: string, d: any) { return this.http.patch<any>(`${BASE}/orders/${id}/status`, d); }
  addItems(id: string, d: any)      { return this.http.post<any>(`${BASE}/orders/${id}/items`, d); }
  remove(id: string)           { return this.http.delete<any>(`${BASE}/orders/${id}`); }
  // Tables
  getTables()                  { return this.http.get<any>(`${BASE}/orders/tables/all`); }
  createTable(d: any)          { return this.http.post<any>(`${BASE}/orders/tables`, d); }
  updateTable(id: string, d: any) { return this.http.put<any>(`${BASE}/orders/tables/${id}`, d); }
  deleteTable(id: string)      { return this.http.delete<any>(`${BASE}/orders/tables/${id}`); }
  // Categories
  getCategories()               { return this.http.get<any>(`${BASE}/orders/categories`); }
  createCategory(d: any)        { return this.http.post<any>(`${BASE}/orders/categories`, d); }
  updateCategory(id: string, d: any) { return this.http.put<any>(`${BASE}/orders/categories/${id}`, d); }
  deleteCategory(id: string)    { return this.http.delete<any>(`${BASE}/orders/categories/${id}`); }
  // Store Movements
  getMovements(f?: any)        { return this.http.get<any>(`${BASE}/orders/store/movements`, { params: this.buildParams(f||{}) }); }
  addMovement(d: any)          { return this.http.post<any>(`${BASE}/orders/store/movements`, d); }
  // Store
  getStore()                   { return this.http.get<any>(`${BASE}/orders/store/items`); }
  createStoreItem(d: any)      { return this.http.post<any>(`${BASE}/orders/store/items`, d); }
  updateStoreItem(id: string, d: any) { return this.http.put<any>(`${BASE}/orders/store/items/${id}`, d); }
  deleteStoreItem(id: string)  { return this.http.delete<any>(`${BASE}/orders/store/items/${id}`); }
}

@Injectable({ providedIn: 'root' })
export class StaffService extends ApiService {
  getDashboard()                  { return this.http.get<any>(`${BASE}/staff/dashboard`); }
  getAll(f?: any)                 { return this.http.get<any>(`${BASE}/staff`, { params: this.buildParams(f||{}) }); }
  getOne(id: string)              { return this.http.get<any>(`${BASE}/staff/${id}`); }
  create(d: any)                  { return this.http.post<any>(`${BASE}/staff`, d); }
  update(id: string, d: any)      { return this.http.put<any>(`${BASE}/staff/${id}`, d); }
  deactivate(id: string)          { return this.http.delete<any>(`${BASE}/staff/${id}`); }
  // Leave
  getLeaves(f?: any)              { return this.http.get<any>(`${BASE}/staff/leaves/all`, { params: this.buildParams(f||{}) }); }
  createLeave(d: any)             { return this.http.post<any>(`${BASE}/staff/leaves`, d); }
  updateLeave(id: string, d: any) { return this.http.patch<any>(`${BASE}/staff/leaves/${id}`, d); }
  // Attendance
  getAttendance(f?: any)          { return this.http.get<any>(`${BASE}/staff/attendance/all`, { params: this.buildParams(f||{}) }); }
  markAttendance(d: any)          { return this.http.post<any>(`${BASE}/staff/attendance/mark`, d); }
  bulkAttendance(d: any)          { return this.http.post<any>(`${BASE}/staff/attendance/bulk`, d); }
  // Payroll
  getPayroll(f?: any)             { return this.http.get<any>(`${BASE}/staff/payroll`, { params: this.buildParams(f||{}) }); }
  generatePayroll(d: any)         { return this.http.post<any>(`${BASE}/staff/payroll/generate`, d); }
  updatePayroll(id: string, d: any){ return this.http.put<any>(`${BASE}/staff/payroll/${id}`, d); }
  approvePayroll(d: any)          { return this.http.post<any>(`${BASE}/staff/payroll/approve`, d); }
  markPayrollPaid(d: any)         { return this.http.post<any>(`${BASE}/staff/payroll/paid`, d); }
}

@Injectable({ providedIn: 'root' })
export class MaintenanceService extends ApiService {
  getDashboard()                  { return this.http.get<any>(`${BASE}/maintenance/dashboard`); }
  getAll(f?: any)                 { return this.http.get<any>(`${BASE}/maintenance`, { params: this.buildParams(f||{}) }); }
  getOne(id: string)              { return this.http.get<any>(`${BASE}/maintenance/${id}`); }
  create(d: any)                  { return this.http.post<any>(`${BASE}/maintenance`, d); }
  update(id: string, d: any)      { return this.http.put<any>(`${BASE}/maintenance/${id}`, d); }
  remove(id: string)              { return this.http.delete<any>(`${BASE}/maintenance/${id}`); }
  uploadImages(id: string, files: File[], type: string) {
    const fd = new FormData();
    files.forEach(f => fd.append('images', f));
    return this.http.post<any>(`${BASE}/maintenance/${id}/images?type=${type}`, fd);
  }
  deleteImage(id: string, url: string, type: string) {
    return this.http.delete<any>(`${BASE}/maintenance/${id}/images`, { body: { url, type } });
  }
}

@Injectable({ providedIn: 'root' })
export class FinanceService extends ApiService {
  getDashboard()                   { return this.http.get<any>(`${BASE}/finance/dashboard`); }
  getReport(f?: any)               { return this.http.get<any>(`${BASE}/finance/report`, { params: this.buildParams(f||{}) }); }
  // Invoices
  getInvoices(f?: any)             { return this.http.get<any>(`${BASE}/invoices`, { params: this.buildParams(f||{}) }); }
  createInvoice(d: any)            { return this.http.post<any>(`${BASE}/invoices`, d); }
  updateInvoice(id: string, d: any){ return this.http.put<any>(`${BASE}/invoices/${id}`, d); }
  deleteInvoice(id: string)        { return this.http.delete<any>(`${BASE}/invoices/${id}`); }
  // Transactions
  getTransactions(f?: any)         { return this.http.get<any>(`${BASE}/transactions`, { params: this.buildParams(f||{}) }); }
  createTransaction(d: any)        { return this.http.post<any>(`${BASE}/transactions`, d); }
  // Assets
  getAssets()                      { return this.http.get<any>(`${BASE}/finance/assets`); }
  createAsset(d: any)              { return this.http.post<any>(`${BASE}/finance/assets`, d); }
  updateAsset(id: string, d: any)  { return this.http.put<any>(`${BASE}/finance/assets/${id}`, d); }
  deleteAsset(id: string)          { return this.http.delete<any>(`${BASE}/finance/assets/${id}`); }
  // Liabilities
  getLiabilities()                        { return this.http.get<any>(`${BASE}/finance/liabilities`); }
  createLiability(d: any)                 { return this.http.post<any>(`${BASE}/finance/liabilities`, d); }
  updateLiability(id: string, d: any)     { return this.http.put<any>(`${BASE}/finance/liabilities/${id}`, d); }
  deleteLiability(id: string)             { return this.http.delete<any>(`${BASE}/finance/liabilities/${id}`); }
  // Expenses
  getExpenses(f?: any)                    { return this.http.get<any>(`${BASE}/finance/expenses`, { params: this.buildParams(f||{}) }); }
  createExpense(d: any)                   { return this.http.post<any>(`${BASE}/finance/expenses`, d); }
  updateExpense(id: string, d: any)       { return this.http.put<any>(`${BASE}/finance/expenses/${id}`, d); }
  deleteExpense(id: string)               { return this.http.delete<any>(`${BASE}/finance/expenses/${id}`); }
}

@Injectable({ providedIn: 'root' })
export class HallService extends ApiService {
  getDashboard()                        { return this.http.get<any>(`${BASE}/halls/dashboard`); }
  getHalls()                            { return this.http.get<any>(`${BASE}/halls`); }
  createHall(d: any)                    { return this.http.post<any>(`${BASE}/halls`, d); }
  updateHall(id: string, d: any)        { return this.http.put<any>(`${BASE}/halls/${id}`, d); }
  deleteHall(id: string)                { return this.http.delete<any>(`${BASE}/halls/${id}`); }
  getBookings(f?: any)                  { return this.http.get<any>(`${BASE}/halls/bookings`, { params: this.buildParams(f||{}) }); }
  getBooking(id: string)                { return this.http.get<any>(`${BASE}/halls/bookings/${id}`); }
  createBooking(d: any)                 { return this.http.post<any>(`${BASE}/halls/bookings`, d); }
  updateBooking(id: string, d: any)     { return this.http.put<any>(`${BASE}/halls/bookings/${id}`, d); }
  cancelBooking(id: string, d?: any)    { return this.http.delete<any>(`${BASE}/halls/bookings/${id}`, { body: d }); }
  uploadHallImages(id: string, files: File[]) {
    const fd = new FormData();
    files.forEach(f => fd.append('images', f));
    return this.http.post<any>(`${BASE}/halls/${id}/images`, fd);
  }
}
