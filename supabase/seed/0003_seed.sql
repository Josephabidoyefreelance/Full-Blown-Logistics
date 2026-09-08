-- Seed data matching the sample data already familiar from the prototype.
-- Run after both migrations. Safe to re-run against an empty database only
-- (uses plain inserts, not upserts).

insert into roles (name, description, permitted_modules) values
  ('Super Admin','Full access to every module, including system settings and RBAC itself.',
    array['dashboard','crm','customers','shipments','fleet','drivers','warehouse','finance','hr','support','reports','admin']),
  ('Operations Manager','Runs day-to-day logistics: bookings, dispatch, fleet, drivers and warehouse.',
    array['dashboard','shipments','fleet','drivers','warehouse']),
  ('Finance Officer','Handles invoicing, expenses, payroll and financial reporting.',
    array['dashboard','finance','reports']),
  ('Customer Service','Manages leads, customer accounts and support tickets.',
    array['dashboard','crm','customers','support']),
  ('Driver','Sees only the shipments assigned to them.',
    array['shipments']);

insert into customers (name, type, contact, credit_limit, balance, status, client_since) values
  ('EricBoss Furnitures','B2B','John, 0810 612 8219', 3000000, 0, 'Active', '2024'),
  ('Arbico PLC','B2B','Franco, Ikoyi Lagos', 8000000, 1200000, 'Active', '2022'),
  ('Doyetek Industries','B2B','Ops desk, Lagos', 6000000, 0, 'Active', '2023'),
  ('Sahara Textiles','B2B','Aisha Mohammed', 1500000, 0, 'On hold', '2026');

insert into drivers (name, license_no, license_expiry, status, trips_completed, rating) values
  ('Musa Bello','FCT-DL-88214','2027-03-01','Available',142,4.8),
  ('Chidi Okafor','LAG-DL-55021','2026-11-12','On trip',98,4.6),
  ('Tunde Fashola','LAG-DL-77310','2026-08-19','Available',76,4.4),
  ('Grace Adeyemi','OGN-DL-40217','2027-01-05','Off duty',54,4.9);

insert into fleet_vehicles (plate, type, status, driver_id, next_service_date, fuel_liters, insurer)
  select 'ABJ-220-KT','Flatbed trailer','Available', id, '2026-09-14', 2100, 'AXA Mansard' from drivers where name='Musa Bello';
insert into fleet_vehicles (plate, type, status, next_service_date, fuel_liters, insurer) values
  ('KJA-441-XL','Container truck','Maintenance','2026-08-04', 1840, 'AXA Mansard');
insert into fleet_vehicles (plate, type, status, driver_id, next_service_date, fuel_liters, insurer)
  select 'LSD-118-BC','20-ton haulage','In Transit', id, '2026-10-02', 2650, 'Leadway Assurance' from drivers where name='Chidi Okafor';
insert into fleet_vehicles (plate, type, status, next_service_date, fuel_liters, insurer) values
  ('ENU-902-QP','10-ton box truck','Out of service','2026-08-20', 900, 'Leadway Assurance');
insert into fleet_vehicles (plate, type, status, driver_id, next_service_date, fuel_liters, insurer)
  select 'PHC-055-RT','Low-bed trailer','Idle', id, '2026-09-30', 3100, 'AXA Mansard' from drivers where name='Tunde Fashola';

insert into bookings (customer_id, customer_name, origin, destination, type, status, pickup_date, weight, declared_value, notes)
  select id, 'EricBoss Furnitures', 'Lagos', 'Ikoyi, Lagos', 'Air', 'Delivered', '2026-07-28', '840kg', 2100000, 'Signed by FRANCO on arrival.' from customers where name='EricBoss Furnitures';
insert into bookings (customer_id, customer_name, origin, destination, type, status, pickup_date, weight, declared_value)
  select id, 'Arbico PLC', 'Lagos', 'Port Harcourt', 'Haulage', 'Delivered', '2026-07-29', '12t', 4600000 from customers where name='Arbico PLC';
insert into bookings (customer_id, customer_name, origin, destination, type, status, pickup_date, weight, declared_value)
  select id, 'Doyetek Industries', 'Lagos', 'Kano', 'Haulage', 'In Transit', '2026-07-30', '18t', 5200000 from customers where name='Doyetek Industries';
insert into bookings (customer_id, customer_name, origin, destination, type, status, pickup_date, weight, declared_value)
  select id, 'Sahara Textiles', 'Lagos', 'Ibadan', 'Road', 'Assigned', '2026-08-01', '3.2t', 980000 from customers where name='Sahara Textiles';

insert into invoices (invoice_no, customer_id, customer_name, amount, status, invoice_date)
  select 'INV-00405', id, 'EricBoss Furnitures', 2100000, 'Paid', '2026-07-28' from customers where name='EricBoss Furnitures';
insert into invoices (invoice_no, customer_id, customer_name, amount, status, invoice_date)
  select 'INV-00406', id, 'Arbico PLC', 4600000, 'Paid', '2026-07-29' from customers where name='Arbico PLC';
insert into invoices (invoice_no, customer_id, customer_name, amount, status, invoice_date)
  select 'INV-00407', id, 'Doyetek Industries', 5200000, 'Overdue', '2026-07-14' from customers where name='Doyetek Industries';

insert into expenses (category, vendor, amount, expense_date) values
  ('Fuel','NNPC Retail Ikeja', 840000, '2026-07-30'),
  ('Maintenance','Berger Truck Parts', 310000, '2026-07-29'),
  ('Toll & levies','Lagos-Ibadan expressway', 64000, '2026-08-01');

insert into employees (name, department, role_title, status, email, phone, hired_year, gross_pay, deductions) values
  ('Oluwaseun John','Executive','Managing Director','Active','oluwaseun@jaadlogistics.com','0806 147 2153','2018', 1800000, 270000),
  ('Abidoye Joseph Damilare','Administration','Admin / Virtual Assistant','Active','admin@jaadlogistics.com','0806 147 2153','2023', 650000, 97500),
  ('Musa Bello','Operations','Long-Haul Driver','Active','musa@jaadlogistics.com','0803 000 1111','2021', 420000, 63000);

insert into inventory_items (sku, name, qty, reorder_level, location, status) values
  ('PKG-BOX-01','Heavy duty cartons', 340, 150, 'Lagos hub', 'In stock'),
  ('PKG-STR-02','Strapping rolls', 60, 80, 'Lagos hub', 'Low stock'),
  ('PKG-PLT-03','Wooden pallets', 210, 100, 'Port Harcourt yard', 'In stock');

insert into tickets (ticket_no, customer_name, subject, priority, status, channel, opened_at) values
  ('TCK-2291','Doyetek Industries','Shipment delayed at Kaduna','High','Open','WhatsApp', now()),
  ('TCK-2290','Zenith Manufacturing','Delivery address needs correction','Urgent','Open','Call', now());

insert into kb_articles (question, answer) values
  ('What services do you offer?','Truck hire, cargo transportation, interstate deliveries, heavy equipment transportation, business logistics, corporate haulage, dedicated truck services and scheduled deliveries.'),
  ('Can I track my shipment?','Yes. Every shipment gets a JAAD tracking number and status updates are available in Shipment Operations.');

-- After creating your first real user via Supabase Auth (dashboard or signUp),
-- link them to a role like this (replace the UUID with the real auth.users.id):
-- insert into profiles (id, full_name, email, role_id)
--   select '00000000-0000-0000-0000-000000000000', 'Your Name', 'you@jaadlogistics.com', id
--   from roles where name = 'Super Admin';
