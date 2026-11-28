import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  auth,
  BOOTSTRAPPED_ADMIN_EMAIL,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
} from '../firebase';
import {
  PORTFOLIO_DATA,
  type BeforeAfterItem,
  type Category,
  type ClientItem,
  type FaqItem,
  type PortfolioData,
  type SoundConfig,
  type ThemeConfig,
  type ThumbnailItem,
} from '../data/portfolio';
import {
  isSafeAssetOrUrl,
  isSafeOptionalUrl,
  isValidDocId,
  makeSafeDocId,
  sanitizeHexColor,
} from '../lib/imageUtils';
import { applyLiveSoundSettings } from '../lib/sound';

export interface SiteConfigPayload {
  brandPrefix: string;
  brandSuffix: string;
  brandName: string;
  logoSrc: string;
  hero: {
    availabilityText: string;
    availabilityOpen: boolean;
    descriptionLine1: string;
    descriptionLine2Prefix: string;
    descriptionHighlight: string;
    primaryCta: string;
    secondaryCta: string;
    avatarBadge: string;
    stats: { value: string; label: string }[];
  };
  about: PortfolioData['about'];
  clientsSection: PortfolioData['clientsSection'];
  contact: PortfolioData['contact'];
  footerTagline: string;
  socials: PortfolioData['socials'];
  theme: ThemeConfig;
  sound: SoundConfig;
}

export interface ClientWithRow extends ClientItem {
  row: 1 | 2;
  order: number;
}

interface OrderedCategory extends Category {
  order: number;
}

interface OrderedThumbnail extends ThumbnailItem {
  order: number;
}

interface OrderedBeforeAfter extends BeforeAfterItem {
  order: number;
}

interface OrderedFaq extends FaqItem {
  order: number;
}

interface LivePortfolioContextValue {
  data: PortfolioData;
  allClients: ClientWithRow[];
  user: User | null;
  authReady: boolean;
  isAdmin: boolean;
  cloudInitialized: boolean;
  syncing: boolean;
  signInAdmin: () => Promise<void>;
  signOutAdmin: () => Promise<void>;
  seedCloudDefaults: () => Promise<void>;
  saveSiteConfig: (next: SiteConfigPayload) => Promise<void>;
  upsertCategory: (cat: { id?: string; name: string; description: string; order?: number }) => Promise<string>;
  deleteCategory: (categoryId: string) => Promise<void>;
  upsertThumbnail: (item: {
    id?: string;
    categoryId: string;
    title: string;
    src: string;
    client?: string;
    videoUrl?: string;
    order?: number;
  }) => Promise<string>;
  reorderThumbnails: (items: { id: string; order: number }[]) => Promise<void>;
  deleteThumbnail: (id: string) => Promise<void>;
  upsertBeforeAfter: (item: {
    id?: string;
    title: string;
    subtitle?: string;
    beforeSrc: string;
    afterSrc: string;
    order?: number;
  }) => Promise<string>;
  deleteBeforeAfter: (id: string) => Promise<void>;
  upsertClient: (item: {
    id?: string;
    name: string;
    subs: string;
    avatar: string;
    channelUrl: string;
    row: 1 | 2;
    order?: number;
  }) => Promise<string>;
  deleteClient: (id: string) => Promise<void>;
  upsertFaq: (item: {
    id?: string;
    question: string;
    answer: string;
    order?: number;
  }) => Promise<string>;
  deleteFaq: (id: string) => Promise<void>;
}

const LivePortfolioContext = createContext<LivePortfolioContextValue | null>(null);

function extractDefaultSiteConfig(): SiteConfigPayload {
  return {
    brandPrefix: PORTFOLIO_DATA.brandPrefix,
    brandSuffix: PORTFOLIO_DATA.brandSuffix,
    brandName: PORTFOLIO_DATA.brandName,
    logoSrc: PORTFOLIO_DATA.logoSrc,
    hero: {
      availabilityText: PORTFOLIO_DATA.hero.availabilityText,
      availabilityOpen: PORTFOLIO_DATA.hero.availabilityOpen,
      descriptionLine1: PORTFOLIO_DATA.hero.descriptionLine1,
      descriptionLine2Prefix: PORTFOLIO_DATA.hero.descriptionLine2Prefix,
      descriptionHighlight: PORTFOLIO_DATA.hero.descriptionHighlight,
      primaryCta: PORTFOLIO_DATA.hero.primaryCta,
      secondaryCta: PORTFOLIO_DATA.hero.secondaryCta,
      avatarBadge: PORTFOLIO_DATA.hero.avatarBadge,
      stats: PORTFOLIO_DATA.hero.stats.map((s) => ({ value: s.value, label: s.label })),
    },
    about: { ...PORTFOLIO_DATA.about },
    clientsSection: { ...PORTFOLIO_DATA.clientsSection },
    contact: { ...PORTFOLIO_DATA.contact },
    footerTagline: PORTFOLIO_DATA.footerTagline,
    socials: { ...PORTFOLIO_DATA.socials },
    theme: { ...PORTFOLIO_DATA.theme },
    sound: { ...PORTFOLIO_DATA.sound },
  };
}

