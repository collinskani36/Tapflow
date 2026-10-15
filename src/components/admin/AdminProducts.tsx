import { useEffect, useState, useRef } from 'react';
import { Plus, Edit2, Trash2, ChevronDown, ChevronUp, PlusCircle, X, Upload, Loader2 } from 'lucide-react';
import { Product } from '@/types';
import { fetchAllProducts, createProduct, updateProduct, deleteProduct } from '@/lib/supabase';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Types ────────────────────────────────────────────────────────────────────

type SizeOption = '250ml' | '375ml' | '500ml' | '750ml' | '1L' | '1.5L' | '2L' | 'Custom';

interface Variant {
  size: SizeOption | string;
  price: number;
}

type CategoryOption = 'whisky' | 'vodka' | 'spirit' | 'beer' | 'wine';

interface ProductForm {
  name: string;
  category: CategoryOption;
  image_url: string;
  is_available: boolean;
  variants: Variant[];
}

const SIZE_OPTIONS: SizeOption[] = ['250ml', '375ml', '500ml', '750ml', '1L', '1.5L', '2L', 'Custom'];

const emptyVariant = (): Variant => ({ size: '750ml', price: 0 });

// ── Category config ──
const ADMIN_CATEGORIES: { value: CategoryOption; label: string; emoji: string }[] = [
  { value: 'whisky',  label: 'Whisky',  emoji: '🥃' },
  { value: 'vodka',   label: 'Vodka',   emoji: '🍸' },
  { value: 'spirit',  label: 'Spirits', emoji: '🍶' },
  { value: 'beer',    label: 'Beer',    emoji: '🍺' },
  { value: 'wine',    label: 'Wine',    emoji: '🍷' },
];

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

      {isCustom && (
        <input
          placeholder="e.g. 330ml"
          value={variant.size}
          onChange={(e) => onChange(index, 'size', e.target.value)}
          className="px-3 py-2 rounded-lg bg-secondary border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary text-sm w-24"
        />
      )}

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
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = () => fetchAllProducts().then(setProducts);
  useEffect(() => { load(); }, []);

  // ── Image Upload Handler ──
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
    if (!allowedTypes.includes(file.type)) {
      alert('Please upload a JPEG, PNG, WebP, or AVIF image.');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be less than 5MB.');
      return;
    }

    setUploading(true);

    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('product-images')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Upload error:', error);
      alert('Failed to upload image. Check console for details.');
      setUploading(false);
      return;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('product-images')
      .getPublicUrl(data.path);

    setForm({ ...form, image_url: urlData.publicUrl });
    setUploading(false);
  };

  // ── Variant helpers ──
  const updateVariant = (index: number, field: keyof Variant, value: string | number) => {
    const updated = form.variants.map((v, i) =>
      i === index ? { ...v, [field]: value } : v
    );
    setForm({ ...form, variants: updated });
  };

  const addVariant = () => {
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

    const minPrice = Math.min(...form.variants.map((v) => v.price));

    const payload = {
      name: form.name,
      category: form.category,
      image_url: form.image_url,
      is_available: form.is_available,
      price: minPrice,
      variants: form.variants,
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
        <h2 className="font-display text-xl text-foreground tracking-tight">Products</h2>
        <button
          onClick={() => {
            setForm(emptyForm);
            setEditId(null);
            setShowForm(!showForm);
          }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg gold-gradient text-primary-foreground text-sm font-semibold"
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
            className="rounded-xl border border-border/50 bg-card p-5 space-y-5 overflow-hidden"
          >
            {/* Form title */}
            <div className="flex items-center gap-2 pb-1 border-b border-border/40">
              <p className="text-sm font-semibold text-foreground">
                {editId ? 'Edit Product' : 'New Product'}
              </p>
              {editId && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium border border-primary/30 text-primary/70 bg-primary/5">
                  Editing
                </span>
              )}
            </div>

            {/* Brand name */}
            <div className="space-y-1.5">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold">Brand name</p>
              <input
                required
                placeholder="e.g. Kenya Cane"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary text-sm"
              />
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold">Category</p>
              <div className="flex flex-wrap gap-2">
                {ADMIN_CATEGORIES.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setForm({ ...form, category: cat.value })}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                      form.category === cat.value
                        ? 'gold-gradient text-primary-foreground border-transparent'
                        : 'bg-secondary border-border text-muted-foreground hover:border-primary/40'
                    }`}
                  >
                    <span>{cat.emoji}</span>
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Image Upload + URL fallback */}
            <div className="space-y-1.5">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold">Product Image</p>
              
              {/* Upload button */}
              <div className="flex gap-3 items-start">
                <div className="flex-1 space-y-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/avif"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary border border-border text-foreground hover:border-primary/50 transition-colors text-sm disabled:opacity-50"
                  >
                    {uploading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    {uploading ? 'Uploading...' : 'Upload Image'}
                  </button>

                  {/* Divider */}
                  <div className="flex items-center gap-2">
                    <div className="h-px flex-1 bg-border/50" />
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">or paste URL</span>
                    <div className="h-px flex-1 bg-border/50" />
                  </div>

                  {/* URL input fallback */}
                  <input
                    placeholder="Paste image link from the web…"
                    value={form.image_url}
                    onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary text-sm"
                  />
                </div>

                {/* Live preview */}
                <div className="w-16 h-16 rounded-lg bg-secondary border border-border/50 flex-shrink-0 overflow-hidden flex items-center justify-center">
                  {form.image_url ? (
                    <img
                      src={form.image_url}
                      alt="preview"
                      className="w-full h-full object-contain p-1"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = 'none';
                        (e.currentTarget.nextSibling as HTMLElement).style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div
                    className="w-full h-full items-center justify-center text-muted-foreground/30 text-[10px] text-center leading-tight px-1"
                    style={{ display: form.image_url ? 'none' : 'flex' }}
                  >
                    Preview
                  </div>
                </div>
              </div>
            </div>

            {/* Sizes / Variants */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold">Sizes & Prices</p>
                <span className="text-[10px] text-muted-foreground/50">All available bottle sizes</span>
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
            <div className="space-y-1.5">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold">Availability</p>
              <label className="flex items-center gap-3 cursor-pointer select-none w-fit">
                <div
                  onClick={() => setForm({ ...form, is_available: !form.is_available })}
                  className={`relative w-10 h-5 rounded-full transition-colors ${form.is_available ? 'bg-success' : 'bg-border'}`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.is_available ? 'translate-x-5' : ''}`}
                  />
                </div>
                <span className={`text-sm font-medium ${form.is_available ? 'text-green-500' : 'text-muted-foreground'}`}>
                  {form.is_available ? 'In Stock' : 'Out of Stock'}
                </span>
              </label>
            </div>

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
              <div key={p.id} className="rounded-xl border border-border/40 bg-card overflow-hidden">
                {/* Main row */}
                <div className="p-3 flex items-center gap-3">
                  {/* Thumbnail */}
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-secondary border border-border/40 flex-shrink-0 flex items-center justify-center">
                    {p.image_url ? (
                      <img
                        src={p.image_url}
                        alt={p.name}
                        className="w-full h-full object-contain p-1"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = 'none';
                          (e.currentTarget.nextSibling as HTMLElement).style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div
                      className="w-full h-full items-center justify-center text-muted-foreground/30"
                      style={{ display: p.image_url ? 'none' : 'flex' }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H2v7l6.29 6.29c.94.94 2.48.94 3.42 0l3.58-3.58c.94-.94.94-2.48 0-3.42L8 3Z"/><path d="M4.5 8.5A.5.5 0 0 1 5 8"/></svg>
                    </div>
                  </div>

                  {/* Name + meta */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-foreground truncate text-sm">{p.name}</h3>
                    <p className="text-[11px] text-muted-foreground capitalize mt-0.5">
                      {ADMIN_CATEGORIES.find(c => c.value === p.category)?.emoji ?? ''}{' '}
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
                    className={`px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wide border flex-shrink-0 transition-colors ${
                      p.is_available
                        ? 'bg-green-500/10 text-green-600 border-green-600/30 hover:bg-green-500/20'
                        : 'bg-red-500/10 text-red-400 border-red-400/30 hover:bg-red-500/20'
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