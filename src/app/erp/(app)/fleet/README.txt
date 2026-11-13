JAAD FLEET — FINAL V3

INSTALL
Put all files into:
src/app/(app)/fleet/

FEATURES
- Active vehicles use compact responsive cards: 4 per row on xl desktop.
- Vehicles in Maintenance or Out of service disappear from the active Vehicles tab.
- Switching a vehicle to Maintenance or Out of service automatically creates an open maintenance record.
- Switching a maintenance record to Completed automatically returns the vehicle to Available and removes the active record from the Maintenance board.
- Next service date is editable directly from the vehicle card.
- Insurance company is editable directly from the vehicle card.
- Service dates automatically produce due/overdue warnings.
- Maintenance is shown as the same compact card style as Vehicles.
- Maintenance Records opens a vehicle history popup.
- Records can be printed or downloaded as an HTML file for proper filing.
- Fleet changes revalidate /fleet and /dashboard.
- Realtime refresh watches fleet_vehicles, fleet_maintenance and fleet_insurance.

IMPORTANT DATABASE COLUMNS USED
fleet_vehicles:
id, plate, type, status, next_service_date, insurer

fleet_maintenance:
id, vehicle_id, description, cost, service_date, status

fleet_insurance:
id, vehicle_id, insurer, policy_number, coverage_type, premium, start_date, expiry_date

No new unknown database columns are required by this package.
