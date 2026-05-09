const mongoose = require('mongoose');

// ── MenuItem ───────────────────────────────────────────
const menuItemSchema = new mongoose.Schema({
  hotelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', required: true },
  name: { type: String, required: true, trim: true },
  category: { type: String, required: true, trim: true },
  price: { type: Number, required: true, min: 0 },
  description: { type: String },
  imageUrl: { type: String },
  isAvailable: { type: Boolean, default: true },
  preparationTime: { type: Number }, // minutes
  allergens: [{ type: String }],
  sortOrder: { type: Number, default: 0 },
}, { timestamps: true });

menuItemSchema.index({ hotelId: 1, category: 1, isAvailable: 1 });


// ── RestaurantOrder ────────────────────────────────────
const orderItemSchema = new mongoose.Schema({
  menuItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem' },
  name: { type: String, required: true },
  qty: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true },
  subtotal: { type: Number, required: true },
}, { _id: false });

const restaurantOrderSchema = new mongoose.Schema({
  hotelId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', required: true },
  orderNumber: { type: String },   // auto-generated in pre-save
  type: {
    type: String,
    enum: ['dine_in', 'takeaway', 'room_service'],
    required: true,
  },
  tableNumber: { type: String },
  roomId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Room' },
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
  staffId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [orderItemSchema],
  subtotal:    { type: Number, required: true },
  taxRate:     { type: Number, default: 5 },
  taxAmount:   { type: Number, required: true },
  totalAmount: { type: Number, required: true },
  status: {
    type: String,
    enum: ['pending', 'preparing', 'served', 'paid', 'cancelled'],
    default: 'pending',
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'room_charge', 'mobile_pay'],
  },
  discountPct:  { type: Number, default: 0 },
  discountAmt:  { type: Number, default: 0 },
  tableId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Table', default: null },
  guestName:    { type: String },
  roomNumber:   { type: String },   // for room_charge billing
  notes: { type: String },
}, { timestamps: true });

restaurantOrderSchema.index({ hotelId: 1, status: 1 });
restaurantOrderSchema.index({ hotelId: 1, createdAt: 1 });
restaurantOrderSchema.index({ bookingId: 1 });

restaurantOrderSchema.pre('save', function (next) {
  if (this.isNew && !this.orderNumber) {
    const d = new Date();
    const ymd = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
    this.orderNumber = `ORD-${ymd}-${Math.floor(Math.random()*9000+1000)}`;
  }
  next();
});


// ── Invoice ────────────────────────────────────────────
const lineItemSchema = new mongoose.Schema({
  description: { type: String, required: true },
  qty: { type: Number, default: 1 },
  unitPrice: { type: Number, required: true },
  total: { type: Number, required: true },
}, { _id: false });

const invoiceSchema = new mongoose.Schema({
  hotelId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', required: true },
  invoiceNumber: { type: String, required: true },
  type: {
    type: String,
    enum: ['room_booking', 'restaurant', 'combined'],
    required: true,
  },
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
  orderId:   { type: mongoose.Schema.Types.ObjectId, ref: 'RestaurantOrder' },
  guestId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Guest', required: true },
  lineItems: [lineItemSchema],
  subtotal:       { type: Number, required: true },
  taxAmount:      { type: Number, required: true },
  discountAmount: { type: Number, default: 0 },
  totalAmount:    { type: Number, required: true },
  currency: { type: String, default: 'USD' },
  status: {
    type: String,
    enum: ['draft', 'issued', 'paid', 'void'],
    default: 'draft',
  },
  issuedAt: { type: Date },
  paidAt:   { type: Date },
  dueDate:  { type: Date },
  notes: { type: String },
}, { timestamps: true });

invoiceSchema.index({ hotelId: 1, invoiceNumber: 1 }, { unique: true });
invoiceSchema.index({ guestId: 1 });
invoiceSchema.index({ hotelId: 1, status: 1, issuedAt: 1 });

invoiceSchema.pre('save', function (next) {
  if (this.isNew && !this.invoiceNumber) {
    const year = new Date().getFullYear();
    this.invoiceNumber = `INV-${year}-${Math.floor(Math.random()*90000+10000)}`;
  }
  next();
});


// ── Transaction ────────────────────────────────────────
const transactionSchema = new mongoose.Schema({
  hotelId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', required: true },
  invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
  orderId:   { type: mongoose.Schema.Types.ObjectId, ref: 'RestaurantOrder' },
  guestId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Guest' },
  type: {
    type: String,
    enum: ['payment', 'refund', 'room_charge', 'adjustment'],
    required: true,
  },
  amount:   { type: Number, required: true }, // negative for refunds
  currency: { type: String, default: 'USD' },
  paymentMethod: {
    type: String,
    enum: ['cash', 'visa', 'mastercard', 'amex', 'mobile_pay', 'room_charge', 'bank_transfer'],
    required: true,
  },
  reference: { type: String }, // external gateway ref
  processedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  notes: { type: String },
}, { timestamps: true });

