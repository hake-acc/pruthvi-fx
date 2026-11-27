import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Check, Palette, Sparkles, Sliders, RotateCcw } from 'lucide-react';

// ---------------------------------------------------------------------------
// Color Math & Conversions
// ---------------------------------------------------------------------------
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  const num = parseInt(clean, 16);
  if (isNaN(num)) return { r: 168, g: 85, b: 247 };
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

export function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const toHex = (n: number) => clamp(n).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

export function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(100, s)) / 100;
  l = Math.max(0, Math.min(100, l)) / 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0,
    g = 0,
    b = 0;

  if (h >= 0 && h < 60) {
    r = c; g = x; b = 0;
  } else if (h >= 60 && h < 120) {
    r = x; g = c; b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0; g = c; b = x;
  } else if (h >= 180 && h < 240) {
    r = 0; g = x; b = c;
  } else if (h >= 240 && h < 300) {
    r = x; g = 0; b = c;
  } else {
    r = c; g = 0; b = x;
  }

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

export function hslToHex(h: number, s: number, l: number): string {
  const { r, g, b } = hslToRgb(h, s, l);
  return rgbToHex(r, g, b);
}

// ---------------------------------------------------------------------------
// Curated Designer Swatches & Gradient Presets
// ---------------------------------------------------------------------------
export const PRESET_SWATCHES = [
  { name: 'Neon Purple', hex: '#a855f7' },
  { name: 'Cyber Cyan', hex: '#06b6d4' },
  { name: 'Aqua Glow', hex: '#38e8d6' },
  { name: 'Crimson Flame', hex: '#ef4444' },
  { name: 'Sunset Amber', hex: '#f59e0b' },
  { name: 'Electric Emerald', hex: '#10b981' },
  { name: 'Hot Pink', hex: '#ec4899' },
  { name: 'Deep Space', hex: '#09080f' },
  { name: 'Obsidian Card', hex: '#131020' },
  { name: 'Abyssal Slate', hex: '#0a0e17' },
  { name: 'Rich Charcoal', hex: '#14141d' },
  { name: 'Studio Pure', hex: '#faf9ff' },
];

export const PRESET_GRADIENTS = [
  {
    name: 'Cosmic Nebula',
    gradient: 'linear-gradient(135deg, #09080f 0%, #200a38 100%)',
    start: '#09080f',
    end: '#200a38',
    angle: 135,
  },
  {
    name: 'Crimson Eclipse',
    gradient: 'linear-gradient(135deg, #0e0508 0%, #300913 100%)',
    start: '#0e0508',
    end: '#300913',
    angle: 135,
  },
  {
    name: 'Cyber Abyssal',
    gradient: 'linear-gradient(135deg, #040d14 0%, #082433 100%)',
    start: '#040d14',
    end: '#082433',
    angle: 135,
  },
  {
    name: 'Emerald Aurora',
    gradient: 'linear-gradient(135deg, #04100c 0%, #072a1e 100%)',
    start: '#04100c',
    end: '#072a1e',
    angle: 135,
  },
  {
    name: 'Solar Horizon',
    gradient: 'linear-gradient(135deg, #130a04 0%, #331908 100%)',
    start: '#130a04',
    end: '#331908',
    angle: 135,
  },
  {
    name: 'Dark Monolith',
    gradient: 'linear-gradient(135deg, #07070a 0%, #171520 100%)',
    start: '#07070a',
    end: '#171520',
    angle: 135,
  },
];

// ---------------------------------------------------------------------------
// Interactive Chromatic Color Wheel Component
// ---------------------------------------------------------------------------
export interface ColorWheelPickerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  value: string;
  onChange: (hex: string) => void;
  allowGradient?: boolean;
  bgType?: 'solid' | 'gradient';
  bgGradientStart?: string;
  bgGradientEnd?: string;
  bgGradientAngle?: number;
  onGradientChange?: (cfg: {
    type: 'solid' | 'gradient';
    gradient: string;
    start: string;
    end: string;
    angle: number;
  }) => void;
}

