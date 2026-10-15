import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { Product } from '@/types';
import { useCart } from '@/context/CartContext';

interface ProductCardProps {
  product: Product;
}

const ProductCard = ({ product }: ProductCardProps) => {
  const { addItem } = useCart();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card rounded-lg overflow-hidden group"
    >
      <div className="aspect-square overflow-hidden bg-secondary">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            No Image
          </div>
        )}
      </div>
      <div className="p-4 space-y-2">
        <p className="text-xs uppercase tracking-widest text-primary font-medium">{product.category}</p>
        <h3 className="font-display text-lg text-foreground leading-tight">{product.name}</h3>
        <div className="flex items-center justify-between pt-1">
          <span className="text-xl font-semibold gold-text">KSh {product.price.toLocaleString()}</span>
          <button
            onClick={() => addItem(product)}
            className="gold-gradient text-primary-foreground p-2 rounded-full hover:opacity-90 transition-opacity active:scale-95"
            aria-label={`Add ${product.name} to cart`}
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default ProductCard;
