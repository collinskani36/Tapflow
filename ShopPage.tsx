import { useEffect, useState } from 'react';
import { Wine } from 'lucide-react';
import ProductCard from '@/components/ProductCard';
import Header from '@/components/Header';
import StickyCartButton from '@/components/StickyCartButton';
import { Product } from '@/types';
import { fetchProducts } from '@/lib/supabase';

const ShopPage = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    fetchProducts().then((data) => {
      setProducts(data);
      setLoading(false);
    });
  }, []);

  const categories = ['all', 'spirit', 'beer', 'wine'];
  const filtered = filter === 'all' ? products : products.filter((p) => p.category === filter);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container pb-28 md:pb-12">
        {/* Hero */}
        <section className="py-12 text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full gold-gradient flex items-center justify-center mb-4">
            <Wine className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="font-display text-4xl md:text-5xl text-foreground">
            Landmark <span className="gold-text">Wines & Spirits</span>
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Premium liquor delivered fast within Kimumu, Eldoret — right to your doorstep.
          </p>
        </section>

        {/* Filter */}
        <div className="flex gap-2 justify-center mb-8 flex-wrap">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-4 py-2 rounded-full text-sm capitalize transition-all ${
                filter === cat
                  ? 'gold-gradient text-primary-foreground font-medium'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              {cat === 'all' ? 'All' : cat}
            </button>
          ))}
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="glass-card rounded-lg overflow-hidden animate-pulse">
                <div className="aspect-square bg-secondary" />
                <div className="p-4 space-y-2">
                  <div className="h-3 w-16 bg-secondary rounded" />
                  <div className="h-5 w-24 bg-secondary rounded" />
                  <div className="h-6 w-20 bg-secondary rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 space-y-3">
            <Wine className="w-12 h-12 mx-auto text-muted-foreground/50" />
            <p className="text-muted-foreground">No products available yet.</p>
            <p className="text-sm text-muted-foreground/70">Check back soon — we're stocking up!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </main>
      <StickyCartButton />
    </div>
  );
};

export default ShopPage;
