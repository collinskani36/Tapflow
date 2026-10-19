import { supabase } from '@/lib/supabase';
import type { Order } from '@/types';

// ============================================================
// Customer-facing data access.
//
// The browser no longer reads or writes orders, customer_profiles or
// customer_saved_locations directly. Everything a customer needs goes through
// these narrow database functions (see 02_customer_rpcs.sql), which only
// expose what that customer should see.
// ============================================================

export interface CustomerProfileRow {
  id: string;
  username: string;
  email: string;
  created_at: string;
}

export interface SavedLocationRow {
  id: string;
  label: string | null;
  location_id: string | null;
  location_description: string | null;
  delivery_lat: number | null;
  delivery_lng: number | null;
  delivery_address: string | null;
  delivery_locations: { name: string; delivery_fee: number } | null;
}

// ── Orders ───────────────────────────────────────────────────

export async function getOrderTracking(orderId: string): Promise<Order | null> {
  const { data, error } = await supabase.rpc('get_order_tracking', { p_order_id: orderId });
  if (error) throw error;
  return (data as Order | null) ?? null;
}

export async function markOrderReceived(orderId: string): Promise<void> {
  const { error } = await supabase.rpc('customer_mark_received', { p_order_id: orderId });
  if (error) throw error;
}

export async function rateOrder(orderId: string, rating: number): Promise<void> {
  const { error } = await supabase.rpc('customer_rate_order', {
    p_order_id: orderId,
    p_rating: rating,
  });
  if (error) throw error;
}

export async function getCustomerOrders(customerId: string): Promise<Order[]> {
  const { data, error } = await supabase.rpc('get_customer_orders', { p_customer_id: customerId });
  if (error) throw error;
  return (data as Order[] | null) ?? [];
}

// ── Customer profile (email / username login) ────────────────

export async function getCustomerProfile(id: string): Promise<CustomerProfileRow | null> {
  const { data, error } = await supabase.rpc('get_customer_profile', { p_id: id });
  if (error) throw error;
  return (data as CustomerProfileRow | null) ?? null;
}

export async function customerSignIn(identifier: string): Promise<CustomerProfileRow | null> {
  const { data, error } = await supabase.rpc('customer_sign_in', { p_identifier: identifier });
  if (error) throw error;
  return (data as CustomerProfileRow | null) ?? null;
}

export type SignUpErrorCode = 'invalid_username' | 'invalid_email' | 'email_taken' | 'username_taken';

export async function customerSignUp(
  username: string,
  email: string
): Promise<{ profile?: CustomerProfileRow; error?: SignUpErrorCode }> {
  const { data, error } = await supabase.rpc('customer_sign_up', {
    p_username: username,
    p_email: email,
  });
  if (error) throw error;
  return (data as { profile?: CustomerProfileRow; error?: SignUpErrorCode }) ?? {};
}

// ── Saved locations ──────────────────────────────────────────

export async function getSavedLocations(customerId: string): Promise<SavedLocationRow[]> {
  const { data, error } = await supabase.rpc('get_saved_locations', { p_customer_id: customerId });
  if (error) throw error;
  return (data as SavedLocationRow[] | null) ?? [];
}

export async function addSavedLocation(params: {
  customerId: string;
  label?: string | null;
  locationId?: string | null; // zone flow
  description?: string | null;
  lat?: number | null; // pin flow
  lng?: number | null;
  address?: string | null;
}): Promise<SavedLocationRow> {
  const { data, error } = await supabase.rpc('add_saved_location', {
    p_customer_id: params.customerId,
    p_label: params.label ?? null,
    p_location_id: params.locationId ?? null,
    p_description: params.description ?? null,
    p_lat: params.lat ?? null,
    p_lng: params.lng ?? null,
    p_address: params.address ?? null,
  });
  if (error) throw error;
  return data as SavedLocationRow;
}

export async function deleteSavedLocation(customerId: string, id: string): Promise<void> {
  const { error } = await supabase.rpc('delete_saved_location', {
    p_customer_id: customerId,
    p_id: id,
  });
  if (error) throw error;
}
