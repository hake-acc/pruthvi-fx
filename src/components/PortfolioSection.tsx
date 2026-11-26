import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowLeft, ArrowUpRight, ChevronDown, FolderOpen, Image as ImageIcon } from 'lucide-react';
import type { Category, ThumbnailItem } from '../data/portfolio';
import { LazyImage, TiltCard } from './MotionHelpers';

function useProgressiveCount(total: number) {
  const initial = Math.min(9, total);
  const [count, setCount] = useState(initial);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setCount(Math.min(9, total));
    setExpanded(false);
  }, [total]);

  const target = expanded ? total : initial;

  useEffect(() => {
    if (count === target) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setCount(target);
      return;
    }
    const timer = window.setTimeout(() => {
      setCount((c) => c + (target > c ? 1 : -1));
    }, 100);
    return () => window.clearTimeout(timer);
  }, [count, target]);

  return {
    count,
    expanded,
    animating: count !== target,
    toggle: () => setExpanded((e) => !e),
  };
}

interface PortfolioSectionProps {
  categories: Category[];
  activeCategoryId: string | null;
  onSelectCategory: (id: string | null) => void;
  thumbnails: ThumbnailItem[];
  onSelectThumbnail: (item: ThumbnailItem) => void;
  brandName: string;
}

export function PortfolioSection({
  categories,
  activeCategoryId,
  onSelectCategory,
  thumbnails,
  onSelectThumbnail,
  brandName,
}: PortfolioSectionProps) {
  const activeCategory = activeCategoryId
    ? categories.find((c) => c.id === activeCategoryId)
    : undefined;
  const filtered = activeCategoryId
    ? thumbnails.filter((t) => t.categoryId === activeCategoryId)
    : [];
  const { count, expanded, animating, toggle } = useProgressiveCount(filtered.length);
  const reduced = useReducedMotion();
  const transition = {
    duration: reduced ? 0 : 0.38,
    ease: [0.22, 1, 0.36, 1] as const,
  };

  return (
    <div className="mx-auto mt-12 max-w-7xl">
      <AnimatePresence mode="wait" initial={false}>
        {activeCategory ? (
          <motion.div
            key={`category-view-${activeCategory.id}`}
            initial={{ opacity: 0, y: reduced ? 0 : 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduced ? 0 : -10 }}
            transition={transition}
          >
            <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-border bg-card/70 p-4 backdrop-blur-md sm:flex-row sm:px-5">
              <div className="flex flex-wrap items-center justify-center gap-3 sm:justify-start">
                <button
                  type="button"
                  data-sound="close"
                  onClick={() => onSelectCategory(null)}
                  className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border border-border bg-background/80 px-4 text-xs font-semibold text-foreground transition-all duration-200 hover:-translate-x-0.5 hover:border-primary hover:text-primary active:scale-95 whitespace-nowrap shrink-0"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  All Categories
                </button>
                <div className="text-center sm:text-left">
                  <div className="flex items-center justify-center gap-2 sm:justify-start">
                    <h3 className="font-display text-lg font-extrabold text-foreground">
                      {activeCategory.name}
                    </h3>
                    <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-semibold text-primary tabular-nums">
                      {filtered.length}
                    </span>
                  </div>
                  {activeCategory.description && (
                    <p className="text-xs text-muted-foreground">
                      {activeCategory.description}
                    </p>
                  )}
                </div>
              </div>

              <div
                role="tablist"
                aria-label="Switch thumbnail category"
                className="flex flex-wrap items-center justify-center gap-1.5"
              >
                {categories.map((cat) => {
                  const isActive = cat.id === activeCategory.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => onSelectCategory(cat.id)}
                      className={`cursor-pointer rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 hover:-translate-y-0.5 active:scale-95 whitespace-nowrap shrink-0 ${
                        isActive
                          ? 'btn-gradient-surface bg-primary text-primary-foreground shadow-glow'
                          : 'border border-border bg-background/70 text-muted-foreground hover:border-primary/50 hover:text-foreground'
                      }`}
                    >
                      {cat.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="mx-auto mt-10 flex max-w-md flex-col items-center gap-3 rounded-3xl border border-dashed border-border bg-card/40 px-6 py-12 text-center">
                <div className="grid h-12 w-12 place-items-center rounded-full border border-border bg-card text-primary">
                  <ImageIcon className="h-5 w-5" />
                </div>
                <p className="font-display text-lg font-bold text-foreground">
                  No thumbnails in {activeCategory.name} yet
                </p>
                <p className="text-sm text-muted-foreground">
                  More fresh designs coming soon.
                </p>
              </div>
            ) : (
              <motion.div
                layout={!reduced}
                id="thumbnail-grid"
                className="relative mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
                transition={transition}
              >
                <AnimatePresence mode="popLayout" initial={false}>
                  {filtered.slice(0, count).map((item, idx) => (
                    <motion.div
                      key={item.id}
                      layout={!reduced}
                      initial={{
                        opacity: 0,
                        y: reduced ? 0 : 22,
                        scale: reduced ? 1 : 0.97,
                      }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{
                        opacity: 0,
                        y: reduced ? 0 : -12,
                        scale: reduced ? 1 : 0.96,
                        pointerEvents: 'none',
                      }}
                      transition={{
                        ...transition,
                        delay: reduced ? 0 : Math.min(idx * 0.04, 0.24),
                      }}
                      className="min-w-0"
                    >
                      <TiltCard
                        maxTilt={7}
                        hoverScale={1.03}
                        glare
                        glareClassName="rounded-lg"
                      >
                        <button
                          type="button"
                          data-sound="open"
                          data-hover-sound="true"
                          onClick={() => onSelectThumbnail(item)}
                          aria-label={`View ${item.title}`}
                          className="thumb card-hover-shine group relative block h-auto w-full cursor-pointer overflow-hidden rounded-lg border border-thumb-border bg-card p-0 shadow-xl transition-[border-color,box-shadow,transform] duration-300 ease-out hover:border-primary hover:shadow-glow active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-primary"
                        >
                          <LazyImage
                            src={item.src}
                            alt={`${item.title} — ${activeCategory.name} thumbnail by ${brandName}`}
                            width={1280}
                            height={720}
                            className="aspect-video w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                          />
                          <span className="pointer-events-none absolute inset-x-0 bottom-0 flex translate-y-2 items-end justify-between gap-2 bg-gradient-to-t from-background/95 via-background/55 to-transparent p-3 pt-10 opacity-0 transition-[opacity,transform] duration-300 ease-out group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100">
                            <span className="truncate text-sm font-semibold text-foreground">
                              {item.title || `Thumbnail #${idx + 1}`}
                            </span>
                            {item.client && (
                              <span className="shrink-0 text-xs font-medium text-primary">
                                {item.client}
                              </span>
                            )}
                          </span>
                        </button>
                      </TiltCard>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            )}

            {filtered.length > 9 && (
              <div className="mt-10 flex justify-center">
                <button
                  type="button"
                  onClick={toggle}
                  aria-expanded={expanded}
                  aria-controls="thumbnail-grid"
                  className="group relative inline-flex h-auto cursor-pointer items-center gap-2 rounded-full border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/60 hover:bg-accent hover:text-primary active:scale-95"
                >
                  <span>
                    {expanded ? 'Show less' : `Show more (${filtered.length - 9})`}
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform duration-300 ${
                      expanded ? 'rotate-180' : ''
                    } ${animating ? 'opacity-60' : ''}`}
                  />
                </button>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="category-boxes"
            initial={{ opacity: 0, y: reduced ? 0 : 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduced ? 0 : -10 }}
            transition={transition}
            className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
          >
            {categories.map((cat, idx) => {
              const items = thumbnails.filter((t) => t.categoryId === cat.id);
              const cover = items[0];

              return (
                <TiltCard
                  key={cat.id}
                  maxTilt={6}
                  hoverScale={1.02}
                  glare
                  glareClassName="rounded-2xl"
                  className="h-full"
                >
                  <motion.button
                    type="button"
                    data-sound="open"
                    data-hover-sound="true"
                    initial={{
                      opacity: 0,
                      y: reduced ? 0 : 18,
                      scale: reduced ? 1 : 0.97,
                    }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{
                      ...transition,
                      delay: reduced ? 0 : Math.min(idx * 0.06, 0.3),
                    }}
                    whileTap={reduced ? undefined : { scale: 0.985 }}
                    onClick={() => onSelectCategory(cat.id)}
                    aria-label={`Open ${cat.name} category (${items.length} thumbnails)`}
                    className="card-hover-shine group relative flex h-full w-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-border bg-card/85 text-left shadow-xl transition-[border-color,box-shadow] duration-300 ease-out hover:border-primary hover:shadow-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <div className="relative aspect-video w-full overflow-hidden bg-muted/40">
                      {cover ? (
                        <>
                          <LazyImage
                            src={cover.src}
                            alt={`${cat.name} thumbnails cover`}
                            width={1280}
                            height={720}
                            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                          />
                          <div
                            aria-hidden="true"
                            className="absolute inset-0 bg-gradient-to-t from-card via-card/25 to-transparent"
                          />
                        </>
                      ) : (
                        <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground">
                          <FolderOpen className="h-8 w-8 text-primary/70" />
                          <span className="text-xs font-medium">No thumbnails yet</span>
                        </div>
                      )}

                      <div className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-background/85 px-3 py-1 text-xs font-semibold text-foreground backdrop-blur-md transition-transform duration-300 group-hover:scale-105">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                        <span className="tabular-nums">
                          {items.length} {items.length === 1 ? 'Thumbnail' : 'Thumbnails'}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-1 items-center justify-between gap-4 p-5">
                      <div className="min-w-0">
                        <h3 className="font-display text-xl font-extrabold tracking-tight text-foreground transition-colors duration-300 group-hover:text-primary">
                          {cat.name}
                        </h3>
                        {cat.description ? (
                          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                            {cat.description}
                          </p>
                        ) : (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Click to explore {cat.name} thumbnails
                          </p>
                        )}
                      </div>

                      <span className="btn-gradient-surface grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border bg-background/80 text-foreground transition-all duration-300 group-hover:scale-110 group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground">
                        <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      </span>
                    </div>
                  </motion.button>
                </TiltCard>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
