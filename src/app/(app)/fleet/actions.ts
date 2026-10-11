'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

const VEHICLE_STATUSES = ['Available', 'In Transit', 'Maintenance', 'Out of service', 'Idle'] as const;
const MAINTENANCE_STATUSES = ['Scheduled', 'In Progress', 'Completed'] as const;

function clean(value: FormDataEntryValue | null) {
  const text = String(value ?? '').trim();
  return text || null;
}

export async function updateFleetStatus(id: string, status: string) {
  if (!id || !VEHICLE_STATUSES.includes(status as (typeof VEHICLE_STATUSES)[number])) {
    return { error: 'Invalid fleet status.' };
  }

  const supabase = await createClient();
  const { data: vehicle, error: vehicleError } = await supabase
    .from('fleet_vehicles')
    .select('id, plate, status')
    .eq('id', id)
    .single();

  if (vehicleError || !vehicle) return { error: vehicleError?.message ?? 'Vehicle not found.' };

  const { error } = await supabase.from('fleet_vehicles').update({ status }).eq('id', id);
  if (error) return { error: error.message };

  if (status === 'Maintenance' || status === 'Out of service') {
    const { data: openRecord } = await supabase
      .from('fleet_maintenance')
      .select('id, status')
      .eq('vehicle_id', id)
      .neq('status', 'Completed')
      .limit(1)
      .maybeSingle();

    if (!openRecord) {
      await supabase.from('fleet_maintenance').insert({
        vehicle_id: id,
        description: status === 'Maintenance' ? 'Vehicle moved to maintenance' : 'Vehicle moved out of service',
        status: status === 'Maintenance' ? 'In Progress' : 'Scheduled',
        service_date: new Date().toISOString().slice(0, 10),
      });
    }
  }

  if (status === 'Available' || status === 'In Transit' || status === 'Idle') {
    // A vehicle returning to operational status closes its open maintenance record.
    await supabase
      .from('fleet_maintenance')
      .update({ status: 'Completed' })
      .eq('vehicle_id', id)
      .neq('status', 'Completed');
  }

  revalidatePath('/fleet');
  revalidatePath('/dashboard');
  return { error: null };
}

export async function updateVehicleDetails(formData: FormData) {
  const supabase = await createClient();

  const id = String(formData.get('id') ?? '').trim();
  const next_service_date = clean(formData.get('next_service_date'));
  const insurer = clean(formData.get('insurer'));

  if (!id) return { error: 'Vehicle ID is required.' };

  const { error } = await supabase
    .from('fleet_vehicles')
    .update({ next_service_date, insurer })
    .eq('id', id);

  if (error) return { error: error.message };

  revalidatePath('/fleet');
  revalidatePath('/dashboard');
  return { error: null };
}

export async function createVehicle(formData: FormData) {
  const supabase = await createClient();
  const plate = String(formData.get('plate') ?? '').trim();
  const type = String(formData.get('type') ?? '').trim();
  const status = String(formData.get('status') ?? 'Available').trim();
  const next_service_date = clean(formData.get('next_service_date'));
  const insurer = clean(formData.get('insurer'));

  if (!plate || !type) return { error: 'Registration number and vehicle type are required.' };
  if (!VEHICLE_STATUSES.includes(status as (typeof VEHICLE_STATUSES)[number])) return { error: 'Invalid vehicle status.' };

  const { data: vehicle, error } = await supabase.from('fleet_vehicles').insert({
    plate,
    type,
    status,
    next_service_date,
    insurer,
  }).select('id').single();

  if (error) return { error: error.message };

  if (vehicle && (status === 'Maintenance' || status === 'Out of service')) {
    await supabase.from('fleet_maintenance').insert({
      vehicle_id: vehicle.id,
      description: status === 'Maintenance' ? 'Vehicle entered maintenance on registration' : 'Vehicle registered as out of service',
      status: status === 'Maintenance' ? 'In Progress' : 'Scheduled',
      service_date: new Date().toISOString().slice(0, 10),
    });
  }

  revalidatePath('/fleet');
  revalidatePath('/dashboard');
  return { error: null };
}

