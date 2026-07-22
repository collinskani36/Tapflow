import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Save, Loader2 } from 'lucide-react';
import { DeliveryLocation } from '@/types';
import { fetchLocations, createLocation, updateLocation, deleteLocation, supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { DeliveryTier } from '@/lib/geo';

interface DeliveryPricingRow {
  id: string;
  road_distance_factor: number;
  tiers: DeliveryTier[];
  notes: string | null;
}

const AdminLocations = () => {
  const [locations, setLocations] = useState<DeliveryLocation[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [fee, setFee] = useState(0);

  // ── Delivery pricing (road factor + tiers) ──
  const [pricing, setPricing] = useState<DeliveryPricingRow | null>(null);
  const [factorInput, setFactorInput] = useState('1.5');
  const [tiersInput, setTiersInput] = useState<DeliveryTier[]>([]);
  const [notesInput, setNotesInput] = useState('');
  const [pricingLoading, setPricingLoading] = useState(true);
  const [pricingSaving, setPricingSaving] = useState(false);
  const [pricingError, setPricingError] = useState<string | null>(null);
  const [pricingSaved, setPricingSaved] = useState(false);

  const load = () => fetchLocations().then(setLocations);

  const loadPricing = async () => {
    setPricingLoading(true);
    setPricingError(null);
    const { data, error } = await supabase
      .from('delivery_pricing')
      .select('id, road_distance_factor, tiers, notes')
      .limit(1)
      .single();

    if (error || !data) {
      setPricingError('Could not load delivery pricing settings.');
      setPricingLoading(false);
      return;
    }

    setPricing(data as DeliveryPricingRow);
    setFactorInput(String(data.road_distance_factor));
    setTiersInput(
      [...(data.tiers as DeliveryTier[])].sort((a, b) => a.max_km - b.max_km)
    );
    setNotesInput(data.notes || '');
    setPricingLoading(false);
  };

  useEffect(() => {
    load();
    loadPricing();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editId) {
      await updateLocation(editId, { name, delivery_fee: fee });
    } else {
      await createLocation({ name, delivery_fee: fee });
    }

    setName('');
    setFee(0);
    setEditId(null);
    setShowForm(false);
    load();
  };

  const startEdit = (l: DeliveryLocation) => {
    setName(l.name);
    setFee(l.delivery_fee);
    setEditId(l.id);
    setShowForm(true);
  };

  // ── Pricing editor helpers ──
  const updateTierField = (index: number, field: keyof DeliveryTier, value: number) => {
    setTiersInput((prev) => prev.map((t, i) => (i === index ? { ...t, [field]: value } : t)));
  };

  const addTier = () => {
    const lastMax = tiersInput.length > 0 ? tiersInput[tiersInput.length - 1].max_km : 0;
    setTiersInput((prev) => [...prev, { max_km: lastMax + 5, fee: 0 }]);
  };

  const removeTier = (index: number) => {
    setTiersInput((prev) => prev.filter((_, i) => i !== index));
  };

  const validatePricing = (): string | null => {
    const factor = Number(factorInput);
    if (Number.isNaN(factor) || factor < 1.0 || factor > 2.5) {
      return 'Road distance factor must be a number between 1.0 and 2.5.';
    }
    if (tiersInput.length === 0) {
      return 'Add at least one distance tier.';
    }
    for (const t of tiersInput) {
      if (Number.isNaN(t.max_km) || t.max_km <= 0) return 'Every tier needs a distance greater than 0 km.';
      if (Number.isNaN(t.fee) || t.fee < 0) return 'Every tier needs a fee of 0 or more.';
    }
    // Tiers must be in ascending order with no duplicate max_km — this is
    // what makes "first match wins" behave predictably.
    const sorted = [...tiersInput].sort((a, b) => a.max_km - b.max_km);
    const maxKms = sorted.map((t) => t.max_km);
    if (new Set(maxKms).size !== maxKms.length) {
      return 'Each tier must have a unique distance value.';
    }
    return null;
  };

  const savePricing = async () => {
    if (!pricing) return;
    const validationError = validatePricing();
    if (validationError) {
      setPricingError(validationError);
      setPricingSaved(false);
      return;
    }

    setPricingSaving(true);
    setPricingError(null);
    setPricingSaved(false);

    const sortedTiers = [...tiersInput].sort((a, b) => a.max_km - b.max_km);

    const { error } = await supabase
      .from('delivery_pricing')
      .update({
        road_distance_factor: Number(factorInput),
        tiers: sortedTiers,
        notes: notesInput || null,
      })
      .eq('id', pricing.id);

    setPricingSaving(false);

    if (error) {
      setPricingError('Failed to save. You may not have admin permissions, or the connection dropped.');
      return;
    }

    setPricingSaved(true);
    setTimeout(() => setPricingSaved(false), 3000);
    loadPricing();
  };

  return (
    <div className="space-y-8">
      {/* ── Delivery pricing config ── */}
      <div className="space-y-4">
        <div>
          <h2 className="font-display text-xl text-foreground">Delivery Pricing</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Controls the fee shown on the map-pin checkout flow. The straight-line distance to
            the lounge is multiplied by the road factor below to approximate real on-road
            distance, then matched against a tier to get the fee.
          </p>
        </div>

        {pricingLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm py-6">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading pricing settings…
          </div>
        ) : !pricing ? (
          <p className="text-sm text-destructive">{pricingError || 'Pricing settings unavailable.'}</p>
        ) : (
          <div className="glass-card rounded-lg p-4 space-y-4">
            {/* Road distance factor */}
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">
                Road Distance Factor
              </label>
              <p className="text-xs text-muted-foreground mb-2">
                
              </p>
              <input
                type="number"
                step="0.1"
                min="1.0"
                max="2.5"
                value={factorInput}
                onChange={(e) => setFactorInput(e.target.value)}
                className="w-32 px-3 py-2 rounded-lg bg-secondary border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Tiers */}
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Distance Tiers</label>
              <p className="text-xs text-muted-foreground mb-2">
                
              </p>
              <div className="space-y-2">
                {tiersInput.map((tier, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-14 shrink-0">Up to</span>
                    <input
                      type="number"
                      min="0.1"
                      step="0.5"
                      value={tier.max_km}
                      onChange={(e) => updateTierField(i, 'max_km', Number(e.target.value))}
                      className="w-20 px-2 py-1.5 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <span className="text-xs text-muted-foreground shrink-0">km — KSh</span>
                    <input
                      type="number"
                      min="0"
                      step="10"
                      value={tier.fee}
                      onChange={(e) => updateTierField(i, 'fee', Number(e.target.value))}
                      className="w-24 px-2 py-1.5 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <button
                      type="button"
                      onClick={() => removeTier(i)}
                      className="p-1.5 text-muted-foreground hover:text-destructive"
                      title="Remove tier"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addTier}
                className="mt-2 flex items-center gap-1 text-xs text-primary hover:opacity-80"
              >
                <Plus className="w-3.5 h-3.5" /> Add tier
              </button>
            </div>

            {/* Notes / paper trail */}
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Notes (optional)</label>
              <input
                type="text"
                placeholder="e.g. raised to 1.6x after rider feedback"
                value={notesInput}
                onChange={(e) => setNotesInput(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {pricingError && <p className="text-sm text-destructive">{pricingError}</p>}
            {pricingSaved && <p className="text-sm text-primary">Saved.</p>}

            <button
              type="button"
              onClick={savePricing}
              disabled={pricingSaving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg gold-gradient text-primary-foreground text-sm font-medium disabled:opacity-60"
            >
              {pricingSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Pricing
            </button>
          </div>
        )}
      </div>

      {/* ── Named delivery locations (fallback dropdown) ── */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="font-display text-xl text-foreground">Delivery Locations</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Manual fallback list shown when a customer's pin is out of range.
            </p>
          </div>
          <button
            onClick={() => { setName(''); setFee(0); setEditId(null); setShowForm(!showForm); }}
            className="flex items-center gap-1 px-3 py-2 rounded-lg gold-gradient text-primary-foreground text-sm font-medium"
          >
            <Plus className="w-4 h-4" /> Add Location
          </button>
        </div>

        <AnimatePresence>
          {showForm && (
            <motion.form
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              onSubmit={handleSubmit}
              className="glass-card rounded-lg p-4 space-y-3 overflow-hidden"
            >
              <input
                required placeholder="Location name"
                value={name} onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <input
                type="number" required placeholder="Delivery fee" min={0}
                value={fee || ''} onChange={(e) => setFee(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <div className="flex gap-3">
                <button type="submit" className="px-4 py-2 rounded-lg gold-gradient text-primary-foreground text-sm font-medium">
                  {editId ? 'Update' : 'Add'} Location
                </button>
                <button type="button" onClick={() => { setShowForm(false); setEditId(null); }} className="px-4 py-2 rounded-lg border border-border text-muted-foreground text-sm">
                  Cancel
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {locations.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">No delivery locations yet. Add one above.</p>
        ) : (
          <div className="space-y-2">
            {locations.map((l) => (
              <div key={l.id} className="glass-card rounded-lg p-3 flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-foreground">{l.name}</h3>
                  <p className="text-sm text-primary">KSh {l.delivery_fee.toLocaleString()}</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => startEdit(l)} className="p-1.5 text-muted-foreground hover:text-primary">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => { deleteLocation(l.id); load(); }} className="p-1.5 text-muted-foreground hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminLocations;