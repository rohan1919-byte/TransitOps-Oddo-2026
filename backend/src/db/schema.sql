

DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS fuel_logs CASCADE;
DROP TABLE IF EXISTS maintenance_logs CASCADE;
DROP TABLE IF EXISTS trips CASCADE;
DROP TABLE IF EXISTS drivers CASCADE;
DROP TABLE IF EXISTS vehicles CASCADE;
DROP TABLE IF EXISTS users CASCADE;


-- DROP TYPE IF EXISTS user_role CASCADE;
-- DROP TYPE IF EXISTS vehicle_status CASCADE;
-- DROP TYPE IF EXISTS vehicle_type CASCADE;
-- DROP TYPE IF EXISTS driver_status CASCADE;
-- DROP TYPE IF EXISTS trip_status CASCADE;
-- DROP TYPE IF EXISTS maintenance_status CASCADE;

CREATE TYPE user_role AS ENUM ('Fleet Manager', 'Dispatcher', 'Safety Officer', 'Financial Analyst');

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(160) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role user_role NOT NULL,
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TYPE vehicle_status AS ENUM ('Available', 'On Trip', 'In Shop', 'Retired');
CREATE TYPE vehicle_type AS ENUM ('Van', 'Truck', 'Mini');

CREATE TABLE vehicles (
  id SERIAL PRIMARY KEY,
  reg_no VARCHAR(40) UNIQUE NOT NULL,
  name_model VARCHAR(120) NOT NULL,
  type vehicle_type NOT NULL,
  capacity_kg NUMERIC(10,2) NOT NULL,
  odometer NUMERIC(12,2) NOT NULL DEFAULT 0,
  acquisition_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  status vehicle_status NOT NULL DEFAULT 'Available',
  region VARCHAR(80) DEFAULT 'Ahmedabad',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);


CREATE TYPE driver_status AS ENUM ('Available', 'On Trip', 'Off Duty', 'Suspended');

CREATE TABLE drivers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  license_no VARCHAR(60) UNIQUE NOT NULL,
  license_category VARCHAR(20) NOT NULL,
  license_expiry DATE NOT NULL,
  contact_no VARCHAR(20) NOT NULL,
  safety_score NUMERIC(5,2) NOT NULL DEFAULT 100,
  status driver_status NOT NULL DEFAULT 'Available',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);


CREATE TYPE trip_status AS ENUM ('Draft', 'Dispatched', 'Completed', 'Cancelled');

CREATE TABLE trips (
  id SERIAL PRIMARY KEY,
  trip_code VARCHAR(20) UNIQUE NOT NULL,
  source VARCHAR(160) NOT NULL,
  destination VARCHAR(160) NOT NULL,
  vehicle_id INTEGER REFERENCES vehicles(id),
  driver_id INTEGER REFERENCES drivers(id),
  cargo_weight_kg NUMERIC(10,2) NOT NULL,
  planned_distance_km NUMERIC(10,2) NOT NULL,
  final_odometer NUMERIC(12,2),
  fuel_consumed_l NUMERIC(10,2),
  revenue NUMERIC(12,2) DEFAULT 0,
  status trip_status NOT NULL DEFAULT 'Draft',
  eta VARCHAR(40),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);


CREATE TYPE maintenance_status AS ENUM ('In Shop', 'Completed');

CREATE TABLE maintenance_logs (
  id SERIAL PRIMARY KEY,
  vehicle_id INTEGER REFERENCES vehicles(id) NOT NULL,
  service_type VARCHAR(120) NOT NULL,
  cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  service_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status maintenance_status NOT NULL DEFAULT 'In Shop',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);


CREATE TABLE fuel_logs (
  id SERIAL PRIMARY KEY,
  vehicle_id INTEGER REFERENCES vehicles(id) NOT NULL,
  trip_id INTEGER REFERENCES trips(id),
  liters NUMERIC(10,2) NOT NULL,
  cost NUMERIC(12,2) NOT NULL,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);


CREATE TABLE expenses (
  id SERIAL PRIMARY KEY,
  trip_id INTEGER REFERENCES trips(id),
  vehicle_id INTEGER REFERENCES vehicles(id) NOT NULL,
  toll NUMERIC(12,2) NOT NULL DEFAULT 0,
  other NUMERIC(12,2) NOT NULL DEFAULT 0,
  maint_linked NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) GENERATED ALWAYS AS (toll + other + maint_linked) STORED,
  status VARCHAR(20) NOT NULL DEFAULT 'Available',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vehicles_status ON vehicles(status);
CREATE INDEX idx_drivers_status ON drivers(status);
CREATE INDEX idx_trips_status ON trips(status);