export async function createInsurancePolicy(formData: FormData) {
  const supabase = await createClient();

  const vehicle_id = String(formData.get('vehicle_id') ?? '').trim();
  const insurer = String(formData.get('insurer') ?? '').trim();
  const policy_number = clean(formData.get('policy_number'));
  const coverage_type = clean(formData.get('coverage_type'));
  const premiumRaw = String(formData.get('premium') ?? '').trim();
  const premium = premiumRaw ? Number(premiumRaw) : null;
  const start_date = clean(formData.get('start_date'));
  const expiry_date = clean(formData.get('expiry_date'));

  if (!vehicle_id) return { error: 'Select a vehicle.' };
  if (!insurer) return { error: 'Insurer is required.' };

  const { error } = await supabase.from('fleet_insurance').insert({
    vehicle_id,
    insurer,
    policy_number,
    coverage_type,
    premium,
    start_date,
    expiry_date,
  });

  if (error) return { error: error.message };
  revalidatePath('/fleet');
  revalidatePath('/dashboard');
  return { error: null };
}

export async function createMaintenanceRecord(formData: FormData) {
  const supabase = await createClient();

  const vehicle_id = String(formData.get('vehicle_id') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim();
  const costRaw = String(formData.get('cost') ?? '').trim();
  const cost = costRaw ? Number(costRaw) : null;
  const service_date = clean(formData.get('service_date'));
  const status = String(formData.get('status') ?? 'Scheduled').trim();

  if (!vehicle_id) return { error: 'Select a vehicle.' };
  if (!description) return { error: 'Work description is required.' };
  if (!MAINTENANCE_STATUSES.includes(status as (typeof MAINTENANCE_STATUSES)[number])) return { error: 'Invalid maintenance status.' };

  const { error } = await supabase.from('fleet_maintenance').insert({
    vehicle_id,
    description,
    cost,
    service_date,
    status,
  });

  if (error) return { error: error.message };

  if (status !== 'Completed') {
    await supabase.from('fleet_vehicles').update({ status: 'Maintenance' }).eq('id', vehicle_id);
  }

  revalidatePath('/fleet');
  revalidatePath('/dashboard');
  return { error: null };
}

export async function updateMaintenanceStatus(id: string, status: string) {
  if (!id || !MAINTENANCE_STATUSES.includes(status as (typeof MAINTENANCE_STATUSES)[number])) {
    return { error: 'Invalid maintenance status.' };
  }

  const supabase = await createClient();
  const { data: record, error } = await supabase
    .from('fleet_maintenance')
    .update({ status })
    .eq('id', id)
    .select('vehicle_id')
    .single();

  if (error) return { error: error.message };

  if (record?.vehicle_id) {
    if (status === 'Completed') {
      const { data: open } = await supabase
        .from('fleet_maintenance')
        .select('id')
        .eq('vehicle_id', record.vehicle_id)
        .neq('status', 'Completed')
        .limit(1);

      if (!open?.length) {
        await supabase.from('fleet_vehicles').update({ status: 'Available' }).eq('id', record.vehicle_id);
      }
    } else {
      await supabase.from('fleet_vehicles').update({ status: 'Maintenance' }).eq('id', record.vehicle_id);
    }
  }

  revalidatePath('/fleet');
  revalidatePath('/dashboard');
  return { error: null };
}

export async function getVehicleMaintenanceHistory(vehicleId: string) {
  if (!vehicleId) return { error: 'Select a vehicle.', records: [] };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('fleet_maintenance')
    .select('id, description, cost, service_date, status')
    .eq('vehicle_id', vehicleId)
    .order('service_date', { ascending: false });

  if (error) return { error: error.message, records: [] };
  return { error: null, records: data ?? [] };
}
