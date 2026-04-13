import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, ChevronDown, ChevronUp, PlusCircle, X } from 'lucide-react';
import { Product } from '@/types';
import { fetchAllProducts, createProduct, updateProduct, deleteProduct } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Types ────────────────────────────────────────────────────────────────────

type SizeOption = '250ml' | '375ml' | '500ml' | '750ml' | '1L' | '1.5L' | '2L' | 'Custom';

interface Variant {
  size: SizeOption | string;
  price: number;
}

interface ProductForm {
  name: string;
  category: 'spirit' | 'beer' | 'wine';
  image_url: string;
  is_available: boolean;
  variants: Variant[];
}

const SIZE_OPTIONS: SizeOption[] = ['250ml', '375ml', '500ml', '750ml', '1L', '1.5L', '2L', 'Custom'];

const emptyVariant = (): Variant => ({ size: '750ml', price: 0 });

const emptyForm: ProductForm = {
  name: '',
  category: 'spirit',
  image_url: '',
  is_available: true,
  variants: [emptyVariant()],
};

// ─── Variant Row ──────────────────────────────────────────────────────────────

const VariantRow = ({
  variant,
  index,
  onChange,
  onRemove,
  canRemove,
}: {
  variant: Variant;
  index: number;
  onChange: (index: number, field: keyof Variant, value: string | number) => void;
  onRemove: (index: number) => void;
  canRemove: boolean;
}) => {
  const isCustom = !SIZE_OPTIONS.slice(0, -1).includes(variant.size as SizeOption);

  return (
    <div className="flex items-center gap-2">
      {/* Size selector */}
      <select
        value={isCustom ? 'Custom' : variant.size}
        onChange={(e) => {
          if (e.target.value !== 'Custom') {
            onChange(index, 'size', e.target.value);
          } else {
            onChange(index, 'size', '');
          }
        }}
        className="px-3 py-2 rounded-lg bg-secondary border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary text-sm min-w-[100px]"
      >
        {SIZE_OPTIONS.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>

      {/* Custom size input */}
      {isCustom && (
        <input
          placeholder="e.g. 330ml"
          value={variant.size}
          onChange={(e) => onChange(index, 'size', e.target.value)}
          className="px-3 py-2 rounded-lg bg-secondary border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary text-sm w-24"
        />
      )}

      {/* Price */}
      <div className="relative flex-1">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-medium">KSh</span>
        <input
          type="number"
          required
          min={0}
          placeholder="Price"
          value={variant.price || ''}
          onChange={(e) => onChange(index, 'price', Number(e.target.value))}
          className="w-full pl-10 pr-3 py-2 rounded-lg bg-secondary border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary text-sm"
        />
      </div>

      {/* Remove */}
      {canRemove && (
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const AdminProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = () => fetchAllProducts().then(setProducts);
  useEffect(() => { load(); }, []);

  // ── Variant helpers ──
  const updateVariant = (index: number, field: keyof Variant, value: string | number) => {
    const updated = form.variants.map((v, i) =>
      i === index ? { ...v, [field]: value } : v
    );
    setForm({ ...form, variants: updated });
  };

  const addVariant = () => {
    // Pick a size not yet used, or default to 750ml
    const usedSizes = new Set(form.variants.map((v) => v.size));
    const nextSize = SIZE_OPTIONS.find((s) => s !== 'Custom' && !usedSizes.has(s)) ?? '750ml';
    setForm({ ...form, variants: [...form.variants, { size: nextSize, price: 0 }] });
  };

  const removeVariant = (index: number) => {
    setForm({ ...form, variants: form.variants.filter((_, i) => i !== index) });
  };

  // ── Submit ──
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // We'll store variants as JSON in a `variants` field, and keep `price`
    // as the lowest variant price for backward compat.
    const minPrice = Math.min(...form.variants.map((v) => v.price));

    const payload = {
      name: form.name,
      category: form.category,
      image_url: form.image_url,
      is_available: form.is_available,
      price: minPrice,
      variants: form.variants, // your Supabase column should support jsonb
    };

    if (editId) {
      await updateProduct(editId, payload);
    } else {
      await createProduct(payload);
    }

    setForm(emptyForm);
    setEditId(null);
    setShowForm(false);
    load();
  };

  const startEdit = (p: Product) => {
    const variants: Variant[] =
      (p as any).variants?.length
        ? (p as any).variants
        : [{ size: '750ml', price: p.price }];

    setForm({
      name: p.name,
      category: p.category,
      image_url: p.image_url,
      is_available: p.is_available,
      variants,
    });
    setEditId(p.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this product?')) return;
    await deleteProduct(id);
    load();
  };

  const toggleStock = async (p: Product) => {
    await updateProduct(p.id, { is_available: !p.is_available });
    load();
  };

  // ── Render ──
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="font-display text-xl text-foreground">Products</h2>
        <button
          onClick={() => {
            setForm(emptyForm);
            setEditId(null);
            setShowForm(!showForm);
          }}
          className="flex items-center gap-1 px-3 py-2 rounded-lg gold-gradient text-primary-foreground text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Add Product
        </button>
      </div>

      {/* ── Add / Edit Form ── */}
      <AnimatePresence>
        {showForm && (
          <motion.form
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            onSubmit={handleSubmit}
            className="glass-card rounded-lg p-4 space-y-4 overflow-hidden"
          >
            {/* Brand name */}
            <input
              required
              placeholder="Brand name (e.g. Kenya Cane)"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />

            {/* Category + Image URL */}
            <div className="grid grid-cols-2 gap-3">
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as any })}
                className="px-3 py-2 rounded-lg bg-secondary border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="spirit">Spirit</option>
                <option value="beer">Beer</option>
                <option value="wine">Wine</option>
              </select>
              <input
                placeholder="Image URL"
                value={form.image_url}
                onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                className="px-3 py-2 rounded-lg bg-secondary border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Sizes / Variants */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">Sizes & Prices</p>
                <span className="text-xs text-muted-foreground">Add all available bottle sizes</span>
              </div>

              <div className="space-y-2">
                {form.variants.map((v, i) => (
                  <VariantRow
                    key={i}
                    variant={v}
                    index={i}
                    onChange={updateVariant}
                    onRemove={removeVariant}
                    canRemove={form.variants.length > 1}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={addVariant}
                className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors mt-1"
              >
                <PlusCircle className="w-4 h-4" />
                Add another size
              </button>
            </div>

            {/* Availability toggle */}
            <label className="flex items-center gap-2 cursor-pointer select-none w-fit">
              <div
                onClick={() => setForm({ ...form, is_available: !form.is_available })}
                className={`relative w-10 h-5 rounded-full transition-colors ${form.is_available ? 'bg-success' : 'bg-border'}`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.is_available ? 'translate-x-5' : ''}`}
                />
              </div>
              <span className="text-sm text-muted-foreground">
                {form.is_available ? 'In Stock' : 'Out of Stock'}
              </span>
            </label>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                type="submit"
                className="px-4 py-2 rounded-lg gold-gradient text-primary-foreground text-sm font-medium"
              >
                {editId ? 'Update' : 'Add'} Product
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setEditId(null); }}
                className="px-4 py-2 rounded-lg border border-border text-muted-foreground text-sm"
              >
                Cancel
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* ── Product List ── */}
      {products.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">
          No products added yet. Add your first product above.
        </p>
      ) : (
        <div className="space-y-2">
          {products.map((p) => {
            const variants: Variant[] =
              (p as any).variants?.length
                ? (p as any).variants
                : [{ size: '750ml', price: p.price }];
            const isExpanded = expandedId === p.id;

            return (
              <div key={p.id} className="glass-card rounded-lg overflow-hidden">
                {/* Main row */}
                <div className="p-3 flex items-center gap-3">
                  {/* Thumbnail */}
                  <div className="w-12 h-12 rounded-md overflow-hidden bg-secondary flex-shrink-0">
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground text-[10px]">
                        No img
                      </div>
                    )}
                  </div>

                  {/* Name + meta */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-foreground truncate">{p.name}</h3>
                    <p className="text-sm text-muted-foreground capitalize">
                      {p.category} ·{' '}
                      <span className="text-foreground/70">
                        {variants.length === 1
                          ? `KSh ${variants[0].price.toLocaleString()}`
                          : `${variants.length} sizes`}
                      </span>
                    </p>
                  </div>

                  {/* Stock badge */}
                  <button
                    onClick={() => toggleStock(p)}
                    className={`px-2 py-1 rounded text-xs font-medium flex-shrink-0 ${
                      p.is_available
                        ? 'bg-success/20 text-success'
                        : 'bg-destructive/20 text-destructive'
                    }`}
                  >
                    {p.is_available ? 'In Stock' : 'Out'}
                  </button>

                  {/* Expand variants */}
                  {variants.length > 1 && (
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : p.id)}
                      className="p-1.5 text-muted-foreground hover:text-primary"
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  )}

                  <button
                    onClick={() => startEdit(p)}
                    className="p-1.5 text-muted-foreground hover:text-primary"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="p-1.5 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Variants breakdown */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-3 pb-3 pt-0 border-t border-border/40">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                          {variants.map((v, i) => (
                            <div
                              key={i}
                              className="flex items-center justify-between px-3 py-2 rounded-md bg-secondary text-sm"
                            >
                              <span className="font-medium text-foreground">{v.size}</span>
                              <span className="text-muted-foreground">
                                KSh {v.price.toLocaleString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminProducts;