'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function createBooking(formData: FormData) {
  const supabase = await createClient();

  const customerName = String(formData.get('customer_name'));
  const origin = String(formData.get('origin'));
  const destination = String(formData.get('destination'));
  const type = String(formData.get('type'));
  const pickupDate = String(formData.get('pickup_date'));
  const weight = String(formData.get('weight') || '');
  const declaredValue = Number(formData.get('declared_value') || 0);

  const senderName = String(formData.get('sender_name') || '');
  const senderAddress = String(formData.get('sender_address') || '');
  const senderEmail = String(formData.get('sender_email') || '');
  const senderPhone = String(formData.get('sender_phone') || '');
  const receiverName = String(formData.get('receiver_name') || '');
  const receiverAddress = String(formData.get('receiver_address') || '');
  const receiverPhone = String(formData.get('receiver_phone') || '');
  const vehicleNumber = String(formData.get('vehicle_number') || '');
  const driverName = String(formData.get('driver_name') || '');
  const driverPhone = String(formData.get('driver_phone') || '');
  const checkedBy = String(formData.get('checked_by') || '');
  const dispatchedBy = String(formData.get('dispatched_by') || '');
  const declaredValueCustoms = String(formData.get('declared_value_customs') || '');
  const insuranceAmount = Number(formData.get('insurance_amount') || 0);
  const freightTerms = String(formData.get('freight_terms') || '');

  let cargoItems: {
    description: string;
    quantity: string;
    gross_weight: string;
    unit: string;
    rate_class: string;
    chargeable_weight: string;
  }[] = [];
  try {
    cargoItems = JSON.parse(String(formData.get('cargo_items') || '[]'));
  } catch {
    cargoItems = [];
  }

  // tracking_no is intentionally omitted: the bookings_set_tracking_no trigger
  // generates it server-side from pickup_date, so it can never be spoofed by the client.
  const { data: booking, error } = await supabase
    .from('bookings')
    .insert({
      customer_name: customerName,
      origin,
      destination,
      type,
      pickup_date: pickupDate,
      weight,
      declared_value: declaredValue,
      sender_name: senderName,
      sender_address: senderAddress,
      sender_email: senderEmail,
      sender_phone: senderPhone,
      receiver_name: receiverName,
      receiver_address: receiverAddress,
      receiver_phone: receiverPhone,
      vehicle_number: vehicleNumber,
      driver_name: driverName,
      driver_phone: driverPhone,
      checked_by: checkedBy,
      dispatched_by: dispatchedBy,
      declared_value_customs: declaredValueCustoms,
      insurance_amount: insuranceAmount,
      freight_terms: freightTerms,
    })
    .select('id')
    .single();

  if (error || !booking) {
    return { error: error?.message ?? 'Could not create booking' };
  }

  if (cargoItems.length > 0) {
    const rows = cargoItems
      .filter((it) => it.description?.trim())
      .map((it) => ({
        booking_id: booking.id,
        description: it.description,
        quantity: it.quantity,
        gross_weight: it.gross_weight,
        unit: it.unit,
        rate_class: it.rate_class,
        chargeable_weight: it.chargeable_weight,
      }));

    if (rows.length > 0) {
      const { error: itemsError } = await supabase.from('booking_cargo_items').insert(rows);
      if (itemsError) {
        return { error: itemsError.message };
      }
    }
  }

  revalidatePath('/shipments');
  return { error: null };
}

export async function updateBookingStatus(id: string, status: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('bookings').update({ status }).eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/shipments');
  return { error: null };
}

export async function generateInvoiceForBooking(bookingId: string) {
  const supabase = await createClient();

  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select('customer_name, type, origin, destination, declared_value')
    .eq('id', bookingId)
    .single();

  if (bookingError || !booking) {
    return { error: bookingError?.message ?? 'Booking not found', invoiceId: null };
  }

  const { data: latestInvoice } = await supabase
    .from('invoices')
    .select('invoice_no')
    .order('invoice_no', { ascending: false })
    .limit(1);

  let nextNum = 1;
  const lastNo = latestInvoice?.[0]?.invoice_no;
  if (lastNo) {
    const match = String(lastNo).match(/(\d+)$/);
    if (match) nextNum = parseInt(match[1], 10) + 1;
  }
  const invoiceNo = 'INV-' + String(nextNum).padStart(5, '0');

  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .insert({
      invoice_no: invoiceNo,
      customer_name: booking.customer_name,
      amount: booking.declared_value,
      status: 'Pending',
      invoice_date: new Date().toISOString().slice(0, 10),
      linked_booking_id: bookingId,
      posted: false,
    })
    .select('id')
    .single();

  if (invoiceError || !invoice) {
    return { error: invoiceError?.message ?? 'Could not create invoice', invoiceId: null };
  }

  const { error: itemError } = await supabase.from('invoice_items').insert({
    invoice_id: invoice.id,
    description: `${booking.type} logistics service, ${booking.origin} to ${booking.destination}`,
    amount: booking.declared_value,
  });

  if (itemError) {
    return { error: itemError.message, invoiceId: invoice.id };
  }

  revalidatePath('/shipments');
  revalidatePath('/finance');
  return { error: null, invoiceId: invoice.id as string };
}

