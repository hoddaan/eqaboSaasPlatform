const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
require('express-async-errors');

// ── Validate required env vars ─────────────────────────
const REQUIRED = ['MONGODB_URI', 'JWT_SECRET', 'JWT_REFRESH_SECRET'];
const missing  = REQUIRED.filter(k => !process.env[k]);
if (missing.length) {
  console.error('\n❌ Missing env vars:', missing.join(', '));
  console.error('   → Copy backend/.env.example to backend/.env\n');
  process.exit(1);
}

const express      = require('express');
const cors         = require('cors');
const helmet       = require('helmet');
const morgan       = require('morgan');
const mongoSanitize= require('express-mongo-sanitize');
const rateLimit    = require('express-rate-limit');

const connectDB        = require('./config/database');
const errorHandler     = require('./middleware/errorHandler');
const notFound         = require('./middleware/notFound');

// ── Route imports ──────────────────────────────────────
const authRoutes        = require('./routes/auth.routes');
const countryRoutes     = require('./routes/countries.routes');
const cityRoutes        = require('./routes/cities.routes');
const companyRoutes     = require('./routes/companies.routes');
const hotelRoutes       = require('./routes/hotels.routes');
const hallRoutes        = require('./routes/halls.routes');
const userRoutes        = require('./routes/users.routes');
const roomRoutes        = require('./routes/rooms.routes');
const bookingRoutes     = require('./routes/bookings.routes');
const guestRoutes       = require('./routes/guests.routes');
const menuRoutes        = require('./routes/menu.routes');
const orderRoutes       = require('./routes/orders.routes');
const partnerRoutes     = require('./routes/partners.routes');
const maintenanceRoutes = require('./routes/maintenance.routes');
const staffRoutes       = require('./routes/staff.routes');
const financeRoutes     = require('./routes/finance.routes');
const invoiceRoutes     = require('./routes/invoices.routes');
const transactionRoutes = require('./routes/transactions.routes');
const dashboardRoutes   = require('./routes/dashboard.routes');

const app = express();
connectDB();

app.use(helmet());
app.use(cors({
  origin: [process.env.CLIENT_URL || 'http://localhost:4200', 'http://localhost:4200'],
  credentials: true,
  exposedHeaders: ['Content-Type'],
}));
// Allow images to be loaded cross-origin
app.use('/uploads', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
});
// Serve hotel uploads
app.use('/uploads/hotel', require('express').static(require('path').join(__dirname, '../uploads/hotel')));
app.use('/uploads/halls', require('express').static(require('path').join(__dirname, '../uploads/halls')));
app.use(morgan(process.env.NODE_ENV === 'development' ? 'dev' : 'combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(mongoSanitize());

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 500 });
app.use('/api/', limiter);

const API = '/api/v1';
app.use(`${API}/auth`,         require('express-rate-limit')({ windowMs: 15*60*1000, max: 30 }), authRoutes);
app.use(`${API}/countries`,    countryRoutes);
app.use(`${API}/cities`,       cityRoutes);
app.use(`${API}/companies`,    companyRoutes);
app.use(`${API}/hotels`,       hotelRoutes);
app.use(`${API}/halls`,         hallRoutes);
app.use(`${API}/users`,        userRoutes);
app.use(`${API}/rooms`,        roomRoutes);
app.use(`${API}/bookings`,     bookingRoutes);
app.use(`${API}/guests`,       guestRoutes);
app.use(`${API}/menu`,         menuRoutes);
app.use(`${API}/orders`,       orderRoutes);
app.use(`${API}/maintenance`,  maintenanceRoutes);
app.use(`${API}/finance`,      financeRoutes);
app.use(`${API}/invoices`,     invoiceRoutes);
app.use(`${API}/transactions`, transactionRoutes);
app.use(`${API}/partners`,     partnerRoutes);
app.use(`${API}/staff`,         staffRoutes);
app.use(`${API}/dashboard`,    dashboardRoutes);

app.get('/health', (_req, res) => res.json({ success: true, message: 'Eqabo API running', env: process.env.NODE_ENV }));
app.use('/uploads', express.static(require('path').join(__dirname, '../uploads')));
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🚀 Eqabo API running on port ${PORT} [${process.env.NODE_ENV}]`);
  console.log(`   Health: http://localhost:${PORT}/health\n`);
});

module.exports = app;