function sanitizeSiteConfig(raw: SiteConfigPayload): SiteConfigPayload {
  const def = extractDefaultSiteConfig();
  const prefix = (raw.brandPrefix || def.brandPrefix).trim().slice(0, 40) || def.brandPrefix;
  const suffix = (raw.brandSuffix ?? '').trim().slice(0, 40);
  const brandName =
    (raw.brandName || `${prefix}${suffix ? ` ${suffix}` : ''}`).trim().slice(0, 80) || def.brandName;
  const logoSrc = isSafeAssetOrUrl(raw.logoSrc, 350000) ? raw.logoSrc.trim() : def.logoSrc;

  const stats = (raw.hero?.stats?.length ? raw.hero.stats : def.hero.stats)
    .slice(0, 4)
    .map((s, idx) => ({
      value: (s.value || def.hero.stats[idx]?.value || '100+').trim().slice(0, 24),
      label: (s.label || def.hero.stats[idx]?.label || 'STAT').trim().slice(0, 32),
    }));

  const t = raw.theme || def.theme;
  const theme: ThemeConfig = {
    defaultMode: t.defaultMode === 'light' ? 'light' : 'dark',
    preset: (t.preset || 'custom').trim().slice(0, 40) || 'custom',
    primaryColor: sanitizeHexColor(t.primaryColor, def.theme.primaryColor),
    kickerColor: sanitizeHexColor(t.kickerColor, def.theme.kickerColor),
    navActiveColor: sanitizeHexColor(t.navActiveColor, def.theme.navActiveColor),
    darkBg: sanitizeHexColor(t.darkBg, def.theme.darkBg),
    darkCard: sanitizeHexColor(t.darkCard, def.theme.darkCard),
    bgType: t.bgType === 'gradient' ? 'gradient' : 'solid',
    bgGradient:
      typeof t.bgGradient === 'string' && t.bgGradient.trim().length < 400
        ? t.bgGradient.trim()
        : 'linear-gradient(135deg, #09080f 0%, #200a38 100%)',
    bgGradientStart: sanitizeHexColor(t.bgGradientStart, '#09080f'),
    bgGradientEnd: sanitizeHexColor(t.bgGradientEnd, '#200a38'),
    bgGradientAngle: Number.isFinite(t.bgGradientAngle) ? Number(t.bgGradientAngle) : 135,
    textColor: sanitizeHexColor(t.textColor, '#faf9ff'),
    mutedTextColor: sanitizeHexColor(t.mutedTextColor, '#a29bb8'),
    displayFont: (t.displayFont || def.theme.displayFont || 'Outfit').trim().slice(0, 60),
    bodyFont: (t.bodyFont || def.theme.bodyFont || 'Plus Jakarta Sans').trim().slice(0, 60),
    customFont: (t.customFont || '').trim().slice(0, 80),
    customBodyFont: (t.customBodyFont || '').trim().slice(0, 80),
    customFontUrl: typeof t.customFontUrl === 'string' && t.customFontUrl.length < 600000 ? t.customFontUrl.trim() : '',
    bgStyle: (['geometric-waves', 'liquid-silk', 'cosmic-aurora', 'cyber-mesh', 'minimal-obsidian', 'custom-image'].includes(t.bgStyle as string)
      ? (t.bgStyle as 'geometric-waves' | 'liquid-silk' | 'cosmic-aurora' | 'cyber-mesh' | 'minimal-obsidian' | 'custom-image')
      : 'geometric-waves'),
    bgImageUrl: typeof t.bgImageUrl === 'string' && t.bgImageUrl.trim().length < 500 ? t.bgImageUrl.trim() : '',
    showCurls: t.showCurls !== false,
    shaderColor1: sanitizeHexColor(t.shaderColor1, def.theme.shaderColor1),
    shaderColor2: sanitizeHexColor(t.shaderColor2, def.theme.shaderColor2),
    shaderColor3: sanitizeHexColor(t.shaderColor3, def.theme.shaderColor3),
    lightShaderColor1: sanitizeHexColor(t.lightShaderColor1, def.theme.lightShaderColor1),
    lightShaderColor2: sanitizeHexColor(t.lightShaderColor2, def.theme.lightShaderColor2),
    lightShaderColor3: sanitizeHexColor(t.lightShaderColor3, def.theme.lightShaderColor3),
  };

  const s = raw.sound || def.sound;
  const sound: SoundConfig = {
    enabled: Boolean(s.enabled),
    volume: Math.max(0, Math.min(1, Number.isFinite(s.volume) ? Number(s.volume) : 0.75)),
    profile: s.profile === 'soft' || s.profile === 'crisp' ? s.profile : 'studio',
  };

  return {
    brandPrefix: prefix,
    brandSuffix: suffix,
    brandName,
    logoSrc,
    hero: {
      availabilityText: (raw.hero?.availabilityText ?? def.hero.availabilityText).trim().slice(0, 80),
      availabilityOpen: Boolean(raw.hero?.availabilityOpen ?? true),
      descriptionLine1: (raw.hero?.descriptionLine1 ?? def.hero.descriptionLine1).trim().slice(0, 160),
      descriptionLine2Prefix: (raw.hero?.descriptionLine2Prefix ?? def.hero.descriptionLine2Prefix).slice(0, 120),
      descriptionHighlight: (raw.hero?.descriptionHighlight ?? def.hero.descriptionHighlight).trim().slice(0, 80),
      primaryCta: (raw.hero?.primaryCta || def.hero.primaryCta).trim().slice(0, 40),
      secondaryCta: (raw.hero?.secondaryCta || def.hero.secondaryCta).trim().slice(0, 40),
      avatarBadge: (raw.hero?.avatarBadge ?? def.hero.avatarBadge).trim().slice(0, 32),
      stats,
    },
    about: {
      badge: (raw.about?.badge ?? def.about.badge).trim().slice(0, 50),
      headingPrefix: (raw.about?.headingPrefix ?? def.about.headingPrefix).trim().slice(0, 60),
      headingHighlight: (raw.about?.headingHighlight ?? def.about.headingHighlight).trim().slice(0, 60),
      bio: (raw.about?.bio ?? def.about.bio).trim().slice(0, 1200),
      experienceBadge: (raw.about?.experienceBadge ?? def.about.experienceBadge).trim().slice(0, 60),
      ctaLabel: (raw.about?.ctaLabel || def.about.ctaLabel).trim().slice(0, 60),
    },
    clientsSection: {
      kicker: (raw.clientsSection?.kicker ?? def.clientsSection.kicker).trim().slice(0, 60),
      headingPrefix: (raw.clientsSection?.headingPrefix ?? def.clientsSection.headingPrefix).trim().slice(0, 80),
      headingHighlight: (raw.clientsSection?.headingHighlight ?? def.clientsSection.headingHighlight).trim().slice(0, 80),
      subtitle: (raw.clientsSection?.subtitle ?? def.clientsSection.subtitle).trim().slice(0, 300),
    },
    contact: {
      kicker: (raw.contact?.kicker ?? def.contact.kicker).trim().slice(0, 60),
      headingPrefix: (raw.contact?.headingPrefix ?? def.contact.headingPrefix).trim().slice(0, 80),
      headingHighlight: (raw.contact?.headingHighlight ?? def.contact.headingHighlight).trim().slice(0, 80),
      subtitle: (raw.contact?.subtitle ?? def.contact.subtitle).trim().slice(0, 300),
      discordCta: (raw.contact?.discordCta || def.contact.discordCta).trim().slice(0, 60),
      xCta: (raw.contact?.xCta || def.contact.xCta).trim().slice(0, 60),
    },
    footerTagline: (raw.footerTagline ?? def.footerTagline).trim().slice(0, 180),
    socials: {
      discord: isSafeOptionalUrl(raw.socials?.discord ?? '', 300)
        ? (raw.socials?.discord ?? '').trim()
        : def.socials.discord,
      discordId: (raw.socials?.discordId ?? '').trim().slice(0, 60),
      x: isSafeOptionalUrl(raw.socials?.x ?? '', 300)
        ? (raw.socials?.x ?? '').trim()
        : def.socials.x,
      xHandle: (raw.socials?.xHandle ?? def.socials.xHandle).trim().slice(0, 60),
    },
    theme,
    sound,
  };
}

