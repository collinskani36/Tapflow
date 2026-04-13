import { Minus, Plus, Trash2 } from 'lucide-react';
import { CartItem as CartItemType } from '@/types';
import { useCart } from '@/context/CartContext';

const CartItemRow = ({ product, quantity }: CartItemType) => {
  const { updateQuantity, removeItem } = useCart();

  return (
    <div className="flex items-center gap-4 glass-card rounded-lg p-3">
      <div className="w-16 h-16 rounded-md overflow-hidden bg-secondary flex-shrink-0">
        {product.image_url ? (
          <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
            No Img
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-foreground truncate">{product.name}</h4>
        <p className="text-sm text-primary">KSh {product.price.toLocaleString()}</p>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => updateQuantity(product.id, quantity - 1)}
          className="p-1 rounded-full border border-border hover:border-primary transition-colors"
        >
          <Minus className="w-4 h-4" />
        </button>
        <span className="w-6 text-center font-medium">{quantity}</span>
        <button
          onClick={() => updateQuantity(product.id, quantity + 1)}
          className="p-1 rounded-full border border-border hover:border-primary transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button onClick={() => removeItem(product.id)} className="p-1 text-destructive hover:opacity-80 ml-1">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default CartItemRow;
