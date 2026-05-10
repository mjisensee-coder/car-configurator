import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import {
  fileToBase64,
  matchFromPhoto,
  type MatchResult,
  type PartAnalysis,
} from '@/services/photoMatchService';
import type { Part, PartCategory } from '@/types';

/**
 * Photo-match UI: open a modal, accept a file or live camera capture,
 * preview the image, and show the top 3 matched parts from the catalog.
 *
 * Wires into any panel that has a part-swap callback. Today the wheel
 * tab uses it; same component drives exhaust later by passing
 * `category="exhaust"`.
 */

interface PhotoMatcherProps {
  category: PartCategory;
  onSelect: (partId: string) => void;
}

export function PhotoMatcher({ category, onSelect }: PhotoMatcherProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 mt-2 px-3 py-2.5 rounded-xl border border-dashed border-garage-600 hover:border-accent text-sm text-garage-200 hover:text-garage-100 hover:bg-garage-800/40 transition-all group"
      >
        <CameraIcon />
        Match from Photo
        <span className="text-[10px] uppercase tracking-wider text-accent-gold ml-1 px-1.5 py-0.5 bg-accent-gold/10 rounded-full">
          AI
        </span>
      </button>
      {open && (
        <PhotoMatcherModal
          category={category}
          onSelect={(id) => {
            onSelect(id);
            setOpen(false);
          }}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function PhotoMatcherModal({
  category,
  onSelect,
  onClose,
}: {
  category: PartCategory;
  onSelect: (partId: string) => void;
  onClose: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<PartAnalysis | null>(null);
  const [matches, setMatches] = useState<MatchResult[]>([]);

  // Lock body scroll while open and dispose preview URL on unmount.
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = ''; // allow re-picking the same file
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.');
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
    setError(null);
    setAnalysis(null);
    setMatches([]);
    setLoading(true);

    try {
      const { base64, mimeType } = await fileToBase64(file);
      const result = await matchFromPhoto(base64, mimeType, category);
      if (!result.ok) {
        setError(result.error);
      } else {
        setAnalysis(result.analysis);
        setMatches(result.matches);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-garage-950/80 backdrop-blur-sm"
      />

      <div className="relative w-full sm:max-w-lg bg-garage-900 sm:rounded-2xl rounded-t-2xl border border-garage-700 shadow-panel overflow-hidden max-h-[90vh] flex flex-col">
        <header className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-garage-700">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-accent-gold">
              Photo Match
            </p>
            <h3 className="text-lg font-bold mt-0.5">
              Find your{' '}
              <span className="capitalize">{category}</span>
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-garage-400 hover:text-garage-100 w-8 h-8 flex items-center justify-center rounded-md hover:bg-garage-800 transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Upload / camera buttons */}
          {!previewUrl && (
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => cameraInputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-2 px-3 py-6 rounded-xl border border-garage-600 hover:border-accent hover:bg-garage-800/40 transition-all"
              >
                <CameraIcon size={24} />
                <span className="text-sm font-semibold">Take Photo</span>
                <span className="text-[10px] text-garage-400">Use camera</span>
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-2 px-3 py-6 rounded-xl border border-garage-600 hover:border-accent hover:bg-garage-800/40 transition-all"
              >
                <UploadIcon size={24} />
                <span className="text-sm font-semibold">Upload</span>
                <span className="text-[10px] text-garage-400">From device</span>
              </button>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFile}
            className="hidden"
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFile}
            className="hidden"
          />

          {/* Preview */}
          {previewUrl && (
            <div className="relative rounded-xl overflow-hidden border border-garage-700 aspect-video bg-garage-800">
              <img
                src={previewUrl}
                alt="Uploaded"
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => {
                  if (previewUrl) URL.revokeObjectURL(previewUrl);
                  setPreviewUrl(null);
                  setAnalysis(null);
                  setMatches([]);
                  setError(null);
                }}
                className="absolute top-2 right-2 bg-garage-950/80 border border-garage-600 text-xs px-2.5 py-1 rounded-md hover:border-accent transition-colors"
              >
                Replace
              </button>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="text-center py-6">
              <div className="inline-flex items-center gap-2 text-garage-300">
                <Spinner />
                <span className="text-sm">Analyzing with AI…</span>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="text-sm text-accent-hot bg-accent/10 border border-accent/30 rounded-lg px-3 py-2.5 leading-relaxed">
              {error}
            </div>
          )}

          {/* Analysis summary */}
          {analysis && !loading && (
            <div className="bg-garage-800/60 border border-garage-700 rounded-xl p-3.5">
              <p className="text-[10px] uppercase tracking-wider text-garage-400 mb-1">
                What we see
              </p>
              <p className="text-sm text-garage-100 leading-relaxed">
                {analysis.description}
              </p>
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {Object.entries(analysis)
                  .filter(
                    ([k, v]) =>
                      k !== 'description' &&
                      k !== 'confidence' &&
                      v !== null &&
                      v !== '',
                  )
                  .map(([k, v]) => (
                    <span
                      key={k}
                      className="text-[10px] bg-garage-700/60 border border-garage-600/60 rounded-full px-2 py-0.5 text-garage-200"
                    >
                      <span className="text-garage-400">{k}:</span>{' '}
                      <span className="font-mono">{String(v)}</span>
                    </span>
                  ))}
              </div>
            </div>
          )}

          {/* Match results */}
          {matches.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-wider text-garage-400 mb-2">
                Top matches
              </p>
              <div className="space-y-2">
                {matches.map(({ part, score, reasons }) => (
                  <MatchRow
                    key={part.id}
                    part={part}
                    score={score}
                    reasons={reasons}
                    onSelect={() => onSelect(part.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MatchRow({
  part,
  score,
  reasons,
  onSelect,
}: {
  part: Part;
  score: number;
  reasons: string[];
  onSelect: () => void;
}) {
  const pct = Math.round(score * 100);
  return (
    <button
      onClick={onSelect}
      className="w-full text-left bg-garage-800/40 border border-garage-700 hover:border-accent rounded-xl p-3 flex items-center gap-3 transition-all group"
    >
      <div className="w-14 h-14 rounded-lg overflow-hidden bg-garage-700 flex-shrink-0">
        <img
          src={part.image}
          alt={part.name}
          loading="lazy"
          className="w-full h-full object-cover"
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <span className="font-semibold text-sm truncate">{part.name}</span>
          <span
            className={`text-xs font-mono font-bold ${
              pct >= 70
                ? 'text-accent-gold'
                : pct >= 40
                  ? 'text-garage-200'
                  : 'text-garage-400'
            }`}
          >
            {pct}%
          </span>
        </div>
        <p className="text-xs text-garage-400 truncate">
          {part.brand} · ${part.price.toLocaleString()}
        </p>
        {reasons.length > 0 && (
          <p className="text-[10px] text-garage-500 mt-0.5 truncate">
            {reasons.slice(0, 2).join(' · ')}
          </p>
        )}
      </div>
      <span className="text-accent group-hover:text-accent-hot transition-transform group-hover:translate-x-0.5 text-sm font-semibold">
        →
      </span>
    </button>
  );
}

// ===== Icons =====

function CameraIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function UploadIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg
      className="animate-spin"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="12" cy="12" r="10" opacity="0.25" />
      <path d="M22 12a10 10 0 0 1-10 10" strokeLinecap="round" />
    </svg>
  );
}
