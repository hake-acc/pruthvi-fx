import React, { useState } from 'react';
import { Type, Sparkles, Upload, Check, RotateCcw, Link as LinkIcon, FileText, Globe, ArrowRight } from 'lucide-react';
import type { ThemeConfig } from '../data/portfolio';

export interface TypographyStudioProps {
  theme: ThemeConfig;
  onChange: (updatedTheme: Partial<ThemeConfig>) => void;
  onSave: () => void;
  syncing?: boolean;
}

export const CURATED_DISPLAY_FONTS = [
  { name: 'Outfit', category: 'Portfolio Original', desc: 'Punchy, geometric, high-CTR gaming standard', badge: 'Original Font' },
  { name: 'Syne', category: 'Avant-Garde', desc: 'Wide editorial curves, bold boutique presence' },
  { name: 'Bricolage Grotesque', category: 'Expressive', desc: 'Personality-packed modern grotesque' },
  { name: 'Space Grotesk', category: 'Cyber Tech', desc: 'Technical monospace vibe with tight geometry' },
  { name: 'Righteous', category: 'Retro Impact', desc: 'Punchy curved arcade feel, ultra-high clickability' },
  { name: 'Bebas Neue', category: 'Condensed Impact', desc: 'Tall, massive headline impact for YouTube' },
  { name: 'Cinzel', category: 'Cinematic', desc: 'Luxury classical capitals and cinematic gravitas' },
  { name: 'Cabinet Grotesk', category: 'Swiss Editorial', desc: 'Clean, versatile, contemporary studio aesthetic' },
  { name: 'Playfair Display', category: 'Editorial Serif', desc: 'High-contrast luxury boutique editorial' },
  { name: 'Montserrat', category: 'Modern Geometric', desc: 'Ultra-clean, balanced geometric architecture' },
  { name: 'Clash Display', category: 'High Contrast', desc: 'Audacious, sharp modern grotesque curves' },
  { name: 'Inter', category: 'Neo-Grotesque', desc: 'Pure system clarity and ultra-sharp legibility' },
];

export const CURATED_BODY_FONTS = [
  { name: 'Plus Jakarta Sans', desc: 'Original Portfolio Body Standard — crisp, contemporary and effortless to read', badge: 'Original Body' },
  { name: 'Inter', desc: 'Industry standard for ultra-clear user interfaces and crisp screen rendering' },
  { name: 'Outfit', desc: 'Matches the geometric headline style for a unified modern aesthetic' },
  { name: 'Space Grotesk', desc: 'Monospace-inspired typography for technical creative credentials' },
  { name: 'DM Sans', desc: 'Friendly, low-contrast geometric structure optimized for smaller sizes' },
  { name: 'Roboto', desc: 'Neutral, dependable geometric-neo-grotesque standard' },
];

export const POPULAR_GOOGLE_SUGGESTIONS = [
  'Righteous',
  'Bebas Neue',
  'Orbitron',
  'Montserrat',
  'Oswald',
  'Unbounded',
  'Chakra Petch',
  'Cinzel',
  'Press Start 2P',
  'Anton',
  'Urbanist',
  'Rubik',
];