export function applyDynamicThemeStyles(theme: ThemeConfig, brandName: string, logoSrc: string) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const isLight = root.dataset.theme === 'light';

  root.style.setProperty('--primary', theme.primaryColor);
  root.style.setProperty('--ring', theme.primaryColor);
  root.style.setProperty('--kicker', theme.kickerColor);
  root.style.setProperty('--nav-active', theme.navActiveColor);
  root.style.setProperty('--accent', theme.navActiveColor);

  if (theme.textColor) {
    root.style.setProperty('--foreground', theme.textColor);
  }
  if (theme.mutedTextColor) {
    root.style.setProperty('--muted-foreground', theme.mutedTextColor);
  }

  // Live dynamic typography & Google Font injection
  const displayFont = (theme.displayFont || 'Outfit').trim();
  const bodyFont = (theme.customBodyFont || theme.bodyFont || 'Plus Jakarta Sans').trim();
  const customFont = (theme.customFont || '').trim();
  const customFontUrl = (theme.customFontUrl || '').trim();

  // Dynamic @font-face injection for custom font URLs or uploaded font files
  if (customFontUrl) {
    let fontFaceEl = document.getElementById('dynamic-custom-font-face') as HTMLStyleElement | null;
    if (!fontFaceEl) {
      fontFaceEl = document.createElement('style');
      fontFaceEl.id = 'dynamic-custom-font-face';
      document.head.appendChild(fontFaceEl);
    }
    if (
      customFontUrl.includes('.css') ||
      customFontUrl.includes('fonts.googleapis.com') ||
      customFontUrl.includes('use.typekit.net')
    ) {
      fontFaceEl.textContent = `@import url("${customFontUrl}");`;
    } else {
      const familyName = customFont || 'CustomUserFont';
      fontFaceEl.textContent = `
        @font-face {
          font-family: "${familyName}";
          src: url("${customFontUrl}") format("woff2"), url("${customFontUrl}");
          font-display: swap;
        }
      `;
    }
  }

  const fontsToLoad = new Set<string>();
  if (displayFont && !['sans-serif', 'system-ui', 'monospace'].includes(displayFont.toLowerCase())) {
    fontsToLoad.add(displayFont);
  }
  if (bodyFont && !['sans-serif', 'system-ui', 'monospace'].includes(bodyFont.toLowerCase())) {
    fontsToLoad.add(bodyFont);
  }
  if (customFont && !customFontUrl && !['sans-serif', 'system-ui', 'monospace'].includes(customFont.toLowerCase())) {
    fontsToLoad.add(customFont);
  }
  if (theme.customBodyFont && !['sans-serif', 'system-ui', 'monospace'].includes(theme.customBodyFont.toLowerCase())) {
    fontsToLoad.add(theme.customBodyFont);
  }

  if (fontsToLoad.size > 0) {
    const familyQueries = Array.from(fontsToLoad)
      .map((f) => `family=${encodeURIComponent(f.replace(/\+/g, ' '))}:wght@400;500;600;700;800`)
      .join('&');
    const href = `https://fonts.googleapis.com/css2?${familyQueries}&display=swap`;
    let link = document.getElementById('dynamic-google-fonts') as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement('link');
      link.id = 'dynamic-google-fonts';
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }
    if (link.href !== href) {
      link.href = href;
    }
  }

  const activeDisplayFont = customFont || displayFont;
  root.style.setProperty('--font-display', `"${activeDisplayFont}", sans-serif`);
  root.style.setProperty('--font-tagline', `"${activeDisplayFont}", sans-serif`);
  root.style.setProperty('--font-sans', `"${bodyFont}", sans-serif`);

  // Live dynamic glow calculation
  root.style.setProperty(
    '--ambient-warm',
    `color-mix(in oklab, ${theme.primaryColor} 16%, transparent)`
  );
  root.style.setProperty(
    '--ambient-cool',
    `color-mix(in oklab, ${theme.kickerColor} 10%, transparent)`
  );
  root.style.setProperty(
    '--shadow-glow',
    `0 18px 50px -12px color-mix(in oklab, ${theme.primaryColor} 52%, transparent)`
  );

  if (isLight) {
    root.style.removeProperty('--background');
    root.style.removeProperty('--card');
    root.style.removeProperty('--popover');
    document.body.style.removeProperty('background');
    document.body.style.removeProperty('background-attachment');
  } else {
    root.style.setProperty('--background', theme.darkBg);
    root.style.setProperty('--card', theme.darkCard);
    root.style.setProperty('--popover', theme.darkCard);

    if (theme.bgType === 'gradient' && theme.bgGradient) {
      document.body.style.background = theme.bgGradient;
      document.body.style.backgroundAttachment = 'fixed';
    } else {
      document.body.style.background = theme.darkBg;
      document.body.style.removeProperty('background-attachment');
    }
  }

  document.title = `${brandName} | Thumbnail Artist`;

  const favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (favicon && logoSrc && !logoSrc.startsWith('javascript:')) {
    favicon.href = logoSrc;
  }
}