export async function createManifest(formData: FormData) {
  const supabase = await createClient();

  const driverName = String(formData.get('driver_name') || '');
  const vehicleNumber = String(formData.get('vehicle_number') || '');
  const route = String(formData.get('route') || '');
  const manifestDate = String(formData.get('manifest_date') || new Date().toISOString().slice(0, 10));

  let bookingIds: string[] = [];
  try {
    bookingIds = JSON.parse(String(formData.get('booking_ids') || '[]'));
  } catch {
    bookingIds = [];
  }

  if (bookingIds.length === 0) {
    return { error: 'Select at least one shipment to include on this manifest.' };
  }

  const { data: latest } = await supabase
    .from('manifests')
    .select('manifest_no')
    .order('manifest_no', { ascending: false })
    .limit(1);

  let nextNum = 1;
  const lastNo = latest?.[0]?.manifest_no;
  if (lastNo) {
    const match = String(lastNo).match(/(\d+)$/);
    if (match) nextNum = parseInt(match[1], 10) + 1;
  }

  const d = new Date(manifestDate);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const manifestNo = `MNF/JAAD/${dd}${mm}/${yyyy}/${String(nextNum).padStart(3, '0')}`;

  const { data: manifest, error } = await supabase
    .from('manifests')
    .insert({
      manifest_no: manifestNo,
      driver_name: driverName,
      vehicle_number: vehicleNumber,
      route,
      manifest_date: manifestDate,
    })
    .select('id')
    .single();

  if (error || !manifest) {
    return { error: error?.message ?? 'Could not create manifest' };
  }

  const links = bookingIds.map((id) => ({ manifest_id: manifest.id, booking_id: id }));
  const { error: linkError } = await supabase.from('manifest_bookings').insert(links);
  if (linkError) {
    return { error: linkError.message };
  }

  revalidatePath('/shipments');
  return { error: null };
}

export async function recordProofOfDelivery(formData: FormData) {
  const supabase = await createClient();

  const bookingId = String(formData.get('booking_id') || '');
  const receivedBy = String(formData.get('received_by') || '');
  const recordedBy = String(formData.get('recorded_by') || '');

  if (!bookingId) {
    return { error: 'Select a shipment.' };
  }
  if (!receivedBy.trim()) {
    return { error: 'Enter who received the shipment.' };
  }

  const { error } = await supabase.from('proof_of_delivery').insert({
    booking_id: bookingId,
    received_by: receivedBy,
    recorded_by: recordedBy || null,
    status: 'Pending',
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/shipments');
  return { error: null };
}

export async function updatePodStatus(id: string, status: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('proof_of_delivery').update({ status }).eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/shipments');
  return { error: null };
}

export async function createReturn(formData: FormData) {
  const supabase = await createClient();

  const bookingId = String(formData.get('booking_id') || '');
  const reason = String(formData.get('reason') || '');
  const recordedBy = String(formData.get('recorded_by') || '');

  if (!bookingId) {
    return { error: 'Select a shipment.' };
  }
  if (!reason.trim()) {
    return { error: 'Enter a reason for the return.' };
  }

  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select('tracking_no')
    .eq('id', bookingId)
    .single();

  if (bookingError || !booking) {
    return { error: bookingError?.message ?? 'Booking not found' };
  }

  const { error: insertError } = await supabase.from('returns').insert({
    booking_id: bookingId,
    tracking_no: booking.tracking_no,
    reason,
    status: 'Open',
    recorded_by: recordedBy || null,
  });

  if (insertError) {
    return { error: insertError.message };
  }

  revalidatePath('/shipments');
  return { error: null };
}

export async function updateReturnStatus(id: string, status: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('returns').update({ status }).eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/shipments');
  return { error: null };
}
