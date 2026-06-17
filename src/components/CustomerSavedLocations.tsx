import { useEffect, useState } from 'react';
import { MapPin, Plus, Trash2, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useCustomer } from '@/context/CustomerContext';
import { DeliveryLocation } from '@/types';
import { fetchLocations } from '@/lib/supabase';

interface SavedLocation {
  id: string;
  label: string | null;
  location_id: string | null;
  location_description: string | null;
  delivery_locations: { name: string; delivery_fee: number } | null;
}

const CustomerSavedLocations = () => {
  const { customer } = useCustomer();
  const [saved, setSaved] = useState<SavedLocation[]>([]);
  const [locations, setLocations] = useState<DeliveryLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [label, setLabel] = useState('');
  const [locationId, setLocationId] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (!customer) return;
    const load = async () => {
      const [{ data: savedData }, locData] = await Promise.all([
        supabase
          .from('customer_saved_locations')
          .select('id, label, location_id, location_description, delivery_locations ( name, delivery_fee )')
          .eq('customer_id', customer.id)
          .order('created_at', { ascending: false }),
        fetchLocations(),
      ]);
      setSaved((savedData as unknown as SavedLocation[]) || []);
      setLocations(locData || []);
      setLoading(false);
    };
    load();
  }, [customer]);

  const handleAdd = async () => {
    if (!customer || !locationId) return;
    setSaving(true);

    const { data, error } = await supabase
      .from('customer_saved_locations')
      .insert({
        customer_id: customer.id,
        label: label.trim() || null,
        location_id: locationId,
        location_description: description.trim() || null,
      })
      .select('id, label, location_id, location_description, delivery_locations ( name, delivery_fee )')
      .single();

    if (!error && data) {
      setSaved((prev) => [data as unknown as SavedLocation, ...prev]);
      setLabel(''); setLocationId(''); setDescription('');
      setAdding(false);
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from('customer_saved_locations').delete().eq('id', id);
    setSaved((prev) => prev.filter((s) => s.id !== id));
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="glass-card rounded-xl p-4 animate-pulse space-y-2">
            <div className="h-3 w-20 bg-secondary rounded" />
            <div className="h-4 w-32 bg-secondary rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {saved.length === 0 && !adding && (
        <div className="text-center py-8 space-y-2">
          <MapPin className="w-10 h-10 mx-auto text-muted-foreground/30" />
          <p className="text-muted-foreground text-sm">No saved locations yet.</p>
        </div>
      )}

      {saved.map((loc) => (
        <div key={loc.id} className="glass-card rounded-xl p-4 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <div>
              {loc.label && (
                <p className="text-xs font-medium text-primary mb-0.5">{loc.label}</p>
              )}
              <p className="text-sm text-foreground">
                {loc.delivery_locations?.name ?? '—'}
              </p>
              {loc.location_description && (
                <p className="text-xs text-muted-foreground mt-0.5">{loc.location_description}</p>
              )}
              {loc.delivery_locations?.delivery_fee != null && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Delivery: KSh {Number(loc.delivery_locations.delivery_fee).toLocaleString()}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={() => handleDelete(loc.id)}
            className="p-1.5 rounded-full hover:bg-secondary text-muted-foreground hover:text-red-400 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}

      {adding ? (
        <div className="glass-card rounded-xl p-4 space-y-3 border border-primary/20">
          <p className="text-sm font-medium text-foreground">Add a location</p>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Label (optional)</label>
            <input
              type="text"
              placeholder="e.g. Home, Work"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Delivery zone *</label>
            <select
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">Select zone</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} — KSh {Number(l.delivery_fee).toLocaleString()}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Description (optional)</label>
            <input
              type="text"
              placeholder="e.g. Near the blue gate"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => { setAdding(false); setLabel(''); setLocationId(''); setDescription(''); }}
              className="flex-1 py-2 rounded-lg border border-border text-muted-foreground text-sm hover:bg-secondary transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={!locationId || saving}
              className="flex-1 py-2 rounded-lg gold-gradient text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Save
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="w-full py-2.5 rounded-xl border border-dashed border-border text-muted-foreground text-sm hover:border-primary/40 hover:text-foreground transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add location
        </button>
      )}
    </div>
  );
};

export default CustomerSavedLocations;