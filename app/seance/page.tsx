'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Terminal } from '@/components/Terminal';
import { useGalleryNetwork } from '@/components/NetworkSwitcher';
import { avatarUrl, seancePath } from '@/lib/soul-client';

type Card = { tokenId: string; name: string; avatarRootHash: string | null };

export default function SeancePicker() {
  const router = useRouter();
  const network = useGalleryNetwork();
  const [opts, setOpts] = useState<Card[]>([]);
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [checking, setChecking] = useState(false);
  const [err, setErr] = useState('');
  const started = useRef(false);

  useEffect(() => {
    started.current = false;
  }, [network]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    fetch(`/api/gallery?network=${network}`)
      .then((r) => r.json())
      .then((j) => setOpts((j.souls ?? []) as Card[]))
      .catch(() => setOpts([]));
  }, [network]);

  const isId = (v: string) => /^\d+$/.test(v.trim());
  const ready = isId(a) && isId(b) && a.trim() !== b.trim();

  // clicking a gallery card toggles it into the first free slot (A then B), or clears it if already picked
  function pick(id: string) {
    setErr('');
    if (a === id) return setA('');
    if (b === id) return setB('');
    if (!a) return setA(id);
    if (!b) return setB(id);
    setA(id); // both full → replace A
  }
  const slotOf = (id: string) => (a === id ? 'A' : b === id ? 'B' : null);

  async function begin() {
    setErr('');
    setChecking(true);
    try {
      const [ra, rb] = await Promise.all([
        fetch(`/api/soul/${a.trim()}?network=${network}`),
        fetch(`/api/soul/${b.trim()}?network=${network}`),
      ]);
      const missing: string[] = [];
      if (!ra.ok) missing.push(a.trim());
      if (!rb.ok) missing.push(b.trim());
      if (missing.length) {
        setErr(`soul${missing.length > 1 ? 's' : ''} #${missing.join(', #')} ${missing.length > 1 ? "don't" : "doesn't"} exist — pick real ones`);
        return;
      }
      router.push(seancePath(a.trim(), b.trim(), network));
    } catch {
      setErr('could not verify the souls — try again');
    } finally {
      setChecking(false);
    }
  }

  return (
    <Terminal path="~/seance">
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <Link href="/" className="term-btn shrink-0 rounded-sm px-2 py-0.5 text-xs">‹ back</Link>
          <div>
            <p className="glow text-lg">⚯ séance</p>
            <p className="text-[var(--phosphor-deep)] text-xs">choose two souls and watch them talk</p>
          </div>
        </div>

        {/* the two chosen slots */}
        <div className="grid grid-cols-2 gap-3">
          <Slot label="soul A" id={a} onChange={setA} />
          <Slot label="soul B" id={b} onChange={setB} />
        </div>

        {/* pick from the gallery */}
        {opts.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-[var(--phosphor-dim)]">tap to choose (or type an id above)</p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {opts.map((s) => {
                const slot = slotOf(s.tokenId);
                return (
                  <button
                    key={s.tokenId}
                    type="button"
                    onClick={() => pick(s.tokenId)}
                    aria-pressed={!!slot}
                    className={`relative rounded-sm border p-1.5 text-left transition-colors ${
                      slot ? 'border-[var(--phosphor)] bg-[rgba(52,255,156,0.08)]' : 'border-[var(--phosphor-deep)] hover:bg-[rgba(52,255,156,0.05)]'
                    }`}
                  >
                    {slot && (
                      <span className="absolute right-1 top-1 rounded-sm bg-[var(--phosphor)] px-1 text-[10px] font-bold text-[#03130b]">{slot}</span>
                    )}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={avatarUrl(s.avatarRootHash ?? undefined, network)} alt="" className="mb-1 aspect-square w-full rounded-sm border border-[var(--phosphor-deep)] object-cover" />
                    <p className="glow truncate text-xs">{s.name}</p>
                    <p className="text-[10px] text-[var(--phosphor-deep)]">#{s.tokenId}</p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {isId(a) && isId(b) && a.trim() === b.trim() && <p className="glow-magenta text-xs">pick two different souls</p>}
        {err && <p className="glow-magenta text-xs">! {err}</p>}
        <button disabled={!ready || checking} onClick={begin} className="term-btn glow rounded-sm px-5 py-2 text-sm">
          {checking ? 'summoning…' : 'begin séance ◈'}
        </button>
      </div>
    </Terminal>
  );
}

// A chosen-soul slot: shows the id, editable as free text (type any tokenId), clearable.
function Slot({ label, id, onChange }: { label: string; id: string; onChange: (v: string) => void }) {
  return (
    <label className="block text-sm">
      <span className="text-[var(--phosphor-dim)]">{label}</span>
      <div className="mt-1 flex items-center gap-2 border border-[var(--phosphor-deep)] rounded-sm p-2">
        <span className="text-[var(--phosphor-deep)]">#</span>
        <input
          value={id}
          onChange={(e) => onChange(e.target.value)}
          inputMode="numeric"
          placeholder="token id"
          className="term-input min-w-0 flex-1"
        />
        {id && (
          <button type="button" onClick={() => onChange('')} aria-label={`clear ${label}`} className="text-[var(--phosphor-deep)] hover:glow">
            ✕
          </button>
        )}
      </div>
    </label>
  );
}
