import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Palette, Sparkles, Sliders, RotateCcw, Check, Flame, Snowflake, Layers, RefreshCw } from 'lucide-react';
import { hexToRgb, rgbToHsl, hslToHex, rgbToHex } from './ColorPickerWheel';
import type { ThemeConfig } from '../data/portfolio';

export type TemperatureMode = 'cooler' | 'warmer' | 'complementary' | 'analogous' | 'monochrome';

export interface HarmonizedPalette {
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
  textColor: string;
  mutedTextColor: string;
  bgGradient: string;
  bgGradientStart: string;
  bgGradientEnd: string;
}

/**
 * Intelligent color harmony engine: calculates high-contrast, boutique
 * secondary accents, dark background tones, elevated card surfaces, and fluid shader
 * harmonics from one single Master Brand Color.
 */
export function calculateHarmonizedPalette(
  masterHex: string,
  mode: TemperatureMode = 'cooler',
  warmth: number = 0
): HarmonizedPalette {
  const { r, g, b } = hexToRgb(masterHex);
  const { h, s, l } = rgbToHsl(r, g, b);

  // Normalize base values for vibrant primary brand impact
  const primaryHue = h;
  const primarySat = Math.max(75, Math.min(100, s));
  const primaryLight = Math.max(48, Math.min(64, l));
  const primaryColor = hslToHex(primaryHue, primarySat, primaryLight);

  // Determine Kicker Accent Hue based on temperature mode
  let kickerHue = primaryHue;
  const isHueWarm = primaryHue >= 330 || primaryHue <= 85;

  if (mode === 'cooler') {
    // If master is warm, contrast with electric cyan / ice blue (175 - 200)
    // If master is cool, push deeper into arctic cyan or electric emerald
    kickerHue = isHueWarm ? 185 : (primaryHue - 55 + 360) % 360;
  } else if (mode === 'warmer') {
    // If master is cool, contrast with radiant gold / amber / coral (35 - 45)
    // If master is warm, push into neon coral or warm golden yellow
    kickerHue = !isHueWarm ? 38 : (primaryHue + 45) % 360;
  } else if (mode === 'complementary') {
    // High-contrast direct dual-tone
    kickerHue = (primaryHue + 180) % 360;
  } else if (mode === 'analogous') {
    // Harmonic adjacent flow
    kickerHue = (primaryHue + 35) % 360;
  } else if (mode === 'monochrome') {
    kickerHue = primaryHue;
  }

  // Apply continuous warmth dial slider (-100 to +100)
  if (warmth < 0) {
    // Pull kicker smoothly towards cool cyan pole (190 deg)
    const factor = Math.abs(warmth) / 100;
    kickerHue = ((kickerHue * (1 - factor) + 190 * factor) + 360) % 360;
  } else if (warmth > 0) {
    // Pull kicker smoothly towards warm gold/amber pole (38 deg)
    const factor = warmth / 100;
    kickerHue = ((kickerHue * (1 - factor) + 38 * factor) + 360) % 360;
  }

  // Kicker color: vibrant with strong contrast
  const kickerSat = Math.max(82, primarySat);
  const kickerLight = mode === 'monochrome'
    ? Math.min(88, primaryLight + 26)
    : Math.max(50, Math.min(62, primaryLight));
  const kickerColor = hslToHex(Math.round(kickerHue), kickerSat, kickerLight);

  // Active Nav Pill & Accent: luminous, high-visibility highlight
  const navActiveLight = Math.min(82, primaryLight + 16);
  const navActiveColor = hslToHex(primaryHue, Math.min(100, primarySat + 5), navActiveLight);

  // Dark Background: bespoke obsidian tint infused with master hue
  // (3-5% lightness for deep luxury OLED contrast, subtly tinted)
  const darkBgSat = Math.max(18, Math.min(32, Math.round(primarySat * 0.35)));
  const darkBgLight = 4;
  const darkBg = hslToHex(primaryHue, darkBgSat, darkBgLight);

  // Dark Card Surface: elevated container surface (7-9% lightness)
  const darkCardSat = Math.max(14, Math.min(26, Math.round(primarySat * 0.28)));
  const darkCardLight = 8;
  const darkCard = hslToHex(primaryHue, darkCardSat, darkCardLight);

  // Ambient fluid shader colors
  const shaderColor1 = primaryColor;
  const shaderColor2 = darkBg;
  const shaderColor3 = kickerColor;

  // Light mode soft pastel counterparts
  const lightShaderColor1 = hslToHex(primaryHue, 75, 84);
  const lightShaderColor2 = hslToHex(primaryHue, 20, 98);
  const lightShaderColor3 = hslToHex(Math.round(kickerHue), 75, 82);

  // Text colors: crisp high-contrast off-whites with subtle temperature tint
  const textColor = hslToHex(primaryHue, 12, 98);
  const mutedTextColor = hslToHex(primaryHue, 15, 68);

  // Rich matching background gradient
  const gradEnd = hslToHex((primaryHue + 30) % 360, Math.min(45, darkBgSat + 15), 11);
  const bgGradient = `linear-gradient(135deg, ${darkBg} 0%, ${gradEnd} 100%)`;

  return {
    primaryColor,
    kickerColor,
    navActiveColor,
    darkBg,
    darkCard,
    shaderColor1,
    shaderColor2,
    shaderColor3,
    lightShaderColor1,
    lightShaderColor2,
    lightShaderColor3,
    textColor,
    mutedTextColor,
    bgGradient,
    bgGradientStart: darkBg,
    bgGradientEnd: gradEnd,
  };
}

export interface MasterColorWheelProps {
  currentTheme: ThemeConfig;
  onApplyPalette: (palette: HarmonizedPalette) => void;
  brandName?: string;
  logoSrc?: string;
}

export function MasterColorWheel({
  currentTheme,
  onApplyPalette,
}: MasterColorWheelProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Master Color Wheel State
  const [masterColor, setMasterColor] = useState<string>(currentTheme.primaryColor || '#fb00ff');
  const [tempMode, setTempMode] = useState<TemperatureMode>('cooler');
  const [warmth, setWarmth] = useState<number>(0);
  const [autoSync, setAutoSync] = useState<boolean>(true);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // HSL state for wheel marker
  const [hue, setHue] = useState<number>(300);
  const [sat, setSat] = useState<number>(95);
  const [light, setLight] = useState<number>(55);

  // Synchronize HSL whenever masterColor changes
  useEffect(() => {
    if (!masterColor || !/^#[0-9a-fA-F]{3,6}$/.test(masterColor)) return;
    const { r, g, b } = hexToRgb(masterColor);
    const hsl = rgbToHsl(r, g, b);
    setHue(hsl.h);
    setSat(hsl.s);
    setLight(hsl.l);
  }, [masterColor]);

  // Compute live harmonized palette
  const livePalette = calculateHarmonizedPalette(masterColor, tempMode, warmth);

  // Render high-DPI Chromatic Wheel Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const displaySize = 250;
    canvas.width = displaySize * dpr;
    canvas.height = displaySize * dpr;
    ctx.scale(dpr, dpr);

    const cx = displaySize / 2;
    const cy = displaySize / 2;
    const radius = cx - 10;

    ctx.clearRect(0, 0, displaySize, displaySize);

    // Draw chromatic color wheel segments
    for (let angle = 0; angle < 360; angle += 1) {
      const startAngle = ((angle - 1) * Math.PI) / 180;
      const endAngle = ((angle + 1) * Math.PI) / 180;

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, startAngle, endAngle);
      ctx.closePath();

      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.2, '#f5f5f5');
      grad.addColorStop(1, `hsl(${angle}, 100%, 50%)`);
      ctx.fillStyle = grad;
      ctx.fill();
    }

    // Outer subtle border
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.stroke();

    // Secondary subtle kicker indicator on the wheel
    const kickerRgb = hexToRgb(livePalette.kickerColor);
    const kickerHsl = rgbToHsl(kickerRgb.r, kickerRgb.g, kickerRgb.b);
    const kickerAngleRad = (kickerHsl.h * Math.PI) / 180;
    const kickerDist = (kickerHsl.s / 100) * radius;
    const kx = cx + kickerDist * Math.cos(kickerAngleRad);
    const ky = cy + kickerDist * Math.sin(kickerAngleRad);

    // Kicker ghost pin
    ctx.beginPath();
    ctx.arc(kx, ky, 6, 0, 2 * Math.PI);
    ctx.fillStyle = livePalette.kickerColor;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    // Primary drag marker pin (Main Wheel Thumb)
    const angleRad = (hue * Math.PI) / 180;
    const dist = (sat / 100) * radius;
    const px = cx + dist * Math.cos(angleRad);
    const py = cy + dist * Math.sin(angleRad);

    // Outer glow
    ctx.beginPath();
    ctx.arc(px, py, 11, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fill();

    // Main pin body
    ctx.beginPath();
    ctx.arc(px, py, 8, 0, 2 * Math.PI);
    ctx.fillStyle = masterColor;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    // Center crosshair dot
    ctx.beginPath();
    ctx.arc(px, py, 2.5, 0, 2 * Math.PI);
    ctx.fillStyle = light > 60 ? '#000000' : '#ffffff';
    ctx.fill();
  }, [hue, sat, light, masterColor, livePalette.kickerColor]);

  // Handle pointer interactions on wheel
  const handlePointer = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const dx = clientX - rect.left - cx;
      const dy = clientY - rect.top - cy;

      let angleDeg = Math.round((Math.atan2(dy, dx) * 180) / Math.PI);
      if (angleDeg < 0) angleDeg += 360;

      const maxRadius = cx - 10;
      const dist = Math.min(maxRadius, Math.hypot(dx, dy));
      const satVal = Math.round((dist / maxRadius) * 100);

      const nextLight = Math.max(45, Math.min(65, light));
      const nextHex = hslToHex(angleDeg, Math.max(65, satVal), nextLight);

      setHue(angleDeg);
      setSat(satVal);
      setMasterColor(nextHex);

      if (autoSync) {
        const nextPalette = calculateHarmonizedPalette(nextHex, tempMode, warmth);
        onApplyPalette(nextPalette);
      }
    },
    [light, autoSync, tempMode, warmth, onApplyPalette]
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    handlePointercoord(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    handlePointercoord(e.clientX, e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const handlePointercoord = (clientX: number, clientY: number) => {
    handlePointer(clientX, clientY);
  };

  // Preset inspiration colors
  const QUICK_MASTER_PRESETS = [
    { name: 'Cyber Magenta', hex: '#fb00ff' },
    { name: 'Neon Violet', hex: '#8b5cf6' },
    { name: 'Electric Cyan', hex: '#00e5ff' },
    { name: 'Sunset Amber', hex: '#f59e0b' },
    { name: 'Crimson Flame', hex: '#ef4444' },
    { name: 'Acid Lime', hex: '#10b981' },
    { name: 'Cobalt Ice', hex: '#3b82f6' },
    { name: 'Rose Gold', hex: '#f43f5e' },
  ];

  return (
    <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-b from-card/90 to-background/95 p-6 shadow-2xl backdrop-blur-xl">
      {/* Decorative ambient background blur */}
      <div
        className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full opacity-20 blur-3xl transition-colors duration-500"
        style={{ backgroundColor: masterColor }}
      />
      <div
        className="pointer-events-none absolute -bottom-20 -left-20 h-72 w-72 rounded-full opacity-15 blur-3xl transition-colors duration-500"
        style={{ backgroundColor: livePalette.kickerColor }}
      />

      {/* Header */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div
            className="grid h-10 w-10 place-items-center rounded-2xl shadow-lg transition-transform hover:scale-105"
            style={{
              backgroundColor: masterColor,
              boxShadow: `0 8px 24px -4px ${masterColor}88`,
            }}
          >
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display text-base font-extrabold text-foreground sm:text-lg">
                Master Color Wheel &amp; Auto-Harmonizer
              </h3>
              <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                1-Wheel Engine
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Turn the wheel to pick your main brand color. The site automatically generates perfectly balanced
              secondary accents, dark backgrounds, elevated cards, and fluid shader harmonics.
            </p>
          </div>
        </div>

        {/* Auto Sync Toggle */}
        <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 transition-colors hover:border-white/20">
          <input
            type="checkbox"
            checked={autoSync}
            onChange={(e) => setAutoSync(e.target.checked)}
            className="h-4 w-4 rounded accent-primary"
          />
          <span className="text-xs font-semibold text-foreground">Auto-Update Live Site</span>
        </label>
      </div>

      {/* Main Wheel & Harmonizer Workspace */}
      <div className="relative z-10 mt-6 grid gap-6 lg:grid-cols-12 lg:items-center">
        {/* BIG CHROMATIC WHEEL (Left Column) */}
        <div className="flex flex-col items-center justify-center lg:col-span-5">
          <div className="relative flex items-center justify-center">
            {/* Ambient halo behind wheel */}
            <div
              className="absolute h-60 w-60 rounded-full opacity-40 blur-2xl transition-all duration-300"
              style={{ backgroundColor: masterColor }}
            />

            <canvas
              ref={canvasRef}
              style={{ width: '250px', height: '250px' }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              className="relative z-10 cursor-crosshair touch-none select-none rounded-full shadow-2xl transition-transform active:scale-[0.99]"
              title="Click or drag around the wheel to choose your Master Site Color"
            />
          </div>

          <div className="mt-3 flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
            <span className="inline-block h-2.5 w-2.5 rounded-full border border-white/40" style={{ backgroundColor: masterColor }} />
            <span>Master Color</span>
            <span className="text-white/20">•</span>
            <span className="inline-block h-2 w-2 rounded-full border border-white/40" style={{ backgroundColor: livePalette.kickerColor }} />
            <span>Harmonized Kicker</span>
          </div>
        </div>

        {/* HARMONY CONTROLS & TEMPERATURE (Right Column) */}
        <div className="space-y-4 lg:col-span-7">
          {/* Main Color Info Swatch */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-3.5">
            <div className="flex items-center gap-3">
              <div
                className="h-11 w-11 rounded-xl border border-white/20 shadow-md"
                style={{ backgroundColor: masterColor }}
              />
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Selected Master Brand Color
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-base font-extrabold text-foreground">{masterColor.toUpperCase()}</span>
                  <span className="text-xs text-muted-foreground">({hue}°, {sat}%, {light}%)</span>
                </div>
              </div>
            </div>

            {/* Quick Inspiration Swatches */}
            <div className="flex flex-wrap items-center gap-1.5">
              {QUICK_MASTER_PRESETS.map((p) => (
                <button
                  key={p.hex}
                  type="button"
                  onClick={() => {
                    setMasterColor(p.hex);
                    if (autoSync) {
                      const nextPal = calculateHarmonizedPalette(p.hex, tempMode, warmth);
                      onApplyPalette(nextPal);
                    }
                  }}
                  title={p.name}
                  className={`h-6 w-6 rounded-lg border transition-transform hover:scale-115 ${
                    masterColor.toLowerCase() === p.hex.toLowerCase()
                      ? 'border-white scale-110 shadow-glow'
                      : 'border-white/20'
                  }`}
                  style={{ backgroundColor: p.hex }}
                />
              ))}
            </div>
          </div>

          {/* Temperature & Mood Presets */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs font-bold text-foreground">
                Harmonic Mood (Cooler vs. Warmer Balance)
              </label>
              <span className="text-[11px] font-medium text-muted-foreground">
                Sets the relation between primary &amp; secondary accents
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => {
                  setTempMode('cooler');
                  if (autoSync) {
                    onApplyPalette(calculateHarmonizedPalette(masterColor, 'cooler', warmth));
                  }
                }}
                className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-bold transition-all ${
                  tempMode === 'cooler'
                    ? 'border-cyan-400 bg-cyan-500/20 text-cyan-200 shadow-[0_0_15px_-3px_rgba(6,182,212,0.4)]'
                    : 'border-white/10 bg-white/5 text-muted-foreground hover:border-white/25 hover:text-foreground'
                }`}
              >
                <Snowflake className="h-3.5 w-3.5 text-cyan-400" />
                <span>Cooler Contrast</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTempMode('warmer');
                  if (autoSync) {
                    onApplyPalette(calculateHarmonizedPalette(masterColor, 'warmer', warmth));
                  }
                }}
                className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-bold transition-all ${
                  tempMode === 'warmer'
                    ? 'border-amber-400 bg-amber-500/20 text-amber-200 shadow-[0_0_15px_-3px_rgba(245,158,11,0.4)]'
                    : 'border-white/10 bg-white/5 text-muted-foreground hover:border-white/25 hover:text-foreground'
                }`}
              >
                <Flame className="h-3.5 w-3.5 text-amber-400" />
                <span>Warmer Glow</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTempMode('complementary');
                  if (autoSync) {
                    onApplyPalette(calculateHarmonizedPalette(masterColor, 'complementary', warmth));
                  }
                }}
                className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-bold transition-all ${
                  tempMode === 'complementary'
                    ? 'border-primary bg-primary/20 text-foreground shadow-glow'
                    : 'border-white/10 bg-white/5 text-muted-foreground hover:border-white/25 hover:text-foreground'
                }`}
              >
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span>Bold Dual-Tone</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTempMode('analogous');
                  if (autoSync) {
                    onApplyPalette(calculateHarmonizedPalette(masterColor, 'analogous', warmth));
                  }
                }}
                className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-bold transition-all ${
                  tempMode === 'analogous'
                    ? 'border-emerald-400 bg-emerald-500/20 text-emerald-200 shadow-[0_0_15px_-3px_rgba(16,185,129,0.4)]'
                    : 'border-white/10 bg-white/5 text-muted-foreground hover:border-white/25 hover:text-foreground'
                }`}
              >
                <Layers className="h-3.5 w-3.5 text-emerald-400" />
                <span>Analogous Flow</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTempMode('monochrome');
                  if (autoSync) {
                    onApplyPalette(calculateHarmonizedPalette(masterColor, 'monochrome', warmth));
                  }
                }}
                className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-bold transition-all sm:col-span-2 ${
                  tempMode === 'monochrome'
                    ? 'border-purple-400 bg-purple-500/20 text-purple-200 shadow-[0_0_15px_-3px_rgba(168,85,247,0.4)]'
                    : 'border-white/10 bg-white/5 text-muted-foreground hover:border-white/25 hover:text-foreground'
                }`}
              >
                <Sliders className="h-3.5 w-3.5 text-purple-400" />
                <span>Monochrome Chroma</span>
              </button>
            </div>
          </div>

          {/* Continuous Warmth Dial Slider */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                <Sliders className="h-3.5 w-3.5 text-primary" />
                <span>Fine-Tune Temperature Shift</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold">
                  {warmth < 0 ? `${warmth}% (Cooler ❄️)` : warmth > 0 ? `+${warmth}% (Warmer 🔥)` : 'Neutral (0%)'}
                </span>
                {warmth !== 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setWarmth(0);
                      if (autoSync) {
                        onApplyPalette(calculateHarmonizedPalette(masterColor, tempMode, 0));
                      }
                    }}
                    className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:text-foreground"
                    title="Reset temperature to 0"
                  >
                    <RotateCcw className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>

            <div className="mt-2.5 flex items-center gap-3">
              <Snowflake className="h-4 w-4 text-cyan-400 shrink-0" />
              <input
                type="range"
                min="-100"
                max="100"
                step="2"
                value={warmth}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setWarmth(val);
                  if (autoSync) {
                    onApplyPalette(calculateHarmonizedPalette(masterColor, tempMode, val));
                  }
                }}
                className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gradient-to-r from-cyan-500 via-purple-500 to-amber-500 accent-white"
              />
              <Flame className="h-4 w-4 text-amber-400 shrink-0" />
            </div>
          </div>

          {/* Live Generated Palette Strip */}
          <div className="rounded-2xl border border-white/10 bg-background/60 p-3.5">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Live Auto-Harmonized Palette
              </span>
              <span className="text-[11px] font-medium text-primary">All colors calculated live</span>
            </div>

            <div className="grid grid-cols-5 gap-2 text-center text-[10px]">
              <div className="space-y-1">
                <div
                  className="h-9 w-full rounded-xl border border-white/20 shadow-md"
                  style={{ backgroundColor: livePalette.primaryColor }}
                />
                <div className="font-bold text-foreground">Primary</div>
                <div className="font-mono text-[9px] text-muted-foreground">{livePalette.primaryColor}</div>
              </div>

              <div className="space-y-1">
                <div
                  className="h-9 w-full rounded-xl border border-white/20 shadow-md"
                  style={{ backgroundColor: livePalette.kickerColor }}
                />
                <div className="font-bold text-foreground">Kicker</div>
                <div className="font-mono text-[9px] text-muted-foreground">{livePalette.kickerColor}</div>
              </div>

              <div className="space-y-1">
                <div
                  className="h-9 w-full rounded-xl border border-white/20 shadow-md"
                  style={{ backgroundColor: livePalette.navActiveColor }}
                />
                <div className="font-bold text-foreground">Nav Glow</div>
                <div className="font-mono text-[9px] text-muted-foreground">{livePalette.navActiveColor}</div>
              </div>

              <div className="space-y-1">
                <div
                  className="h-9 w-full rounded-xl border border-white/20 shadow-md"
                  style={{ backgroundColor: livePalette.darkBg }}
                />
                <div className="font-bold text-foreground">Dark Bg</div>
                <div className="font-mono text-[9px] text-muted-foreground">{livePalette.darkBg}</div>
              </div>

              <div className="space-y-1">
                <div
                  className="h-9 w-full rounded-xl border border-white/20 shadow-md"
                  style={{ backgroundColor: livePalette.darkCard }}
                />
                <div className="font-bold text-foreground">Card Bg</div>
                <div className="font-mono text-[9px] text-muted-foreground">{livePalette.darkCard}</div>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => onApplyPalette(livePalette)}
              className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-xs font-bold text-white shadow-glow transition-all hover:brightness-110 active:scale-[0.98]"
            >
              <Check className="h-4 w-4" />
              <span>Apply &amp; Harmonize Entire Site Palette</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
