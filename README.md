# 🏨 Eqabo — Multi-Tenant Hotel SaaS Platform

> **MEAN Stack** · MongoDB · Express.js · Angular · Node.js

A production-grade, multi-tenant SaaS platform for hotel management, restaurant POS, and financial reporting — all under one Super Admin control panel.

---

## 🎨 Brand Identity

```css
background-image: linear-gradient(to right top, #051937, #32265c, #6d2a75, #ae217d, #eb1271);
```

| Color   | Hex       | Role       |
|---------|-----------|------------|
| Dark Blue | `#051937` | Primary / Sidebar |
| Navy    | `#32265c` | Secondary  |
| Purple  | `#6d2a75` | Accent     |
| Magenta | `#ae217d` | Mid        |
| Pink    | `#eb1271` | CTA / Accent |

---

## 🏗 Architecture

```
Super Admin (Platform Owner)
        │
        ├── Grand Palace Hotel (Dubai)
        │       ├── Rooms & Bookings
        │       ├── Restaurant POS
        │       ├── Finance & Reports
        │       └── Staff Management
        │
        ├── Azure Boutique (London)
        ├── The Crown Resort (Paris)
        └── Safari Lodge (Nairobi)
```

Each hotel's data is **fully isolated** via `hotelId` tenant scoping on every MongoDB query.

---

## 📁 Project Structure

```
eqabo/
├── backend/                    # Node.js + Express API
│   ├── src/
│   │   ├── config/
│   │   │   └── database.js     # MongoDB connection
│   │   ├── controllers/        # Route handlers (10 modules)
│   │   │   ├── auth/
│   │   │   ├── bookings/
│   │   │   ├── finance/
│   │   │   ├── guests/
│   │   │   ├── hotels/
│   │   │   ├── maintenance/
│   │   │   ├── orders/
│   │   │   └── rooms/
│   │   ├── middleware/
│   │   │   ├── auth.js         # JWT + Role-Based Access
│   │   │   └── errorHandler.js
│   │   ├── models/             # Mongoose schemas
│   │   │   ├── User.js
│   │   │   ├── Hotel.js
│   │   │   ├── Room.js
│   │   │   ├── Guest.js
│   │   │   ├── Booking.js
│   │   │   └── index.js        # MenuItem, Order, Invoice, Transaction, Maintenance
│   │   ├── routes/             # Express routers
│   │   ├── utils/
│   │   │   └── seeder.js       # Sample data seeder
│   │   └── server.js           # App entry point
│   ├── .env.example
│   └── package.json
│
└── frontend/                   # Angular 17 (Standalone)
    ├── src/
    │   ├── app/
    │   │   ├── core/
    │   │   │   ├── guards/     # authGuard, roleGuard
    │   │   │   ├── interceptors/ # JWT interceptor + auto-refresh
    │   │   │   └── services/   # AuthService, all API services
    │   │   ├── features/       # Lazy-loaded feature modules
    │   │   │   ├── auth/       # Login page
    │   │   │   ├── dashboard/  # Live KPI dashboard
    │   │   │   ├── super-admin/# Platform control panel
    │   │   │   ├── rooms/      # Room management + grid map
    │   │   │   ├── bookings/   # Reservations + check-in/out
    │   │   │   ├── guests/     # Guest profiles
    │   │   │   ├── pos/        # Restaurant POS
    │   │   │   ├── maintenance/# Maintenance tickets
    │   │   │   ├── staff/      # Staff management
    │   │   │   ├── finance/    # Revenue reports
    │   │   │   ├── invoices/   # Invoice management
    │   │   │   └── transactions/ # Audit log
    │   │   ├── layout/
    │   │   │   └── shell/      # Sidebar + topbar layout
    │   │   └── shared/         # Reusable components
    │   ├── environments/
    │   └── styles.css          # Global design system
    ├── angular.json
    └── package.json
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB 7+ (local or Atlas)
- Angular CLI 17+

### 1. Clone & Install

```bash
# Install root deps (for concurrent dev server)
npm install

# Install all dependencies
npm run install:all
```

### 2. Configure Backend

```bash
cd backend
cp .env.example .env
# Edit .env — set MONGODB_URI and JWT_SECRET
```

### 3. Seed the Database

```bash
cd backend
npm run seed
```

This creates:
- 3 hotels (Dubai, London, Paris)
- 7 users across all roles
- 20 rooms
- 6 guest profiles
- Sample bookings, menu items, maintenance requests, transactions

### 4. Start Development

```bash
# From project root — starts both backend (5000) and frontend (4200)
npm run dev

# Or separately:
npm run backend    # http://localhost:5000
npm run frontend   # http://localhost:4200
```

---

## 🔐 Login Credentials

| Role          | Email                          | Password    |
|---------------|--------------------------------|-------------|
| Super Admin   | superadmin@eqabo.com           | Admin@1234  |
| Hotel Admin   | admin@grandpalace.ae           | Admin@1234  |
| Manager       | manager@grandpalace.ae         | Admin@1234  |
| Receptionist  | reception@grandpalace.ae       | Admin@1234  |
| POS Staff     | pos@grandpalace.ae             | Admin@1234  |
| Technician    | tech@grandpalace.ae            | Admin@1234  |
| Finance       | finance@grandpalace.ae         | Admin@1234  |

---

## 🔌 API Reference

Base URL: `http://localhost:5000/api/v1`

