import { useEffect, useState } from 'react';
import { Plus, Trash2, UserCheck, Phone, Loader2, Copy, Check, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Rider {
  id: string;
  name: string;
  phone: string;
  created_at: string;
}

interface NewRiderCredentials {
  name: string;
  email: string;
  password: string;
}

const AdminRiders = () => {
  const [riders, setRiders] = useState<Rider[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  // Set only right after a successful create — shown once, then discarded.
  // Nothing re-fetches this; if the admin navigates away, it's gone for good.
  const [newCredentials, setNewCredentials] = useState<NewRiderCredentials | null>(null);

  // ---------------------------
  // LOAD RIDERS
  // ---------------------------
  const loadRiders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('riders')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error) setRiders(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadRiders();
  }, []);

  // ---------------------------
  // ADD RIDER — via Edge Function (creates auth account + riders row + profile link)
  // ---------------------------
  const handleAdd = async () => {
    if (!name.trim() || !phone.trim()) {
      setError('Name and phone are required.');
      return;
    }

    setSaving(true);
    setError('');

    const { data, error: fnError } = await supabase.functions.invoke('create-rider-account', {
      body: { name: name.trim(), phone: phone.trim() },
    });

    setSaving(false);

    // supabase.functions.invoke doesn't throw on non-2xx by default — the
    // error payload comes back in `data.error` for our function's shape,
    // or in `fnError` for transport-level failures (network, timeout, etc.)
    if (fnError) {
      setError('Could not reach the server. Check your connection and try again.');
      return;
    }

    if (data?.error) {
      setError(data.error);
      return;
    }

    if (!data?.success) {
      setError('Something went wrong creating the rider. Try again.');
      return;
    }

    // Success — show the one-time credentials, reset the form, refresh the list
    setNewCredentials({
      name: name.trim(),
      email: data.credentials.email,
      password: data.credentials.password,
    });
    setName('');
    setPhone('');
    setAdding(false);
    await loadRiders();
  };

  // ---------------------------
  // DELETE RIDER
  // ---------------------------
  const handleDelete = async (id: string) => {
    if (!confirm('Remove this rider from the system?')) return;

    setDeletingId(id);

    const { error } = await supabase
      .from('riders')
      .delete()
      .eq('id', id);

    if (!error) {
      setRiders((prev) => prev.filter((r) => r.id !== id));
    }

    setDeletingId(null);
  };

  const handleCopyCredentials = () => {
    if (!newCredentials) return;
    navigator.clipboard.writeText(
      `Email: ${newCredentials.email}\nPassword: ${newCredentials.password}`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ---------------------------
  // RENDER
  // ---------------------------
  return (
    <div className="space-y-4">

      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg text-foreground">Riders</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {riders.length} rider{riders.length !== 1 ? 's' : ''} registered
          </p>
        </div>

        {!adding && (
          <button
            onClick={() => {
              setAdding(true);
              setError('');
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg gold-gradient text-primary-foreground text-sm font-medium hover:opacity-90 transition"
          >
            <Plus className="w-4 h-4" />
            Add Rider
          </button>
        )}
      </div>

      {/* ONE-TIME CREDENTIALS CARD */}
      {newCredentials && (
        <div className="glass-card rounded-xl p-4 border border-primary/40 bg-primary/5 space-y-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">
                {newCredentials.name}'s login — save this now
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                This password won't be shown again. Relay it to the rider directly.
              </p>
            </div>
          </div>

          <div className="bg-background rounded-lg p-3 space-y-1 font-mono text-xs">
            <p className="text-foreground">
              <span className="text-muted-foreground">Email: </span>
              {newCredentials.email}
            </p>
            <p className="text-foreground">
              <span className="text-muted-foreground">Password: </span>
              {newCredentials.password}
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleCopyCredentials}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-secondary transition"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy credentials'}
            </button>
            <button
              onClick={() => setNewCredentials(null)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground transition"
            >
              Done, I've saved it
            </button>
          </div>
        </div>
      )}

      {/* ADD FORM */}
      {adding && (
        <div className="glass-card rounded-xl p-4 border border-border/50 space-y-3">
          <h3 className="text-sm font-medium text-foreground">New Rider</h3>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. John Kamau"
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 0712 345 678"
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground">
            This creates a login for the rider automatically — you'll get a one-time password to share with them.
          </p>

          {error && (
            <p className="text-xs text-destructive">{error}</p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleAdd}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition disabled:opacity-60"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              {saving ? 'Creating…' : 'Save Rider'}
            </button>

            <button
              onClick={() => {
                setAdding(false);
                setName('');
                setPhone('');
                setError('');
              }}
              className="px-4 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* RIDERS LIST */}
      {loading ? (
        <div className="text-center py-10">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground mx-auto" />
        </div>
      ) : riders.length === 0 ? (
        <div className="glass-card rounded-xl p-8 text-center border border-border/50">
          <UserCheck className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No riders yet. Add your first rider above.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {riders.map((rider) => (
            <div
              key={rider.id}
              className="glass-card rounded-xl px-4 py-3 border border-border/50 flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <UserCheck className="w-4 h-4 text-primary" />
                </div>

                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{rider.name}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Phone className="w-3 h-3" />
                    {rider.phone}
                  </p>
                </div>
              </div>

              <button
                onClick={() => handleDelete(rider.id)}
                disabled={deletingId === rider.id}
                className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition disabled:opacity-50"
                title="Remove rider"
              >
                {deletingId === rider.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminRiders;