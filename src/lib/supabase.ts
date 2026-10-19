import { createClient } from '@supabase/supabase-js';
import { Product, DeliveryLocation, Order, OrderStatus } from '@/types';

// ============================================================
// SUPABASE CLIENT
// ============================================================
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check your .env.local file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ============================================================
// PRODUCTS
// ============================================================

export async function fetchProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('is_available', true);

  if (error) throw error;
  return data || [];
}

export async function fetchAllProducts(): Promise<Product[]> {
  const { data, error } = await supabase.from('products').select('*');
  if (error) throw error;
  return data || [];
}

export async function createProduct(
  p: Omit<Product, 'id' | 'created_at'>
): Promise<Product> {
  const { data, error } = await supabase
    .from('products')
    .insert([p])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateProduct(
  id: string,
  data: Partial<Product>
): Promise<Product> {
  const { data: updated, error } = await supabase
    .from('products')
    .update(data)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return updated;
}

export async function deleteProduct(id: string): Promise<void> {
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) throw error;
}

// ============================================================
// DELIVERY LOCATIONS
// ============================================================

export async function fetchLocations(): Promise<DeliveryLocation[]> {
  const { data, error } = await supabase.from('delivery_locations').select('*');
  if (error) throw error;
  return data || [];
}

export async function createLocation(
  l: Omit<DeliveryLocation, 'id'>
): Promise<DeliveryLocation> {
  const { data, error } = await supabase
    .from('delivery_locations')
    .insert([l])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateLocation(
  id: string,
  data: Partial<DeliveryLocation>
): Promise<DeliveryLocation> {
  const { data: updated, error } = await supabase
    .from('delivery_locations')
    .update(data)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return updated;
}

export async function deleteLocation(id: string): Promise<void> {
  const { error } = await supabase
    .from('delivery_locations')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ============================================================
// ORDERS
// ============================================================

export async function createOrder(data: {
  phone_number: string;
  location_id?: string | null; // null when the map-pin flow was used instead
  location_description?: string;
  transaction_code: string;
  customer_id?: string | null;
  // Pin-based delivery — null when the fallback dropdown was used instead
  delivery_lat?: number | null;
  delivery_lng?: number | null;
  delivery_address?: string | null;
  distance_km?: number | null;
  items: {
    product_id: string;
    quantity: number;
    size?: string | null; // which variant was chosen; the server looks the price up
    variant_price?: number | null; // legacy: only used to identify the chosen variant, never as a price
  }[];
}): Promise<Order> {
  const { data: orderId, error } = await supabase.rpc(
    'create_order_with_items',
    {
      p_phone: data.phone_number,
      p_location_id: data.location_id ?? null,
      p_location_description: data.location_description ?? null,
      p_transaction_code: data.transaction_code,
      p_items: data.items,
      p_customer_id: data.customer_id ?? null,
      p_delivery_lat: data.delivery_lat ?? null,
      p_delivery_lng: data.delivery_lng ?? null,
      p_delivery_address: data.delivery_address ?? null,
      p_distance_km: data.distance_km ?? null,
    }
  );

  if (error) {
    console.error('RPC error:', error);
    throw error;
  }

  // Customers can't read the orders table directly; load it through the tracking function.
  const { data: order, error: fetchError } = await supabase.rpc('get_order_tracking', {
    p_order_id: orderId,
  });

  if (fetchError) throw fetchError;
  if (!order) throw new Error('Order was created but could not be loaded');

  return order as Order;
}

export async function fetchOrders(): Promise<Order[]> {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      order_items (*, products (*)),
      delivery_locations (*),
      riders (id, name, phone)
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function updateOrderStatus(
  id: string,
  status: OrderStatus
): Promise<void> {
  const { error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', id);

  if (error) throw error;
}

export async function markOrderRead(id: string): Promise<void> {
  const { error } = await supabase
    .from('orders')
    .update({ is_read: true })
    .eq('id', id);

  if (error) throw error;
}
