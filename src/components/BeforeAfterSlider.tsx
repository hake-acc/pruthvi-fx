import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import type { BeforeAfterItem } from '../data/portfolio';

interface ComparisonCardProps {
  item: BeforeAfterItem;
}

function ComparisonCard({ item }: ComparisonCardProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState(0.5);
  const [bend, setBend] = useState(0);
  const [dragging, setDragging] = useState(false);

  const lastXRef = useRef<number | null>(null);
  const bendDecayRef = useRef<number>(0);

  // Smoothly spring the elastic curve back toward 0
  useEffect(() => {
    if (Math.abs(bend) < 0.25) {
      if (bend !== 0) setBend(0);
      return;
    }
    bendDecayRef.current = requestAnimationFrame(() => {
      setBend((b) => b * 0.82);
    });
    return () => cancelAnimationFrame(bendDecayRef.current);
  }, [bend]);

  const updateFromClientX = (clientX: number, trackVelocity: boolean) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const next = Math.min(0.96, Math.max(0.04, (clientX - rect.left) / rect.width));

    if (trackVelocity && lastXRef.current !== null) {
      const dx = clientX - lastXRef.current;
      const clampedBend = Math.max(-44, Math.min(44, dx * 1.45));
      setBend((prev) => prev * 0.55 + clampedBend * 0.45);
    }
    lastXRef.current = clientX;
    setPos(next);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    lastXRef.current = e.clientX;
    updateFromClientX(e.clientX, false);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    updateFromClientX(e.clientX, true);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragging) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // ignore if already released
      }
      setDragging(false);
      lastXRef.current = null;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setPos((p) => Math.max(0.04, p - 0.05));
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      setPos((p) => Math.min(0.96, p + 0.05));
    }
  };

  const xPx = pos * 640;
  const ctrlX = Math.max(8, Math.min(632, xPx + bend));
  const curvePath = `M ${xPx.toFixed(2)} 0 Q ${ctrlX.toFixed(2)} 180 ${xPx.toFixed(2)} 360`;
  const beforeClipPct = `${(pos * 100).toFixed(2)}%`;

  // Use SVG clipPath with objectBoundingBox (0..1 normalized coords) so the curved edge scales crisply at any width!
  const nx = pos;
  const nCtrl = Math.max(0.01, Math.min(0.99, pos + bend / 640));
  const clipId = `cmp-clip-${item.id}`;

  return (
    <motion.figure
      initial={{ opacity: 0, y: 28, scale: 0.97 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.72, ease: [0.22, 1, 0.36, 1] }}
      className="group m-0 flex flex-col"
    >
      <div
        ref={containerRef}
        role="slider"
        tabIndex={0}
        aria-label={`${item.title} — before and after comparison`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pos * 100)}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onKeyDown={handleKeyDown}
        className="relative aspect-video w-full cursor-ew-resize select-none overflow-hidden rounded-2xl border border-white/12 bg-card shadow-2xl transition-[border-color,box-shadow] duration-300 hover:border-primary/60 hover:shadow-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary touch-none"
      >
        {/* Dynamic curved SVG clipPath definition */}
        <svg className="pointer-events-none absolute h-0 w-0" aria-hidden="true">
          <defs>
            <clipPath id={clipId} clipPathUnits="objectBoundingBox">
              <path
                d={`M 0 0 L ${nx.toFixed(4)} 0 Q ${nCtrl.toFixed(4)} 0.5 ${nx.toFixed(4)} 1 L 0 1 Z`}
              />
            </clipPath>
          </defs>
        </svg>

        {/* After (Final Finished Thumbnail — Base Layer) */}
        <img
          src={item.afterSrc}
          alt={`${item.title} — final thumbnail`}
          loading="lazy"
          draggable={false}
          referrerPolicy="no-referrer"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        />

        {/* Before (Raw 3D Render / Base Shot — Curved Clipped Layer) */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{ clipPath: `url(#${clipId})` }}
        >
          <img
            src={item.beforeSrc}
            alt={`${item.title} — raw before shot`}
            loading="lazy"
            draggable={false}
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover"
          />
        </div>

        {/* Floating glass Before / After tags */}
        <span
          className="pointer-events-none absolute left-3.5 top-3.5 z-10 rounded-full border border-white/15 bg-black/65 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-white backdrop-blur-md transition-opacity duration-200"
          style={{ opacity: pos > 0.16 ? 1 : 0 }}
        >
          Before
        </span>
        <span
          className="pointer-events-none absolute right-3.5 top-3.5 z-10 rounded-full border border-primary/40 bg-primary/85 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-white shadow-md backdrop-blur-md transition-opacity duration-200"
          style={{ opacity: pos < 0.84 ? 1 : 0 }}
        >
          After
        </span>

        {/* Elastic curved glowing divider line */}
        <svg
          className="pointer-events-none absolute inset-0 z-10 h-full w-full"
          viewBox="0 0 640 360"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            d={curvePath}
            fill="none"
            stroke="rgba(255,255,255,0.92)"
            strokeWidth="2.4"
            style={{ filter: 'drop-shadow(0 0 10px rgba(168, 85, 247, 0.85))' }}
          />
        </svg>

        {/* Tactile Drag Handle Knob */}
        <span
          className="pointer-events-none absolute top-1/2 z-20 -translate-x-1/2 -translate-y-1/2"
          style={{
            left: `calc(${beforeClipPct} + ${(bend * 0.25).toFixed(1)}px)`,
          }}
        >
          <span
            className={`grid h-10 w-10 place-items-center rounded-full border-2 border-white/90 bg-[#140e24]/90 text-white shadow-[0_0_24px_rgba(168,85,247,0.75)] backdrop-blur-md transition-transform duration-150 ${
              dragging ? 'scale-110 bg-primary' : 'group-hover:scale-105'
            }`}
          >
            <svg width="16" height="10" viewBox="0 0 16 10" aria-hidden="true">
              <path
                d="M5 1 1 5l4 4M11 1l4 4-4 4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </span>
      </div>
    </motion.figure>
  );
}

export function BeforeAfterShowcase({ items }: { items: BeforeAfterItem[] }) {
  return (
    <div id="before-after" className="mx-auto mt-20 max-w-6xl">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-kicker">
          Before / After
        </p>
        <h3 className="font-display mt-3 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl md:text-5xl">
          From raw shot to <span className="text-primary">the click.</span>
        </h3>
        <p className="mt-3 text-sm text-muted-foreground sm:text-base">
          Drag the slider across each frame to see lighting, depth, color grading, and visual
          storytelling transform raw renders.
        </p>
      </div>

      <div className="mt-10 grid gap-7 md:grid-cols-2">
        {items.map((item) => (
          <ComparisonCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}
