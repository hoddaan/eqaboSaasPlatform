const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
const mongoose = require('mongoose');
const connectDB = require('../config/database');

const User    = require('../models/User');
const Country = require('../models/Country');
const City    = require('../models/City');
const Company = require('../models/Company');
const Hotel   = require('../models/Hotel');
const Room    = require('../models/Room');
const Guest   = require('../models/Guest');
const Booking = require('../models/Booking');
const { MenuItem, MaintenanceRequest, Transaction } = require('../models/index');

const seed = async () => {
  await connectDB();
  console.log('🌱 Seeding Eqabo database...\n');

  await Promise.all([
    User.deleteMany({}), Country.deleteMany({}), City.deleteMany({}),
    Company.deleteMany({}), Hotel.deleteMany({}), Room.deleteMany({}),
    Guest.deleteMany({}), Booking.deleteMany({}), MenuItem.deleteMany({}),
    MaintenanceRequest.deleteMany({}), Transaction.deleteMany({}),
  ]);
  console.log('✓ Cleared existing data');

  // ── Super Admin ─────────────────────────────────────
  const superAdmin = await User.create({
    name: 'Super Admin', email: 'superadmin@eqabo.com',
    passwordHash: 'Admin@1234', role: 'SuperAdmin',
  });
  console.log('✓ Created SuperAdmin');

  // ── Countries ────────────────────────────────────────
  const countries = await Country.create([
    { name: 'United Arab Emirates', code: 'AE', currency: 'AED', timezone: 'Asia/Dubai',     flag: '🇦🇪', createdBy: superAdmin._id },
    { name: 'United Kingdom',       code: 'GB', currency: 'GBP', timezone: 'Europe/London',  flag: '🇬🇧', createdBy: superAdmin._id },
    { name: 'France',               code: 'FR', currency: 'EUR', timezone: 'Europe/Paris',   flag: '🇫🇷', createdBy: superAdmin._id },
    { name: 'Kenya',                code: 'KE', currency: 'KES', timezone: 'Africa/Nairobi', flag: '🇰🇪', createdBy: superAdmin._id },
    { name: 'United States',        code: 'US', currency: 'USD', timezone: 'America/New_York',flag:'🇺🇸', createdBy: superAdmin._id },
    { name: 'Germany',              code: 'DE', currency: 'EUR', timezone: 'Europe/Berlin',  flag: '🇩🇪', createdBy: superAdmin._id },
  ]);
  console.log(`✓ Created ${countries.length} countries`);

  const [UAE, UK, FR, KE] = countries;

  // ── Cities ───────────────────────────────────────────
  const cities = await City.create([
    { name: 'Dubai',    countryId: UAE._id, timezone: 'Asia/Dubai',     createdBy: superAdmin._id },
    { name: 'Abu Dhabi',countryId: UAE._id, timezone: 'Asia/Dubai',     createdBy: superAdmin._id },
    { name: 'London',   countryId: UK._id,  timezone: 'Europe/London',  createdBy: superAdmin._id },
    { name: 'Manchester',countryId:UK._id,  timezone: 'Europe/London',  createdBy: superAdmin._id },
    { name: 'Paris',    countryId: FR._id,  timezone: 'Europe/Paris',   createdBy: superAdmin._id },
    { name: 'Nairobi',  countryId: KE._id,  timezone: 'Africa/Nairobi', createdBy: superAdmin._id },
  ]);
  console.log(`✓ Created ${cities.length} cities`);

  const [Dubai, , London, , Paris, Nairobi] = cities;

  // ── Companies ─────────────────────────────────────────
  const companies = await Company.create([
    {
      name: 'Grand Palace Group', countryId: UAE._id, cityId: Dubai._id,
      contactEmail: 'info@grandpalacegroup.ae', createdBy: superAdmin._id,
    },
    {
      name: 'Azure Hospitality', countryId: UK._id, cityId: London._id,
      contactEmail: 'info@azurehospitality.co.uk', createdBy: superAdmin._id,
    },
    {
      name: 'Crown Resorts International', countryId: FR._id, cityId: Paris._id,
      contactEmail: 'info@crownresorts.fr', createdBy: superAdmin._id,
    },
  ]);
  console.log(`✓ Created ${companies.length} companies`);

  const [grandPalaceGroup, azureGroup, crownGroup] = companies;

  // ── Company Admins ────────────────────────────────────
  const companyAdmins = await User.create([
    { name: 'Ahmed Al-Mansouri', email: 'admin@grandpalacegroup.ae', passwordHash: 'Admin@1234', role: 'CompanyAdmin', companyId: grandPalaceGroup._id },
    { name: 'Sophie Clarke',     email: 'admin@azurehospitality.co.uk', passwordHash: 'Admin@1234', role: 'CompanyAdmin', companyId: azureGroup._id },
    { name: 'Jean-Pierre Dubois',email: 'admin@crownresorts.fr', passwordHash: 'Admin@1234', role: 'CompanyAdmin', companyId: crownGroup._id },
  ]);
  // Link admin to company
  await Company.findByIdAndUpdate(grandPalaceGroup._id, { adminUserId: companyAdmins[0]._id });
  await Company.findByIdAndUpdate(azureGroup._id,       { adminUserId: companyAdmins[1]._id });
  await Company.findByIdAndUpdate(crownGroup._id,       { adminUserId: companyAdmins[2]._id });
  console.log(`✓ Created ${companyAdmins.length} company admins`);

  // ── Hotels ────────────────────────────────────────────
  const hotels = await Hotel.create([
    { companyId: grandPalaceGroup._id, countryId: UAE._id, cityId: Dubai._id,
      name: 'Grand Palace Hotel', country: 'AE', city: 'Dubai', timezone: 'Asia/Dubai', currency: 'USD', taxRate: 5 },
    { companyId: grandPalaceGroup._id, countryId: UAE._id, cityId: cities[1]._id,
      name: 'Grand Palace Abu Dhabi', country: 'AE', city: 'Abu Dhabi', timezone: 'Asia/Dubai', currency: 'USD', taxRate: 5 },
    { companyId: azureGroup._id, countryId: UK._id, cityId: London._id,
      name: 'Azure Boutique London', country: 'GB', city: 'London', timezone: 'Europe/London', currency: 'GBP', taxRate: 20 },
    { companyId: crownGroup._id, countryId: FR._id, cityId: Paris._id,
      name: 'The Crown Resort Paris', country: 'FR', city: 'Paris', timezone: 'Europe/Paris', currency: 'EUR', taxRate: 10 },
  ]);
  console.log(`✓ Created ${hotels.length} hotels`);

  const mainHotel = hotels[0];

  // ── Hotel staff for Grand Palace Hotel ───────────────
  const staff = await User.create([
    { name: 'Khalid Hotel Admin', email: 'hoteladmin@grandpalace.ae', passwordHash: 'Admin@1234', role: 'HotelAdmin',       companyId: grandPalaceGroup._id, hotelId: mainHotel._id },
    { name: 'Sara Manager',       email: 'manager@grandpalace.ae',    passwordHash: 'Admin@1234', role: 'Manager',           companyId: grandPalaceGroup._id, hotelId: mainHotel._id },
    { name: 'Pedro Receptionist', email: 'reception@grandpalace.ae',  passwordHash: 'Admin@1234', role: 'Receptionist',      companyId: grandPalaceGroup._id, hotelId: mainHotel._id },
    { name: 'Aisha POS',          email: 'pos@grandpalace.ae',        passwordHash: 'Admin@1234', role: 'RestaurantStaff',   companyId: grandPalaceGroup._id, hotelId: mainHotel._id },
    { name: 'Kofi Technician',    email: 'tech@grandpalace.ae',       passwordHash: 'Admin@1234', role: 'Technician',        companyId: grandPalaceGroup._id, hotelId: mainHotel._id },
    { name: 'Li Wei Finance',     email: 'finance@grandpalace.ae',    passwordHash: 'Admin@1234', role: 'Finance',           companyId: grandPalaceGroup._id, hotelId: mainHotel._id },
  ]);
  console.log(`✓ Created ${staff.length} hotel staff`);

  const receptionist = staff[2];

  // ── Rooms ─────────────────────────────────────────────
  const roomTypes = [
    { type: 'single', price: 120, maxGuests: 1 },
    { type: 'double', price: 220, maxGuests: 2 },
    { type: 'twin',   price: 200, maxGuests: 2 },
    { type: 'suite',  price: 480, maxGuests: 3 },
  ];
  const statusCycle = ['available','occupied','available','reserved','maintenance'];
  const roomDocs = [];
  for (let floor = 1; floor <= 4; floor++) {
    for (let num = 1; num <= 5; num++) {
      const rt = roomTypes[(floor + num) % roomTypes.length];
      roomDocs.push({
        hotelId: mainHotel._id, roomNumber: `${floor}0${num}`,
        floor, building: floor <= 2 ? 'Main Tower' : 'Sea View Wing',
        type: rt.type, pricePerNight: rt.price, maxGuests: rt.maxGuests,
        status: statusCycle[(floor * num) % statusCycle.length],
        amenities: ['wifi', 'tv', rt.type === 'suite' ? 'jacuzzi' : 'shower'],
      });
    }
  }
  const rooms = await Room.create(roomDocs);
  console.log(`✓ Created ${rooms.length} rooms`);

  // ── Guests ────────────────────────────────────────────
  const guests = await Guest.create([
    { hotelId: mainHotel._id, firstName:'James',  lastName:'Okafor',  email:'james@email.com',  phone:'+234810000001', nationality:'NG', vipTier:'vip',     totalStays:14, totalSpend:8420 },
    { hotelId: mainHotel._id, firstName:'Sarah',  lastName:'Chen',    email:'sarah@email.com',  phone:'+447700000001', nationality:'GB', vipTier:'gold',    totalStays:6,  totalSpend:3200 },
    { hotelId: mainHotel._id, firstName:'Maria',  lastName:'Garcia',  email:'maria@gmail.com',  phone:'+34600000001',  nationality:'ES', vipTier:'vip',     totalStays:8,  totalSpend:12480 },
    { hotelId: mainHotel._id, firstName:'Ali',    lastName:'Hassan',  email:'ali@email.com',    phone:'+97150000001',  nationality:'AE', vipTier:'regular', totalStays:2,  totalSpend:520 },
  ]);
  console.log(`✓ Created ${guests.length} guests`);

  // ── Menu Items ────────────────────────────────────────
  await MenuItem.create([
    { hotelId: mainHotel._id, name:'Eggs Benedict',   category:'breakfast', price:18, preparationTime:12, allergens:['eggs','gluten'], isAvailable:true },
    { hotelId: mainHotel._id, name:'Club Sandwich',   category:'lunch',     price:22, preparationTime:10, isAvailable:true },
    { hotelId: mainHotel._id, name:'Caesar Salad',    category:'salads',    price:14, preparationTime:8,  isAvailable:true },
    { hotelId: mainHotel._id, name:'Grilled Salmon',  category:'dinner',    price:45, preparationTime:20, isAvailable:true },
    { hotelId: mainHotel._id, name:'Beef Tenderloin', category:'dinner',    price:68, preparationTime:25, isAvailable:true },
    { hotelId: mainHotel._id, name:'Cappuccino',      category:'coffee',    price:8,  preparationTime:4,  isAvailable:true },
    { hotelId: mainHotel._id, name:'Latte',           category:'coffee',    price:7,  preparationTime:4,  isAvailable:true },
    { hotelId: mainHotel._id, name:'Fresh Orange Juice', category:'drinks', price:9,  preparationTime:3,  isAvailable:true },
    { hotelId: mainHotel._id, name:'Chocolate Lava',  category:'desserts',  price:16, preparationTime:12, isAvailable:true },
  ]);
  console.log('✓ Created menu items');

  // ── Bookings ──────────────────────────────────────────
  const suiteRoom = rooms.find(r => r.type === 'suite');
  const booking = await Booking.create({
    hotelId: mainHotel._id, roomId: suiteRoom._id, guestId: guests[0]._id,
    createdByUserId: receptionist._id,
    checkIn: new Date('2026-05-01'), checkOut: new Date('2026-05-05'),
    nights: 4, adults: 2, ratePerNight: 480, totalAmount: 1920, paidAmount: 1920,
    status: 'checked_in', paymentStatus: 'paid', actualCheckIn: new Date('2026-05-01T14:00:00Z'),
  });
  console.log('✓ Created sample booking');

  // ── Maintenance ───────────────────────────────────────
  await MaintenanceRequest.create([
    { hotelId: mainHotel._id, location: 'Room 103', category: 'plumbing',    priority: 'high',   title: 'Shower leak',       reportedByUserId: receptionist._id, status: 'in_progress' },
    { hotelId: mainHotel._id, location: 'Room 202', category: 'hvac',        priority: 'medium', title: 'AC malfunction',     reportedByUserId: receptionist._id, status: 'assigned', assignedToUserId: staff[4]._id },
  ]);
  console.log('✓ Created maintenance requests');

  // ── Sample transaction ─────────────────────────────────
  await Transaction.create({
    hotelId: mainHotel._id, bookingId: booking._id, guestId: guests[0]._id,
    type: 'payment', amount: 1920, currency: 'USD', paymentMethod: 'visa',
    reference: 'VISA-1234', processedByUserId: receptionist._id,
  });
  console.log('✓ Created transactions');

  console.log('\n✅ Seeding complete!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📧 LOGIN CREDENTIALS (all passwords: Admin@1234)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔴 SuperAdmin:       superadmin@eqabo.com');
  console.log('🟠 Company Admin:    admin@grandpalacegroup.ae');
  console.log('🟡 Hotel Admin:      hoteladmin@grandpalace.ae');
  console.log('🟢 Manager:          manager@grandpalace.ae');
  console.log('🔵 Receptionist:     reception@grandpalace.ae');
  console.log('🟣 POS Staff:        pos@grandpalace.ae');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  process.exit(0);
};

seed().catch(err => { console.error('❌ Seeding failed:', err.message || err); process.exit(1); });
