'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

type CargoItemInput = {
  description: string;
  quantity: string;
  gross_weight: string;
  unit: string;
  rate_class: string;
  chargeable_weight: string;
};

export async function createCustomerBooking(formData: FormData) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'You must be signed in to book a shipment.' };
  }

  const { data: customerRow } = await supabase
    .from('customers')
    .select('name, email, phone')
    .eq('user_id', user.id)
    .maybeSingle();

  let cargoItems: CargoItemInput[] = [];
  const cargoItemsRaw = formData.get('cargo_items');
  if (cargoItemsRaw) {
    try {
      cargoItems = JSON.parse(cargoItemsRaw.toString());
    } catch {
      cargoItems = [];
    }
  }

  const insertPayload = {
    user_id: user.id,
    customer_name: customerRow?.name ?? '',
    origin: formData.get('origin')?.toString() ?? '',
    destination: formData.get('destination')?.toString() ?? '',
    type: formData.get('type')?.toString() ?? 'Road',
    pickup_date: formData.get('pickup_date')?.toString() || null,
    weight: formData.get('weight')?.toString() || null,
    declared_value: formData.get('declared_value')
      ? Number(formData.get('declared_value'))
      : null,
    sender_name: formData.get('sender_name')?.toString() || customerRow?.name || '',
    sender_phone: formData.get('sender_phone')?.toString() || customerRow?.phone || '',
    sender_email: formData.get('sender_email')?.toString() || customerRow?.email || '',
    sender_address: formData.get('sender_address')?.toString() || '',
    receiver_name: formData.get('receiver_name')?.toString() || '',
    receiver_phone: formData.get('receiver_phone')?.toString() || '',
    receiver_address: formData.get('receiver_address')?.toString() || '',
    status: 'Pending',
  };

  if (!insertPayload.origin || !insertPayload.destination || !insertPayload.pickup_date) {
    return { error: 'Origin, destination and pickup date are required.' };
  }

  const { data: booking, error } = await supabase
    .from('bookings')
    .insert(insertPayload)
    .select('id, tracking_no')
    .single();

  if (error) {
    return { error: error.message };
  }

  const validItems = cargoItems.filter((it) => it.description?.trim());
  if (validItems.length && booking) {
    const rows = validItems.map((it) => ({
      booking_id: booking.id,
      description: it.description,
      quantity: it.quantity,
      gross_weight: it.gross_weight,
      unit: it.unit,
      rate_class: it.rate_class,
      chargeable_weight: it.chargeable_weight,
    }));

    const { error: itemsError } = await supabase.from('booking_cargo_items').insert(rows);
    if (itemsError) {
      return { error: `Booking created but cargo items failed: ${itemsError.message}` };
    }
  }

  revalidatePath('/customer/dashboard');
  return { success: true, tracking_no: booking?.tracking_no ?? null };
}
