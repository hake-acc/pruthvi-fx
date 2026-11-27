import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { MotionConfig, motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import type { ThumbnailItem } from './data/portfolio';
import { useLivePortfolio } from './hooks/useLivePortfolio';
import { AdminPanel } from './components/AdminPanel';
import { attachGlobalSoundListeners } from './lib/sound';
import { AmbientBackground } from './components/AmbientBackground';
import { HeroBackground } from './components/HeroBackground';
import { AnimatedCurls } from './components/AnimatedCurls';
import { OpeningReveal } from './components/OpeningReveal';
import {
  HeroTitle,
  LazyImage,
  Reveal,
  ScrollParallax,
  WordReveal,
} from './components/MotionHelpers';
import {
  DiscordIcon,
  HeartIcon,
  SoundToggle,
  ThemeToggle,
  XIcon,
} from './components/Controls';
import { PortfolioSection } from './components/PortfolioSection';
import { BeforeAfterShowcase } from './components/BeforeAfterSlider';
import { ClientMarquee } from './components/ClientMarquee';
import { Lightbox, type LightboxImage } from './components/Lightbox';
import { FaqAccordion } from './components/FaqAccordion';
import { CpsAvatar } from './components/CpsAvatar';

const EASE = [0.16, 1, 0.3, 1] as const;

const NAV_ITEMS = [
  { id: 'about', label: 'About' },
  { id: 'work', label: 'Work' },
  { id: 'clients', label: 'Clients' },
  { id: 'faq', label: 'FAQ' },
  { id: 'contact', label: 'Contact' },
] as const;

const SCROLL_SECTIONS = [
  'home',
  'about',
  'work',
  'clients',
  'faq',
  'contact',
] as const;

let activeScrollRaf = 0;

function smoothScrollToY(targetY: number, duration = 480) {
  if (activeScrollRaf) {
    cancelAnimationFrame(activeScrollRaf);
    activeScrollRaf = 0;
  }

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clampedTarget = Math.max(
    0,
    Math.min(targetY, document.documentElement.scrollHeight - window.innerHeight)
  );

  if (reduced) {
    window.scrollTo({ top: clampedTarget, behavior: 'instant' });
    return;
  }

  const startY = window.scrollY;
  const delta = clampedTarget - startY;
  if (Math.abs(delta) < 2) return;

  const startTime = performance.now();

  const stopOnUserInput = () => {
    if (activeScrollRaf) {
      cancelAnimationFrame(activeScrollRaf);
      activeScrollRaf = 0;
    }
    cleanup();
  };

  const cleanup = () => {
    window.removeEventListener('wheel', stopOnUserInput);
    window.removeEventListener('touchstart', stopOnUserInput);
  };

  window.addEventListener('wheel', stopOnUserInput, { passive: true });
  window.addEventListener('touchstart', stopOnUserInput, { passive: true });

  const step = (now: number) => {
    const t = Math.min(1, (now - startTime) / duration);
    // Snappy, buttery easeOutQuart curve
    const eased = 1 - Math.pow(1 - t, 4);
    window.scrollTo({ top: startY + delta * eased, behavior: 'instant' });
    if (t < 1) {
      activeScrollRaf = requestAnimationFrame(step);
    } else {
      activeScrollRaf = 0;
      cleanup();
    }
  };

  activeScrollRaf = requestAnimationFrame(step);
}

function scrollToSection(id: string) {
  if (id === 'home') {
    smoothScrollToY(0);
    return;
  }

  const el = document.getElementById(id);
  if (!el) return;

  const rect = el.getBoundingClientRect();
  const style = window.getComputedStyle(el);
  const padTop = parseFloat(style.paddingTop) || 0;
  const padBottom = parseFloat(style.paddingBottom) || 0;

  const contentTop = window.scrollY + rect.top + padTop;
  const contentHeight = rect.height - padTop - padBottom;
  const navClearance = 84;
  const availableHeight = window.innerHeight - navClearance - 24;

  let targetTop: number;
  if (contentHeight > 0 && contentHeight < availableHeight) {
    targetTop = contentTop - navClearance - (availableHeight - contentHeight) / 2;
  } else {
    targetTop = contentTop - navClearance;
  }

  smoothScrollToY(Math.round(targetTop));
}

const PRIMARY_BTN =
  'btn-shine inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-glow ring-1 ring-inset ring-white/10 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:brightness-110 active:scale-95 whitespace-nowrap shrink-0';

const SECONDARY_BTN =
  'btn-shine inline-flex items-center justify-center gap-2 rounded-full border border-white/12 bg-card/80 px-6 py-3 text-sm font-semibold text-foreground backdrop-blur-sm transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-primary/60 hover:bg-secondary hover:text-foreground hover:shadow-glow active:scale-95 whitespace-nowrap shrink-0';

function useScrollState() {
  const [active, setActive] = useState<string>('about');
  const [scrolled, setScrolled] = useState(false);
  const lockUntilRef = useRef(0);
  const currentActiveRef = useRef('about');

  const setActiveImmediate = useCallback((id: string) => {
    const resolved = id === 'home' ? 'about' : id;
    lockUntilRef.current = performance.now() + 560;
    currentActiveRef.current = resolved;
    setActive(resolved);
  }, []);

  useEffect(() => {
    let rafId = 0;
    let currentScrolled = false;

    const update = () => {
      rafId = 0;
      const doc = document.documentElement;
      const top = doc.scrollTop;

      const nextScrolled = top > 20;
      if (nextScrolled !== currentScrolled) {
        currentScrolled = nextScrolled;
        setScrolled(nextScrolled);
      }

      if (performance.now() < lockUntilRef.current) return;

      let nextActive = 'about';
      const atBottom = top + window.innerHeight >= doc.scrollHeight - 28;
      if (atBottom) {
        nextActive = 'contact';
      } else {
        for (const id of SCROLL_SECTIONS) {
          const el = document.getElementById(id);
          if (!el) continue;
          const padTop = parseFloat(window.getComputedStyle(el).paddingTop) || 0;
          const visualTop = el.getBoundingClientRect().top + padTop;
          if (visualTop < window.innerHeight * 0.5) {
            nextActive = id === 'home' ? 'about' : id;
          }
        }
      }
      if (nextActive !== currentActiveRef.current) {
        currentActiveRef.current = nextActive;
        setActive(nextActive);
      }
    };

    const schedule = () => {
      if (!rafId) rafId = requestAnimationFrame(update);
    };

    const ro = new ResizeObserver(schedule);
    ro.observe(document.body);
    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });

    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      ro.disconnect();
      cancelAnimationFrame(rafId);
    };
  }, []);

  return { active, scrolled, setActiveImmediate };
}