### Authentication
| Method | Endpoint              | Description        |
|--------|-----------------------|--------------------|
| POST   | `/auth/login`         | Login              |
| POST   | `/auth/register`      | Register user      |
| POST   | `/auth/refresh`       | Refresh JWT token  |
| GET    | `/auth/me`            | Current user       |
| POST   | `/auth/logout`        | Logout             |

### Hotels (SuperAdmin only)
| Method | Endpoint                         | Description        |
|--------|----------------------------------|--------------------|
| GET    | `/hotels`                        | List all hotels    |
| POST   | `/hotels`                        | Create hotel       |
| GET    | `/hotels/platform-stats`         | Global stats       |
| PATCH  | `/hotels/:id/toggle`             | Enable/disable     |
| PATCH  | `/hotels/:id/subscription`       | Update plan        |

### Rooms
| Method | Endpoint            | Description          |
|--------|---------------------|----------------------|
| GET    | `/rooms`            | List rooms (filtered)|
| GET    | `/rooms/stats`      | Status breakdown     |
| POST   | `/rooms`            | Create room          |
| PUT    | `/rooms/:id`        | Update room          |

### Bookings
| Method | Endpoint                    | Description       |
|--------|-----------------------------|-------------------|
| GET    | `/bookings`                 | List bookings     |
| POST   | `/bookings`                 | Create booking    |
| GET    | `/bookings/availability`    | Check availability|
| PATCH  | `/bookings/:id/checkin`     | Check in guest    |
| PATCH  | `/bookings/:id/checkout`    | Check out guest   |
| PATCH  | `/bookings/:id/cancel`      | Cancel booking    |

### Restaurant POS
| Method | Endpoint              | Description        |
|--------|-----------------------|--------------------|
| GET    | `/menu`               | Get menu items     |
| POST   | `/orders`             | Create order       |
| PATCH  | `/orders/:id/status`  | Update status      |

### Finance
| Method | Endpoint                  | Description         |
|--------|---------------------------|---------------------|
| GET    | `/finance/report`         | Revenue report      |
| GET    | `/transactions`           | Transaction log     |
| GET    | `/invoices`               | Invoice list        |

### Dashboard
| Method | Endpoint      | Description      |
|--------|---------------|------------------|
| GET    | `/dashboard`  | KPI summary      |

---

## 👥 Role Permissions

| Role            | Hotels | Rooms | Bookings | POS | Finance | Maintenance | Staff |
|-----------------|--------|-------|----------|-----|---------|-------------|-------|
| SuperAdmin      | ✅ All | ✅    | ✅       | ✅  | ✅      | ✅          | ✅    |
| HotelAdmin      | Own    | ✅    | ✅       | ✅  | ✅      | ✅          | ✅    |
| Manager         | Own    | ✅    | ✅       | ✅  | ✅      | ✅          | View  |
| Receptionist    | —      | View  | ✅       | —   | —       | Create      | —     |
| RestaurantStaff | —      | —     | —        | ✅  | —       | —           | —     |
| Finance         | —      | —     | View     | —   | ✅      | —           | —     |
| Technician      | —      | —     | —        | —   | —       | Assigned    | —     |

---

## 🌍 Multi-Tenant Design

Every database query is scoped with `hotelId`:

```js
// ✅ Correct — tenant isolated
const rooms = await Room.find({ hotelId: req.hotelId, status: 'available' });

// ❌ Wrong — would expose all hotels' data
const rooms = await Room.find({ status: 'available' });
```

The `tenantScope` middleware sets `req.hotelId` from the JWT:
- **SuperAdmin**: can pass `?hotelId=xxx` to scope to any hotel
- **All other roles**: locked to their own `user.hotelId`

---

## 🗄 MongoDB Collections

| Collection             | Documents | Key Indexes                    |
|------------------------|-----------|--------------------------------|
| `users`                | Staff     | `email (unique)`, `hotelId+role` |
| `hotels`               | Tenants   | `slug (unique)`                |
| `rooms`                | Inventory | `hotelId+roomNumber (unique)`  |
| `bookings`             | Stays     | `hotelId+status`, `checkIn+checkOut` |
| `guests`               | Profiles  | `hotelId+email`                |
| `menuitems`            | Menu      | `hotelId+category`             |
| `restaurantorders`     | POS       | `hotelId+status`               |
| `invoices`             | Billing   | `hotelId+invoiceNumber (unique)` |
| `transactions`         | Payments  | `hotelId+createdAt` (immutable)|
| `maintenancerequests`  | Tickets   | `hotelId+status`               |

---

## 🛠 Tech Stack

**Backend**
- Node.js 22 + Express 4
- MongoDB 7 + Mongoose 8
- JWT (access + refresh tokens)
- bcryptjs password hashing
- Helmet, CORS, rate limiting, mongo-sanitize

**Frontend**
- Angular 17 (Standalone components)
- Angular Signals (reactive state)
- Lazy-loaded routes per feature
- HTTP Interceptors (auto token refresh)
- Role-based route guards

---

## 📦 Production Deployment

### Backend (e.g. Railway / Render)
```bash
cd backend
npm start
# Set environment variables in your hosting dashboard
```

### Frontend (e.g. Vercel / Netlify)
```bash
cd frontend
npm run build:prod
# Deploy the dist/eqabo-frontend/ directory
```

### Environment Variables
```
NODE_ENV=production
MONGODB_URI=mongodb+srv://...
JWT_SECRET=<32+ random chars>
JWT_REFRESH_SECRET=<32+ random chars>
CLIENT_URL=https://yourdomain.com
```

---

## 📜 License

MIT © 2026 Eqabo Platform

---

*Built with ❤️ using the MEAN Stack*
