-- Safe reset: removes everything the schema script creates, if it exists.
-- Safe to run even if nothing was created yet, or if only some of it was.
-- Run this BEFORE re-running 0001_schema.sql.

drop table if exists kb_articles cascade;
drop table if exists chat_messages cascade;
drop table if exists chat_threads cascade;
drop table if exists tickets cascade;
drop table if exists purchase_orders cascade;
drop table if exists inventory_items cascade;
drop table if exists leave_requests cascade;
drop table if exists applicants cascade;
drop table if exists employees cascade;
drop table if exists expense_items cascade;
drop table if exists expenses cascade;
drop table if exists invoice_items cascade;
drop table if exists invoices cascade;
drop table if exists returns cascade;
drop table if exists manifest_shipments cascade;
drop table if exists manifests cascade;
drop table if exists tracking_events cascade;
drop table if exists bookings cascade;
drop table if exists fleet_vehicles cascade;
drop table if exists drivers cascade;
drop table if exists quotation_items cascade;
drop table if exists quotations cascade;
drop table if exists lead_notes cascade;
drop table if exists leads cascade;
drop table if exists customers cascade;
drop table if exists audit_log cascade;
drop table if exists profiles cascade;
drop table if exists roles cascade;

drop sequence if exists manifest_seq;
drop sequence if exists booking_seq;

drop function if exists trg_set_tracking_no() cascade;
drop function if exists generate_tracking_no(date) cascade;
drop function if exists auth_has_module(text) cascade;
drop function if exists auth_permitted_modules() cascade;
