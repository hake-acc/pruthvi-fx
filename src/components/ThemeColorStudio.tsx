import React, { useState, useEffect, type ChangeEvent } from 'react';
import { Sparkles, Upload, Save, RotateCcw, Check, Loader2 } from 'lucide-react';
import type { PortfolioData, ThemeConfig } from '../data/portfolio';
import { PORTFOLIO_DATA } from '../data/portfolio';
import { compressImageFile } from '../lib/imageUtils';

export interface GradientThemePreset {
  id: string;
  name: string;
  desc: string;
  start: string;
  mid: string;
  end: string;
  preview: string;
  primary: string;
  kicker: string;
  shader1: string;
  shader2: string;
  shader3: string;
}

export const GRADIENT_THEME_PRESETS: GradientThemePreset[] = [
  {
    id: 'crimson-prism',
    name: 'Crimson Prism Gradient',
    desc: 'Multi-stop Gradient',
    start: '#ec4899',
    mid: '#8b5cf6',
    end: '#3b82f6',
    preview: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 50%, #3b82f6 100%)',
    primary: '#ec4899',
    kicker: '#3b82f6',
    shader1: '#ec4899',
    shader2: '#09080f',
    shader3: '#8b5cf6',
  },
  {
    id: 'inferno-sunset',
    name: 'Inferno Sunset Gradient',
    desc: 'Multi-stop Gradient',
    start: '#eab308',
    mid: '#ea580c',
    end: '#dc2626',
    preview: 'linear-gradient(135deg, #eab308 0%, #ea580c 50%, #dc2626 100%)',
    primary: '#ea580c',
    kicker: '#eab308',
    shader1: '#ea580c',
    shader2: '#0f0709',
    shader3: '#eab308',
  },
  {
    id: 'cyber-aurora',
    name: 'Cyber Aurora Gradient',
    desc: 'Multi-stop Gradient',
    start: '#06b6d4',
    mid: '#3b82f6',
    end: '#8b5cf6',
    preview: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 50%, #8b5cf6 100%)',
    primary: '#06b6d4',
    kicker: '#8b5cf6',
    shader1: '#06b6d4',
    shader2: '#060b14',
    shader3: '#8b5cf6',
  },
];

export interface SolidColorPreset {
  id: string;
  name: string;
  color: string;
  kicker: string;
  shader1: string;
  shader2: string;
  shader3: string;
}

export const SOLID_COLOR_PRESETS: SolidColorPreset[] = [
  {
    id: 'scarlet-red',
    name: 'Scarlet Red',
    color: '#dc2626',
    kicker: '#f87171',
    shader1: '#dc2626',
    shader2: '#0d0709',
    shader3: '#f97316',
  },
  {
    id: 'crimson-rose',
    name: 'Crimson Rose',
    color: '#e11d48',
    kicker: '#fb7185',
    shader1: '#e11d48',
    shader2: '#0e070a',
    shader3: '#f43f5e',
  },
  {
    id: 'ember-orange',
    name: 'Ember Orange',
    color: '#ea580c',
    kicker: '#fb923c',
    shader1: '#ea580c',
    shader2: '#0f0906',
    shader3: '#f59e0b',
  },
  {
    id: 'cobalt-blue',
    name: 'Cobalt Blue',
    color: '#2563eb',
    kicker: '#60a5fa',
    shader1: '#2563eb',
    shader2: '#060b14',
    shader3: '#38bdf8',
  },
  {
    id: 'neon-emerald',
    name: 'Neon Emerald',
    color: '#10b981',
    kicker: '#34d399',
    shader1: '#10b981',
    shader2: '#060d0a',
    shader3: '#22d3ee',
  },
  {
    id: 'royal-violet',
    name: 'Royal Violet',
    color: '#8b5cf6',
    kicker: '#a78bfa',
    shader1: '#8b5cf6',
    shader2: '#0a0714',
    shader3: '#c084fc',
  },
];