export function TypographyStudio({
  theme,
  onChange,
  onSave,
  syncing = false,
}: TypographyStudioProps) {
  const currentDisplay = (theme.customFont || theme.displayFont || 'Outfit').trim();
  const currentBody = (theme.customBodyFont || theme.bodyFont || 'Plus Jakarta Sans').trim();
  const isOriginalActive =
    !theme.customFont &&
    !theme.customFontUrl &&
    (theme.displayFont || 'Outfit') === 'Outfit' &&
    (!theme.customBodyFont || theme.customBodyFont === 'Plus Jakarta Sans') &&
    (theme.bodyFont || 'Plus Jakarta Sans') === 'Plus Jakarta Sans';

  const [customFontInput, setCustomFontInput] = useState<string>(theme.customFont || '');
  const [customFontUrlInput, setCustomFontUrlInput] = useState<string>(theme.customFontUrl || '');
  const [customBodyInput, setCustomBodyInput] = useState<string>(theme.customBodyFont || '');
  const [customTab, setCustomTab] = useState<'google' | 'upload' | 'url'>('google');
  const [uploadStatus, setUploadStatus] = useState<string>('');

  // 1-Click Restore to Original Portfolio Fonts (Outfit + Plus Jakarta Sans)
  const handleRestoreOriginal = () => {
    setCustomFontInput('');
    setCustomFontUrlInput('');
    setCustomBodyInput('');
    onChange({
      displayFont: 'Outfit',
      bodyFont: 'Plus Jakarta Sans',
      customFont: '',
      customBodyFont: '',
      customFontUrl: '',
    });
  };

  // Select a preset headline font
  const handleSelectDisplay = (fontName: string) => {
    setCustomFontInput('');
    setCustomFontUrlInput('');
    onChange({
      displayFont: fontName,
      customFont: '',
      customFontUrl: '',
    });
  };

  // Select a preset body font
  const handleSelectBody = (fontName: string) => {
    setCustomBodyInput('');
    onChange({
      bodyFont: fontName,
      customBodyFont: '',
    });
  };

  // Apply custom Google Font name for Headlines
  const handleApplyGoogleFont = (fontName: string) => {
    const clean = fontName.trim();
    if (!clean) return;
    setCustomFontInput(clean);
    onChange({
      customFont: clean,
      displayFont: clean,
      customFontUrl: '',
    });
  };

  // Apply custom font file upload (.woff2, .woff, .ttf, .otf)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 800000) {
      setUploadStatus('File is larger than 800KB. Please use a compressed .woff2 file or Google Font name.');
      return;
    }

    const familyName = file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_\- ]/g, '').trim() || 'CustomFont';
    setUploadStatus(`Loading ${file.name}...`);

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setCustomFontInput(familyName);
      setCustomFontUrlInput(dataUrl);
      setUploadStatus(`Active: ${familyName} (${Math.round(file.size / 1024)} KB)`);

      onChange({
        customFont: familyName,
        customFontUrl: dataUrl,
      });
    };
    reader.onerror = () => {
      setUploadStatus('Failed to read font file.');
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6">
      {/* 1. ORIGINAL / PREVIOUS FONT RESTORATION CARD */}
      <div className={`relative overflow-hidden rounded-3xl border p-6 transition-all ${
        isOriginalActive
          ? 'border-primary/40 bg-gradient-to-r from-primary/10 via-card/90 to-background/95 shadow-glow'
          : 'border-white/15 bg-card/80 hover:border-white/30'
      }`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary/20 text-primary">
                <RotateCcw className="h-4 w-4" />
              </span>
              <h4 className="font-display text-base font-extrabold text-foreground">
                Original Portfolio Typography: <span className="text-primary">Outfit</span> &amp; <span className="text-primary">Plus Jakarta Sans</span>
              </h4>
              {isOriginalActive && (
                <span className="flex items-center gap-1 rounded-full bg-primary/20 px-2.5 py-0.5 text-[10px] font-bold text-primary">
                  <Check className="h-3 w-3" /> Currently Active
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Looking for the previous font? The portfolio was originally designed with <strong>Outfit</strong> for punchy, high-CTR titles and <strong>Plus Jakarta Sans</strong> for clean editorial body text.
            </p>
          </div>

          <button
            type="button"
            onClick={handleRestoreOriginal}
            className={`flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
              isOriginalActive
                ? 'border border-primary/50 bg-primary/20 text-primary hover:bg-primary/30'
                : 'bg-primary text-white shadow-glow hover:brightness-110 active:scale-[0.98]'
            }`}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>{isOriginalActive ? 'Reset to Outfit (Already Active)' : 'Restore Original Font (Outfit)'}</span>
          </button>
        </div>
      </div>

      {/* 2. HEADLINE & DISPLAY FONTS GRID */}
      <div className="rounded-3xl border border-white/10 bg-card/60 p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Type className="h-4 w-4 text-primary" />
              <h4 className="text-sm font-extrabold text-foreground">Headline &amp; Brand Title Fonts</h4>
            </div>
            <p className="text-xs text-muted-foreground">
              Applied to brand title, hero headlines, work section headings, and stats.
            </p>
          </div>
          <span className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 font-mono text-xs font-bold text-primary">
            Active: {currentDisplay}
          </span>
        </div>

        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {CURATED_DISPLAY_FONTS.map((font) => {
            const active = (!theme.customFont || !theme.customFontUrl) && (theme.displayFont || 'Outfit') === font.name;
            return (
              <button
                key={font.name}
                type="button"
                onClick={() => handleSelectDisplay(font.name)}
                className={`flex cursor-pointer flex-col justify-between rounded-2xl border p-3.5 text-left transition-all ${
                  active
                    ? 'border-primary bg-primary/15 text-foreground shadow-glow'
                    : 'border-white/10 bg-background/50 text-muted-foreground hover:border-white/25 hover:text-foreground'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      {font.category}
                    </span>
                    {font.badge && (
                      <span className="rounded bg-primary/20 px-1.5 py-0.5 text-[9px] font-bold text-primary">
                        {font.badge}
                      </span>
                    )}
                    {active && <Check className="h-3.5 w-3.5 text-primary" />}
                  </div>
                  <div
                    className="mt-2 text-lg font-bold text-foreground"
                    style={{ fontFamily: `"${font.name}", sans-serif` }}
                  >
                    {font.name}
                  </div>
                </div>
                <div className="mt-2 text-[11px] text-muted-foreground line-clamp-1">
                  {font.desc}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. BODY TEXT & DESCRIPTIONS FONT GRID */}
      <div className="rounded-3xl border border-white/10 bg-card/60 p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <h4 className="text-sm font-extrabold text-foreground">Body Text, Bios &amp; Tagline Fonts</h4>
            </div>
            <p className="text-xs text-muted-foreground">
              Applied to paragraph descriptions, creator names, FAQ answers, and bios.
            </p>
          </div>
          <span className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 font-mono text-xs font-bold text-primary">
            Active: {currentBody}
          </span>
        </div>

        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {CURATED_BODY_FONTS.map((font) => {
            const active = (!theme.customBodyFont && (theme.bodyFont || 'Plus Jakarta Sans') === font.name) ||
              theme.customBodyFont === font.name;
            return (
              <button
                key={font.name}
                type="button"
                onClick={() => handleSelectBody(font.name)}
                className={`flex cursor-pointer flex-col justify-between rounded-2xl border p-3.5 text-left transition-all ${
                  active
                    ? 'border-primary bg-primary/15 text-foreground shadow-glow'
                    : 'border-white/10 bg-background/50 text-muted-foreground hover:border-white/25 hover:text-foreground'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span
                      className="text-base font-bold text-foreground"
                      style={{ fontFamily: `"${font.name}", sans-serif` }}
                    >
                      {font.name}
                    </span>
                    {font.badge && (
                      <span className="rounded bg-primary/20 px-1.5 py-0.5 text-[9px] font-bold text-primary">
                        {font.badge}
                      </span>
                    )}
                    {active && <Check className="h-3.5 w-3.5 text-primary" />}
                  </div>
                  <p
                    className="mt-1.5 text-xs text-muted-foreground"
                    style={{ fontFamily: `"${font.name}", sans-serif` }}
                  >
                    {font.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. ADD ANY CUSTOM FONT ENGINE */}
      <div className="rounded-3xl border border-primary/25 bg-primary/5 p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h4 className="text-sm font-extrabold text-foreground">Add Custom Font (Google Font, File Upload, or Webfont URL)</h4>
          </div>
          <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-background/50 p-1">
            <button
              type="button"
              onClick={() => setCustomTab('google')}
              className={`rounded-lg px-3 py-1 text-xs font-bold transition-all ${
                customTab === 'google' ? 'bg-primary text-white shadow-glow' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Google Font Name
            </button>
            <button
              type="button"
              onClick={() => setCustomTab('upload')}
              className={`rounded-lg px-3 py-1 text-xs font-bold transition-all ${
                customTab === 'upload' ? 'bg-primary text-white shadow-glow' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Upload Font File
            </button>
            <button
              type="button"
              onClick={() => setCustomTab('url')}
              className={`rounded-lg px-3 py-1 text-xs font-bold transition-all ${
                customTab === 'url' ? 'bg-primary text-white shadow-glow' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              External Font URL
            </button>
          </div>
        </div>

        {/* Tab A: Enter Google Font Name */}
        {customTab === 'google' && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={customFontInput}
                onChange={(e) => {
                  setCustomFontInput(e.target.value);
                  handleApplyGoogleFont(e.target.value);
                }}
                placeholder="Type any Google Font: e.g. Righteous, Montserrat, Bebas Neue, Orbitron..."
                className="w-full rounded-xl border border-white/15 bg-background/80 px-4 py-2.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              {customFontInput && (
                <button
                  type="button"
                  onClick={handleRestoreOriginal}
                  className="rounded-xl border border-white/15 bg-background/80 px-3 text-xs font-semibold hover:border-primary"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Quick Inspiration Pills */}
            <div>
              <span className="text-[11px] font-bold text-muted-foreground">Click to test instant boutique Google Fonts:</span>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {POPULAR_GOOGLE_SUGGESTIONS.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => {
                      setCustomFontInput(name);
                      handleApplyGoogleFont(name);
                    }}
                    className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-all ${
                      customFontInput.toLowerCase() === name.toLowerCase()
                        ? 'border-primary bg-primary/20 text-foreground font-bold shadow-glow'
                        : 'border-white/10 bg-background/60 text-muted-foreground hover:border-white/25 hover:text-foreground'
                    }`}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab B: Upload Custom Font File (.woff2, .woff, .ttf, .otf) */}
        {customTab === 'upload' && (
          <div className="space-y-3">
            <div className="rounded-2xl border-2 border-dashed border-white/20 bg-background/50 p-6 text-center transition-colors hover:border-primary/50">
              <Upload className="mx-auto h-8 w-8 text-primary" />
              <div className="mt-2 text-xs font-bold text-foreground">
                Drop your custom font file here, or click to browse
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Supports .woff2, .woff, .ttf, and .otf files (under 800KB).
              </p>
              <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-glow hover:brightness-110">
                <span>Select Font File</span>
                <input
                  type="file"
                  accept=".woff2,.woff,.ttf,.otf"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
              {uploadStatus && (
                <div className="mt-3 font-mono text-xs font-bold text-primary">
                  {uploadStatus}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab C: External Webfont URL */}
        {customTab === 'url' && (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-foreground">Font Family Name</label>
              <input
                type="text"
                value={customFontInput}
                onChange={(e) => {
                  setCustomFontInput(e.target.value);
                  onChange({ customFont: e.target.value });
                }}
                placeholder="e.g. MyStudioFont"
                className="mt-1 w-full rounded-xl border border-white/15 bg-background/80 px-4 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-foreground">Font File URL / Stylesheet URL</label>
              <input
                type="url"
                value={customFontUrlInput}
                onChange={(e) => {
                  setCustomFontUrlInput(e.target.value);
                  onChange({ customFontUrl: e.target.value });
                }}
                placeholder="https://example.com/fonts/myfont.woff2 or CSS link"
                className="mt-1 w-full rounded-xl border border-white/15 bg-background/80 px-4 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* 5. LIVE TYPOGRAPHY PREVIEW STUDIO */}
      <div className="rounded-3xl border border-white/15 bg-gradient-to-b from-card/90 to-background/95 p-6 shadow-2xl backdrop-blur-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
            Live Typography Studio Preview
          </span>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">Headline: <strong className="text-foreground">{currentDisplay}</strong></span>
            <span className="text-white/20">•</span>
            <span className="text-muted-foreground">Body: <strong className="text-foreground">{currentBody}</strong></span>
          </div>
        </div>

        <div className="space-y-2 rounded-2xl border border-white/10 bg-background/60 p-5">
          <div
            className="text-[11px] font-bold uppercase tracking-widest text-primary"
            style={{ fontFamily: `"${currentDisplay}", sans-serif` }}
          >
            MINECRAFT, ROBLOX &amp; IRL YOUTUBE THUMBNAILS
          </div>
          <h2
            className="text-2xl font-black leading-tight text-foreground sm:text-3xl"
            style={{ fontFamily: `"${currentDisplay}", sans-serif` }}
          >
            CREATING THUMBNAILS THAT COMMAND MILLIONS OF VIEWS
          </h2>
          <p
            className="pt-2 text-xs leading-relaxed text-muted-foreground sm:text-sm"
            style={{ fontFamily: `"${currentBody}", sans-serif` }}
          >
            My name is Pruthvi FX. I focus on the exact split second a viewer scrolls past your video — capturing the sharpest storytelling, psychological contrast, and crafting one bold frame engineered to earn the click.
          </p>
        </div>

        {/* Action Button */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onSave}
            disabled={syncing}
            className="flex cursor-pointer items-center gap-2 rounded-xl bg-primary px-6 py-3 text-xs font-bold text-white shadow-glow transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
          >
            <Check className="h-4 w-4" />
            <span>{syncing ? 'Publishing Live...' : 'Publish Typography & Fonts Live'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
