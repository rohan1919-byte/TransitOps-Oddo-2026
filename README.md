# TransitOps — Smart Transport Operations Platform

Full-stack fleet management app — vehicles, drivers, trip dispatch, maintenance,
fuel/expense tracking, and analytics, with role-based access control.

**Stack:** React (Vite) · Node.js · Express · PostgreSQL

## Prerequisites

- Node.js 18+
- PostgreSQL 14+

## Backend setup

```bash
cd backend
npm install
```

Rename `.env.example` to `.env` and set your own DB password in `DATABASE_URL`:

```env
PORT=5000
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/transitops
JWT_SECRET=transitops_super_secret_key_change_me
JWT_EXPIRES_IN=8h
CORS_ORIGIN=http://localhost:5173
```

Create the database:

```bash
createdb transitops
```

Load schema + seed data + demo users:

```bash
npm run db:init
```

(Safe to run again anytime — resets everything back to the seeded demo state.)

Start the API:

```bash
npm run dev      # http://localhost:5000
```

## Frontend setup

```bash
cd frontend
npm install
npm run dev       # http://localhost:5173
```

Vite proxies `/api/*` to `http://localhost:5000` (see `vite.config.js`).

## Demo logins

Password for every account: `Passw0rd!`

| Role | Email | Access |
|---|---|---|
| Fleet Manager | meera@transitops.in | Vehicles, Drivers, Maintenance |
| Dispatcher | raven@transitops.in | Trips |
| Safety Officer | divya@transitops.in | Drivers, Trips (view) |
| Financial Analyst | kunal@transitops.in | Fuel & Expenses, Analytics |

Role must match the account — server rejects login if the selected role doesn't
match what's actually registered for that email, even with the correct password.

## RBAC matrix

`edit` = read/write · `view` = read-only · `—` = no access

| Role | Dashboard | Fleet | Drivers | Trips | Maintenance | Fuel/Exp | Analytics | Settings |
|---|---|---|---|---|---|---|---|---|
| Fleet Manager | view | edit | edit | — | edit | — | view | — |
| Dispatcher | view | view | — | edit | — | — | — | — |
| Safety Officer | view | — | edit | view | — | — | — | — |
| Financial Analyst | view | view | — | — | — | edit | edit | — |

## Business rules

- Registration number and license number are unique.
- Retired / In Shop vehicles don't show up in the Trip Dispatcher's picker.
- Expired license or Suspended drivers can't be assigned to trips.
- Cargo weight can't exceed vehicle capacity (checked on create and dispatch).
- Dispatch → vehicle & driver go `On Trip`. Complete → both back to `Available`,
  odometer updates, fuel log gets written. Cancel → both restored.
- Maintenance log → vehicle flips to `In Shop`; closing it restores `Available`.
- Operational cost = fuel cost + maintenance cost.
- Vehicle ROI = (Revenue − (Maintenance + Fuel)) / Acquisition Cost.
- 5 failed login attempts → account locked for 15 minutes.
- Dark/light mode toggle on login page and top bar, saved in localStorage.

## CSV export

Analytics → Export CSV downloads a per-vehicle cost breakdown.