// Immutable — no updates allowed
transactionSchema.index({ hotelId: 1, createdAt: 1 });
transactionSchema.index({ hotelId: 1, type: 1 });
transactionSchema.index({ invoiceId: 1 });


// ── MaintenanceRequest ─────────────────────────────────
const maintenanceSchema = new mongoose.Schema({
  hotelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', required: true },
  roomId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Room' },
  location: { type: String, required: true },
  category: {
    type: String,
    enum: ['plumbing', 'electrical', 'hvac', 'furniture', 'appliance', 'structural', 'other'],
    required: true,
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
  },
  title:       { type: String, required: true },
  description: { type: String },
  reportedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  assignedToUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: {
    type: String,
    enum: ['open', 'assigned', 'in_progress', 'completed', 'cancelled'],
    default: 'open',
  },
  images: [{ type: String }],
  estimatedMinutes: { type: Number },
  scheduledDate:    { type: Date },
  startedAt:        { type: Date },
  completedAt:      { type: Date },
  resolutionNotes:  { type: String },
  costEstimate:     { type: Number, default: 0 },
  actualCost:       { type: Number, default: 0 },
  partsUsed:        [{ name: String, quantity: Number, cost: Number }],
  issueImages:      [{ type: String }],      // uploaded on create
  proofImages:      [{ type: String }],      // uploaded on complete
  affectsRoom:      { type: Boolean, default: false },
  roomStatusSet:    { type: String },   // what status we put the room in
}, { timestamps: true });

maintenanceSchema.index({ hotelId: 1, status: 1 });
maintenanceSchema.index({ assignedToUserId: 1, status: 1 });
maintenanceSchema.index({ roomId: 1, status: 1 });


// ── Leave Request ─────────────────────────────────────
const leaveSchema = new mongoose.Schema({
  hotelId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', required: true },
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type:        { type: String, enum: ['annual','sick','emergency','unpaid','maternity','other'], required: true },
  startDate:   { type: Date, required: true },
  endDate:     { type: Date, required: true },
  days:        { type: Number, required: true },
  reason:      { type: String },
  status:      { type: String, enum: ['pending','approved','rejected'], default: 'pending' },
  approvedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt:  { type: Date },
  notes:       { type: String },
}, { timestamps: true });

// ── Attendance ────────────────────────────────────────
const attendanceSchema = new mongoose.Schema({
  hotelId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', required: true },
  userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date:       { type: Date, required: true },
  checkIn:    { type: Date },
  checkOut:   { type: Date },
  status:     { type: String, enum: ['present','absent','late','half_day','holiday','off'], default: 'present' },
  hoursWorked:{ type: Number, default: 0 },
  notes:      { type: String },
}, { timestamps: true });
attendanceSchema.index({ hotelId: 1, date: -1 });
attendanceSchema.index({ userId: 1, date: -1 });


// ── Payroll ───────────────────────────────────────────
const payrollSchema = new mongoose.Schema({
  hotelId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', required: true },
  userId:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  period:        { type: String, required: true },  // e.g. "2024-05"
  month:         { type: Number, required: true },
  year:          { type: Number, required: true },
  baseSalary:    { type: Number, default: 0 },
  salaryType:    { type: String, default: 'monthly' },
  daysWorked:    { type: Number, default: 0 },
  daysAbsent:    { type: Number, default: 0 },
  overtimeHours: { type: Number, default: 0 },
  overtimeRate:  { type: Number, default: 0 },
  overtimePay:   { type: Number, default: 0 },
  bonuses:       [{ label: String, amount: Number }],
  bonusTotal:    { type: Number, default: 0 },
  deductions:    [{ label: String, amount: Number }],
  deductionTotal:{ type: Number, default: 0 },
  grossPay:      { type: Number, default: 0 },
  netPay:        { type: Number, default: 0 },
  status:        { type: String, enum: ['draft','approved','paid'], default: 'draft' },
  paidAt:        { type: Date },
  paymentMethod: { type: String, enum: ['bank','cash','cheque'], default: 'bank' },
  notes:         { type: String },
  processedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });
payrollSchema.index({ hotelId: 1, period: 1 });
payrollSchema.index({ userId: 1, period: 1 }, { unique: true });


// ── Asset ─────────────────────────────────────────────
const assetSchema = new mongoose.Schema({
  hotelId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', required: true },
  name:         { type: String, required: true },
  category:     { type: String, enum: ['cash','bank','receivable','inventory','equipment','property','vehicle','other'], default: 'equipment' },
  value:        { type: Number, required: true, default: 0 },
  purchaseDate: { type: Date },
  description:  { type: String },
  isActive:     { type: Boolean, default: true },
}, { timestamps: true });

// ── Liability ─────────────────────────────────────────
const liabilitySchema = new mongoose.Schema({
  hotelId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', required: true },
  name:       { type: String, required: true },
  category:   { type: String, enum: ['loan','payable','tax','salary','rent','utility','other'], default: 'other' },
  amount:     { type: Number, required: true, default: 0 },
  dueDate:    { type: Date },
  isPaid:     { type: Boolean, default: false },
  paidAt:     { type: Date },
  description:{ type: String },
}, { timestamps: true });

// ── Expense ───────────────────────────────────────────
const expenseSchema = new mongoose.Schema({
  hotelId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', required: true },
  title:      { type: String, required: true },
  category:   { type: String, enum: ['salary','rent','utilities','supplies','maintenance','marketing','food_beverage','equipment','other'], default: 'other' },
  amount:     { type: Number, required: true },
  date:       { type: Date, required: true, default: Date.now },
  notes:      { type: String },
  source:     { type: String, enum: ['hotel','restaurant','coffee','general'], default: 'general' },
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });


// ── Exports ────────────────────────────────────────────
// ── MenuCategory ───────────────────────────────────────
const menuCategorySchema = new mongoose.Schema({
  hotelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', required: true },
  name:    { type: String, required: true, trim: true },
  icon:    { type: String, default: '🍽' },
  sortOrder: { type: Number, default: 0 },
  isActive:  { type: Boolean, default: true },
}, { timestamps: true });
menuCategorySchema.index({ hotelId: 1, name: 1 }, { unique: true });


// ── Table ──────────────────────────────────────────────
const tableSchema = new mongoose.Schema({
  hotelId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', required: true },
  number:      { type: String, required: true },
  capacity:    { type: Number, default: 4 },
  location:    { type: String, enum: ['indoor','outdoor','bar','terrace','private'], default: 'indoor' },
  status:      { type: String, enum: ['available','occupied','reserved','cleaning'], default: 'available' },
  currentOrderId: { type: mongoose.Schema.Types.ObjectId, ref: 'RestaurantOrder', default: null },
  shape:       { type: String, enum: ['round','square','rectangle'], default: 'round' },
  isActive:    { type: Boolean, default: true },
}, { timestamps: true });

tableSchema.index({ hotelId: 1, number: 1 }, { unique: true });


// ── StoreItem (Inventory) ─────────────────────────────
const storeItemSchema = new mongoose.Schema({
  hotelId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', required: true },
  name:        { type: String, required: true },
  category:    { type: String, enum: ['beverages','food','supplies','cleaning','other'], default: 'food' },
  unit:        { type: String, default: 'pcs' },
  quantity:    { type: Number, default: 0 },
  minQuantity: { type: Number, default: 5 },  // alert threshold
  costPrice:   { type: Number, default: 0 },
  supplier:    { type: String },
  usageType:   { type: String, enum: ['kitchen','bar','coffee','bakery','general'], default: 'kitchen' },
  notes:       { type: String },
}, { timestamps: true });


// ── StoreMovement ─────────────────────────────────────
const storeMovementSchema = new mongoose.Schema({
  hotelId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', required: true },
  itemId:      { type: mongoose.Schema.Types.ObjectId, ref: 'StoreItem', required: true },
  itemName:    { type: String, required: true },
  type:        { type: String, enum: ['in','out'], required: true },
  reason:      { type: String, enum: ['purchase','return','kitchen','waste','adjustment','other'], required: true },
  quantity:    { type: Number, required: true, min: 0.01 },
  unitCost:    { type: Number, default: 0 },
  totalCost:   { type: Number, default: 0 },
  supplier:    { type: String },
  reference:   { type: String },   // invoice/PO number
  notes:       { type: String },
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  destination: { type: String, enum: ['kitchen','bar','coffee','bakery','waste','supplier','general'], default: 'kitchen' },
  balanceAfter:{ type: Number },
}, { timestamps: true });

storeMovementSchema.index({ hotelId: 1, createdAt: -1 });
storeMovementSchema.index({ itemId: 1, createdAt: -1 });


module.exports = {
  MenuItem:           mongoose.model('MenuItem', menuItemSchema),
  MenuCategory:       mongoose.model('MenuCategory', menuCategorySchema),
  Table:              mongoose.model('Table', tableSchema),
  StoreItem:          mongoose.model('StoreItem', storeItemSchema),
  StoreMovement:      mongoose.model('StoreMovement', storeMovementSchema),
  RestaurantOrder:    mongoose.model('RestaurantOrder', restaurantOrderSchema),
  Invoice:            mongoose.model('Invoice', invoiceSchema),
  Transaction:        mongoose.model('Transaction', transactionSchema),
  MaintenanceRequest: mongoose.model('MaintenanceRequest', maintenanceSchema),
  Leave:              mongoose.model('Leave', leaveSchema),
  Attendance:         mongoose.model('Attendance', attendanceSchema),
  Payroll:            mongoose.model('Payroll', payrollSchema),
  Asset:              mongoose.model('Asset', assetSchema),
  Liability:          mongoose.model('Liability', liabilitySchema),
  Expense:            mongoose.model('Expense', expenseSchema),
};
