import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import {
  approve,
  getEntry,
  getQueue,
  loadTrialParts,
  reject,
  runGeneration,
  subscribe,
  type QueueEntry,
  type QueueStatus,
} from '@/services/catalogSyncService';
import {
  fetchBackendHealth,
  type BackendHealth,
  type Generation3DBackend,
} from '@/services/partGeneratorService';
import { ProceduralWheelPreview } from './ProceduralWheelPreview';

/**
 * Per-backend metadata shown in the UI. Costs are point-in-time and
 * documented for the operator — the server is the source of truth.
 */
const BACKEND_META: Record<
  Generation3DBackend,
  { label: string; cost: string; tone: string }
> = {
  fal: {
    label: 'TRELLIS.2',
    cost: '~$0.02',
    tone: 'bg-emerald-500/15 text-emerald-200 border-emerald-500/40',
  },
  tripo: {
    label: 'Tripo3D',
    cost: '~$0.30',
    tone: 'bg-accent-gold/15 text-accent-gold border-accent-gold/40',
  },
  billboard: {
    label: '2.5D Preview',
    cost: 'free',
    tone: 'bg-garage-700 text-garage-200 border-garage-600',
  },
};

function BackendBadge({ backend }: { backend: Generation3DBackend }) {
  const meta = BACKEND_META[backend];
  return (
    <span
      className={`text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-full border ${meta.tone}`}
    >
      via {meta.label}
    </span>
  );
}

/**
 * Admin: review queue for AI-generated parts.
 *
 * Pulls trial parts on mount, lets you kick off Gemini/Tripo3D generation
 * per item, preview the result, and approve / reject. v1 is in-memory —
 * approval flips status but does not write registry.json (server-side
 * write endpoint is the v2 step).
 */
