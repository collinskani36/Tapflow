import { useEffect, useState, useRef } from 'react';
import { Wine, Search, X, Plus, Minus, ShoppingCart, ChevronRight } from 'lucide-react';
import Header from '@/components/Header';
import StickyCartButton from '@/components/StickyCartButton';
import { Product } from '@/types';
import { fetchProducts } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '@/context/CartContext'; // ← updated import path

// ─── Types ────────────────────────────────────────────────────────────────────

interface Variant {
  size: string;
  price: number;
}

function getVariants(product: Product): Variant[] {
  return (product as any).variants?.length
    ? (product as any).variants
    : [{ size: '750ml', price: product.price }];
}

// ─── Product Modal ────────────────────────────────────────────────────────────

const ProductModal = ({
  product,
  onClose,
}: {
  product: Product;
  onClose: () => void;
}) => {
  const variants = getVariants(product);
  const [selectedVariant, setSelectedVariant] = useState<Variant>(variants[0]);
  const [qty, setQty] = useState(1);
  const { addItem } = useCart(); // ← uses addItem, not addToCart

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const handleAdd = () => {
    addItem(product, {
      variantSize: selectedVariant.size,
      variantPrice: selectedVariant.price,
      quantity: qty,
    });
    onClose();
  };

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
      />

      {/* Sheet — slides up from bottom on mobile, centered on desktop */}
      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 md:inset-0 md:m-auto z-50 md:max-w-md md:max-h-[90vh] md:rounded-2xl rounded-t-2xl bg-background overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close pill */}
        <div className="sticky top-0 z-10 bg-background pt-3 pb-2 px-4 flex items-center justify-between border-b border-border/30">
          <div className="w-10 h-1 rounded-full bg-border mx-auto absolute left-1/2 -translate-x-1/2 top-3 md:hidden" />
          <span className="text-xs text-muted-foreground uppercase tracking-widest font-medium mt-2 md:mt-0">
            {product.category}
          </span>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-secondary text-muted-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Product image */}
          <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden bg-secondary">
            {product.image_url ? (
              <img
                src={product.image_url}
                alt={product.name}
                className="w-full h-full object-contain p-4"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Wine className="w-16 h-16 text-muted-foreground/30" />
              </div>
            )}
            {!product.is_available && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <span className="text-white font-medium text-sm tracking-wide uppercase bg-black/60 px-4 py-1.5 rounded-full">
                  Out of Stock
                </span>
              </div>
            )}
          </div>

          {/* Name */}
          <div>
            <h2 className="font-display text-2xl text-foreground leading-tight">{product.name}</h2>
            <p className="text-muted-foreground text-sm capitalize mt-1">{product.category}</p>
          </div>

          {/* Size selector */}
          {variants.length > 1 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Select size</p>
              <div className="flex flex-wrap gap-2">
                {variants.map((v) => (
                  <button
                    key={v.size}
                    onClick={() => setSelectedVariant(v)}
                    className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                      selectedVariant.size === v.size
                        ? 'gold-gradient text-primary-foreground border-transparent'
                        : 'border-border text-muted-foreground hover:border-primary/50 bg-secondary'
                    }`}
                  >
                    {v.size}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Price */}
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-display gold-text">
              KSh {selectedVariant.price.toLocaleString()}
            </span>
            {variants.length === 1 && (
              <span className="text-sm text-muted-foreground ml-1">{variants[0].size}</span>
            )}
          </div>

          {/* Quantity */}
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">Quantity</p>
            <div className="flex items-center gap-3 bg-secondary rounded-full px-1 py-1">
              <button
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-background transition-colors text-foreground"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="text-base font-display w-6 text-center">{qty}</span>
              <button
                onClick={() => setQty((q) => q + 1)}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-background transition-colors text-foreground"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Total */}
          <div className="flex items-center justify-between py-3 border-t border-border/30">
            <span className="text-muted-foreground text-sm">Total</span>
            <span className="font-display text-xl gold-text">
              KSh {(selectedVariant.price * qty).toLocaleString()}
            </span>
          </div>

          {/* Add to cart */}
          <button
            disabled={!product.is_available}
            onClick={handleAdd}
            className="w-full py-4 rounded-xl gold-gradient text-primary-foreground font-medium flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition-transform"
          >
            <ShoppingCart className="w-4 h-4" />
            Add to Cart
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

// ─── Product Card ─────────────────────────────────────────────────────────────

const ProductCard = ({
  product,
  onClick,
}: {
  product: Product;
  onClick: () => void;
}) => {
  const variants = getVariants(product);
  const minPrice = Math.min(...variants.map((v) => v.price));
  const hasMultiple = variants.length > 1;

  return (
    <motion.div
      whileTap={{ scale: 0.97 }}
      onClick={product.is_available ? onClick : undefined}
      className={`glass-card rounded-xl overflow-hidden cursor-pointer group transition-all hover:ring-1 hover:ring-primary/30 ${
        !product.is_available ? 'opacity-60 cursor-default' : ''
      }`}
    >
      {/* Image */}
      <div className="relative aspect-square bg-secondary overflow-hidden">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Wine className="w-10 h-10 text-muted-foreground/30" />
          </div>
        )}
        {!product.is_available && (
          <div className="absolute top-2 left-2">
            <span className="text-[10px] bg-destructive/80 text-white px-2 py-0.5 rounded-full font-medium uppercase tracking-wide">
              Out
            </span>
          </div>
        )}
        {hasMultiple && (
          <div className="absolute top-2 right-2">
            <span className="text-[10px] bg-black/60 text-white px-2 py-0.5 rounded-full font-medium">
              {variants.length} sizes
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium mb-0.5">
          {product.category}
        </p>
        <h3 className="font-display text-sm text-foreground leading-snug line-clamp-2 mb-2">
          {product.name}
        </h3>
        <div className="flex items-center justify-between">
          <div>
            {hasMultiple && (
              <span className="text-[10px] text-muted-foreground">from </span>
            )}
            <span className="font-display text-base gold-text">
              KSh {minPrice.toLocaleString()}
            </span>
          </div>
          {product.is_available && (
            <div className="w-7 h-7 rounded-full gold-gradient flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <ChevronRight className="w-3.5 h-3.5 text-primary-foreground" />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// ─── Shop Page ────────────────────────────────────────────────────────────────

const ShopPage = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchProducts().then((data) => {
      setProducts(data);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (showSearch) searchRef.current?.focus();
  }, [showSearch]);

  const categories = ['all', 'spirit', 'beer', 'wine'];

  const filtered = products.filter((p) => {
    const matchCat = filter === 'all' || p.category === filter;
    const matchSearch =
      !search || p.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container pb-28 md:pb-12">
        {/* Hero */}
        <section className="py-10 text-center space-y-3">
          <div className="mx-auto w-14 h-14 rounded-full gold-gradient flex items-center justify-center mb-3">
            <Wine className="w-7 h-7 text-primary-foreground" />
          </div>
          <h1 className="font-display text-4xl md:text-5xl text-foreground leading-tight">
            Tap_Flow <span className="gold-text">Wines & Spirits</span>
          </h1>
          <p className="text-muted-foreground max-w-xs mx-auto text-sm">
            Premium liquor delivered fast within Kimumu, Eldoret — right to your doorstep.
          </p>
        </section>

        {/* Search + Filter bar */}
        <div className="mb-8 space-y-3">
          {/* Search row */}
          <AnimatePresence mode="wait">
            {showSearch ? (
              <motion.div
                key="search-open"
                initial={{ opacity: 0, width: '40px' }}
                animate={{ opacity: 1, width: '100%' }}
                exit={{ opacity: 0, width: '40px' }}
                className="relative"
              >
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  ref={searchRef}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search products..."
                  className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary text-sm"
                />
                <button
                  onClick={() => {
                    setShowSearch(false);
                    setSearch('');
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="search-closed"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center justify-end"
              >
                <button
                  onClick={() => setShowSearch(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-secondary text-muted-foreground text-sm hover:text-foreground transition-colors"
                >
                  <Search className="w-4 h-4" />
                  Search
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Category pills */}
          <div className="flex gap-2 flex-wrap">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`px-4 py-1.5 rounded-full text-sm capitalize transition-all ${
                  filter === cat
                    ? 'gold-gradient text-primary-foreground font-medium shadow-sm'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                {cat === 'all' ? 'All' : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Results count */}
        {!loading && search && (
          <p className="text-sm text-muted-foreground mb-4">
            {filtered.length} result{filtered.length !== 1 ? 's' : ''} for &ldquo;{search}&rdquo;
          </p>
        )}

        {/* Products Grid */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="glass-card rounded-xl overflow-hidden animate-pulse">
                <div className="aspect-square bg-secondary" />
                <div className="p-3 space-y-2">
                  <div className="h-2 w-12 bg-secondary rounded" />
                  <div className="h-4 w-20 bg-secondary rounded" />
                  <div className="h-5 w-16 bg-secondary rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 space-y-3">
            <Wine className="w-12 h-12 mx-auto text-muted-foreground/30" />
            <p className="text-muted-foreground">
              {search ? `No results for "${search}"` : 'No products available yet.'}
            </p>
            {search ? (
              <button
                onClick={() => setSearch('')}
                className="text-sm text-primary underline underline-offset-2"
              >
                Clear search
              </button>
            ) : (
              <p className="text-sm text-muted-foreground/60">Check back soon — we're stocking up!</p>
            )}
          </div>
        ) : (
          <motion.div
            layout
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
          >
            {filtered.map((product) => (
              <motion.div key={product.id} layout>
                <ProductCard
                  product={product}
                  onClick={() => setSelectedProduct(product)}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </main>

      {/* Product detail modal */}
      <AnimatePresence>
        {selectedProduct && (
          <ProductModal
            product={selectedProduct}
            onClose={() => setSelectedProduct(null)}
          />
        )}
      </AnimatePresence>

      <StickyCartButton />
    </div>
  );
};

export default ShopPage;