// src/pages/ShopPage.tsx (revamped - premium clean theme)
import { useEffect, useState, useRef } from 'react';
import { Wine, Search, X, Plus, Minus, ShoppingCart, ChevronRight, Sparkles } from 'lucide-react';
import Header from '@/components/Header';
import StickyCartButton from '@/components/StickyCartButton';
import { Product } from '@/types';
import { fetchProducts } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '@/context/CartContext';

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

// ─── Category Config ──────────────────────────────────────────────────────────

type CategoryKey = 'all' | 'whisky' | 'vodka' | 'spirit' | 'beer' | 'wine';

const CATEGORIES: { key: CategoryKey; label: string; emoji: string; match: string[] }[] = [
  { key: 'all',    label: 'All',    emoji: '✦',  match: [] },
  { key: 'whisky', label: 'Whisky', emoji: '🥃', match: ['whisky', 'whiskey', 'scotch', 'bourbon'] },
  { key: 'vodka',  label: 'Vodka',  emoji: '🍸', match: ['vodka'] },
  { key: 'spirit', label: 'Spirits', emoji: '🍶', match: ['spirit', 'gin', 'rum', 'tequila', 'brandy', 'cognac'] },
  { key: 'beer',   label: 'Beer',   emoji: '🍺', match: ['beer', 'lager', 'ale', 'stout'] },
  { key: 'wine',   label: 'Wine',   emoji: '🍷', match: ['wine', 'champagne', 'prosecco', 'rosé', 'rose'] },
];

function matchesCategory(product: Product, key: CategoryKey): boolean {
  if (key === 'all') return true;
  const cat = (product.category ?? '').toLowerCase();
  const name = (product.name ?? '').toLowerCase();
  const targets = CATEGORIES.find((c) => c.key === key)?.match ?? [];
  return targets.some((t) => cat.includes(t) || name.includes(t));
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
  const { addItem } = useCart();

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
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
        className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md"
      />

      {/* Sheet */}
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 320 }}
        className="fixed bottom-0 left-0 right-0 md:inset-0 md:m-auto z-50 md:max-w-sm md:max-h-[88vh] md:rounded-2xl rounded-t-3xl bg-background overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle — mobile only */}
        <div className="flex justify-center pt-3 pb-1 md:hidden">
          <div className="w-8 h-[3px] rounded-full bg-border" />
        </div>

        {/* Header bar */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm px-5 pt-3 pb-3 flex items-center justify-between border-b border-border/20">
          <span className="text-[11px] text-muted-foreground tracking-widest font-medium">
            {CATEGORIES.find((c) => c.key !== 'all' && c.match.some((m) => (product.category ?? '').toLowerCase().includes(m)))?.emoji ?? '🍾'}{' '}
            {product.category?.toUpperCase()}
          </span>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Product image — compact */}
          <div className="relative w-full aspect-[5/4] rounded-2xl overflow-hidden bg-secondary/40">
            {product.image_url ? (
              <>
                <img
                  src={product.image_url}
                  alt={product.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-contain p-5"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                    (e.currentTarget.nextSibling as HTMLElement).style.display = 'flex';
                  }}
                />
                <div className="w-full h-full items-center justify-center absolute inset-0" style={{ display: 'none' }}>
                  <Wine className="w-12 h-12 text-muted-foreground/20" />
                </div>
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Wine className="w-12 h-12 text-muted-foreground/20" />
              </div>
            )}
            {!product.is_available && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-2xl">
                <span className="text-white font-medium text-xs tracking-widest uppercase bg-black/60 px-4 py-1.5 rounded-full">
                  Out of Stock
                </span>
              </div>
            )}
          </div>

          {/* Name + price row */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-xl text-foreground leading-tight">{product.name}</h2>
              <p className="text-muted-foreground text-xs capitalize mt-0.5">{product.category}</p>
            </div>
            <div className="text-right shrink-0">
              <span className="font-display text-2xl gold-text">
                KSh {selectedVariant.price.toLocaleString()}
              </span>
              {variants.length === 1 && (
                <p className="text-[10px] text-muted-foreground">{variants[0].size}</p>
              )}
            </div>
          </div>

          {/* Size selector */}
          {variants.length > 1 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Size</p>
              <div className="flex flex-wrap gap-1.5">
                {variants.map((v) => (
                  <button
                    key={v.size}
                    onClick={() => setSelectedVariant(v)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      selectedVariant.size === v.size
                        ? 'gold-gradient text-primary-foreground border-transparent'
                        : 'border-border/60 text-muted-foreground hover:border-primary/40 bg-secondary/50'
                    }`}
                  >
                    {v.size}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity + Total row */}
          <div className="flex items-center justify-between bg-secondary/40 rounded-2xl px-4 py-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="w-7 h-7 rounded-full bg-background border border-border/40 flex items-center justify-center hover:border-primary/40 transition-colors"
              >
                <Minus className="w-3 h-3 text-foreground" />
              </button>
              <span className="text-base font-display w-5 text-center">{qty}</span>
              <button
                onClick={() => setQty((q) => q + 1)}
                className="w-7 h-7 rounded-full bg-background border border-border/40 flex items-center justify-center hover:border-primary/40 transition-colors"
              >
                <Plus className="w-3 h-3 text-foreground" />
              </button>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground mb-0.5">Total</p>
              <span className="font-display text-lg gold-text">
                KSh {(selectedVariant.price * qty).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Add to cart */}
          <button
            disabled={!product.is_available}
            onClick={handleAdd}
            className="w-full py-3.5 rounded-2xl gold-gradient text-primary-foreground font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition-transform"
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
  const categoryEmoji = CATEGORIES.find(
    (c) => c.key !== 'all' && c.match.some((m) => (product.category ?? '').toLowerCase().includes(m))
  )?.emoji ?? '';

  return (
    <motion.div
      whileTap={{ scale: 0.97 }}
      onClick={product.is_available ? onClick : undefined}
      className={`group relative rounded-2xl overflow-hidden border border-border/30 bg-card transition-all duration-200 hover:border-primary/25 hover:shadow-[0_4px_20px_rgba(0,0,0,0.15)] ${
        !product.is_available ? 'opacity-55 cursor-default' : 'cursor-pointer'
      }`}
    >
      {/* Image — tighter aspect ratio */}
      <div className="relative aspect-[4/3] bg-secondary/30 overflow-hidden">
        {product.image_url ? (
          <>
            <img
              src={product.image_url}
              alt={product.name}
              referrerPolicy="no-referrer"
              className="w-full h-full object-contain p-3 transition-transform duration-300 group-hover:scale-[1.04]"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
                (e.currentTarget.nextSibling as HTMLElement).style.display = 'flex';
              }}
            />
            <div className="w-full h-full items-center justify-center absolute inset-0" style={{ display: 'none' }}>
              <Wine className="w-8 h-8 text-muted-foreground/20" />
            </div>
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Wine className="w-8 h-8 text-muted-foreground/20" />
          </div>
        )}

        {/* Emoji badge — top left */}
        {categoryEmoji && (
          <div className="absolute top-1.5 left-1.5 text-xs leading-none">
            {categoryEmoji}
          </div>
        )}

        {!product.is_available && (
          <div className="absolute inset-0 bg-black/45 flex items-center justify-center">
            <span className="text-white text-[9px] font-medium uppercase tracking-widest bg-black/50 px-2 py-0.5 rounded-full">
              Sold Out
            </span>
          </div>
        )}
      </div>

      {/* Info — minimal */}
      <div className="px-3 py-2.5">
        <h3 className="font-display text-[13px] text-foreground leading-snug line-clamp-1 mb-1">
          {product.name}
        </h3>
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-0.5">
            {hasMultiple && (
              <span className="text-[9px] text-muted-foreground mr-0.5">from</span>
            )}
            <span className="font-display text-sm gold-text">
              KSh {minPrice.toLocaleString()}
            </span>
          </div>
          {product.is_available && (
            <div className="w-5 h-5 rounded-full gold-gradient flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <ChevronRight className="w-2.5 h-2.5 text-primary-foreground" />
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
  const [filter, setFilter] = useState<CategoryKey>('all');
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

  const filtered = products.filter((p) => {
    const matchCat = matchesCategory(p, filter);
    const matchSearch =
      !search || p.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container pb-28 md:pb-12">

        {/* ── Hero — tight and precise ──────────────────────────────────────── */}
        <section className="relative pt-10 pb-8 md:pt-14 md:pb-10 text-center overflow-hidden">
          {/* Soft ambient glow */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-32 rounded-full bg-primary/6 blur-3xl" />
          </div>

          {/* Eyebrow */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-1.5 mb-4"
          >
            <span className="gold-text text-xs">✦</span>
            <span className="text-[11px] tracking-[0.18em] text-muted-foreground font-medium">
              Action
            </span>
            <span className="gold-text text-xs">✦</span>
          </motion.div>

          {/* Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.08 }}
            className="font-display text-3xl md:text-5xl text-foreground leading-tight tracking-tight mb-2"
          >
            Cheers{' '}
            <span className="gold-text">Wines & Spirits</span>
          </motion.h1>

          {/* Ornament line */}
          <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ duration: 0.45, delay: 0.2 }}
            className="flex items-center justify-center gap-3 mt-3 mb-3"
          >
            <div className="h-px w-10 bg-gradient-to-r from-transparent to-primary/35" />
            <Wine className="w-3.5 h-3.5 gold-text opacity-70" />
            <div className="h-px w-10 bg-gradient-to-l from-transparent to-primary/35" />
          </motion.div>

          {/* Tagline */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.28 }}
            className="text-muted-foreground text-xs max-w-[220px] mx-auto leading-relaxed"
          >
            Premium liquor, cold &amp; delivered fast.
          </motion.p>
        </section>

        {/* ── Search + Filter ───────────────────────────────────────────────── */}
        <div className="mb-6 space-y-3">
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
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input
                  ref={searchRef}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search products..."
                  className="w-full pl-9 pr-10 py-2.5 rounded-2xl bg-secondary/60 border border-border/40 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 text-sm"
                />
                <button
                  onClick={() => { setShowSearch(false); setSearch(''); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
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
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary/60 border border-border/30 text-muted-foreground text-xs hover:text-foreground transition-colors"
                >
                  <Search className="w-3.5 h-3.5" />
                  Search
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Category pills — smaller, cleaner */}
          <div className="flex gap-1.5 flex-wrap">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setFilter(cat.key)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs transition-all duration-150 ${
                  filter === cat.key
                    ? 'gold-gradient text-primary-foreground font-medium shadow-sm'
                    : 'bg-secondary/50 border border-border/30 text-muted-foreground hover:text-foreground hover:border-primary/25'
                }`}
              >
                <span className="text-sm leading-none">{cat.emoji}</span>
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Results count ─────────────────────────────────────────────────── */}
        {!loading && search && (
          <p className="text-xs text-muted-foreground mb-4">
            {filtered.length} result{filtered.length !== 1 ? 's' : ''} for &ldquo;{search}&rdquo;
          </p>
        )}

        {/* ── Products Grid — tighter, 3-col on mobile ──────────────────────── */}
        {loading ? (
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
            {[...Array(9)].map((_, i) => (
              <div key={i} className="rounded-2xl overflow-hidden border border-border/20 animate-pulse">
                <div className="aspect-[4/3] bg-secondary/60" />
                <div className="p-2.5 space-y-1.5">
                  <div className="h-2.5 w-3/4 bg-secondary rounded" />
                  <div className="h-3 w-1/2 bg-secondary rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 space-y-3">
            <Wine className="w-10 h-10 mx-auto text-muted-foreground/25" />
            <p className="text-sm text-muted-foreground">
              {search ? `No results for "${search}"` : 'Nothing here yet.'}
            </p>
            {search ? (
              <button
                onClick={() => setSearch('')}
                className="text-xs text-primary underline underline-offset-2"
              >
                Clear search
              </button>
            ) : (
              <p className="text-xs text-muted-foreground/50">Check back soon — we're stocking up.</p>
            )}
          </div>
        ) : (
          <motion.div layout className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
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