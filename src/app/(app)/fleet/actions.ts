'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function updateFleetStatus(id: string, status: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('fleet_vehicles').update({ status }).eq('id', id);
  if (error) return { error: error.message };

  if (status === 'Maintenance') {
    const { data: openRecord } = await supabase
      .from('fleet_maintenance')
      .select('id')
      .eq('vehicle_id', id)
      .neq('status', 'Completed')
      .limit(1)
      .maybeSingle();

    if (!openRecord) {
      await supabase.from('fleet_maintenance').insert({
        vehicle_id: id,
        description: 'Vehicle moved to maintenance',
        status: 'Scheduled',
        service_date: new Date().toISOString().slice(0, 10),
      });
    }
  }

  revalidatePath('/fleet');
  return { error: null };
}

export async function createVehicle(formData: FormData) {
  const supabase = await createClient();

  const plate = String(formData.get('plate') ?? '').trim();
  const type = String(formData.get('type') ?? '').trim();
  const status = String(formData.get('status') ?? 'Available');
  const next_service_date = String(formData.get('next_service_date') ?? '') || null;
  const insurer = String(formData.get('insurer') ?? '').trim() || null;

  if (!plate || !type) return { error: 'Plate and type are required.' };

  // Driver assignment is not wired up yet: the FK column name on
  // fleet_vehicles that links to drivers is unconfirmed. Tell me the
  // exact column name and I'll add an "assign driver" field here.
  const { error } = await supabase.from('fleet_vehicles').insert({
    plate,
    type,
    status,
    next_service_date,
    insurer,
  });

  if (error) return { error: error.message };
  revalidatePath('/fleet');
  return { error: null };
}

export async function createInsurancePolicy(formData: FormData) {
  const supabase = await createClient();

  const vehicle_id = String(formData.get('vehicle_id') ?? '');
  const insurer = String(formData.get('insurer') ?? '').trim();
  const policy_number = String(formData.get('policy_number') ?? '').trim() || null;
  const coverage_type = String(formData.get('coverage_type') ?? '').trim() || null;
  const premiumRaw = String(formData.get('premium') ?? '').trim();
  const premium = premiumRaw ? Number(premiumRaw) : null;
  const start_date = String(formData.get('start_date') ?? '') || null;
  const expiry_date = String(formData.get('expiry_date') ?? '') || null;

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
  return { error: null };
}

export async function createMaintenanceRecord(formData: FormData) {
  const supabase = await createClient();

  const vehicle_id = String(formData.get('vehicle_id') ?? '');
  const description = String(formData.get('description') ?? '').trim();
  const costRaw = String(formData.get('cost') ?? '').trim();
  const cost = costRaw ? Number(costRaw) : null;
  const service_date = String(formData.get('service_date') ?? '') || null;
  const status = String(formData.get('status') ?? 'Scheduled');
  const raised_by = String(formData.get('raised_by') ?? '') || null;

  if (!vehicle_id) return { error: 'Select a vehicle.' };
  if (!description) return { error: 'Description is required.' };

  const { error } = await supabase.from('fleet_maintenance').insert({
    vehicle_id,
    description,
    cost,
    service_date,
    status,
    raised_by,
  });

  if (error) return { error: error.message };
  revalidatePath('/fleet');
  return { error: null };
}

export async function updateMaintenanceStatus(id: string, status: string) {
  const supabase = await createClient();
  const { data: record, error } = await supabase
    .from('fleet_maintenance')
    .update({ status })
    .eq('id', id)
    .select('vehicle_id')
    .single();

  if (error) return { error: error.message };

  if (status === 'Completed' && record?.vehicle_id) {
    await supabase.from('fleet_vehicles').update({ status: 'Available' }).eq('id', record.vehicle_id);
  }

  revalidatePath('/fleet');
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
