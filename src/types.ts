export type OrderStatus =
  | 'pending_verification'
  | 'confirmed'
  | 'processing'
  | 'out_for_delivery'
  | 'delivered'
  | 'completed'
  | 'rejected';

export interface Product {
  id: string;
  name: string;
  category: 'spirit' | 'beer' | 'wine';
  price: number;
  image_url: string;
  is_available: boolean;
  created_at?: string;
}

export interface DeliveryLocation {
  id: string;
  name: string;
  delivery_fee: number;
  created_at?: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  price_at_time: number;
  // Present only when the query joins products, e.g.
  // .select('order_items (*, products (*))')
  products?: { name: string } | null;
}

export interface Order {
  id: string;
  phone_number: string;
  // null when the map-pin delivery flow was used instead of the dropdown
  location_id: string | null;
  location_description?: string;
  transaction_code: string;
  total_amount: number;
  status: OrderStatus;
  is_read: boolean;
  created_at: string;
  customer_id?: string | null;
  // Pin-based delivery — null when the fallback dropdown was used instead
  delivery_lat?: number | null;
  delivery_lng?: number | null;
  delivery_address?: string | null;
  distance_km?: number | null;
  is_received?: boolean;
  rating?: number | null;
  // Joined relations — only present when explicitly selected via .select()
  order_items?: OrderItem[];
  delivery_locations?: { name: string } | null;
  riders?: { id: string; name: string; phone: string } | null;
}