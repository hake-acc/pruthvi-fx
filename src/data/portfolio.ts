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

export const PORTFOLIO_DATA: PortfolioData = {
  brandPrefix: 'Pruthvi',
  brandSuffix: 'FX',
  brandName: 'Pruthvi FX',
  logoSrc: '/assets/aistudio/image_58923e46.png',
  categories: [
    {
      id: 'minecraft',
      name: 'Minecraft',
      description: 'SMP storytelling, 100-player events, PvP wars & modpacks',
    },
    {
      id: 'roblox',
      name: 'Roblox',
      description: 'High-saturation tycoons, roleplay chases & anime boss battles',
    },
    {
      id: 'irl',
      name: 'IRL',
      description: 'High-stakes studio challenges, room makeovers & 24hr survival',
    },
  ],
  thumbnails: [
    {
      id: 'mc-1',
      categoryId: 'minecraft',
      src: '/src/assets/images/mc_war_thumb_1795347704652.jpg',
      title: 'Minecraft Biggest SMP War',
      client: 'SenpaiSpider',
      videoUrl: 'https://www.youtube.com/watch?v=X-Su2FSGQeE',
    },
    {
      id: 'mc-2',
      categoryId: 'minecraft',
      src: '/src/assets/images/mc_assassin_thumb_1795347706458.jpg',
      title: 'How I Became Assassin In This Minecraft SMP',
      client: 'DreamBoy',
      videoUrl: 'https://www.youtube.com/watch?v=cx0rSLFzIB8',
    },
    {
      id: 'mc-3',
      categoryId: 'minecraft',
      src: '/src/assets/images/mc_dimension_thumb_1795347704196.jpg',
      title: 'Opening The Forbidden Crimson Dimension',
      client: 'PSD1',
      videoUrl: 'https://www.youtube.com/watch?v=vRAphVKaHQE',
    },
    {
      id: 'rblx-1',
      categoryId: 'roblox',
      src: '/src/assets/images/rblx_tycoon_thumb_1795347704378.jpg',
      title: 'I Built The Ultimate Mega Vault Tycoon',
      client: 'Bulky Star',
    },
    {
      id: 'rblx-2',
      categoryId: 'roblox',
      src: '/src/assets/images/rblx_brookhaven_thumb_1795347704857.jpg',
      title: 'Midnight Police Escape Heist in Roblox',
      client: 'NizGamer',
    },
    {
      id: 'rblx-3',
      categoryId: 'roblox',
      src: '/src/assets/images/rblx_boss_thumb_1795347703941.jpg',
      title: 'Defeating The Volcanic Demon Boss Solo',
      client: 'Teddy Gaming',
    },
    {
      id: 'irl-1',
      categoryId: 'irl',
      src: '/src/assets/images/irl_challenge_thumb_1795347704382.jpg',
      title: '$10,000 Mystery Vault Countdown Challenge',
      client: 'Daiazal',
    },
    {
      id: 'irl-2',
      categoryId: 'irl',
      src: '/src/assets/images/irl_setup_thumb_1795347704798.jpg',
      title: 'Upgrading My Dream Crimson Gaming Studio',
      client: 'SamNuzz Gaming',
    },
    {
      id: 'irl-3',
      categoryId: 'irl',
      src: '/src/assets/images/irl_24hr_thumb_1795347703819.jpg',
      title: '24 Hours Trapped Inside A Laser Glass Box',
      client: 'Game Beat',
    },
  ],
  beforeAfter: [
    {
      id: 'ba-mimikyu',
      title: 'Mimikyu Encounter',
      subtitle: 'Raw Blender Scene → Final Composite',
      beforeSrc: '/src/assets/compare/01-before-CrT0YzDN.webp',
      afterSrc: '/src/assets/compare/03-mimikyu-CDsEWoJf.webp',
    },
    {
      id: 'ba-downloads',
      title: '0 Downloads Mod',
      subtitle: 'Base Render → Atmospheric Paint-Over',
      beforeSrc: '/src/assets/compare/02-before-CJsTVuK6.webp',
      afterSrc: '/src/assets/compare/24-0-downloads-mod-Bik0-mJZ.webp',
    },
  ],
  clientRows: {
    rowOne: [
      {
        id: 'c-senpaispider',
        name: 'SenpaiSpider',
        subs: '2M+ subscribers',
        avatar: '/src/assets/avatars/senpaispider.png',
        channelUrl: 'https://youtube.com/@SenpaiSpider',
      },
      {
        id: 'c-bulkystar',
        name: 'Bulky Star',
        subs: '1.44M+ subscribers',
        avatar: '/src/assets/clients/bulky-star.webp',
        channelUrl: 'https://youtube.com/@bulkystar',
      },
      {
        id: 'c-dreamboy',
        name: 'DreamBoy',
        subs: '1M+ subscribers',
        avatar: '/src/assets/avatars/dreamboy.png',
        channelUrl: 'https://youtube.com/@DreamBoyYT',
      },
      {
        id: 'c-nizunfiltered',
        name: 'Niz Unfiltered',
        subs: '863K+ subscribers',
        avatar: '/src/assets/clients/niz-unfiltered.webp',
        channelUrl: 'https://youtube.com/@nizunfiltered',
      },
      {
        id: 'c-daiazal',
        name: 'Daiazal',
        subs: '450K+ subscribers',
        avatar: '/src/assets/clients/daiazal.webp',
        channelUrl: 'https://youtube.com/@daiazal',
      },
      {
        id: 'c-mrfenix47',
        name: 'Mr Fenix 47',
        subs: '406K+ subscribers',
        avatar: '/src/assets/clients/mr-fenix-47.webp',
        channelUrl: 'https://youtube.com/@mrfenix47',
      },
      {
        id: 'c-stevee',
        name: 'Stevee',
        subs: '259K+ subscribers',
        avatar: '/src/assets/clients/stevee.webp',
        channelUrl: 'https://youtube.com/@notstevee69',
      },
      {
        id: 'c-spyinsaan',
        name: 'Spy Insaan',
        subs: '141K+ subscribers',
        avatar: '/src/assets/clients/spy-insaan.webp',
        channelUrl: 'https://youtube.com/@spy_insaan',
      },
      {
        id: 'c-lozo',
        name: 'Lozo',
        subs: '57K+ subscribers',
        avatar: '/src/assets/clients/lozo.webp',
        channelUrl: 'https://youtube.com/@lozoytt',
      },
    ],
    rowTwo: [
      {
        id: 'c-teddygaming',
        name: 'Teddy Gaming',
        subs: '1.22M+ subscribers',
        avatar: '/src/assets/clients/teddy-gaming.webp',
        channelUrl: 'https://youtube.com/@teddygaming',
      },
      {
        id: 'c-psd1',
        name: 'PSD1',
        subs: '1M+ subscribers',
        avatar: '/src/assets/avatars/psd1.png',
        channelUrl: 'https://youtube.com/@PSD1',
      },
      {
        id: 'c-nizgamer',
        name: 'NizGamer',
        subs: '900K+ subscribers',
        avatar: '/src/assets/avatars/nizgamer.png',
        channelUrl: 'https://youtube.com/@NizGamer',
      },
      {
        id: 'c-gamebeat',
        name: 'Game Beat',
        subs: '750K+ subscribers',
        avatar: '/src/assets/clients/game-beat.webp',
        channelUrl: 'https://youtube.com/@gamebeatyoutube',
      },
      {
        id: 'c-samnuzz',
        name: 'SamNuzz Gaming',
        subs: '445K+ subscribers',
        avatar: '/src/assets/clients/samnuzz-gaming.webp',
        channelUrl: 'https://youtube.com/@samnuzzgaming',
      },
      {
        id: 'c-ygg',
        name: 'YGG',
        subs: '368K+ subscribers',
        avatar: '/src/assets/clients/ygg.webp',
        channelUrl: 'https://youtube.com/@yggislive90',
      },
      {
        id: 'c-notrexy',
        name: 'NotRexy',
        subs: '276K+ subscribers',
        avatar: '/src/assets/clients/notrexy.webp',
        channelUrl: 'https://youtube.com/@notrexy',
      },
      {
        id: 'c-spunkyop',
        name: 'Spunky OP',
        subs: '160K+ subscribers',
        avatar: '/src/assets/clients/spunky-op.webp',
        channelUrl: 'https://youtube.com/@spunkyop',
      },
      {
        id: 'c-momingaming',
        name: 'MominGaming',
        subs: '19K+ subscribers',
        avatar: '/src/assets/clients/momingaming.webp',
        channelUrl: 'https://youtube.com/@momingaming50',
      },
      {
        id: 'c-eltro',
        name: 'ElTro',
        subs: '10K+ subscribers',
        avatar: '/src/assets/clients/eltro.webp',
        channelUrl: 'https://youtube.com/@elastromc',
      },
    ],
  },
  faqs: [
    {
      id: 'faq-order',
      question: 'How do I order a thumbnail?',
      answer:
        'Message me on Discord or X (@PruthviFX) with your video concept, title idea, and any reference styles you like.',
    },
    {
      id: 'faq-niches',
      question: 'Which niches do you specialize in?',
      answer:
        'I have over 2 years of experience designing high-performing Minecraft, Roblox, and IRL thumbnails tailored to boost click-through rate.',
    },
    {
      id: 'faq-send',
      question: 'What should I send you?',
      answer:
        'Share your video topic, working title, skins or facecam photos if needed, and any key moment or emotion you want highlighted.',
    },
    {
      id: 'faq-cost',
      question: 'How much does a thumbnail cost?',
      answer:
        'Pricing depends on complexity, custom 3D renders, and turnaround speed. Reach out on Discord or X to discuss your upload and get a quick quote.',
    },
    {
      id: 'faq-turnaround',
      question: 'How long does a thumbnail take?',
      answer:
        'Most thumbnails are delivered within 24 to 72 hours. Let me know your upload schedule so we can lock in your slot ahead of time.',
    },
    {
      id: 'faq-revisions',
      question: 'Can I ask for changes?',
      answer:
        'Of course. I share clean composition drafts first and refine lighting, expressions, or layout until the frame feels clickable.',
    },
  ],
  about: {
    badge: 'About me',
    headingPrefix: "Hey, I'm",
    headingHighlight: 'Pruthvi FX',
    bio: 'My name is Pruthvi FX, and I bring 2+ years of hands-on experience creating high-performing Minecraft, Roblox, and IRL thumbnails. I focus on the exact split second a viewer scrolls past your video — taking your raw idea, capturing the sharpest story and emotion, and crafting one bold, crystal-clear frame engineered to earn the click.',
    experienceBadge: '2+ Years Experience',
    ctaLabel: "Let's create something great",
  },
  hero: {
    availabilityText: 'Open for new projects',
    availabilityOpen: true,
    headlineWords: ['Pruthvi', 'FX'],
    descriptionLine1: 'A professional Minecraft Thumbnail Artist making',
    descriptionLine2Prefix: 'thumbnails that get your videos ',
    descriptionHighlight: 'more clicks.',
    primaryCta: 'View My Work',
    secondaryCta: 'Contact Me',
    avatarBadge: 'PruthviFx',
    stats: [
      { value: '300+', label: 'THUMBNAILS' },
      { value: '80+', label: 'CREATORS' },
      { value: '100M+', label: 'VIEWS' },
    ],
  },
  clientsSection: {
    kicker: 'Trusted by creators',
    headingPrefix: 'Built alongside',
    headingHighlight: 'top creators.',
    subtitle:
      'From rising channels to million-subscriber names — creators count on Pruthvi FX for the frame that earns the click.',
  },
  contact: {
    kicker: 'Contact',
    headingPrefix: "Let's work",
    headingHighlight: 'together.',
    subtitle:
      'Send me your video idea. I will reply fast. Discord and X are the best ways to reach me.',
    discordCta: 'Message me on Discord',
    xCta: 'Follow @PruthviFX on X',
  },
  footerTagline: 'Minecraft, Roblox & IRL YouTube thumbnails that get clicks.',
  socials: {
    discord: 'https://discord.com/users/828130504305410048',
    discordId: '828130504305410048',
    x: 'https://x.com/PruthviFX',
    xHandle: '@PruthviFX',
  },
  theme: {
    defaultMode: 'dark',
    preset: 'pruthvi-purple',
    primaryColor: '#a855f7',
    kickerColor: '#38e8d6',
    navActiveColor: '#0f4c5c',
    darkBg: '#09080f',
    darkCard: '#131020',
    bgType: 'solid',
    bgGradient: 'linear-gradient(135deg, #09080f 0%, #200a38 100%)',
    bgGradientStart: '#09080f',
    bgGradientEnd: '#200a38',
    bgGradientAngle: 135,
    textColor: '#faf9ff',
    mutedTextColor: '#a29bb8',
    displayFont: 'Outfit',
    bodyFont: 'Plus Jakarta Sans',
    customFont: '',
    bgStyle: 'geometric-waves',
    bgImageUrl: '',
    showCurls: true,
    shaderColor1: '#7c3aed',
    shaderColor2: '#09080f',
    shaderColor3: '#38e8d6',
    lightShaderColor1: '#c4b5fd',
    lightShaderColor2: '#f6f5fb',
    lightShaderColor3: '#99f6e4',
  },
  sound: {
    enabled: true,
    volume: 0.75,
    profile: 'studio',
  },
  shader: {
    dark: {
      color1: '#7c3aed',
      color2: '#09080f',
      color3: '#38e8d6',
    },
    light: {
      color1: '#c4b5fd',
      color2: '#f6f5fb',
      color3: '#99f6e4',
    },
  },
};
