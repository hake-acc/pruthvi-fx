import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';

export interface LightboxImage {
  src: string;
  alt: string;
  title?: string;
  videoUrl?: string;
}

const ZOOM_LEVELS = [1, 1.5, 2.2];
const EASE = [0.22, 1, 0.36, 1] as const;

const iconBtnClass =
  'grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-full border border-border bg-card/85 text-foreground backdrop-blur-md transition-all duration-300 hover:scale-110 hover:border-primary hover:text-primary hover:shadow-glow active:scale-95 disabled:pointer-events-none disabled:opacity-40';

interface LightboxProps {
  image: LightboxImage | null;
  items: LightboxImage[];
  onChange: (item: LightboxImage) => void;
  onClose: () => void;
}

export function Lightbox({ image, items, onChange, onClose }: LightboxProps) {
  const reduced = useReducedMotion();
  const stripRef = useRef<HTMLDivElement | null>(null);
  const [direction, setDirection] = useState(1);
  const [zoomIdx, setZoomIdx] = useState(0);

  const activeIdx = image ? items.findIndex((item) => item.src === image.src) : -1;
  const hasMultiple = items.length > 1 && activeIdx >= 0;

  useEffect(() => {
    setZoomIdx(0);
  }, [image?.src]);

  useEffect(() => {
    if (!image) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight' && hasMultiple) {
        const next = items[(activeIdx + 1) % items.length];
        if (next) {
          setDirection(1);
          onChange(next);
        }
      } else if (e.key === 'ArrowLeft' && hasMultiple) {
        const prev = items[(activeIdx - 1 + items.length) % items.length];
        if (prev) {
          setDirection(-1);
          onChange(prev);
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [image, activeIdx, hasMultiple, items, onChange, onClose]);

  useEffect(() => {
    stripRef.current
      ?.querySelector('[aria-current="true"]')
      ?.scrollIntoView({
        behavior: reduced ? 'auto' : 'smooth',
        inline: 'center',
        block: 'nearest',
      });
  }, [activeIdx, reduced]);

  const navigate = (delta: number) => {
    if (!hasMultiple) return;
    const next = items[(activeIdx + delta + items.length) % items.length];
    if (next) {
      setDirection(delta);
      onChange(next);
    }
  };

  const transition = { duration: reduced ? 0 : 0.45, ease: EASE };

  return (
    <AnimatePresence>
      {image && (
        <motion.div
          key="lightbox-root"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduced ? 0 : 0.25 }}
          role="dialog"
          aria-modal="true"
          aria-label={image.alt}
          className="fixed inset-0 z-[110] flex flex-col bg-background/95 backdrop-blur-xl outline-none"
        >
          {/* Top toolbar */}
          <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <div className="flex min-w-0 items-baseline gap-2.5">
              {hasMultiple && (
                <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                  {activeIdx + 1} / {items.length}
                </span>
              )}
              {image.title && (
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={image.src}
                    initial={{ opacity: 0, y: reduced ? 0 : 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: reduced ? 0 : -6 }}
                    transition={{ duration: reduced ? 0 : 0.22, ease: EASE }}
                    className="truncate text-sm font-semibold text-foreground"
                  >
                    {image.title}
                  </motion.span>
                </AnimatePresence>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className={iconBtnClass}
                aria-label="Zoom out"
                disabled={zoomIdx === 0}
                onClick={() => setZoomIdx((z) => Math.max(0, z - 1))}
              >
                <ZoomOut className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                className={iconBtnClass}
                aria-label="Zoom in"
                disabled={zoomIdx === ZOOM_LEVELS.length - 1}
                onClick={() => setZoomIdx((z) => Math.min(ZOOM_LEVELS.length - 1, z + 1))}
              >
                <ZoomIn className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                data-sound="close"
                className={`${iconBtnClass} hover:rotate-90`}
                aria-label="Close thumbnail"
                onClick={onClose}
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Center viewer */}
          <div
            className="relative flex min-h-0 flex-1 items-center justify-center px-3 sm:px-20"
            onClick={(e) => {
              if (e.target === e.currentTarget) onClose();
            }}
          >
            {hasMultiple && (
              <button
                type="button"
                aria-label="Previous thumbnail"
                onClick={() => navigate(-1)}
                className={`${iconBtnClass} absolute left-4 z-10 hidden sm:grid`}
              >
                <ChevronLeft className="h-5 w-5" aria-hidden="true" />
              </button>
            )}

            <figure
              className="m-0 flex w-full min-w-0 flex-col items-center gap-4"
              style={{ maxWidth: 'min(72rem, calc((100svh - 16rem) * 16 / 9))' }}
            >
              <div className="relative aspect-video w-full">
                <AnimatePresence initial={false} custom={direction} mode="popLayout">
                  <motion.div
                    key={image.src}
                    custom={direction}
                    initial={{
                      opacity: 0,
                      x: reduced ? 0 : `${direction * 18}%`,
                      scale: reduced ? 1 : 0.96,
                    }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{
                      opacity: 0,
                      x: reduced ? 0 : `${direction * -18}%`,
                      scale: reduced ? 1 : 0.96,
                    }}
                    transition={transition}
                    drag={hasMultiple && zoomIdx === 0 ? 'x' : false}
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={0.6}
                    onDragEnd={(_, info) => {
                      if (
                        Math.abs(info.offset.x) > 60 ||
                        Math.abs(info.velocity.x) > 400
                      ) {
                        navigate(info.offset.x < 0 ? 1 : -1);
                      }
                    }}
                    onDoubleClick={() => setZoomIdx((z) => (z === 0 ? 1 : 0))}
                    onWheel={(e) => {
                      setZoomIdx((z) =>
                        Math.max(0, Math.min(ZOOM_LEVELS.length - 1, z + (e.deltaY < 0 ? 1 : -1)))
                      );
                    }}
                    className={`absolute inset-0 touch-pan-y select-none overflow-hidden rounded-lg border border-thumb-border bg-card shadow-2xl ${
                      zoomIdx > 0 ? 'cursor-zoom-out' : 'cursor-zoom-in'
                    }`}
                  >
                    <motion.img
                      src={image.src}
                      alt={image.alt}
                      width={1280}
                      height={720}
                      draggable={false}
                      referrerPolicy="no-referrer"
                      animate={{ scale: ZOOM_LEVELS[zoomIdx] ?? 1 }}
                      drag={zoomIdx > 0}
                      dragConstraints={{
                        left: -300 * zoomIdx,
                        right: 300 * zoomIdx,
                        top: -200 * zoomIdx,
                        bottom: 200 * zoomIdx,
                      }}
                      transition={transition}
                      className="pointer-events-auto h-full w-full object-contain"
                    />
                  </motion.div>
                </AnimatePresence>
              </div>

              <figcaption className="grid min-h-6 w-full place-items-center text-center text-sm font-semibold text-foreground">
                <AnimatePresence initial={false} mode="wait">
                  <motion.span
                    key={image.src}
                    initial={{ opacity: 0, y: reduced ? 0 : 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: reduced ? 0 : -8 }}
                    transition={{ duration: reduced ? 0 : 0.2, ease: EASE }}
                    className="max-w-full break-words"
                  >
                    {image.title ?? (activeIdx >= 0 ? `Thumbnail #${activeIdx + 1}` : 'Thumbnail')}
                  </motion.span>
                </AnimatePresence>
              </figcaption>

              {image.videoUrl && (
                <a
                  href={image.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-4 py-2 text-xs font-semibold text-foreground transition-all duration-200 hover:-translate-y-0.5 hover:border-primary hover:text-primary"
                >
                  <span>Watch Video</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </figure>

            {hasMultiple && (
              <button
                type="button"
                aria-label="Next thumbnail"
                onClick={() => navigate(1)}
                className={`${iconBtnClass} absolute right-4 z-10 hidden sm:grid`}
              >
                <ChevronRight className="h-5 w-5" aria-hidden="true" />
              </button>
            )}
          </div>

          {/* Bottom filmstrip */}
          {hasMultiple && (
            <div className="flex items-center justify-center gap-3 px-4 pb-5 pt-2">
              <button
                type="button"
                aria-label="Previous thumbnail"
                onClick={() => navigate(-1)}
                className={`${iconBtnClass} sm:hidden`}
              >
                <ChevronLeft className="h-5 w-5" aria-hidden="true" />
              </button>

              <div
                ref={stripRef}
                className="no-scrollbar flex max-w-full items-center gap-2.5 overflow-x-auto px-2 py-2"
              >
                {items.map((item, idx) => {
                  const isCurrent = idx === activeIdx;
                  return (
                    <button
                      key={item.src}
                      type="button"
                      aria-label={`View ${item.title ?? `Thumbnail #${idx + 1}`}`}
                      aria-current={isCurrent ? 'true' : undefined}
                      onClick={() => {
                        setDirection(idx >= activeIdx ? 1 : -1);
                        onChange(item);
                      }}
                      className={`relative aspect-video w-20 shrink-0 cursor-pointer overflow-visible rounded-md transition-all duration-300 sm:w-24 ${
                        isCurrent
                          ? 'scale-105 opacity-100'
                          : 'opacity-50 hover:opacity-85'
                      }`}
                    >
                      <img
                        src={item.src}
                        alt=""
                        referrerPolicy="no-referrer"
                        className="h-full w-full rounded-md border border-border object-cover"
                      />
                      {isCurrent && (
                        <>
                          <span className="absolute -left-0.5 -top-0.5 h-2.5 w-2.5 rounded-tl-sm border-l-2 border-t-2 border-primary" />
                          <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-tr-sm border-r-2 border-t-2 border-primary" />
                          <span className="absolute -bottom-0.5 -left-0.5 h-2.5 w-2.5 rounded-bl-sm border-b-2 border-l-2 border-primary" />
                          <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-br-sm border-b-2 border-r-2 border-primary" />
                        </>
                      )}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                aria-label="Next thumbnail"
                onClick={() => navigate(1)}
                className={`${iconBtnClass} sm:hidden`}
              >
                <ChevronRight className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
