import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { DeliveryLocation } from '@/types';
import { fetchLocations, createLocation, updateLocation, deleteLocation } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';

const AdminLocations = () => {
  const [locations, setLocations] = useState<DeliveryLocation[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [fee, setFee] = useState(0);

  const load = () => fetchLocations().then(setLocations);
  useEffect(() => { load(); }, []);

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

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="font-display text-xl text-foreground">Delivery Locations</h2>
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
  );
};

export default AdminLocations;