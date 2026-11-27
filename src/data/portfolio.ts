export interface Category {
  id: string;
  name: string;
  description: string;
}

export interface ThumbnailItem {
  id: string;
  categoryId: string;
  src: string;
  title: string;
  client?: string;
  videoUrl?: string;
}

export interface BeforeAfterItem {
  id: string;
  title: string;
  subtitle: string;
  beforeSrc: string;
  afterSrc: string;
}

export interface ClientItem {
  id: string;
  name: string;
  subs: string;
  avatar: string;
  channelUrl: string;
}

export interface StatItem {
  value: string;
  label: string;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export interface ThemeConfig {
  defaultMode: 'dark' | 'light';
  preset: string;
  primaryColor: string;
  kickerColor: string;
  navActiveColor: string;
  darkBg: string;
  darkCard: string;
  bgType?: 'solid' | 'gradient';
  bgGradient?: string;
  bgGradientStart?: string;
  bgGradientEnd?: string;
  bgGradientAngle?: number;
  textColor?: string;
  mutedTextColor?: string;
  displayFont?: string;
  bodyFont?: string;
  customFont?: string;
  bgStyle?: 'geometric-waves' | 'liquid-silk' | 'cosmic-aurora' | 'cyber-mesh' | 'minimal-obsidian' | 'custom-image';
  bgImageUrl?: string;
  showCurls?: boolean;
  shaderColor1: string;
  shaderColor2: string;
  shaderColor3: string;
  lightShaderColor1: string;
  lightShaderColor2: string;
  lightShaderColor3: string;
}

export interface SoundConfig {
  enabled: boolean;
  volume: number;
  profile: 'studio' | 'soft' | 'crisp';
}

export interface ContactSectionConfig {
  kicker: string;
  headingPrefix: string;
  headingHighlight: string;
  subtitle: string;
  discordCta: string;
  xCta: string;
}

export interface ThemePreset {
  id: string;
  name: string;
  primaryColor: string;
  kickerColor: string;
  navActiveColor: string;
  darkBg: string;
  darkCard: string;
  shaderColor1: string;
  shaderColor2: string;
  shaderColor3: string;
  lightShaderColor1: string;
  lightShaderColor2: string;
  lightShaderColor3: string;
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'pruthvi-purple',
    name: 'Pruthvi Purple',
    primaryColor: '#a855f7',
    kickerColor: '#38e8d6',
    navActiveColor: '#0f4c5c',
    darkBg: '#09080f',
    darkCard: '#131020',
    shaderColor1: '#7c3aed',
    shaderColor2: '#09080f',
    shaderColor3: '#38e8d6',
    lightShaderColor1: '#c4b5fd',
    lightShaderColor2: '#f6f5fb',
    lightShaderColor3: '#99f6e4',
  },
  {
    id: 'crimson-forge',
    name: 'Crimson Neon',
    primaryColor: '#ef4444',
    kickerColor: '#fb923c',
    navActiveColor: '#7f1d1d',
    darkBg: '#0d0709',
    darkCard: '#1a0e12',
    shaderColor1: '#dc2626',
    shaderColor2: '#0d0709',
    shaderColor3: '#f97316',
    lightShaderColor1: '#fca5a5',
    lightShaderColor2: '#fff5f5',
    lightShaderColor3: '#fdba74',
  },
  {
    id: 'cyber-cyan',
    name: 'Cyber Cyan',
    primaryColor: '#06b6d4',
    kickerColor: '#38bdf8',
    navActiveColor: '#0e4f63',
    darkBg: '#060c12',
    darkCard: '#0d1722',
    shaderColor1: '#0891b2',
    shaderColor2: '#060c12',
    shaderColor3: '#6366f1',
    lightShaderColor1: '#67e8f9',
    lightShaderColor2: '#f0f9ff',
    lightShaderColor3: '#a5b4fc',
  },
  {
    id: 'emerald-craft',
    name: 'Emerald Craft',
    primaryColor: '#10b981',
    kickerColor: '#34d399',
    navActiveColor: '#064e3b',
    darkBg: '#060d0a',
    darkCard: '#0e1b15',
    shaderColor1: '#059669',
    shaderColor2: '#060d0a',
    shaderColor3: '#22d3ee',
    lightShaderColor1: '#6ee7b7',
    lightShaderColor2: '#f0fdf4',
    lightShaderColor3: '#67e8f9',
  },
  {
    id: 'royal-gold',
    name: 'Royal Gold',
    primaryColor: '#f59e0b',
    kickerColor: '#fbbf24',
    navActiveColor: '#78350f',
    darkBg: '#0c0a06',
    darkCard: '#1a150c',
    shaderColor1: '#d97706',
    shaderColor2: '#0c0a06',
    shaderColor3: '#f43f5e',
    lightShaderColor1: '#fcd34d',
    lightShaderColor2: '#fffbeb',
    lightShaderColor3: '#fda4af',
  },
  {
    id: 'magenta-pulse',
    name: 'Rose Magenta',
    primaryColor: '#ec4899',
    kickerColor: '#c084fc',
    navActiveColor: '#701a4a',
    darkBg: '#0e070c',
    darkCard: '#1c0f18',
    shaderColor1: '#db2777',
    shaderColor2: '#0e070c',
    shaderColor3: '#a855f7',
    lightShaderColor1: '#f9a8d4',
    lightShaderColor2: '#fdf2f8',
    lightShaderColor3: '#d8b4fe',
  },
];

export interface PortfolioData {
  brandPrefix: string;
  brandSuffix: string;
  brandName: string;
  logoSrc: string;
  categories: Category[];
  thumbnails: ThumbnailItem[];
  beforeAfter: BeforeAfterItem[];
  clientRows: {
    rowOne: ClientItem[];
    rowTwo: ClientItem[];
  };
  faqs: FaqItem[];
  about: {
    badge: string;
    headingPrefix: string;
    headingHighlight: string;
    bio: string;
    experienceBadge: string;
    ctaLabel: string;
  };
  hero: {
    availabilityText: string;
    availabilityOpen: boolean;
    headlineWords: string[];
    descriptionLine1: string;
    descriptionLine2Prefix: string;
    descriptionHighlight: string;
    primaryCta: string;
    secondaryCta: string;
    avatarBadge: string;
    stats: StatItem[];
  };
  clientsSection: {
    kicker: string;
    headingPrefix: string;
    headingHighlight: string;
    subtitle: string;
  };
  contact: ContactSectionConfig;
  footerTagline: string;
  socials: {
    discord: string;
    discordId: string;
    x: string;
    xHandle: string;
  };
  theme: ThemeConfig;
  sound: SoundConfig;
  shader: {
    dark: {
      color1: string;
      color2: string;
      color3: string;
    };
    light: {
      color1: string;
      color2: string;
      color3: string;
    };
  };
}

import liveDefaults from './live_synced_defaults.json';

export const PORTFOLIO_DATA: PortfolioData = {
  ...(liveDefaults as unknown as PortfolioData),
  shader: {
    dark: {
      color1: (liveDefaults.theme as any).shaderColor1 || '#dc2626',
      color2: (liveDefaults.theme as any).shaderColor2 || '#0d0709',
      color3: (liveDefaults.theme as any).shaderColor3 || '#a915f9',
    },
    light: {
      color1: (liveDefaults.theme as any).lightShaderColor1 || '#fca5a5',
      color2: (liveDefaults.theme as any).lightShaderColor2 || '#fff5f5',
      color3: (liveDefaults.theme as any).lightShaderColor3 || '#fdba74',
    },
  },
};
