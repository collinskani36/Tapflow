import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Product } from '@/types';

// ============================================================
// TYPES
// ============================================================

export interface CartItem {
  product: Product;
  quantity: number;
  variantSize?: string;
  variantPrice?: number; // the price at the time of adding (may differ from base product.price)
}

// Unique key per cart line = product id + variant size
const lineKey = (productId: string, variantSize?: string) =>
  `${productId}__${variantSize ?? 'default'}`;

interface CartContextType {
  items: CartItem[];
  totalItems: number;
  subtotal: number;
  /** Add a product, optionally with a specific variant size/price and starting quantity */
  addItem: (product: Product, options?: { variantSize?: string; variantPrice?: number; quantity?: number }) => void;
  removeItem: (productId: string, variantSize?: string) => void;
  updateQuantity: (productId: string, quantity: number, variantSize?: string) => void;
  clearCart: () => void;
}

// ============================================================
// CONTEXT
// ============================================================

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'landmark_cart';

// ============================================================
// PROVIDER
// ============================================================

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Persist to localStorage whenever items change
  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = (
    product: Product,
    options?: { variantSize?: string; variantPrice?: number; quantity?: number }
  ) => {
    const { variantSize, variantPrice, quantity = 1 } = options ?? {};
    const key = lineKey(product.id, variantSize);

    setItems((prev) => {
      const existing = prev.find(
        (i) => lineKey(i.product.id, i.variantSize) === key
      );
      if (existing) {
        return prev.map((i) =>
          lineKey(i.product.id, i.variantSize) === key
            ? { ...i, quantity: i.quantity + quantity }
            : i
        );
      }
      return [
        ...prev,
        { product, quantity, variantSize, variantPrice: variantPrice ?? product.price },
      ];
    });
  };

  const removeItem = (productId: string, variantSize?: string) => {
    const key = lineKey(productId, variantSize);
    setItems((prev) =>
      prev.filter((i) => lineKey(i.product.id, i.variantSize) !== key)
    );
  };

  const updateQuantity = (productId: string, quantity: number, variantSize?: string) => {
    if (quantity <= 0) {
      removeItem(productId, variantSize);
      return;
    }
    const key = lineKey(productId, variantSize);
    setItems((prev) =>
      prev.map((i) =>
        lineKey(i.product.id, i.variantSize) === key ? { ...i, quantity } : i
      )
    );
  };

  const clearCart = () => setItems([]);

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  // Use variantPrice when available, fall back to product.price
  const subtotal = items.reduce(
    (sum, i) => sum + (i.variantPrice ?? i.product.price) * i.quantity,
    0
  );

  return (
    <CartContext.Provider
      value={{ items, totalItems, subtotal, addItem, removeItem, updateQuantity, clearCart }}
    >
      {children}
    </CartContext.Provider>
  );
};

// ============================================================
// HOOK
// ============================================================

export const useCart = (): CartContextType => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};