export const LIVE_PORTFOLIO_CACHE_KEYS = {
  siteConfig: 'pruthvifx_cached_site_config_v2',
  categories: 'pruthvifx_cached_categories_v2',
  thumbnails: 'pruthvifx_cached_thumbnails_v2',
  beforeAfter: 'pruthvifx_cached_before_after_v2',
  clients: 'pruthvifx_cached_clients_v2',
  faqs: 'pruthvifx_cached_faqs_v2',
  cloudInitialized: 'pruthvifx_cached_cloud_init_v2',
} as const;

function getCachedJson<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function setCachedJson<T>(key: string, data: T): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // safe ignore for private mode / quota
  }
}

export function LivePortfolioProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Synchronously initialize state from persistent localStorage cache to eliminate 1s stale/default flash
  const [cloudInitialized, setCloudInitialized] = useState<boolean>(() => {
    return Boolean(getCachedJson<boolean>(LIVE_PORTFOLIO_CACHE_KEYS.cloudInitialized));
  });

  const [siteConfig, setSiteConfig] = useState<SiteConfigPayload>(() => {
    const cached = getCachedJson<SiteConfigPayload>(LIVE_PORTFOLIO_CACHE_KEYS.siteConfig);
    if (cached) {
      const sanitized = sanitizeSiteConfig(cached);
      applyDynamicThemeStyles(sanitized.theme, sanitized.brandName, sanitized.logoSrc);
      applyLiveSoundSettings(sanitized.sound);
      return sanitized;
    }
    const def = extractDefaultSiteConfig();
    applyDynamicThemeStyles(def.theme, def.brandName, def.logoSrc);
    return def;
  });

  const [categories, setCategories] = useState<OrderedCategory[] | null>(() => {
    return getCachedJson<OrderedCategory[]>(LIVE_PORTFOLIO_CACHE_KEYS.categories);
  });
  const [thumbnails, setThumbnails] = useState<OrderedThumbnail[] | null>(() => {
    return getCachedJson<OrderedThumbnail[]>(LIVE_PORTFOLIO_CACHE_KEYS.thumbnails);
  });
  const [beforeAfter, setBeforeAfter] = useState<OrderedBeforeAfter[] | null>(() => {
    return getCachedJson<OrderedBeforeAfter[]>(LIVE_PORTFOLIO_CACHE_KEYS.beforeAfter);
  });
  const [clients, setClients] = useState<ClientWithRow[] | null>(() => {
    return getCachedJson<ClientWithRow[]>(LIVE_PORTFOLIO_CACHE_KEYS.clients);
  });
  const [faqs, setFaqs] = useState<OrderedFaq[] | null>(() => {
    return getCachedJson<OrderedFaq[]>(LIVE_PORTFOLIO_CACHE_KEYS.faqs);
  });

  // 1. Auth listener & admin role check
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      if (!nextUser) {
        setIsAdmin(false);
        setAuthReady(true);
        return;
      }

      if (
        nextUser.email?.toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase() &&
        nextUser.emailVerified
      ) {
        setIsAdmin(true);
        setAuthReady(true);
        return;
      }

      try {
        const snap = await getDoc(doc(db, 'admins', nextUser.uid));
        setIsAdmin(snap.exists() && Boolean(nextUser.emailVerified));
      } catch {
        setIsAdmin(false);
      } finally {
        setAuthReady(true);
      }
    });
    return () => unsub();
  }, []);

  // 2. Real-time Firestore onSnapshot listeners for public portfolio data (live for ALL visitors!)
  useEffect(() => {
    const unsubs: (() => void)[] = [];

    unsubs.push(
      onSnapshot(
        doc(db, 'site_config', 'main'),
        (snap) => {
          if (snap.exists()) {
            const raw = snap.data() as Partial<SiteConfigPayload>;
            setCloudInitialized(true);
            setCachedJson(LIVE_PORTFOLIO_CACHE_KEYS.cloudInitialized, true);
            setSiteConfig((prev) => {
              const updated = sanitizeSiteConfig({
                ...prev,
                ...raw,
                hero: { ...prev.hero, ...(raw.hero || {}) },
                about: { ...prev.about, ...(raw.about || {}) },
                clientsSection: { ...prev.clientsSection, ...(raw.clientsSection || {}) },
                contact: { ...prev.contact, ...(raw.contact || {}) },
                socials: { ...prev.socials, ...(raw.socials || {}) },
                theme: { ...prev.theme, ...(raw.theme || {}) },
                sound: { ...prev.sound, ...(raw.sound || {}) },
              });
              setCachedJson(LIVE_PORTFOLIO_CACHE_KEYS.siteConfig, updated);
              return updated;
            });
          } else {
            setCloudInitialized(false);
          }
        },
        (error) => {
          console.error('site_config listener error:', error);
        }
      )
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, 'categories'), where('order', '>=', 0), orderBy('order', 'asc')),
        (snap) => {
          const items: OrderedCategory[] = snap.docs.map((d) => {
            const v = d.data();
            return {
              id: d.id,
              name: String(v.name || ''),
              description: String(v.description || ''),
              order: Number(v.order ?? 0),
            };
          });
          setCategories(items);
          setCachedJson(LIVE_PORTFOLIO_CACHE_KEYS.categories, items);
        },
        (error) => {
          console.error('categories listener error:', error);
        }
      )
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, 'thumbnails'), where('order', '>=', 0), orderBy('order', 'asc')),
        (snap) => {
          const items: OrderedThumbnail[] = snap.docs.map((d) => {
            const v = d.data();
            return {
              id: d.id,
              categoryId: String(v.categoryId || ''),
              title: String(v.title || ''),
              src: String(v.src || ''),
              client: v.client ? String(v.client) : undefined,
              videoUrl: v.videoUrl ? String(v.videoUrl) : undefined,
              order: Number(v.order ?? 0),
            };
          });
          setThumbnails(items);
          setCachedJson(LIVE_PORTFOLIO_CACHE_KEYS.thumbnails, items);
        },
        (error) => {
          console.error('thumbnails listener error:', error);
        }
      )
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, 'before_after'), where('order', '>=', 0), orderBy('order', 'asc')),
        (snap) => {
          const items: OrderedBeforeAfter[] = snap.docs.map((d) => {
            const v = d.data();
            return {
              id: d.id,
              title: String(v.title || ''),
              subtitle: String(v.subtitle || ''),
              beforeSrc: String(v.beforeSrc || ''),
              afterSrc: String(v.afterSrc || ''),
              order: Number(v.order ?? 0),
            };
          });
          setBeforeAfter(items);
          setCachedJson(LIVE_PORTFOLIO_CACHE_KEYS.beforeAfter, items);
        },
        (error) => {
          console.error('before_after listener error:', error);
        }
      )
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, 'clients'), where('order', '>=', 0), orderBy('order', 'asc')),
        (snap) => {
          const items: ClientWithRow[] = snap.docs.map((d) => {
            const v = d.data();
            return {
              id: d.id,
              name: String(v.name || ''),
              subs: String(v.subs || ''),
              avatar: String(v.avatar || ''),
              channelUrl: String(v.channelUrl || ''),
              row: v.row === 2 ? 2 : 1,
              order: Number(v.order ?? 0),
            };
          });
          setClients(items);
          setCachedJson(LIVE_PORTFOLIO_CACHE_KEYS.clients, items);
        },
        (error) => {
          console.error('clients listener error:', error);
        }
      )
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, 'faqs'), where('order', '>=', 0), orderBy('order', 'asc')),
        (snap) => {
          const items: OrderedFaq[] = snap.docs.map((d) => {
            const v = d.data();
            return {
              id: d.id,
              question: String(v.question || ''),
              answer: String(v.answer || ''),
              order: Number(v.order ?? 0),
            };
          });
          setFaqs(items);
          setCachedJson(LIVE_PORTFOLIO_CACHE_KEYS.faqs, items);
        },
        (error) => {
          console.error('faqs listener error:', error);
        }
      )
    );

    return () => {
      unsubs.forEach((fn) => fn());
    };
  }, []);

  // 3. Apply live theme CSS tokens & sound settings whenever siteConfig updates
  useEffect(() => {
    applyDynamicThemeStyles(siteConfig.theme, siteConfig.brandName, siteConfig.logoSrc);
    applyLiveSoundSettings(siteConfig.sound);

    const observer = new MutationObserver(() => {
      applyDynamicThemeStyles(siteConfig.theme, siteConfig.brandName, siteConfig.logoSrc);
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    return () => observer.disconnect();
  }, [siteConfig.theme, siteConfig.brandName, siteConfig.logoSrc, siteConfig.sound]);

  // Compute merged live PortfolioData (falls back to PORTFOLIO_DATA smoothly before cloud seed)
  const resolvedClients = useMemo<ClientWithRow[]>(() => {
    if (cloudInitialized && clients !== null) return clients;
    return [
      ...PORTFOLIO_DATA.clientRows.rowOne.map((c, i) => ({ ...c, row: 1 as const, order: i })),
      ...PORTFOLIO_DATA.clientRows.rowTwo.map((c, i) => ({ ...c, row: 2 as const, order: i })),
    ];
  }, [cloudInitialized, clients]);

  const data = useMemo<PortfolioData>(() => {
    const resolvedCategories: Category[] =
      cloudInitialized && categories !== null ? categories : PORTFOLIO_DATA.categories;
    const resolvedThumbnails: ThumbnailItem[] =
      cloudInitialized && thumbnails !== null ? thumbnails : PORTFOLIO_DATA.thumbnails;
    const resolvedBeforeAfter: BeforeAfterItem[] =
      cloudInitialized && beforeAfter !== null ? beforeAfter : PORTFOLIO_DATA.beforeAfter;
    const resolvedFaqs: FaqItem[] =
      cloudInitialized && faqs !== null ? faqs : PORTFOLIO_DATA.faqs;

    const rowOne = resolvedClients.filter((c) => c.row === 1);
    const rowTwo = resolvedClients.filter((c) => c.row === 2);

    return {
      brandPrefix: siteConfig.brandPrefix,
      brandSuffix: siteConfig.brandSuffix,
      brandName: siteConfig.brandName,
      logoSrc: siteConfig.logoSrc,
      categories: resolvedCategories,
      thumbnails: resolvedThumbnails,
      beforeAfter: resolvedBeforeAfter,
      clientRows: {
        rowOne,
        rowTwo: rowTwo.length > 0 ? rowTwo : rowOne,
      },
      faqs: resolvedFaqs,
      about: siteConfig.about,
      hero: {
        ...siteConfig.hero,
        headlineWords: [siteConfig.brandPrefix, siteConfig.brandSuffix].filter(Boolean),
      },
      clientsSection: siteConfig.clientsSection,
      contact: siteConfig.contact,
      footerTagline: siteConfig.footerTagline,
      socials: siteConfig.socials,
      theme: siteConfig.theme,
      sound: siteConfig.sound,
      shader: {
        dark: {
          color1: siteConfig.theme.shaderColor1,
          color2: siteConfig.theme.shaderColor2,
          color3: siteConfig.theme.shaderColor3,
        },
        light: {
          color1: siteConfig.theme.lightShaderColor1,
          color2: siteConfig.theme.lightShaderColor2,
          color3: siteConfig.theme.lightShaderColor3,
        },
      },
    };
  }, [
    siteConfig,
    cloudInitialized,
    categories,
    thumbnails,
    beforeAfter,
    resolvedClients,
    faqs,
  ]);

  const signInAdmin = useCallback(async () => {
    await signInWithPopup(auth, googleProvider);
  }, []);

  const signOutAdmin = useCallback(async () => {
    await signOut(auth);
  }, []);

  const seedCloudDefaults = useCallback(async (overrideConfig?: SiteConfigPayload) => {
    setSyncing(true);
    let currentPath = 'site_config/main';
    try {
      // 1. Write site_config/main first (standalone to keep expression count well under 1,000)
      const def = sanitizeSiteConfig(overrideConfig || extractDefaultSiteConfig());
      await setDoc(doc(db, 'site_config', 'main'), {
        ...def,
        updatedAt: serverTimestamp(),
      });

      // 2. Write categories BEFORE thumbnails so exists(/categories/{id}) passes cleanly
      currentPath = 'categories';
      const catBatch = writeBatch(db);
      PORTFOLIO_DATA.categories.forEach((cat, idx) => {
        catBatch.set(doc(db, 'categories', cat.id), {
          name: cat.name,
          description: cat.description,
          order: idx,
          updatedAt: serverTimestamp(),
        });
      });
      await catBatch.commit();

      // 3. Write thumbnails (categories now exist in Firestore)
      currentPath = 'thumbnails';
      const thumbBatch = writeBatch(db);
      PORTFOLIO_DATA.thumbnails.forEach((t, idx) => {
        thumbBatch.set(doc(db, 'thumbnails', t.id), {
          categoryId: t.categoryId,
          title: t.title,
          src: t.src,
          client: t.client || '',
          videoUrl: t.videoUrl || '',
          order: idx,
          updatedAt: serverTimestamp(),
        });
      });
      await thumbBatch.commit();

      // 4. Write before_after pairs + faqs
      currentPath = 'before_after';
      const baFaqBatch = writeBatch(db);
      PORTFOLIO_DATA.beforeAfter.forEach((ba, idx) => {
        baFaqBatch.set(doc(db, 'before_after', ba.id), {
          title: ba.title,
          subtitle: ba.subtitle,
          beforeSrc: ba.beforeSrc,
          afterSrc: ba.afterSrc,
          order: idx,
          updatedAt: serverTimestamp(),
        });
      });
      PORTFOLIO_DATA.faqs.forEach((f, idx) => {
        baFaqBatch.set(doc(db, 'faqs', f.id), {
          question: f.question,
          answer: f.answer,
          order: idx,
          updatedAt: serverTimestamp(),
        });
      });
      await baFaqBatch.commit();

      // 5. Write clients row 1 and row 2 in two small batches (< 350 expressions each)
      currentPath = 'clients';
      const row1Batch = writeBatch(db);
      PORTFOLIO_DATA.clientRows.rowOne.forEach((c, idx) => {
        row1Batch.set(doc(db, 'clients', c.id), {
          name: c.name,
          subs: c.subs,
          avatar: c.avatar,
          channelUrl: c.channelUrl,
          row: 1,
          order: idx,
          updatedAt: serverTimestamp(),
        });
      });
      await row1Batch.commit();

      const row2Batch = writeBatch(db);
      PORTFOLIO_DATA.clientRows.rowTwo.forEach((c, idx) => {
        row2Batch.set(doc(db, 'clients', c.id), {
          name: c.name,
          subs: c.subs,
          avatar: c.avatar,
          channelUrl: c.channelUrl,
          row: 2,
          order: idx,
          updatedAt: serverTimestamp(),
        });
      });
      await row2Batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, currentPath);
    } finally {
      setSyncing(false);
    }
  }, []);

  const ensureCloudReady = useCallback(async () => {
    if (!cloudInitialized) {
      await seedCloudDefaults();
    }
  }, [cloudInitialized, seedCloudDefaults]);

  const saveSiteConfig = useCallback(
    async (next: SiteConfigPayload) => {
      const clean = sanitizeSiteConfig(next);
      // Synchronous optimistic update to eliminate any 1-second lag
      setSiteConfig(clean);
      setCloudInitialized(true);
      setCachedJson(LIVE_PORTFOLIO_CACHE_KEYS.siteConfig, clean);
      setCachedJson(LIVE_PORTFOLIO_CACHE_KEYS.cloudInitialized, true);
      applyDynamicThemeStyles(clean.theme, clean.brandName, clean.logoSrc);
      applyLiveSoundSettings(clean.sound);

      if (!cloudInitialized) {
        await seedCloudDefaults(next);
        return;
      }
      setSyncing(true);
      try {
        await setDoc(doc(db, 'site_config', 'main'), {
          ...clean,
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, 'site_config/main');
      } finally {
        setSyncing(false);
      }
    },
    [cloudInitialized, seedCloudDefaults]
  );

  const upsertCategory = useCallback(
    async (cat: { id?: string; name: string; description: string; order?: number }) => {
      const id =
        cat.id && isValidDocId(cat.id) ? cat.id : makeSafeDocId('cat', cat.name);
      const name = cat.name.trim().slice(0, 60);
      if (!name) throw new Error('Category name is required.');
      const description = (cat.description || '').trim().slice(0, 220);
      const order = Math.max(0, Math.min(1000, Number(cat.order ?? data.categories.length)));

      // Optimistic update
      setCategories((prev) => {
        const list = prev ? [...prev] : [...data.categories];
        const idx = list.findIndex((c) => c.id === id);
        const item: OrderedCategory = { id, name, description, order };
        if (idx >= 0) list[idx] = item;
        else list.push(item);
        list.sort((a, b) => a.order - b.order);
        setCachedJson(LIVE_PORTFOLIO_CACHE_KEYS.categories, list);
        return list;
      });

      setSyncing(true);
      try {
        await ensureCloudReady();
        await setDoc(doc(db, 'categories', id), {
          name,
          description,
          order,
          updatedAt: serverTimestamp(),
        });
        return id;
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `categories/${id}`);
      } finally {
        setSyncing(false);
      }
    },
    [ensureCloudReady, data.categories]
  );

  const deleteCategory = useCallback(
    async (categoryId: string) => {
      // Optimistic update
      setCategories((prev) => {
        const list = (prev ? [...prev] : [...data.categories]).filter((c) => c.id !== categoryId);
        setCachedJson(LIVE_PORTFOLIO_CACHE_KEYS.categories, list);
        return list;
      });
      setThumbnails((prev) => {
        const list = (prev ? [...prev] : [...data.thumbnails]).filter((t) => t.categoryId !== categoryId);
        setCachedJson(LIVE_PORTFOLIO_CACHE_KEYS.thumbnails, list);
        return list;
      });

      setSyncing(true);
      try {
        await ensureCloudReady();
        const batch = writeBatch(db);
        batch.delete(doc(db, 'categories', categoryId));
        data.thumbnails
          .filter((t) => t.categoryId === categoryId)
          .forEach((t) => {
            batch.delete(doc(db, 'thumbnails', t.id));
          });
        await batch.commit();
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `categories/${categoryId}`);
      } finally {
        setSyncing(false);
      }
    },
    [ensureCloudReady, data.categories, data.thumbnails]
  );

  const upsertThumbnail = useCallback(
    async (item: {
      id?: string;
      categoryId: string;
      title: string;
      src: string;
      client?: string;
      videoUrl?: string;
      order?: number;
    }) => {
      const id =
        item.id && isValidDocId(item.id) ? item.id : makeSafeDocId('thumb', item.title);
      const title = item.title.trim().slice(0, 140);
      if (!title) throw new Error('Thumbnail title is required.');
      if (!isValidDocId(item.categoryId)) throw new Error('Please choose a valid category.');
      if (!isSafeAssetOrUrl(item.src, 450000)) {
        throw new Error('Please provide a valid HTTPS image URL or upload an image.');
      }
      const videoUrl = (item.videoUrl || '').trim();
      if (!isSafeOptionalUrl(videoUrl, 400)) {
        throw new Error('Video URL must start with https:// or be left blank.');
      }
      const client = (item.client || '').trim().slice(0, 80);
      const nextOrder = Math.max(0, Math.min(2000, Number(item.order ?? data.thumbnails.length)));

      // Optimistic update: instantly reflects in UI and cache without 1-second delay
      setThumbnails((prev) => {
        const list = prev ? [...prev] : [...data.thumbnails];
        const idx = list.findIndex((t) => t.id === id);
        const nextThumb: OrderedThumbnail = {
          id,
          categoryId: item.categoryId,
          title,
          src: item.src.trim(),
          client,
          videoUrl,
          order: nextOrder,
        };
        if (idx >= 0) list[idx] = nextThumb;
        else list.push(nextThumb);
        list.sort((a, b) => a.order - b.order);
        setCachedJson(LIVE_PORTFOLIO_CACHE_KEYS.thumbnails, list);
        return list;
      });

      setSyncing(true);
      try {
        await ensureCloudReady();
        await setDoc(doc(db, 'thumbnails', id), {
          categoryId: item.categoryId,
          title,
          src: item.src.trim(),
          client,
          videoUrl,
          order: nextOrder,
          updatedAt: serverTimestamp(),
        });
        return id;
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `thumbnails/${id}`);
      } finally {
        setSyncing(false);
      }
    },
    [ensureCloudReady, data.thumbnails]
  );

  const reorderThumbnails = useCallback(
    async (items: { id: string; order: number }[]) => {
      if (!items.length) return;
      // Optimistic update: instantly reflects new order in UI and cache
      setThumbnails((prev) => {
        const base = prev ? [...prev] : [...data.thumbnails];
        const orderMap = new Map(items.map((i) => [i.id, i.order]));
        const updated = base.map((t) => (orderMap.has(t.id) ? { ...t, order: orderMap.get(t.id)! } : t));
        updated.sort((a, b) => a.order - b.order);
        setCachedJson(LIVE_PORTFOLIO_CACHE_KEYS.thumbnails, updated);
        return updated;
      });

      setSyncing(true);
      try {
        await ensureCloudReady();
        const batch = writeBatch(db);
        items.forEach(({ id, order }) => {
          batch.update(doc(db, 'thumbnails', id), {
            order,
            updatedAt: serverTimestamp(),
          });
        });
        await batch.commit();
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, 'thumbnails/reorder');
      } finally {
        setSyncing(false);
      }
    },
    [ensureCloudReady, data.thumbnails]
  );

  const deleteThumbnail = useCallback(
    async (id: string) => {
      // Optimistic update
      setThumbnails((prev) => {
        const list = (prev ? [...prev] : [...data.thumbnails]).filter((t) => t.id !== id);
        setCachedJson(LIVE_PORTFOLIO_CACHE_KEYS.thumbnails, list);
        return list;
      });

      setSyncing(true);
      try {
        await ensureCloudReady();
        await deleteDoc(doc(db, 'thumbnails', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `thumbnails/${id}`);
      } finally {
        setSyncing(false);
      }
    },
    [ensureCloudReady, data.thumbnails]
  );

  const upsertBeforeAfter = useCallback(
    async (item: {
      id?: string;
      title: string;
      subtitle?: string;
      beforeSrc: string;
      afterSrc: string;
      order?: number;
    }) => {
      const id =
        item.id && isValidDocId(item.id) ? item.id : makeSafeDocId('ba', item.title);
      const title = item.title.trim().slice(0, 120) || 'Comparison';
      if (!isSafeAssetOrUrl(item.beforeSrc, 450000) || !isSafeAssetOrUrl(item.afterSrc, 450000)) {
        throw new Error('Both Before and After images must be valid HTTPS URLs or uploaded images.');
      }
      const subtitle = (item.subtitle || '').trim().slice(0, 160);
      const beforeSrc = item.beforeSrc.trim();
      const afterSrc = item.afterSrc.trim();
      const order = Math.max(0, Math.min(500, Number(item.order ?? data.beforeAfter.length)));

      // Optimistic update
      setBeforeAfter((prev) => {
        const list = prev ? [...prev] : [...data.beforeAfter];
        const idx = list.findIndex((b) => b.id === id);
        const nextBA: OrderedBeforeAfter = { id, title, subtitle, beforeSrc, afterSrc, order };
        if (idx >= 0) list[idx] = nextBA;
        else list.push(nextBA);
        list.sort((a, b) => a.order - b.order);
        setCachedJson(LIVE_PORTFOLIO_CACHE_KEYS.beforeAfter, list);
        return list;
      });

      setSyncing(true);
      try {
        await ensureCloudReady();
        await setDoc(doc(db, 'before_after', id), {
          title,
          subtitle,
          beforeSrc,
          afterSrc,
          order,
          updatedAt: serverTimestamp(),
        });
        return id;
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `before_after/${id}`);
      } finally {
        setSyncing(false);
      }
    },
    [ensureCloudReady, data.beforeAfter]
  );

  const deleteBeforeAfter = useCallback(
    async (id: string) => {
      // Optimistic update
      setBeforeAfter((prev) => {
        const list = (prev ? [...prev] : [...data.beforeAfter]).filter((b) => b.id !== id);
        setCachedJson(LIVE_PORTFOLIO_CACHE_KEYS.beforeAfter, list);
        return list;
      });

      setSyncing(true);
      try {
        await ensureCloudReady();
        await deleteDoc(doc(db, 'before_after', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `before_after/${id}`);
      } finally {
        setSyncing(false);
      }
    },
    [ensureCloudReady, data.beforeAfter]
  );

  const upsertClient = useCallback(
    async (item: {
      id?: string;
      name: string;
      subs: string;
      avatar: string;
      channelUrl: string;
      row: 1 | 2;
      order?: number;
    }) => {
      const id =
        item.id && isValidDocId(item.id) ? item.id : makeSafeDocId('client', item.name);
      const name = item.name.trim().slice(0, 80);
      const subs = item.subs.trim().slice(0, 60) || 'Creator';
      if (!name) throw new Error('Creator name is required.');
      if (!isSafeAssetOrUrl(item.avatar, 350000)) {
        throw new Error('Creator logo/avatar must be a valid HTTPS URL or uploaded image.');
      }
      if (!isSafeAssetOrUrl(item.channelUrl, 400)) {
        throw new Error('Channel link must be a valid HTTPS URL.');
      }
      const avatar = item.avatar.trim();
      const channelUrl = item.channelUrl.trim();
      const row = item.row === 2 ? 2 : 1;
      const order = Math.max(0, Math.min(1000, Number(item.order ?? resolvedClients.length)));

      // Optimistic update
      setClients((prev) => {
        const list = prev ? [...prev] : [...resolvedClients];
        const idx = list.findIndex((c) => c.id === id);
        const nextClient: ClientWithRow = { id, name, subs, avatar, channelUrl, row, order };
        if (idx >= 0) list[idx] = nextClient;
        else list.push(nextClient);
        list.sort((a, b) => a.order - b.order);
        setCachedJson(LIVE_PORTFOLIO_CACHE_KEYS.clients, list);
        return list;
      });

      setSyncing(true);
      try {
        await ensureCloudReady();
        await setDoc(doc(db, 'clients', id), {
          name,
          subs,
          avatar,
          channelUrl,
          row,
          order,
          updatedAt: serverTimestamp(),
        });
        return id;
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `clients/${id}`);
      } finally {
        setSyncing(false);
      }
    },
    [ensureCloudReady, resolvedClients]
  );

  const deleteClient = useCallback(
    async (id: string) => {
      // Optimistic update
      setClients((prev) => {
        const list = (prev ? [...prev] : [...resolvedClients]).filter((c) => c.id !== id);
        setCachedJson(LIVE_PORTFOLIO_CACHE_KEYS.clients, list);
        return list;
      });

      setSyncing(true);
      try {
        await ensureCloudReady();
        await deleteDoc(doc(db, 'clients', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `clients/${id}`);
      } finally {
        setSyncing(false);
      }
    },
    [ensureCloudReady, resolvedClients]
  );

  const upsertFaq = useCallback(
    async (item: { id?: string; question: string; answer: string; order?: number }) => {
      const id =
        item.id && isValidDocId(item.id) ? item.id : makeSafeDocId('faq', item.question);
      const question = item.question.trim().slice(0, 200);
      const answer = item.answer.trim().slice(0, 1000);
      if (!question || !answer) throw new Error('Both question and answer are required.');
      const order = Math.max(0, Math.min(500, Number(item.order ?? data.faqs.length)));

      // Optimistic update
      setFaqs((prev) => {
        const list = prev ? [...prev] : [...data.faqs];
        const idx = list.findIndex((f) => f.id === id);
        const nextFaq: OrderedFaq = { id, question, answer, order };
        if (idx >= 0) list[idx] = nextFaq;
        else list.push(nextFaq);
        list.sort((a, b) => a.order - b.order);
        setCachedJson(LIVE_PORTFOLIO_CACHE_KEYS.faqs, list);
        return list;
      });

      setSyncing(true);
      try {
        await ensureCloudReady();
        await setDoc(doc(db, 'faqs', id), {
          question,
          answer,
          order,
          updatedAt: serverTimestamp(),
        });
        return id;
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `faqs/${id}`);
      } finally {
        setSyncing(false);
      }
    },
    [ensureCloudReady, data.faqs]
  );

  const deleteFaq = useCallback(
    async (id: string) => {
      // Optimistic update
      setFaqs((prev) => {
        const list = (prev ? [...prev] : [...data.faqs]).filter((f) => f.id !== id);
        setCachedJson(LIVE_PORTFOLIO_CACHE_KEYS.faqs, list);
        return list;
      });

      setSyncing(true);
      try {
        await ensureCloudReady();
        await deleteDoc(doc(db, 'faqs', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `faqs/${id}`);
      } finally {
        setSyncing(false);
      }
    },
    [ensureCloudReady, data.faqs]
  );

  const value = useMemo<LivePortfolioContextValue>(
    () => ({
      data,
      allClients: resolvedClients,
      user,
      authReady,
      isAdmin,
      cloudInitialized,
      syncing,
      signInAdmin,
      signOutAdmin,
      seedCloudDefaults,
      saveSiteConfig,
      upsertCategory,
      deleteCategory,
      upsertThumbnail,
      reorderThumbnails,
      deleteThumbnail,
      upsertBeforeAfter,
      deleteBeforeAfter,
      upsertClient,
      deleteClient,
      upsertFaq,
      deleteFaq,
    }),
    [
      data,
      resolvedClients,
      user,
      authReady,
      isAdmin,
      cloudInitialized,
      syncing,
      signInAdmin,
      signOutAdmin,
      seedCloudDefaults,
      saveSiteConfig,
      upsertCategory,
      deleteCategory,
      upsertThumbnail,
      reorderThumbnails,
      deleteThumbnail,
      upsertBeforeAfter,
      deleteBeforeAfter,
      upsertClient,
      deleteClient,
      upsertFaq,
      deleteFaq,
    ]
  );

  return (
    <LivePortfolioContext.Provider value={value}>
      {children}
    </LivePortfolioContext.Provider>
  );
}

export function useLivePortfolio() {
  const ctx = useContext(LivePortfolioContext);
  if (!ctx) throw new Error('useLivePortfolio must be used within LivePortfolioProvider');
  return ctx;
}