function toLightboxImage(
  thumb: ThumbnailItem,
  categoryName: string | undefined,
  brandName: string
): LightboxImage {
  return {
    src: thumb.src,
    alt: `${thumb.title}${categoryName ? ` (${categoryName})` : ''} thumbnail by ${brandName}`,
    title: thumb.title,
    videoUrl: thumb.videoUrl,
  };
}

function isAdminRouteHash(): boolean {
  if (typeof window === 'undefined') return false;
  const normalized = window.location.hash.replace(/\/+$/, '').toLowerCase();
  return normalized === '#ad';
}

export default function App() {
  const { data } = useLivePortfolio();
  const { active, scrolled, setActiveImmediate } = useScrollState();
  const [heroReady, setHeroReady] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [hoveredNav, setHoveredNav] = useState<string | null>(null);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<LightboxImage | null>(null);
  const [adminOpen, setAdminOpen] = useState<boolean>(() => isAdminRouteHash());

  useEffect(() => {
    return attachGlobalSoundListeners();
  }, []);

  // Open Admin Panel when URL ends with /#ad (or #ad)
  useEffect(() => {
    const syncFromHash = () => {
      setAdminOpen(isAdminRouteHash());
    };
    window.addEventListener('hashchange', syncFromHash);
    window.addEventListener('popstate', syncFromHash);
    return () => {
      window.removeEventListener('hashchange', syncFromHash);
      window.removeEventListener('popstate', syncFromHash);
    };
  }, []);

  const handleCloseAdmin = useCallback(() => {
    setAdminOpen(false);
    if (typeof window !== 'undefined' && isAdminRouteHash()) {
      window.history.replaceState(null, '', window.location.pathname || '/');
    }
  }, []);

  // If currently open category is deleted live in Admin Panel, reset smoothly
  useEffect(() => {
    if (activeCategoryId && !data.categories.some((c) => c.id === activeCategoryId)) {
      setActiveCategoryId(null);
    }
  }, [activeCategoryId, data.categories]);

  const handleRevealComplete = useCallback((ready: boolean) => {
    setHeroReady(ready);
  }, []);

  const activeCategory = data.categories.find((c) => c.id === activeCategoryId);

  const lightboxItems = useMemo(
    () =>
      data.thumbnails
        .filter((t) => t.categoryId === activeCategoryId)
        .map((t) => toLightboxImage(t, activeCategory?.name, data.brandName)),
    [data.thumbnails, activeCategoryId, activeCategory?.name, data.brandName]
  );

  const heroRows = useMemo(
    () => [
      [
        { word: data.brandPrefix, hl: false },
        { word: data.brandSuffix, hl: false },
      ],
    ],
    [data.brandPrefix, data.brandSuffix]
  );

  const socialLinks = useMemo(
    () => [
      { href: data.socials.discord, label: 'Discord', Icon: DiscordIcon },
      { href: data.socials.x, label: `X (${data.socials.xHandle})`, Icon: XIcon },
    ],
    [data.socials.discord, data.socials.x, data.socials.xHandle]
  );

  const handleNavClick = useCallback(
    (id: string) => (e: MouseEvent<HTMLAnchorElement>) => {
      e.preventDefault();
      setMenuOpen(false);
      setActiveImmediate(id);
      scrollToSection(id);
    },
    [setActiveImmediate]
  );

  return (
    <MotionConfig reducedMotion="user">
      <div className="portfolio-page relative isolate min-h-screen overflow-x-hidden bg-background text-center text-foreground">
        <AmbientBackground />
        <OpeningReveal
          logoSrc={data.logoSrc}
          brandName={data.brandName}
          onComplete={handleRevealComplete}
        />

        {/* Clean Top Navigation Bar (smokefx.skiez.xyz style) */}
        <motion.header
          initial={{ y: -64, opacity: 0 }}
          animate={heroReady ? { y: 0, opacity: 1 } : { y: -64, opacity: 0 }}
          transition={{ duration: 0.65, ease: EASE }}
          className="fixed inset-x-0 top-0 z-50"
        >
          <nav
            className={`top-navbar relative z-50 flex h-16 w-full items-center justify-between gap-3 px-4 transition-all duration-300 sm:px-6 ${
              scrolled || menuOpen ? 'top-navbar-scrolled' : ''
            }`}
          >
            {/* Brand Lockup */}
            <a
              href="#home"
              onClick={handleNavClick('home')}
              className="group flex min-w-0 items-center gap-2.5 shrink-0"
            >
              <img
                src={data.logoSrc}
                alt={data.brandName}
                referrerPolicy="no-referrer"
                className="size-8 shrink-0 rounded-full object-cover ring-2 ring-primary/35 transition-transform duration-300 group-hover:scale-105 group-hover:ring-primary"
              />
              <span className="truncate font-display text-base font-extrabold tracking-tight">
                <span className="text-primary">{data.brandPrefix}</span>
                <span className="text-foreground">{data.brandSuffix}</span>
              </span>
            </a>

            {/* Centered Clean Nav List with Sliding Active & Smooth Hover Pill */}
            <ul
              onMouseLeave={() => setHoveredNav(null)}
              className="hidden items-center gap-0.5 md:flex"
            >
              {NAV_ITEMS.map((item) => {
                const isActive = active === item.id;
                const isHovered = hoveredNav === item.id;
                return (
                  <li key={item.id} className="relative">
                    {isHovered && !isActive && (
                      <motion.span
                        layoutId="smokefx-nav-hover"
                        transition={{ type: 'spring', stiffness: 460, damping: 34 }}
                        className="pointer-events-none absolute inset-0 rounded-full bg-foreground/[0.08]"
                      />
                    )}
                    {isActive && (
                      <motion.span
                        layoutId="smokefx-nav-pill"
                        transition={{ type: 'spring', stiffness: 440, damping: 32 }}
                        className="pointer-events-none absolute inset-0 rounded-full bg-accent shadow-sm"
                      />
                    )}
                    <a
                      href={`#${item.id}`}
                      onMouseEnter={() => setHoveredNav(item.id)}
                      onFocus={() => setHoveredNav(item.id)}
                      onBlur={() => setHoveredNav(null)}
                      onClick={handleNavClick(item.id)}
                      aria-current={isActive ? 'true' : undefined}
                      className={`relative block rounded-full px-4 py-2 text-sm font-semibold transition-colors duration-200 whitespace-nowrap ${
                        isActive
                          ? 'text-accent-foreground'
                          : isHovered
                            ? 'text-foreground'
                            : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {item.label}
                    </a>
                  </li>
                );
              })}
            </ul>

            {/* Right Controls & Primary CTA */}
            <div className="flex items-center gap-2 shrink-0">
              <SoundToggle />
              <ThemeToggle defaultMode={data.theme.defaultMode} />
              <div className="hidden md:block">
                <a
                  href={data.socials.discord}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-shine inline-flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow ring-1 ring-inset ring-white/10 transition-all duration-200 hover:-translate-y-0.5 hover:brightness-110 active:scale-95 whitespace-nowrap"
                >
                  Let&apos;s talk
                </a>
              </div>

              <button
                type="button"
                onClick={() => setMenuOpen((o) => !o)}
                aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={menuOpen}
                className="relative z-50 grid size-10 cursor-pointer place-items-center rounded-full border border-border bg-card text-foreground transition-all duration-300 active:scale-90 md:hidden"
              >
                <span
                  className={`absolute h-0.5 w-4.5 rounded bg-foreground transition-all duration-300 ${
                    menuOpen ? 'rotate-45' : '-translate-y-1.5'
                  }`}
                />
                <span
                  className={`absolute h-0.5 w-4.5 rounded bg-foreground transition-all duration-300 ${
                    menuOpen ? 'scale-x-0 opacity-0' : ''
                  }`}
                />
                <span
                  className={`absolute h-0.5 w-4.5 rounded bg-foreground transition-all duration-300 ${
                    menuOpen ? '-rotate-45' : 'translate-y-1.5'
                  }`}
                />
              </button>
            </div>
          </nav>

          {/* Mobile dropdown */}
          <div
            className={`top-navbar grid transition-all duration-300 ease-out md:hidden ${
              menuOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
            }`}
          >
            <div className="overflow-hidden">
              <div className="flex flex-col gap-1 border-t border-border/60 px-4 py-3">
                {NAV_ITEMS.map((item) => {
                  const isActive = active === item.id;
                  return (
                    <a
                      key={item.id}
                      href={`#${item.id}`}
                      onClick={handleNavClick(item.id)}
                      className={`rounded-full px-4 py-2.5 text-left text-sm font-semibold transition-colors ${
                        isActive
                          ? 'bg-accent text-accent-foreground'
                          : 'text-muted-foreground hover:bg-card hover:text-foreground'
                      }`}
                    >
                      {item.label}
                    </a>
                  );
                })}
                <a
                  href={data.socials.discord}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => setMenuOpen(false)}
                  className={`${PRIMARY_BTN} mt-2`}
                >
                  Let&apos;s talk
                </a>
              </div>
            </div>
          </div>
        </motion.header>

        <main>
          {/* Hero Section with Choreographed Entrance */}
          <section
            id="home"
            className="hero-section relative flex min-h-screen items-center overflow-hidden px-5 pb-14 pt-24 sm:px-8 lg:pt-24"
          >
            <div
              aria-hidden="true"
              className="hero-glass pointer-events-none absolute inset-0 z-0 overflow-hidden"
            >
              <HeroBackground
                styleType={data.theme.bgStyle || 'geometric-waves'}
                customImageUrl={data.theme.bgImageUrl}
                primaryColor={data.theme.primaryColor}
                kickerColor={data.theme.kickerColor}
              />
            </div>

            {/* Subtle Hand-Drawn Animated SVG Curl Strokes */}
            <AnimatedCurls enabled={data.theme.showCurls !== false} count={14} minSize={28} maxSize={85} minOpacity={0.04} maxOpacity={0.12} seed={101} />

            <div className="relative z-20 mx-auto grid w-full max-w-6xl items-center gap-14 lg:grid-cols-[1.25fr_0.75fr] lg:gap-12">
              {/* Left Column */}
              <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
                {data.hero.availabilityOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 18 }}
                    animate={heroReady ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
                    transition={{ duration: 0.65, delay: 0.04, ease: EASE }}
                    className="inline-flex items-center gap-2.5 rounded-full border border-emerald-500/30 bg-emerald-950/60 px-4 py-1.5 text-xs font-medium text-emerald-100 backdrop-blur-sm"
                  >
                    <span className="availability-dot h-2 w-2 rounded-full bg-emerald-400" />
                    <span>{data.hero.availabilityText}</span>
                  </motion.div>
                )}

                <div className="mt-4">
                  <HeroTitle
                    ready={heroReady}
                    align="start"
                    className="hero-name"
                    rows={heroRows}
                  />
                </div>

                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={heroReady ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                  transition={{ duration: 0.72, delay: 0.22, ease: EASE }}
                  className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground sm:text-[1.2rem]"
                >
                  {data.hero.descriptionLine1}
                  <br className="hidden sm:inline" /> {data.hero.descriptionLine2Prefix}
                  <strong className="font-bold text-foreground">
                    {data.hero.descriptionHighlight}
                  </strong>
                </motion.p>

                {/* Hero CTAs */}
                <motion.div
                  initial={{ opacity: 0, y: 22 }}
                  animate={heroReady ? { opacity: 1, y: 0 } : { opacity: 0, y: 22 }}
                  transition={{ duration: 0.72, delay: 0.32, ease: EASE }}
                  className="mt-9 flex flex-wrap items-center justify-center gap-3.5 lg:justify-start"
                >
                  <a
                    href="#work"
                    onClick={handleNavClick('work')}
                    className="btn-shine inline-flex min-h-12 items-center justify-center gap-2.5 rounded-2xl bg-foreground px-7 py-3 text-sm font-semibold text-background shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:opacity-95 active:scale-95 whitespace-nowrap shrink-0"
                  >
                    <span>{data.hero.primaryCta}</span>
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </a>

                  <a
                    href={data.socials.discord}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-shine inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/[0.04] px-7 py-3 text-sm font-semibold text-foreground backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/60 hover:bg-white/[0.08] active:scale-95 whitespace-nowrap shrink-0"
                  >
                    {data.hero.secondaryCta}
                  </a>
                </motion.div>

                {/* 3-Stat Strip */}
                <motion.div
                  initial={{ opacity: 0, y: 22 }}
                  animate={heroReady ? { opacity: 1, y: 0 } : { opacity: 0, y: 22 }}
                  transition={{ duration: 0.72, delay: 0.42, ease: EASE }}
                  className="mt-12 grid w-full max-w-md grid-cols-3 divide-x divide-border text-center lg:max-w-lg lg:text-left"
                >
                  {data.hero.stats.map((stat, idx) => (
                    <div
                      key={stat.label}
                      className={idx === 0 ? 'pr-5' : idx === 1 ? 'px-5' : 'pl-5'}
                    >
                      <div className="font-display text-2xl font-extrabold tracking-tight text-foreground tabular-nums sm:text-3xl">
                        {stat.value}
                      </div>
                      <div className="mt-1 text-[11px] font-medium tracking-[0.14em] text-muted-foreground">
                        {stat.label}
                      </div>
                    </div>
                  ))}
                </motion.div>
              </div>

              {/* Right Column: Interactive 3D Tilt Avatar with Scroll Parallax */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 24 }}
                animate={
                  heroReady
                    ? { opacity: 1, scale: 1, y: 0 }
                    : { opacity: 0, scale: 0.9, y: 24 }
                }
                transition={{ duration: 0.82, delay: 0.18, ease: EASE }}
                className="flex items-center justify-center lg:justify-end"
              >
                <ScrollParallax offset={18}>
                  <CpsAvatar
                    src={data.logoSrc}
                    alt={data.brandName}
                    badgeText={data.hero.avatarBadge || data.brandName}
                  />
                </ScrollParallax>
              </motion.div>
            </div>
          </section>

          {/* About Section */}
          <section id="about" className="relative overflow-hidden px-5 py-24 sm:px-8 md:py-28">
            {/* Subtle Hand-Drawn Animated SVG Curl Strokes */}
            <AnimatedCurls enabled={data.theme.showCurls !== false} count={12} minSize={26} maxSize={75} minOpacity={0.04} maxOpacity={0.11} seed={202} />

            <div className="relative z-10 mx-auto grid max-w-5xl items-center gap-14 md:grid-cols-[minmax(0,280px)_1fr] md:gap-16 md:text-left">
              <Reveal className="relative mx-auto w-52 sm:w-60 md:w-full">
                <ScrollParallax offset={22}>
                  <div aria-hidden="true" className="about-aura absolute -inset-8 rounded-full" />
                  <div className="float-soft relative aspect-square overflow-hidden rounded-full border border-primary/40 bg-card p-2 shadow-glow">
                    <LazyImage
                      src={data.logoSrc}
                      alt={`${data.brandName} avatar`}
                      className="h-full w-full rounded-full object-cover"
                    />
                  </div>
                  <div className="absolute -bottom-4 left-1/2 inline-flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full border border-border bg-card/95 px-4 py-2 text-xs font-semibold backdrop-blur-md">
                    <span className="availability-dot h-2 w-2 rounded-full bg-online" />
                    {data.about.experienceBadge}
                  </div>
                </ScrollParallax>
              </Reveal>

              <Reveal delay={120}>
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-kicker">
                  {data.about.badge}
                </p>
                <h2 className="font-display mt-4 text-4xl font-extrabold leading-[1.05] md:text-5xl">
                  <WordReveal text={data.about.headingPrefix} />{' '}
                  <WordReveal
                    text={data.about.headingHighlight}
                    start={160}
                    className="studio-gradient-text"
                  />
                </h2>
                <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
                  {data.about.bio}
                </p>
                <div className="mt-8 flex flex-wrap items-center justify-center gap-3 md:justify-start">
                  <a
                    href={data.socials.discord}
                    target="_blank"
                    rel="noreferrer"
                    className={`${PRIMARY_BTN} min-h-12 !px-7`}
                  >
                    <DiscordIcon /> {data.about.ctaLabel}
                  </a>
                  <a
                    href={data.socials.x}
                    target="_blank"
                    rel="noreferrer"
                    className={`${SECONDARY_BTN} min-h-12 !px-5`}
                  >
                    <XIcon /> {data.socials.xHandle}
                  </a>
                </div>
              </Reveal>
            </div>
          </section>

          {/* Portfolio / Work + Before/After Section */}
          <section id="work" className="relative overflow-hidden px-4 py-24 md:px-6 md:py-28">
            {/* Subtle Hand-Drawn Animated SVG Curl Strokes */}
            <AnimatedCurls enabled={data.theme.showCurls !== false} count={15} minSize={28} maxSize={80} minOpacity={0.03} maxOpacity={0.10} seed={303} />

            <div className="relative z-10">
              <Reveal className="mx-auto max-w-2xl">
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-kicker">
                  Portfolio
                </p>
                <h2 className="font-display mt-4 text-4xl font-extrabold leading-[1.02] md:text-6xl">
                  <WordReveal text="Featured" />{' '}
                  <WordReveal text="work." start={180} className="studio-gradient-text" />
                </h2>
                <p className="mt-5 text-muted-foreground">
                  Browse Minecraft, Roblox, and IRL thumbnails built to grab attention and earn
                  the click.
                </p>
              </Reveal>

              <Reveal delay={90}>
                <PortfolioSection
                  categories={data.categories}
                  activeCategoryId={activeCategoryId}
                  onSelectCategory={setActiveCategoryId}
                  thumbnails={data.thumbnails}
                  onSelectThumbnail={(item) =>
                    setSelectedImage(toLightboxImage(item, activeCategory?.name, data.brandName))
                  }
                  brandName={data.brandName}
                />
              </Reveal>

              <Reveal delay={120}>
                <BeforeAfterShowcase items={data.beforeAfter} />
              </Reveal>

              <Lightbox
                image={selectedImage}
                items={lightboxItems}
                onChange={(img) => setSelectedImage(img)}
                onClose={() => setSelectedImage(null)}
              />
            </div>
          </section>

          {/* Clients Dual-Row Opposing Marquee Section */}
          <section id="clients" className="relative overflow-hidden py-24 md:py-32">
            {/* Subtle Hand-Drawn Animated SVG Curl Strokes */}
            <AnimatedCurls enabled={data.theme.showCurls !== false} count={12} minSize={25} maxSize={75} minOpacity={0.04} maxOpacity={0.12} seed={404} />

            <div className="relative z-10">
              <Reveal className="mx-auto max-w-3xl px-4">
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-kicker">
                  {data.clientsSection.kicker}
                </p>
                <h2 className="font-display mt-4 text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl md:text-6xl">
                  <WordReveal text={data.clientsSection.headingPrefix} />{' '}
                  <WordReveal
                    text={data.clientsSection.headingHighlight}
                    start={160}
                    className="studio-gradient-text"
                  />
                </h2>
                <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted-foreground">
                  {data.clientsSection.subtitle}
                </p>
              </Reveal>

              <Reveal delay={120}>
                <ClientMarquee
                  rowOne={data.clientRows.rowOne}
                  rowTwo={data.clientRows.rowTwo}
                />
              </Reveal>
            </div>
          </section>

          {/* FAQs Section */}
          <section id="faq" className="relative overflow-hidden px-4 py-20 md:px-6 md:py-28">
            {/* Subtle Hand-Drawn Animated SVG Curl Strokes */}
            <AnimatedCurls enabled={data.theme.showCurls !== false} count={10} minSize={24} maxSize={70} minOpacity={0.03} maxOpacity={0.10} seed={505} />

            <div className="relative z-10">
              <Reveal className="mx-auto max-w-2xl">
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-kicker">
                  FAQs
                </p>
                <h2 className="font-display mt-4 text-3xl font-extrabold leading-tight md:text-5xl">
                  <WordReveal text="Good questions." />{' '}
                  <WordReveal
                    text="Clear answers."
                    className="studio-gradient-text"
                    start={180}
                  />
                </h2>
                <p className="mt-5 text-muted-foreground">
                  Everything you need to know before we start.
                </p>
              </Reveal>

              <Reveal delay={100}>
                <FaqAccordion faqs={data.faqs} />
              </Reveal>
            </div>
          </section>

          {/* Contact Section */}
          <section id="contact" className="relative overflow-hidden px-4 pb-24 pt-12 md:pb-32">
            {/* Subtle Hand-Drawn Animated SVG Curl Strokes */}
            <AnimatedCurls enabled={data.theme.showCurls !== false} count={12} minSize={26} maxSize={75} minOpacity={0.04} maxOpacity={0.12} seed={606} />

            <div className="relative z-10">
              <Reveal className="mx-auto max-w-3xl">
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-kicker">
                  {data.contact.kicker}
                </p>
                <h2 className="font-display mt-4 text-4xl font-extrabold leading-[1.02] md:text-6xl">
                  <WordReveal text={data.contact.headingPrefix} />{' '}
                  <WordReveal
                    text={data.contact.headingHighlight}
                    start={180}
                    className="studio-gradient-text"
                  />
                </h2>
                <p className="mx-auto mt-5 max-w-lg text-muted-foreground">
                  {data.contact.subtitle}
                </p>

                <div className="mx-auto mt-9 flex max-w-sm flex-col items-stretch">
                  <a
                    href={data.socials.discord}
                    target="_blank"
                    rel="noreferrer"
                    className={PRIMARY_BTN}
                  >
                    <DiscordIcon /> {data.contact.discordCta}
                  </a>

                  <div className="my-5 flex items-center gap-4 text-xs uppercase tracking-widest text-muted-foreground">
                    <span className="h-px flex-1 bg-border" />
                    or
                    <span className="h-px flex-1 bg-border" />
                  </div>

                  <a
                    href={data.socials.x}
                    target="_blank"
                    rel="noreferrer"
                    className={SECONDARY_BTN}
                  >
                    <XIcon /> {data.contact.xCta}
                  </a>
                </div>
              </Reveal>
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer className="border-t border-border px-4 py-10">
          <Reveal className="mx-auto flex max-w-3xl flex-col items-center">
            <div className="font-display text-xl font-extrabold tracking-tight">
              <span className="studio-gradient-text">{data.brandPrefix}</span>
              <span className="text-foreground">{data.brandSuffix}</span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{data.footerTagline}</p>
            <div className="mt-4 flex gap-2.5">
              {socialLinks.map(({ href, label, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={label}
                  className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card transition-all duration-300 hover:-translate-y-1 hover:scale-110 hover:border-primary hover:text-primary hover:shadow-glow active:scale-95"
                >
                  <Icon />
                </a>
              ))}
            </div>
            <div className="mt-6 w-full text-xs text-muted-foreground">
              <span aria-hidden="true" className="mx-auto mb-4 block h-px w-16 bg-border" />
              <p>
                &copy; {new Date().getFullYear()} {data.brandName}. All Rights Reserved.
              </p>
              <p className="mt-1.5 inline-flex items-center gap-1.5">
                Crafted with <HeartIcon /> by {data.brandName}
              </p>
            </div>
          </Reveal>
        </footer>

        <AdminPanel open={adminOpen} onClose={handleCloseAdmin} />
      </div>
    </MotionConfig>
  );
}
