import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

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
  // 1. Geometric Fluid Waves (Directly modeled after the user's attached reference)
  if (styleType === 'geometric-waves') {
    return (
      <div className={`pointer-events-none absolute inset-0 overflow-hidden bg-[#09080f] ${className}`}>
        {/* Deep ambient backdrop glow */}
        <div
          className="absolute -top-[20%] -left-[10%] h-[70vw] w-[70vw] max-w-[900px] rounded-full blur-[140px] opacity-45"
          style={{ background: `radial-gradient(circle, ${primaryColor} 0%, rgba(15,10,30,0) 70%)` }}
        />
        <div
          className="absolute -bottom-[20%] -right-[10%] h-[60vw] w-[60vw] max-w-[800px] rounded-full blur-[130px] opacity-35"
          style={{ background: `radial-gradient(circle, ${kickerColor} 0%, rgba(9,8,15,0) 70%)` }}
        />

        {/* Fluid Organic Waves SVG Layers */}
        <svg
          viewBox="0 0 1440 900"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full opacity-85"
        >
          <defs>
            <linearGradient id="waveGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1a0f35" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#0d071a" stopOpacity="0.98" />
            </linearGradient>
            <linearGradient id="waveGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#2c1654" stopOpacity="0.85" />
              <stop offset="50%" stopColor="#1e0e3b" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#0b0617" stopOpacity="0.95" />
            </linearGradient>
            <linearGradient id="waveGrad3" x1="0%" y1="50%" x2="100%" y2="50%">
              <stop offset="0%" stopColor="#3d1d78" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#1f0c42" stopOpacity="0.75" />
            </linearGradient>
            <pattern id="dotGrid" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="3" cy="3" r="1.5" fill="#c4b5fd" fillOpacity="0.35" />
            </pattern>
            <pattern id="cyanDotGrid" x="0" y="0" width="22" height="22" patternUnits="userSpaceOnUse">
              <circle cx="3" cy="3" r="1.5" fill={kickerColor} fillOpacity="0.4" />
            </pattern>
          </defs>

          {/* Deep organic wave 1 */}
          <path
            d="M-50 120 C280 60 450 320 820 220 C1190 120 1350 280 1520 200 L1520 950 L-50 950 Z"
            fill="url(#waveGrad1)"
          />

          {/* Mid organic fluid wave 2 */}
          <path
            d="M-60 380 C240 260 490 520 860 400 C1230 280 1380 480 1520 420 L1520 950 L-60 950 Z"
            fill="url(#waveGrad2)"
          />

          {/* Foreground crest wave 3 with luminous rim */}
          <path
            d="M-40 590 C260 490 540 680 920 560 C1300 440 1420 620 1520 580 L1520 950 L-40 950 Z"
            fill="url(#waveGrad3)"
            stroke="rgba(168, 85, 247, 0.25)"
            strokeWidth="1.5"
          />

          {/* Geometric Memphis Accent: Dot Matrix Block Top Left */}
          <rect x="80" y="70" width="160" height="120" fill="url(#dotGrid)" />

          {/* Geometric Memphis Accent: Dot Matrix Block Bottom Right */}
          <rect x="1160" y="580" width="200" height="140" fill="url(#cyanDotGrid)" />

          {/* Concentric Floating Rings (Upper Left) */}
          <circle cx="160" cy="180" r="48" stroke="rgba(255, 255, 255, 0.35)" strokeWidth="3" />
          <circle cx="160" cy="180" r="32" stroke="rgba(168, 85, 247, 0.45)" strokeWidth="2" strokeDasharray="6 4" />

          {/* Concentric Floating Rings (Center Right) */}
          <circle cx="1280" cy="240" r="64" stroke="rgba(255, 255, 255, 0.4)" strokeWidth="4" />
          <circle cx="1280" cy="240" r="44" stroke="rgba(56, 232, 214, 0.5)" strokeWidth="2.5" />
          <circle cx="1280" cy="240" r="26" stroke="rgba(168, 85, 247, 0.6)" strokeWidth="1.5" strokeDasharray="4 3" />

          {/* Concentric Ring Lower Left */}
          <circle cx="480" cy="740" r="36" stroke="rgba(255, 255, 255, 0.3)" strokeWidth="3" />
          <circle cx="480" cy="740" r="22" stroke="rgba(168, 85, 247, 0.4)" strokeWidth="1.5" />

          {/* Floating Arc / Crescents */}
          <path
            d="M 520 140 A 30 30 0 0 1 560 180"
            stroke="rgba(255, 255, 255, 0.5)"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <path
            d="M 980 340 A 40 40 0 0 1 1020 400"
            stroke="rgba(168, 85, 247, 0.6)"
            strokeWidth="3"
            strokeLinecap="round"
          />

          {/* Sparkles / Plus Crosses */}
          <g transform="translate(380, 260)">
            <line x1="-8" y1="0" x2="8" y2="0" stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeLinecap="round" />
            <line x1="0" y1="-8" x2="0" y2="8" stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeLinecap="round" />
          </g>
          <g transform="translate(880, 160)">
            <line x1="-10" y1="0" x2="10" y2="0" stroke={primaryColor} strokeWidth="2.5" strokeLinecap="round" />
            <line x1="0" y1="-10" x2="0" y2="10" stroke={primaryColor} strokeWidth="2.5" strokeLinecap="round" />
          </g>
          <g transform="translate(1080, 680)">
            <line x1="-7" y1="0" x2="7" y2="0" stroke={kickerColor} strokeWidth="2" strokeLinecap="round" />
            <line x1="0" y1="-7" x2="0" y2="7" stroke={kickerColor} strokeWidth="2" strokeLinecap="round" />
          </g>
        </svg>

        {/* Ambient Film Grain & Vignette */}
        <div className="absolute inset-0 bg-radial-vignette opacity-80" />
      </div>
    );
  }

  // 2. Boutique Liquid Silk (High resolution dark violet silk 3D render)
  if (styleType === 'liquid-silk') {
    return (
      <div className={`pointer-events-none absolute inset-0 overflow-hidden bg-[#07050d] ${className}`}>
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
      <div className={`pointer-events-none absolute inset-0 overflow-hidden bg-[#06040a] ${className}`}>
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
      <div className={`pointer-events-none absolute inset-0 overflow-hidden bg-[#07050e] ${className}`}>
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
      <div className={`pointer-events-none absolute inset-0 overflow-hidden bg-[#09080f] ${className}`}>
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
    <div className={`pointer-events-none absolute inset-0 overflow-hidden bg-[#09080f] ${className}`}>
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
