import React from 'react';

export interface HeroBackgroundProps {
  styleType?: 'geometric-waves' | 'liquid-silk' | 'cosmic-aurora' | 'cyber-mesh' | 'minimal-obsidian' | 'custom-image';
  customImageUrl?: string;
  primaryColor?: string;
  kickerColor?: string;
  className?: string;
}

export function HeroBackground({
  styleType = 'geometric-waves',
  customImageUrl,
  primaryColor = '#a855f7',
  kickerColor = '#38e8d6',
  className = '',
}: HeroBackgroundProps) {
  // 1. Geometric Fluid Waves (Bespoke organic wave curves & geometric tech accents)
  if (styleType === 'geometric-waves') {
    return (
      <div className={`pointer-events-none absolute inset-0 overflow-hidden bg-[#09080f] select-none ${className}`}>
        {/* Ambient luminous spotlights */}
        <div
          className="absolute -top-[15%] left-1/4 h-[50vw] w-[50vw] min-h-[400px] min-w-[400px] max-w-[850px] rounded-full blur-[140px] opacity-35"
          style={{ background: `radial-gradient(circle, ${primaryColor} 0%, rgba(13,8,25,0) 70%)` }}
        />
        <div
          className="absolute top-1/2 -right-[10%] h-[45vw] w-[45vw] min-h-[350px] min-w-[350px] max-w-[700px] rounded-full blur-[130px] opacity-25"
          style={{ background: `radial-gradient(circle, ${kickerColor} 0%, rgba(9,8,15,0) 70%)` }}
        />
        <div
          className="absolute -bottom-[10%] -left-[5%] h-[40vw] w-[40vw] min-h-[300px] min-w-[300px] max-w-[600px] rounded-full blur-[120px] opacity-20"
          style={{ background: `radial-gradient(circle, ${primaryColor} 0%, rgba(9,8,15,0) 70%)` }}
        />

        {/* Fluid Organic Waves - Uses xMidYMid slice so it NEVER squashes or stretches on any aspect ratio */}
        <svg
          viewBox="0 0 1920 1080"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="xMidYMid slice"
          className="absolute inset-0 h-full w-full opacity-80"
        >
          <defs>
            <linearGradient id="waveGradDeep" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#180e34" stopOpacity="0.85" />
              <stop offset="60%" stopColor="#110924" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#09080f" stopOpacity="0.98" />
            </linearGradient>

            <linearGradient id="waveGradMid" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#29144d" stopOpacity="0.65" />
              <stop offset="40%" stopColor="#1c0c38" stopOpacity="0.75" />
              <stop offset="100%" stopColor="#0b0616" stopOpacity="0.9" />
            </linearGradient>

            <linearGradient id="waveGradAccent" x1="0%" y1="30%" x2="100%" y2="70%">
              <stop offset="0%" stopColor="#3b1b6e" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#1b0a33" stopOpacity="0.65" />
            </linearGradient>

            <pattern id="dotMatrixPurple" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="3" cy="3" r="1.5" fill="#c4b5fd" fillOpacity="0.3" />
            </pattern>

            <pattern id="dotMatrixTeal" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="3" cy="3" r="1.5" fill={kickerColor} fillOpacity="0.35" />
            </pattern>
          </defs>

          {/* Background Layer 1: Sweeping Upper Fluid Wave Contour */}
          <path
            d="M-100 -50 C350 200 650 -100 1150 140 C1550 320 1800 120 2050 220 L2050 -100 L-100 -100 Z"
            fill="url(#waveGradDeep)"
            opacity="0.6"
          />

          {/* Background Layer 2: Main Organic Diagonal Wave Flow */}
          <path
            d="M-80 320 C240 160 520 460 920 310 C1320 160 1600 390 2020 280 L2020 1150 L-80 1150 Z"
            fill="url(#waveGradDeep)"
          />

          {/* Background Layer 3: Mid Fluid Swell */}
          <path
            d="M-60 540 C280 400 580 660 1020 520 C1460 380 1720 590 2020 520 L2020 1150 L-60 1150 Z"
            fill="url(#waveGradMid)"
            stroke="rgba(168, 85, 247, 0.18)"
            strokeWidth="1.5"
          />

          {/* Background Layer 4: Gentle Lower Fluid Shelf */}
          <path
            d="M-40 760 C320 660 680 840 1180 720 C1620 600 1820 780 2020 750 L2020 1150 L-40 1150 Z"
            fill="url(#waveGradAccent)"
            stroke="rgba(168, 85, 247, 0.12)"
            strokeWidth="1"
          />

          {/* Geometric Memphis Accent: Dot Matrix Block (Upper Left Perimeter) */}
          <rect x="120" y="90" width="168" height="120" fill="url(#dotMatrixPurple)" rx="4" />

          {/* Geometric Memphis Accent: Dot Matrix Block (Lower Right Perimeter) */}
          <rect x="1620" y="740" width="192" height="144" fill="url(#dotMatrixTeal)" rx="4" />

          {/* Concentric Circle 1 (Top Left Header Zone) */}
          <circle cx="210" cy="230" r="52" stroke="rgba(255, 255, 255, 0.25)" strokeWidth="2.5" />
          <circle cx="210" cy="230" r="34" stroke="rgba(168, 85, 247, 0.4)" strokeWidth="1.5" strokeDasharray="6 4" />
          <circle cx="210" cy="230" r="16" fill="rgba(168, 85, 247, 0.15)" />

          {/* Concentric Circle 2 (Far Right Edge) */}
          <circle cx="1780" cy="320" r="72" stroke="rgba(255, 255, 255, 0.28)" strokeWidth="3" />
          <circle cx="1780" cy="320" r="48" stroke="rgba(56, 232, 214, 0.45)" strokeWidth="2" />
          <circle cx="1780" cy="320" r="28" stroke="rgba(168, 85, 247, 0.55)" strokeWidth="1.5" strokeDasharray="5 3" />

          {/* Concentric Circle 3 (Bottom Center-Left) */}
          <circle cx="560" cy="880" r="44" stroke="rgba(255, 255, 255, 0.2)" strokeWidth="2" />
          <circle cx="560" cy="880" r="26" stroke="rgba(168, 85, 247, 0.35)" strokeWidth="1.5" strokeDasharray="4 3" />

          {/* Floating Geometric Arcs & Crescents */}
          <path
            d="M 680 180 A 32 32 0 0 1 724 224"
            stroke="rgba(255, 255, 255, 0.4)"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d="M 1240 380 A 42 42 0 0 1 1282 444"
            stroke="rgba(168, 85, 247, 0.5)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d="M 1480 720 A 30 30 0 0 1 1520 760"
            stroke="rgba(56, 232, 214, 0.4)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* Sparkles / Plus Crosses */}
          <g transform="translate(480, 290)">
            <line x1="-7" y1="0" x2="7" y2="0" stroke="rgba(255,255,255,0.45)" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="0" y1="-7" x2="0" y2="7" stroke="rgba(255,255,255,0.45)" strokeWidth="1.5" strokeLinecap="round" />
          </g>
          <g transform="translate(1080, 200)">
            <line x1="-9" y1="0" x2="9" y2="0" stroke={primaryColor} strokeWidth="2" strokeLinecap="round" />
            <line x1="0" y1="-9" x2="0" y2="9" stroke={primaryColor} strokeWidth="2" strokeLinecap="round" />
          </g>
          <g transform="translate(1380, 780)">
            <line x1="-6" y1="0" x2="6" y2="0" stroke={kickerColor} strokeWidth="1.5" strokeLinecap="round" />
            <line x1="0" y1="-6" x2="0" y2="6" stroke={kickerColor} strokeWidth="1.5" strokeLinecap="round" />
          </g>
        </svg>

        {/* Central Readability Vignette: keeps hero text, avatar, and CTA punchy and legible */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 50% 45%, rgba(9, 8, 15, 0.2) 0%, rgba(9, 8, 15, 0.65) 60%, rgba(9, 8, 15, 0.95) 100%)',
          }}
        />
      </div>
    );
  }

  // 2. Boutique Liquid Silk (High resolution dark violet silk 3D render)
  if (styleType === 'liquid-silk') {
    return (
      <div className={`pointer-events-none absolute inset-0 overflow-hidden bg-[#07050d] select-none ${className}`}>
        <img
          src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=2400&q=85"
          alt="Dark Silk Liquid"
          className="h-full w-full object-cover opacity-35 mix-blend-screen filter contrast-125 saturate-150"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#09080f] via-[#09080f]/75 to-[#09080f]/90" />
        <div
          className="absolute -top-[10%] left-1/3 h-[50vw] w-[50vw] max-w-[700px] rounded-full blur-[140px] opacity-40"
          style={{ background: `radial-gradient(circle, ${primaryColor} 0%, rgba(9,8,15,0) 70%)` }}
        />
      </div>
    );
  }

  // 3. Cosmic Aurora Nebula
  if (styleType === 'cosmic-aurora') {
    return (
      <div className={`pointer-events-none absolute inset-0 overflow-hidden bg-[#06040a] select-none ${className}`}>
        <img
          src="https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?auto=format&fit=crop&w=2400&q=85"
          alt="Cosmic Aurora"
          className="h-full w-full object-cover opacity-30 mix-blend-screen filter contrast-110"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#09080f]/70 via-[#09080f]/80 to-[#09080f]" />
        <div
          className="absolute top-1/4 -right-[10%] h-[55vw] w-[55vw] max-w-[750px] rounded-full blur-[150px] opacity-35"
          style={{ background: `radial-gradient(circle, ${primaryColor} 0%, rgba(9,8,15,0) 70%)` }}
        />
      </div>
    );
  }

  // 4. Cyber Tech Mesh
  if (styleType === 'cyber-mesh') {
    return (
      <div className={`pointer-events-none absolute inset-0 overflow-hidden bg-[#07050e] select-none ${className}`}>
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, ${primaryColor} 1px, transparent 0)`,
            backgroundSize: '36px 36px',
          }}
        />
        <div
          className="absolute inset-0 opacity-15"
          style={{
            backgroundImage: `linear-gradient(to right, rgba(168,85,247,0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(168,85,247,0.12) 1px, transparent 1px)`,
            backgroundSize: '72px 72px',
          }}
        />
        <div
          className="absolute -top-1/4 left-1/4 h-[60vw] w-[60vw] max-w-[800px] rounded-full blur-[160px] opacity-40"
          style={{ background: `radial-gradient(circle, ${primaryColor} 0%, rgba(9,8,15,0) 70%)` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#09080f]/60 to-[#09080f]" />
      </div>
    );
  }

  // 5. Custom User Upload Image
  if (styleType === 'custom-image' && customImageUrl) {
    return (
      <div className={`pointer-events-none absolute inset-0 overflow-hidden bg-[#09080f] select-none ${className}`}>
        <img
          src={customImageUrl}
          alt="Custom Background"
          className="h-full w-full object-cover opacity-45 filter contrast-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#09080f] via-[#09080f]/75 to-[#09080f]/85" />
      </div>
    );
  }

  // 6. Minimal Studio Obsidian (Default fallback)
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden bg-[#09080f] select-none ${className}`}>
      <div
        className="absolute -top-[15%] left-1/4 h-[55vw] w-[55vw] max-w-[750px] rounded-full blur-[160px] opacity-40"
        style={{ background: `radial-gradient(circle, ${primaryColor} 0%, rgba(9,8,15,0) 70%)` }}
      />
      <div
        className="absolute bottom-0 right-1/4 h-[45vw] w-[45vw] max-w-[650px] rounded-full blur-[140px] opacity-25"
        style={{ background: `radial-gradient(circle, ${kickerColor} 0%, rgba(9,8,15,0) 70%)` }}
      />
    </div>
  );
}
