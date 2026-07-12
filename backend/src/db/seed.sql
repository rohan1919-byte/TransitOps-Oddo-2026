
INSERT INTO vehicles (reg_no, name_model, type, capacity_kg, odometer, acquisition_cost, status, region) VALUES
('GJ01AB4521', 'Van-05', 'Van', 500, 74000, 620000, 'On Trip', 'Ahmedabad'),
('GJ01AB9981', 'Truck-11', 'Truck', 5000, 182000, 2450000, 'Available', 'Vadodara'),
('GJ01AB1120', 'Mini-03', 'Mini', 1000, 66000, 410000, 'In Shop', 'Gandhinagar'),
('GJ01AB0087', 'Van-09', 'Van', 750, 241000, 540000, 'Retired', 'Ahmedabad'),
('GJ01AB3345', 'Truck-04', 'Truck', 4500, 95000, 2100000, 'On Trip', 'Anand'),
('GJ01AB7712', 'Mini-08', 'Mini', 800, 41000, 380000, 'Available', 'Ahmedabad');

INSERT INTO drivers (name, license_no, license_category, license_expiry, contact_no, safety_score, status) VALUES
('Alex Fernandes', 'DL-88213', 'LMV', '2028-12-15', '9876500001', 96, 'On Trip'),
('John Mathews', 'DL-44120', 'HMV', '2025-03-01', '9822000002', 81, 'Suspended'),
('Priya Sharma', 'DL-77031', 'LMV', '2027-08-20', '9910000003', 99, 'Available'),
('Suresh Patel', 'DL-90045', 'HMV', '2027-01-18', '9944000004', 88, 'On Trip'),
('Rakesh Modi', 'DL-55210', 'LMV', '2029-02-11', '9812340005', 92, 'Available');

INSERT INTO trips (trip_code, source, destination, vehicle_id, driver_id, cargo_weight_kg, planned_distance_km, status, eta, revenue) VALUES
('TR001', 'Gandhinagar Depot', 'Ahmedabad Hub', 1, 1, 450, 38, 'Dispatched', '45 min', 6500),
('TR002', 'Vadodara Depot', 'Surat Warehouse', 2, 3, 3200, 150, 'Completed', 'Arrived', 42000),
('TR003', 'Anand Depot', 'Nadiad Market', 5, 4, 900, 22, 'Dispatched', '18 min', 5200),
('TR006', 'Mansa Depot', 'Kalol Depot', 3, NULL, 300, 15, 'Cancelled', NULL, 0);

INSERT INTO maintenance_logs (vehicle_id, service_type, cost, service_date, status) VALUES
(1, 'Oil Change', 2500, '2026-07-05', 'In Shop'),
(2, 'Engine Repair', 18000, '2026-06-20', 'Completed'),
(3, 'Tyre Replace', 6200, '2026-07-03', 'In Shop');

INSERT INTO fuel_logs (vehicle_id, trip_id, liters, cost, log_date) VALUES
(1, 1, 42, 3950, '2026-07-05'),
(2, 2, 110, 8400, '2026-07-06'),
(3, NULL, 28, 2050, '2026-07-06');

INSERT INTO expenses (trip_id, vehicle_id, toll, other, maint_linked, status) VALUES
(1, 1, 120, 0, 0, 'Available'),
(2, 2, 340, 150, 18000, 'Completed');