export function AdminPage() {
  // Subscribe to the catalog sync store. useSyncExternalStore avoids
  // re-render races when generation completes asynchronously.
  const queue = useSyncExternalStore(
    (cb) => subscribe(cb),
    () => getQueue(),
    () => getQueue(),
  );

  const [health, setHealth] = useState<BackendHealth | null>(null);
  const [selectedBackend, setSelectedBackend] =
    useState<Generation3DBackend | null>(null);

  useEffect(() => {
    loadTrialParts();
    let active = true;
    fetchBackendHealth().then((h) => {
      if (!active || !h) return;
      setHealth(h);
      setSelectedBackend(h.defaultBackend);
    });
    return () => {
      active = false;
    };
  }, []);

  const availableBackends = useMemo<Generation3DBackend[]>(() => {
    const list: Generation3DBackend[] = [];
    if (health?.features.trellis) list.push('fal');
    if (health?.features.tripo3D) list.push('tripo');
    list.push('billboard');
    return list;
  }, [health]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = selectedId ? getEntry(selectedId) : null;

  return (
    <div className="min-h-[calc(100vh-56px)] bg-garage-950">
      <header className="border-b border-garage-700 bg-garage-900/80 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <p className="text-xs uppercase tracking-[0.2em] text-accent-gold">
            Admin · Parts Pipeline
          </p>
          <h1 className="text-3xl font-bold mt-1 tracking-tight">
            Generation Queue
          </h1>
          <p className="text-garage-300 text-sm mt-1.5 max-w-2xl">
            Trial parts auto-loaded from{' '}
            <code className="text-garage-100 bg-garage-800 px-1.5 py-0.5 rounded text-xs">
              src/data/trialParts.json
            </code>
            . Click <em>Generate</em> to run the pipeline, then approve or reject
            the result.
          </p>

          {selectedBackend && (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span className="text-[11px] uppercase tracking-wider text-garage-400">
                3D backend
              </span>
              <div className="inline-flex rounded-lg border border-garage-700 bg-garage-800/60 p-0.5">
                {(['fal', 'tripo', 'billboard'] as Generation3DBackend[]).map(
                  (b) => {
                    const meta = BACKEND_META[b];
                    const available = availableBackends.includes(b);
                    const active = selectedBackend === b;
                    return (
                      <button
                        key={b}
                        onClick={() => available && setSelectedBackend(b)}
                        disabled={!available}
                        title={
                          available
                            ? `${meta.label} (${meta.cost} per run)`
                            : `${meta.label} unavailable — set the matching API key on the server`
                        }
                        className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                          active
                            ? 'bg-garage-700 text-white'
                            : available
                              ? 'text-garage-300 hover:text-white'
                              : 'text-garage-500 cursor-not-allowed'
                        }`}
                      >
                        {meta.label}
                        <span className="ml-1.5 font-normal text-[10px] opacity-70">
                          {meta.cost}
                        </span>
                      </button>
                    );
                  },
                )}
              </div>
              {health && (
                <span className="text-[11px] text-garage-500">
                  default:{' '}
                  <span className="text-garage-300">
                    {BACKEND_META[health.defaultBackend].label}
                  </span>
                </span>
              )}
            </div>
          )}
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-6">
        {/* Left: queue list */}
        <div>
          <h2 className="text-sm uppercase tracking-wider text-garage-400 mb-3">
            Queue ({queue.length})
          </h2>
          <div className="space-y-2">
            {queue.map((entry) => (
              <QueueRow
                key={entry.id}
                entry={entry}
                active={selectedId === entry.id}
                onSelect={() => setSelectedId(entry.id)}
              />
            ))}
            {queue.length === 0 && (
              <div className="text-sm text-garage-400 py-10 text-center">
                Loading trial parts…
              </div>
            )}
          </div>
        </div>

        {/* Right: detail / preview */}
        <div className="lg:sticky lg:top-[80px] lg:self-start">
          {selected ? (
            <DetailPanel
              entry={selected}
              backend={selectedBackend ?? 'billboard'}
            />
          ) : (
            <div className="bg-garage-800/40 border border-garage-700 rounded-2xl p-10 text-center text-garage-400">
              Select a queue entry to inspect it.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function QueueRow({
  entry,
  active,
  onSelect,
}: {
  entry: QueueEntry;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left bg-garage-800/40 border rounded-xl p-3 flex items-center gap-3 transition-all ${
        active
          ? 'border-accent shadow-glow'
          : 'border-garage-700 hover:border-garage-500'
      }`}
    >
      <div className="w-14 h-14 rounded-lg overflow-hidden bg-garage-700 flex-shrink-0 border border-garage-600">
        <img
          src={entry.trial.imageUrl}
          alt={entry.trial.displayName}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm truncate">{entry.trial.displayName}</div>
        <div className="text-[11px] text-garage-400 mt-0.5 flex items-center gap-1.5">
          <span className="capitalize">{entry.trial.category}</span>
          <span>·</span>
          <span>{entry.trial.vendor}</span>
        </div>
      </div>
      <StatusPill status={entry.status} />
    </button>
  );
}

function StatusPill({ status }: { status: QueueStatus }) {
  const cfg: Record<QueueStatus, { label: string; cls: string }> = {
    pending: { label: 'Pending', cls: 'bg-garage-700 text-garage-200 border-garage-600' },
    generating: { label: 'Generating…', cls: 'bg-accent-gold/15 text-accent-gold border-accent-gold/40' },
    review: { label: 'Review', cls: 'bg-accent/15 text-accent-hot border-accent/40' },
    approved: { label: 'Approved', cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40' },
    rejected: { label: 'Rejected', cls: 'bg-garage-700/60 text-garage-400 border-garage-600' },
    error: { label: 'Error', cls: 'bg-red-500/15 text-red-300 border-red-500/40' },
  };
  const { label, cls } = cfg[status];
  return (
    <span
      className={`text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-full border ${cls}`}
    >
      {label}
    </span>
  );
}

function DetailPanel({
  entry,
  backend,
}: {
  entry: QueueEntry;
  backend: Generation3DBackend;
}) {
  const [running, setRunning] = useState(false);
  const handleGenerate = async () => {
    setRunning(true);
    // Wheels use the procedural pipeline, not /api/generate-3d — the
    // backend choice is moot for them. For exhaust + future complex
    // categories, pass the operator's pick through.
    await runGeneration(
      entry.id,
      entry.trial.category === 'wheels' ? undefined : backend,
    );
    setRunning(false);
  };
  const generateLabel = (() => {
    if (entry.trial.category === 'wheels') return 'Generate (procedural)';
    return `Generate (${BACKEND_META[backend].label} · ${BACKEND_META[backend].cost})`;
  })();

  return (
    <div className="bg-garage-800/40 border border-garage-700 rounded-2xl overflow-hidden">
      <div className="aspect-[16/9] bg-garage-900 overflow-hidden border-b border-garage-700">
        {entry.wheelSpec ? (
          <ProceduralWheelPreview spec={entry.wheelSpec} />
        ) : entry.asset?.kind === 'billboard' ? (
          <img
            src={entry.asset.url}
            alt="Billboard fallback"
            className="w-full h-full object-contain bg-garage-950"
          />
        ) : (
          <img
            src={entry.trial.imageUrl}
            alt={entry.trial.displayName}
            className="w-full h-full object-contain bg-garage-950"
          />
        )}
      </div>

      <div className="p-5 space-y-4">
        <div>
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-lg font-bold">{entry.trial.displayName}</h3>
            {entry.assetBackend && <BackendBadge backend={entry.assetBackend} />}
          </div>
          <p className="text-xs text-garage-400 mt-0.5">
            {entry.trial.vendor} ·{' '}
            <a
              href={entry.trial.vendorProductUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent-gold hover:text-accent-hot underline-offset-2 hover:underline"
            >
              product page
            </a>
          </p>
          {entry.trial.notes && (
            <p className="text-xs text-garage-500 mt-2 leading-relaxed">
              {entry.trial.notes}
            </p>
          )}
          {entry.generationNote && (
            <p className="text-[11px] text-garage-400 italic mt-2">
              {entry.generationNote}
            </p>
          )}
        </div>

        {entry.analysis && (
          <div className="bg-garage-900/70 border border-garage-700 rounded-xl p-3.5">
            <p className="text-[10px] uppercase tracking-wider text-garage-400 mb-2">
              Gemini analysis
            </p>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
              {Object.entries(entry.analysis).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-2 min-w-0">
                  <span className="text-garage-400 truncate">{k}</span>
                  <span className="font-mono text-garage-100 truncate">
                    {String(v)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {entry.error && (
          <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
            {entry.error}
          </div>
        )}

        <div className="flex flex-wrap gap-2 pt-1">
          {entry.status === 'pending' || entry.status === 'error' ? (
            <button
              onClick={handleGenerate}
              disabled={running}
              className="bg-gradient-to-r from-accent to-accent-hot hover:shadow-glow text-white font-semibold text-sm px-4 py-2 rounded-lg transition-all disabled:opacity-60"
            >
              {running ? 'Generating…' : generateLabel}
            </button>
          ) : null}

          {entry.status === 'review' && (
            <>
              <button
                onClick={() => approve(entry.id)}
                className="bg-emerald-500/20 border border-emerald-500/50 text-emerald-200 hover:bg-emerald-500/30 text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
              >
                Approve
              </button>
              <button
                onClick={() => reject(entry.id)}
                className="bg-garage-700 border border-garage-600 text-garage-200 hover:border-red-500/50 hover:text-red-200 text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
              >
                Reject
              </button>
              <button
                onClick={handleGenerate}
                disabled={running}
                className="text-sm text-garage-300 hover:text-garage-100 px-3 py-2 rounded-lg transition-colors"
                title={`Regenerate via ${BACKEND_META[backend].label}`}
              >
                {running ? 'Regenerating…' : 'Regenerate'}
              </button>
            </>
          )}

          {entry.status === 'approved' && (
            <p className="text-xs text-emerald-300">
              Approved (in-memory). v2: persists to{' '}
              <code className="bg-garage-900 px-1 py-0.5 rounded">
                /generated-parts/registry.json
              </code>{' '}
              via a server-side write endpoint.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
