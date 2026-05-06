const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const userSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    default: null, // null = SuperAdmin
  },
  hotelId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hotel',
    default: null, // null = SuperAdmin or CompanyAdmin
  },
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: 100,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
  },
  passwordHash: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 8,
    select: false,
  },
  role: {
    type: String,
    enum: ['SuperAdmin', 'CompanyAdmin', 'HotelAdmin', 'Manager', 'Receptionist', 'RestaurantStaff', 'Finance', 'Technician'],
    required: true,
  },
  isActive:     { type: Boolean, default: true },
  lastLogin:    { type: Date },
  refreshToken: { type: String, select: false },
  avatar:       { type: String },
  phone:        { type: String, trim: true },
  // HR fields
  department:   { type: String, enum: ['front_desk','housekeeping','restaurant','maintenance','security','finance','management','other'], default: 'front_desk' },
  position:     { type: String },
  employeeId:   { type: String },
  salary:       { type: Number, default: 0 },
  salaryType:   { type: String, enum: ['monthly','hourly','daily'], default: 'monthly' },
  joinDate:     { type: Date },
  shiftType:    { type: String, enum: ['morning','afternoon','night','flexible'], default: 'morning' },
  daysOff:      [{ type: String, enum: ['sun','mon','tue','wed','thu','fri','sat'] }],
  nationality:  { type: String },
  idNumber:     { type: String },
  emergencyContact: {
    name:  { type: String },
    phone: { type: String },
    relation: { type: String },
  },
  address:      { type: String },
  notes:        { type: String },
}, { timestamps: true });

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ companyId: 1, role: 1 });
userSchema.index({ hotelId: 1, role: 1 });

userSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) return next();
  this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
  next();
});

userSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.passwordHash);
};

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  delete obj.refreshToken;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
