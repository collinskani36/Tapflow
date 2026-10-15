export type OrderStatus =
  | 'pending_verification'
  | 'confirmed'
  | 'processing'
  | 'out_for_delivery'
  | 'delivered'
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

export interface Order {
  id: string;
  phone_number: string;
  location_id: string;
  location_description?: string;
  transaction_code: string;
  total_amount: number;
  status: OrderStatus;
  is_read: boolean;
  created_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  price_at_time: number;
}