export function ColorWheelModal({
  isOpen,
  onClose,
  title,
  value,
  onChange,
  allowGradient = false,
  bgType = 'solid',
  bgGradientStart = '#09080f',
  bgGradientEnd = '#200a38',
  bgGradientAngle = 135,
  onGradientChange,
}: ColorWheelPickerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [activeTab, setActiveTab] = useState<'solid' | 'gradient'>(
    allowGradient && bgType === 'gradient' ? 'gradient' : 'solid'
  );

  // Gradient state
  const [gradStart, setGradStart] = useState<string>(bgGradientStart);
  const [gradEnd, setGradEnd] = useState<string>(bgGradientEnd);
  const [gradAngle, setGradAngle] = useState<number>(bgGradientAngle);
  const [activeGradStop, setActiveGradStop] = useState<'start' | 'end'>('start');

  // Solid Color state (HSL)
  const [hue, setHue] = useState<number>(270);
  const [sat, setSat] = useState<number>(90);
  const [light, setLight] = useState<number>(65);
  const [hexInput, setHexInput] = useState<string>('#a855f7');
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Initialize HSL from initial value or active gradient stop
  useEffect(() => {
    if (!isOpen) return;
    const targetHex =
      activeTab === 'gradient'
        ? activeGradStop === 'start'
          ? gradStart
          : gradEnd
        : value && /^#[0-9a-fA-F]{3,6}$/.test(value)
        ? value
        : '#a855f7';

    const rgb = hexToRgb(targetHex);
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    setHue(hsl.h);
    setSat(hsl.s);
    setLight(hsl.l);
    setHexInput(rgbToHex(rgb.r, rgb.g, rgb.b));
  }, [isOpen, activeTab, activeGradStop]);

  // Render the circular chromatic color wheel onto canvas
  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const cx = width / 2;
    const cy = height / 2;
    const radius = Math.min(cx, cy) - 6;

    ctx.clearRect(0, 0, width, height);

    // Draw chromatic wheel segments
    for (let angle = 0; angle < 360; angle += 1) {
      const startAngle = ((angle - 1) * Math.PI) / 180;
      const endAngle = ((angle + 1) * Math.PI) / 180;

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, startAngle, endAngle);
      ctx.closePath();

      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(1, `hsl(${angle}, 100%, 50%)`);
      ctx.fillStyle = grad;
      ctx.fill();
    }

    // Outer subtle border
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.stroke();

    // Draw cursor marker at current (hue, sat)
    const angleRad = (hue * Math.PI) / 180;
    const dist = (sat / 100) * radius;
    const px = cx + dist * Math.cos(angleRad);
    const py = cy + dist * Math.sin(angleRad);

    ctx.beginPath();
    ctx.arc(px, py, 7, 0, 2 * Math.PI);
    ctx.fillStyle = hslToHex(hue, sat, light);
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = light > 60 ? '#111111' : '#ffffff';
    ctx.stroke();
  }, [isOpen, hue, sat, light]);

  // Handle pointer coordinate to HSL calculation
  const handlePointerCoord = useCallback(
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

      const maxRadius = Math.min(cx, cy) - 6;
      const dist = Math.min(maxRadius, Math.hypot(dx, dy));
      const satVal = Math.round((dist / maxRadius) * 100);

      setHue(angleDeg);
      setSat(satVal);

      const nextHex = hslToHex(angleDeg, satVal, light);
      setHexInput(nextHex);

      if (activeTab === 'gradient') {
        const nextStart = activeGradStop === 'start' ? nextHex : gradStart;
        const nextEnd = activeGradStop === 'end' ? nextHex : gradEnd;
        if (activeGradStop === 'start') setGradStart(nextHex);
        else setGradEnd(nextEnd);

        if (onGradientChange) {
          const gradStr = `linear-gradient(${gradAngle}deg, ${nextStart} 0%, ${nextEnd} 100%)`;
          onGradientChange({
            type: 'gradient',
            gradient: gradStr,
            start: nextStart,
            end: nextEnd,
            angle: gradAngle,
          });
        }
      } else {
        onChange(nextHex);
      }
    },
    [light, activeTab, activeGradStop, gradStart, gradEnd, gradAngle, onChange, onGradientChange]
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    handlePointerCoord(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    handlePointerCoord(e.clientX, e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  // Handle lightness bar slider change
  const handleLightnessChange = (newLight: number) => {
    setLight(newLight);
    const nextHex = hslToHex(hue, sat, newLight);
    setHexInput(nextHex);

    if (activeTab === 'gradient') {
      const nextStart = activeGradStop === 'start' ? nextHex : gradStart;
      const nextEnd = activeGradStop === 'end' ? nextHex : gradEnd;
      if (activeGradStop === 'start') setGradStart(nextHex);
      else setGradEnd(nextEnd);

      if (onGradientChange) {
        const gradStr = `linear-gradient(${gradAngle}deg, ${nextStart} 0%, ${nextEnd} 100%)`;
        onGradientChange({
          type: 'gradient',
          gradient: gradStr,
          start: nextStart,
          end: nextEnd,
          angle: gradAngle,
        });
      }
    } else {
      onChange(nextHex);
    }
  };

  // Apply a hex directly (from preset swatch or text input)
  const applyHex = (hex: string) => {
    if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return;
    const rgb = hexToRgb(hex);
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    setHue(hsl.h);
    setSat(hsl.s);
    setLight(hsl.l);
    setHexInput(hex);

    if (activeTab === 'gradient') {
      const nextStart = activeGradStop === 'start' ? hex : gradStart;
      const nextEnd = activeGradStop === 'end' ? hex : gradEnd;
      if (activeGradStop === 'start') setGradStart(hex);
      else setGradEnd(nextEnd);

      if (onGradientChange) {
        const gradStr = `linear-gradient(${gradAngle}deg, ${nextStart} 0%, ${nextEnd} 100%)`;
        onGradientChange({
          type: 'gradient',
          gradient: gradStr,
          start: nextStart,
          end: nextEnd,
          angle: gradAngle,
        });
      }
    } else {
      onChange(hex);
    }
  };

  // Handle gradient angle changes
  const handleAngleChange = (angle: number) => {
    setGradAngle(angle);
    if (onGradientChange) {
      const gradStr = `linear-gradient(${angle}deg, ${gradStart} 0%, ${gradEnd} 100%)`;
      onGradientChange({
        type: 'gradient',
        gradient: gradStr,
        start: gradStart,
        end: gradEnd,
        angle,
      });
    }
  };

  if (!isOpen) return null;

  const currentHex = hslToHex(hue, sat, light);
  const activeGradientString = `linear-gradient(${gradAngle}deg, ${gradStart} 0%, ${gradEnd} 100%)`;

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
      <div className="relative w-full max-w-md rounded-2xl border border-white/15 bg-card/95 p-5 shadow-2xl backdrop-blur-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/15 text-primary">
              <Palette className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-display text-base font-bold text-foreground">{title}</h3>
              <p className="text-[11px] text-muted-foreground">Interactive color design wheel &amp; palette</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-7 w-7 place-items-center rounded-lg border border-white/10 text-muted-foreground transition-colors hover:border-white/20 hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab Toggle: Solid vs Gradient */}
        {allowGradient && (
          <div className="mt-4 flex rounded-xl border border-white/10 bg-background/80 p-1">
            <button
              type="button"
              onClick={() => {
                setActiveTab('solid');
                if (onGradientChange) {
                  onGradientChange({
                    type: 'solid',
                    gradient: currentHex,
                    start: gradStart,
                    end: gradEnd,
                    angle: gradAngle,
                  });
                }
                onChange(currentHex);
              }}
              className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition-all ${
                activeTab === 'solid'
                  ? 'bg-primary text-primary-foreground shadow-glow'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Solid Color
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('gradient');
                if (onGradientChange) {
                  onGradientChange({
                    type: 'gradient',
                    gradient: activeGradientString,
                    start: gradStart,
                    end: gradEnd,
                    angle: gradAngle,
                  });
                }
              }}
              className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition-all ${
                activeTab === 'gradient'
                  ? 'bg-primary text-primary-foreground shadow-glow'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Linear Gradient
            </button>
          </div>
        )}

        {/* Gradient Controls Strip */}
        {allowGradient && activeTab === 'gradient' && (
          <div className="mt-3.5 space-y-3 rounded-xl border border-white/10 bg-background/60 p-3">
            {/* Live Gradient Preview Bar */}
            <div
              className="h-9 w-full rounded-lg border border-white/20 shadow-inner"
              style={{ background: activeGradientString }}
            />

            {/* Gradient Stops & Angle */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveGradStop('start');
                    const rgb = hexToRgb(gradStart);
                    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
                    setHue(hsl.h);
                    setSat(hsl.s);
                    setLight(hsl.l);
                    setHexInput(gradStart);
                  }}
                  className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold ${
                    activeGradStop === 'start'
                      ? 'border-primary bg-primary/20 text-primary ring-2 ring-primary/30'
                      : 'border-white/10 bg-card text-muted-foreground'
                  }`}
                >
                  <span className="h-3.5 w-3.5 rounded-full border border-white/30" style={{ backgroundColor: gradStart }} />
                  <span>Stop 1</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveGradStop('end');
                    const rgb = hexToRgb(gradEnd);
                    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
                    setHue(hsl.h);
                    setSat(hsl.s);
                    setLight(hsl.l);
                    setHexInput(gradEnd);
                  }}
                  className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold ${
                    activeGradStop === 'end'
                      ? 'border-primary bg-primary/20 text-primary ring-2 ring-primary/30'
                      : 'border-white/10 bg-card text-muted-foreground'
                  }`}
                >
                  <span className="h-3.5 w-3.5 rounded-full border border-white/30" style={{ backgroundColor: gradEnd }} />
                  <span>Stop 2</span>
                </button>
              </div>

              {/* Angle Selector */}
              <div className="flex items-center gap-1">
                {[0, 90, 135, 180].map((deg) => (
                  <button
                    key={deg}
                    type="button"
                    onClick={() => handleAngleChange(deg)}
                    className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                      gradAngle === deg
                        ? 'bg-primary text-primary-foreground'
                        : 'border border-white/10 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {deg}°
                  </button>
                ))}
              </div>
            </div>

            {/* Curated Gradient Presets */}
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Gradient Presets
              </span>
              <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                {PRESET_GRADIENTS.map((p) => (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => {
                      setGradStart(p.start);
                      setGradEnd(p.end);
                      setGradAngle(p.angle);
                      if (onGradientChange) {
                        onGradientChange({
                          type: 'gradient',
                          gradient: p.gradient,
                          start: p.start,
                          end: p.end,
                          angle: p.angle,
                        });
                      }
                      const rgb = hexToRgb(activeGradStop === 'start' ? p.start : p.end);
                      const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
                      setHue(hsl.h);
                      setSat(hsl.s);
                      setLight(hsl.l);
                      setHexInput(activeGradStop === 'start' ? p.start : p.end);
                    }}
                    className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-card/60 p-1.5 text-left text-[11px] transition-colors hover:border-primary/50"
                  >
                    <span
                      className="h-4 w-4 shrink-0 rounded border border-white/20"
                      style={{ background: p.gradient }}
                    />
                    <span className="truncate text-foreground">{p.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* The Chromatic Color Wheel */}
        <div className="mt-4 flex flex-col items-center">
          <div className="relative">
            <canvas
              ref={canvasRef}
              width={200}
              height={200}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              className="cursor-crosshair touch-none select-none rounded-full shadow-lg"
            />
          </div>

          {/* Lightness Slider */}
          <div className="mt-3.5 w-full">
            <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
              <span>Lightness</span>
              <span>{light}%</span>
            </div>
            <div className="relative mt-1">
              <input
                type="range"
                min={0}
                max={100}
                value={light}
                onChange={(e) => handleLightnessChange(Number(e.target.value))}
                className="h-3 w-full cursor-pointer appearance-none rounded-full border border-white/20"
                style={{
                  background: `linear-gradient(to right, #000000 0%, hsl(${hue}, ${sat}%, 50%) 50%, #ffffff 100%)`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Value Swatch & Inputs */}
        <div className="mt-3.5 flex items-center gap-2.5 rounded-xl border border-white/10 bg-background/80 p-2.5">
          <div
            className="h-9 w-12 shrink-0 rounded-lg border border-white/20 shadow-inner"
            style={{ backgroundColor: currentHex }}
          />
          <div className="flex flex-1 items-center gap-2">
            <input
              type="text"
              value={hexInput}
              onChange={(e) => {
                setHexInput(e.target.value);
                applyHex(e.target.value);
              }}
              placeholder="#A855F7"
              className="w-full rounded-lg border border-white/10 bg-card px-2.5 py-1 font-mono text-xs text-foreground uppercase focus:border-primary focus:outline-none"
            />
            <div className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
              <span>H:{hue}°</span>
              <span>S:{sat}%</span>
              <span>L:{light}%</span>
            </div>
          </div>
        </div>

        {/* Quick Studio Palette Presets */}
        <div className="mt-3">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Quick Studio Swatches
          </span>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {PRESET_SWATCHES.map((swatch) => (
              <button
                key={swatch.hex}
                type="button"
                title={`${swatch.name} (${swatch.hex})`}
                onClick={() => applyHex(swatch.hex)}
                className="group relative h-6 w-6 cursor-pointer rounded-lg border border-white/20 shadow-sm transition-transform hover:scale-110 active:scale-95"
                style={{ backgroundColor: swatch.hex }}
              >
                {currentHex.toLowerCase() === swatch.hex.toLowerCase() && (
                  <Check className="absolute inset-0 m-auto h-3 w-3 text-white drop-shadow" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Done / Apply Button */}
        <div className="mt-4 flex items-center justify-end gap-2 border-t border-white/10 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-primary px-5 py-2 text-xs font-bold text-primary-foreground shadow-glow hover:brightness-110 active:scale-95"
          >
            <Check className="h-3.5 w-3.5" />
            <span>Done &amp; Preview</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ColorFieldWithWheel Button Trigger Component
// ---------------------------------------------------------------------------
export function ColorFieldWithWheel({
  label,
  value,
  onChange,
  allowGradient = false,
  bgType = 'solid',
  bgGradient = '',
  bgGradientStart = '#09080f',
  bgGradientEnd = '#200a38',
  bgGradientAngle = 135,
  onGradientChange,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  allowGradient?: boolean;
  bgType?: 'solid' | 'gradient';
  bgGradient?: string;
  bgGradientStart?: string;
  bgGradientEnd?: string;
  bgGradientAngle?: number;
  onGradientChange?: (cfg: {
    type: 'solid' | 'gradient';
    gradient: string;
    start: string;
    end: string;
    angle: number;
  }) => void;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const isGradient = allowGradient && bgType === 'gradient' && Boolean(bgGradient);

  return (
    <div className="rounded-xl border border-white/10 bg-background/60 p-3 transition-colors hover:border-white/20">
      <div className="flex items-center justify-between">
        <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </label>
        {isGradient && (
          <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[9px] font-bold text-primary">
            Gradient
          </span>
        )}
      </div>

      <div className="mt-2 flex items-center gap-2">
        {/* Swatch & Wheel Trigger */}
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="group relative flex h-9 flex-1 cursor-pointer items-center gap-2 rounded-lg border border-white/15 bg-card/80 px-2.5 text-left transition-all hover:border-primary/50"
        >
          <span
            className="h-5 w-5 shrink-0 rounded-md border border-white/25 shadow-sm transition-transform group-hover:scale-105"
            style={{
              background: isGradient ? bgGradient : value,
            }}
          />
          <span className="truncate font-mono text-xs text-foreground uppercase">
            {isGradient ? 'Linear Gradient' : value}
          </span>
          <Palette className="ml-auto h-3.5 w-3.5 text-primary transition-transform group-hover:rotate-12" />
        </button>

        {/* Native picker fallback */}
        <div className="relative">
          <input
            type="color"
            value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : '#a855f7'}
            onChange={(e) => onChange(e.target.value)}
            className="h-9 w-9 cursor-pointer rounded-lg border border-white/15 bg-transparent p-0.5 opacity-80 transition-opacity hover:opacity-100"
            title="Native quick picker"
          />
        </div>
      </div>

      {modalOpen && (
        <ColorWheelModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title={label}
          value={value}
          onChange={onChange}
          allowGradient={allowGradient}
          bgType={bgType}
          bgGradientStart={bgGradientStart}
          bgGradientEnd={bgGradientEnd}
          bgGradientAngle={bgGradientAngle}
          onGradientChange={onGradientChange}
        />
      )}
    </div>
  );
}