interface ThemeColorStudioProps {
  draft: PortfolioData;
  setDraft: React.Dispatch<React.SetStateAction<PortfolioData>>;
  applyStyles: (theme: ThemeConfig, brandName: string, logoSrc: string) => void;
  onSave: (customDraft?: PortfolioData, label?: string) => Promise<void>;
  onSeedDefaults: () => Promise<void>;
  notify: (type: 'ok' | 'err', message: string) => void;
  syncing: boolean;
}

export function ThemeColorStudio({
  draft,
  setDraft,
  applyStyles,
  onSave,
  onSeedDefaults,
  notify,
  syncing,
}: ThemeColorStudioProps) {
  // Custom 3-Stop Gradient State
  const [customStart, setCustomStart] = useState<string>(
    draft.theme.gradientStart || '#ff0000'
  );
  const [customMid, setCustomMid] = useState<string>(
    draft.theme.gradientMid || '#ff7300'
  );
  const [customEnd, setCustomEnd] = useState<string>(
    draft.theme.gradientEnd || '#ff2600'
  );

  // Custom Single Accent Color State
  const [singleCustomColor, setSingleCustomColor] = useState<string>(
    draft.theme.primaryColor || '#ff0000'
  );

  // Avatar / Logo State
  const [logoInput, setLogoInput] = useState<string>(draft.logoSrc || '');
  const [uploadingLogo, setUploadingLogo] = useState(false);

  useEffect(() => {
    if (draft.theme.gradientStart) setCustomStart(draft.theme.gradientStart);
    if (draft.theme.gradientMid) setCustomMid(draft.theme.gradientMid);
    if (draft.theme.gradientEnd) setCustomEnd(draft.theme.gradientEnd);
    if (draft.theme.primaryColor) setSingleCustomColor(draft.theme.primaryColor);
    setLogoInput(draft.logoSrc || '');
  }, [
    draft.theme.gradientStart,
    draft.theme.gradientMid,
    draft.theme.gradientEnd,
    draft.theme.primaryColor,
    draft.logoSrc,
  ]);

  const isGradientActive = Boolean(
    draft.theme.gradientId || draft.theme.bgType === 'gradient'
  );

  // Apply one of the 3 Gradient Presets
  const handleApplyGradientPreset = (preset: GradientThemePreset) => {
    setCustomStart(preset.start);
    setCustomMid(preset.mid);
    setCustomEnd(preset.end);

    const nextTheme: ThemeConfig = {
      ...draft.theme,
      preset: preset.id,
      gradientId: preset.id,
      gradientStart: preset.start,
      gradientMid: preset.mid,
      gradientEnd: preset.end,
      bgType: 'gradient',
      bgGradient: preset.preview,
      primaryColor: preset.primary,
      kickerColor: preset.kicker,
      navActiveColor: preset.primary,
      shaderColor1: preset.shader1,
      shaderColor2: preset.shader2,
      shaderColor3: preset.shader3,
    };

    const nextDraft = { ...draft, theme: nextTheme };
    setDraft(nextDraft);
    applyStyles(nextTheme, draft.brandName, draft.logoSrc);
    void onSave(nextDraft, `${preset.name} applied across live portfolio!`);
  };

  // Apply Custom 3-Stop Gradient
  const handleApplyCustomGradient = () => {
    const preview = `linear-gradient(135deg, ${customStart} 0%, ${customMid} 50%, ${customEnd} 100%)`;

    const nextTheme: ThemeConfig = {
      ...draft.theme,
      preset: 'custom',
      gradientId: 'custom-3stop',
      gradientStart: customStart,
      gradientMid: customMid,
      gradientEnd: customEnd,
      bgType: 'gradient',
      bgGradient: preview,
      primaryColor: customStart,
      kickerColor: customEnd,
      navActiveColor: customStart,
      shaderColor1: customStart,
      shaderColor2: '#09080f',
      shaderColor3: customMid,
    };

    const nextDraft = { ...draft, theme: nextTheme };
    setDraft(nextDraft);
    applyStyles(nextTheme, draft.brandName, draft.logoSrc);
    void onSave(nextDraft, 'Custom 3-stop gradient applied to buttons, highlights & shader!');
  };

  // Apply Solid Color Preset
  const handleApplySolidPreset = (preset: SolidColorPreset) => {
    const nextTheme: ThemeConfig = {
      ...draft.theme,
      preset: preset.id,
      gradientId: '',
      bgType: 'solid',
      primaryColor: preset.color,
      kickerColor: preset.kicker,
      navActiveColor: preset.color,
      shaderColor1: preset.shader1,
      shaderColor2: preset.shader2,
      shaderColor3: preset.shader3,
    };

    setSingleCustomColor(preset.color);

    const nextDraft = { ...draft, theme: nextTheme };
    setDraft(nextDraft);
    applyStyles(nextTheme, draft.brandName, draft.logoSrc);
    void onSave(nextDraft, `${preset.name} solid theme applied live!`);
  };

  // Apply Single Custom Accent Color
  const handleApplySingleCustomColor = () => {
    const nextTheme: ThemeConfig = {
      ...draft.theme,
      preset: 'custom',
      gradientId: '',
      bgType: 'solid',
      primaryColor: singleCustomColor,
      kickerColor: singleCustomColor,
      navActiveColor: singleCustomColor,
      shaderColor1: singleCustomColor,
      shaderColor2: '#09080f',
      shaderColor3: singleCustomColor,
    };

    const nextDraft = { ...draft, theme: nextTheme };
    setDraft(nextDraft);
    applyStyles(nextTheme, draft.brandName, draft.logoSrc);
    void onSave(nextDraft, 'Custom accent color applied live across portfolio!');
  };

  // Save Avatar & Logo
  const handleSaveLogo = () => {
    if (!logoInput.trim()) {
      notify('err', 'Please enter an image URL or upload a file.');
      return;
    }
    const nextDraft = { ...draft, logoSrc: logoInput.trim() };
    setDraft(nextDraft);
    applyStyles(draft.theme, draft.brandName, logoInput.trim());
    void onSave(nextDraft, 'Portfolio Avatar & Logo saved live!');
  };

  // Reset to Default Logo
  const handleResetDefaultLogo = () => {
    const defaultLogo = PORTFOLIO_DATA.logoSrc || '/avatar.png';
    setLogoInput(defaultLogo);
    const nextDraft = { ...draft, logoSrc: defaultLogo };
    setDraft(nextDraft);
    applyStyles(draft.theme, draft.brandName, defaultLogo);
    void onSave(nextDraft, 'Reset to default logo!');
  };

  // Upload Avatar File
  const handleAvatarFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const dataUrl = await compressImageFile(file, 512, 320000);
      setLogoInput(dataUrl);
      const nextDraft = { ...draft, logoSrc: dataUrl };
      setDraft(nextDraft);
      applyStyles(draft.theme, draft.brandName, dataUrl);
      notify('ok', 'Logo uploaded! Click "Save Avatar & Logo" to commit.');
    } catch (err) {
      notify('err', err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploadingLogo(false);
      e.target.value = '';
    }
  };

  // Toggle Theme Mode
  const handleToggleThemeMode = (mode: 'dark' | 'light') => {
    document.documentElement.dataset.theme = mode;
    try {
      localStorage.setItem('pruthvifx-theme', mode);
    } catch {
      // ignore
    }
    const nextTheme: ThemeConfig = { ...draft.theme, defaultMode: mode };
    const nextDraft = { ...draft, theme: nextTheme };
    setDraft(nextDraft);
    applyStyles(nextTheme, draft.brandName, draft.logoSrc);
    void onSave(nextDraft, `Default ${mode} mode saved!`);
  };

  // Restore Seed Defaults
  const handleRestoreDefaults = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to restore all portfolio categories, Red theme, clients, and sample thumbnails to defaults?'
    );
    if (!confirmed) return;
    try {
      await onSeedDefaults();
      notify('ok', 'Default portfolio seed data restored successfully!');
    } catch (err) {
      notify('err', err instanceof Error ? err.message : 'Failed to restore defaults.');
    }
  };

  const isDarkMode = (draft.theme.defaultMode || 'dark') === 'dark';

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      {/* LEFT COLUMN: Portfolio Theme Color System */}
      <div className="space-y-6 lg:col-span-7 xl:col-span-8">
        <div className="rounded-2xl border border-white/10 bg-[#121118]/90 p-5 sm:p-6 space-y-6 shadow-xl">
          {/* Main Title & Subtitle */}
          <div className="flex items-start gap-3">
            <div className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-red-600/20 text-red-500">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-foreground">
                Portfolio Theme Color
              </h3>
              <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                Switch the accent glow, buttons, rings, and Hero WebGL folded-glass shader across your live portfolio.
              </p>
            </div>
          </div>

          {/* GRADIENT THEMES */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-red-500">
              GRADIENT THEMES
            </h4>
            <div className="grid gap-3 sm:grid-cols-2">
              {GRADIENT_THEME_PRESETS.map((preset) => {
                const active = draft.theme.gradientId === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleApplyGradientPreset(preset)}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                      active
                        ? 'border-red-500 bg-red-950/20 shadow-[0_0_20px_-3px_rgba(239,68,68,0.35)] ring-1 ring-red-500/50'
                        : 'border-white/10 bg-black/40 hover:border-white/25 hover:bg-black/60'
                    }`}
                  >
                    <div
                      className="h-9 w-9 shrink-0 rounded-full border border-white/20 shadow-sm"
                      style={{ background: preset.preview }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-bold text-foreground">
                        {preset.name}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {preset.desc}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* CUSTOM COLOR GRADIENT BUILDER */}
          <div className="rounded-xl border border-white/10 bg-black/40 p-4 space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-red-500">
                CUSTOM COLOR GRADIENT BUILDER
              </span>
              {isGradientActive && (
                <span className="inline-flex items-center gap-1 rounded-full border border-red-500/40 bg-red-600/20 px-2.5 py-0.5 text-[10px] font-bold text-red-400">
                  <Check className="h-3 w-3" />
                  Active
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Pick your own 3-stop gradient colors for buttons, highlights, ring, and WebGL shader.
            </p>

            {/* Gradient Visual Preview Strip */}
            <div
              className="h-9 w-full rounded-full border border-white/20 shadow-inner transition-all duration-300"
              style={{
                background: `linear-gradient(to right, ${customStart}, ${customMid}, ${customEnd})`,
              }}
            />

            {/* 3 Color Stop Inputs */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {/* Start Color */}
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground">
                  Start Color
                </label>
                <div className="mt-1 flex items-center gap-2">
                  <div
                    className="relative h-9 w-9 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-white/20 shadow-sm"
                    style={{ backgroundColor: customStart }}
                    title="Click to open color picker"
                  >
                    <input
                      type="color"
                      value={customStart}
                      onChange={(e) => setCustomStart(e.target.value)}
                      className="absolute -inset-2 h-14 w-14 cursor-pointer opacity-0"
                    />
                  </div>
                  <input
                    type="text"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="w-full rounded-lg border border-white/15 bg-black/60 px-2.5 py-2 font-mono text-xs uppercase text-foreground focus:border-red-500 focus:outline-none"
                    placeholder="#ff0000"
                  />
                </div>
              </div>

              {/* Middle Color */}
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground">
                  Middle Color
                </label>
                <div className="mt-1 flex items-center gap-2">
                  <div
                    className="relative h-9 w-9 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-white/20 shadow-sm"
                    style={{ backgroundColor: customMid }}
                    title="Click to open color picker"
                  >
                    <input
                      type="color"
                      value={customMid}
                      onChange={(e) => setCustomMid(e.target.value)}
                      className="absolute -inset-2 h-14 w-14 cursor-pointer opacity-0"
                    />
                  </div>
                  <input
                    type="text"
                    value={customMid}
                    onChange={(e) => setCustomMid(e.target.value)}
                    className="w-full rounded-lg border border-white/15 bg-black/60 px-2.5 py-2 font-mono text-xs uppercase text-foreground focus:border-red-500 focus:outline-none"
                    placeholder="#ff7300"
                  />
                </div>
              </div>

              {/* End Color */}
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground">
                  End Color
                </label>
                <div className="mt-1 flex items-center gap-2">
                  <div
                    className="relative h-9 w-9 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-white/20 shadow-sm"
                    style={{ backgroundColor: customEnd }}
                    title="Click to open color picker"
                  >
                    <input
                      type="color"
                      value={customEnd}
                      onChange={(e) => setCustomEnd(e.target.value)}
                      className="absolute -inset-2 h-14 w-14 cursor-pointer opacity-0"
                    />
                  </div>
                  <input
                    type="text"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="w-full rounded-lg border border-white/15 bg-black/60 px-2.5 py-2 font-mono text-xs uppercase text-foreground focus:border-red-500 focus:outline-none"
                    placeholder="#ff2600"
                  />
                </div>
              </div>
            </div>

            {/* Apply Gradient Button */}
            <div className="flex justify-end pt-1">
              <button
                type="button"
                disabled={syncing}
                onClick={handleApplyCustomGradient}
                className="inline-flex cursor-pointer items-center justify-center rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-md transition-all hover:bg-red-500 active:scale-95 disabled:opacity-50"
              >
                Apply Custom Gradient
              </button>
            </div>
          </div>

          {/* SOLID COLOR PRESETS */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
              SOLID COLOR PRESETS
            </h4>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {SOLID_COLOR_PRESETS.map((p) => {
                const active =
                  !isGradientActive &&
                  (draft.theme.preset === p.id ||
                    draft.theme.primaryColor.toLowerCase() === p.color.toLowerCase());
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleApplySolidPreset(p)}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                      active
                        ? 'border-red-500 bg-red-950/20 shadow-[0_0_20px_-3px_rgba(239,68,68,0.35)] ring-1 ring-red-500/50'
                        : 'border-white/10 bg-black/40 hover:border-white/25 hover:bg-black/60'
                    }`}
                  >
                    <div
                      className="h-9 w-9 shrink-0 rounded-full border border-white/20 shadow-sm"
                      style={{ backgroundColor: p.color }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-bold text-foreground">
                        {p.name}
                      </div>
                      <div className="font-mono text-[10px] text-muted-foreground uppercase">
                        {p.color}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* CUSTOM ACCENT COLOR */}
          <div className="rounded-xl border border-white/10 bg-black/40 p-4 space-y-2.5">
            <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
              CUSTOM ACCENT COLOR
            </h4>
            <div className="flex flex-wrap items-center gap-3">
              <div
                className="relative h-9 w-9 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-white/20 shadow-sm"
                style={{ backgroundColor: singleCustomColor }}
                title="Click to open color picker"
              >
                <input
                  type="color"
                  value={singleCustomColor}
                  onChange={(e) => setSingleCustomColor(e.target.value)}
                  className="absolute -inset-2 h-14 w-14 cursor-pointer opacity-0"
                />
              </div>
              <input
                type="text"
                value={singleCustomColor}
                onChange={(e) => setSingleCustomColor(e.target.value)}
                className="w-36 rounded-lg border border-white/15 bg-black/60 px-3 py-2 font-mono text-xs uppercase text-foreground focus:border-red-500 focus:outline-none"
                placeholder="#ff0000"
              />
              <button
                type="button"
                disabled={syncing}
                onClick={handleApplySingleCustomColor}
                className="inline-flex cursor-pointer items-center justify-center rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-md transition-all hover:bg-red-500 active:scale-95 disabled:opacity-50"
              >
                Apply Custom Theme
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Portfolio Avatar & Logo + Default Appearance & Maintenance */}
      <div className="space-y-6 lg:col-span-5 xl:col-span-4">
        {/* Portfolio Avatar & Logo */}
        <div className="rounded-2xl border border-white/10 bg-[#121118]/90 p-5 space-y-4 shadow-xl">
          <div>
            <h4 className="text-sm font-bold text-foreground">Portfolio Avatar &amp; Logo</h4>
            <p className="mt-0.5 text-[11px] text-muted-foreground leading-relaxed">
              Updates your main avatar &amp; logo across Hero, About, Navbar, Loading Screen, and Admin Panel.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <img
              src={logoInput || PORTFOLIO_DATA.logoSrc}
              alt="Avatar Preview"
              referrerPolicy="no-referrer"
              className="h-14 w-14 shrink-0 rounded-full border border-white/20 object-cover shadow-sm bg-black/40"
            />
            <div className="flex flex-1 items-center gap-2">
              <input
                type="text"
                value={logoInput}
                onChange={(e) => setLogoInput(e.target.value)}
                className="w-full rounded-lg border border-white/15 bg-black/60 px-2.5 py-1.5 font-mono text-xs text-foreground focus:border-red-500 focus:outline-none"
                placeholder="/assets/avatar.png or https://..."
              />
              <label className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-foreground transition-all hover:bg-white/15 active:scale-95">
                {uploadingLogo ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-red-400" />
                ) : (
                  <Upload className="h-3.5 w-3.5 text-foreground" />
                )}
                <span>File</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarFileSelect}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleResetDefaultLogo}
              className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-white/20 bg-background/50 px-3.5 py-1.5 text-xs font-semibold text-muted-foreground transition-all hover:border-white/40 hover:text-foreground active:scale-95"
            >
              Reset Default Logo
            </button>
            <button
              type="button"
              disabled={syncing}
              onClick={handleSaveLogo}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-red-600 px-4 py-1.5 text-xs font-bold text-white shadow-md transition-all hover:bg-red-500 active:scale-95 disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" />
              <span>Save Avatar &amp; Logo</span>
            </button>
          </div>
        </div>

        {/* Default Appearance & Maintenance */}
        <div className="rounded-2xl border border-white/10 bg-[#121118]/90 p-5 space-y-4 shadow-xl">
          <div>
            <h4 className="text-sm font-bold text-foreground">
              Default Appearance &amp; Maintenance
            </h4>
            <p className="mt-0.5 text-[11px] text-muted-foreground">Default Light / Dark Mode</p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleToggleThemeMode('dark')}
              className={`cursor-pointer rounded-xl py-2.5 text-xs font-bold transition-all ${
                isDarkMode
                  ? 'bg-red-600 text-white shadow-md'
                  : 'border border-white/10 bg-black/40 text-muted-foreground hover:text-foreground hover:bg-black/60'
              }`}
            >
              Dark Mode
            </button>
            <button
              type="button"
              onClick={() => handleToggleThemeMode('light')}
              className={`cursor-pointer rounded-xl py-2.5 text-xs font-bold transition-all ${
                !isDarkMode
                  ? 'bg-red-600 text-white shadow-md'
                  : 'border border-white/10 bg-black/40 text-muted-foreground hover:text-foreground hover:bg-black/60'
              }`}
            >
              Light Mode
            </button>
          </div>

          <div className="border-t border-white/10 pt-3 space-y-2">
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Need a fresh start? Reset categories, Red theme, clients, and sample thumbnails to defaults.
            </p>
            <button
              type="button"
              disabled={syncing}
              onClick={handleRestoreDefaults}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-white/20 bg-background/50 px-3.5 py-2 text-xs font-semibold text-muted-foreground transition-all hover:border-red-500/50 hover:text-red-400 active:scale-95 disabled:opacity-50"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Restore Default Seed Data</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
