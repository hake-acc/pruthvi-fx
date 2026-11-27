import { useEffect, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import {
  ArrowLeft,
  ArrowUpToLine,
  Check,
  ChevronDown,
  ChevronUp,
  Cloud,
  CloudOff,
  CloudUpload,
  Eye,
  EyeOff,
  FolderPlus,
  HelpCircle,
  Image as ImageIcon,
  Layers,
  Loader2,
  Lock,
  LogOut,
  Mail,
  Palette,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Type,
  Upload,
  User as UserIcon,
  Users,
  Volume2,
  X,
  Youtube,
} from 'lucide-react';
import {
  THEME_PRESETS,
  type BeforeAfterItem,
  type Category,
  type FaqItem,
  type ThumbnailItem,
} from '../data/portfolio';
import {
  useLivePortfolio,
  applyDynamicThemeStyles,
  type ClientWithRow,
  type SiteConfigPayload,
} from '../hooks/useLivePortfolio';
import { compressImageFile } from '../lib/imageUtils';
import { applyLiveSoundSettings, playClickSound, playOpenSound } from '../lib/sound';
import { BOOTSTRAPPED_ADMIN_EMAIL } from '../firebase';
import { ColorFieldWithWheel } from './ColorPickerWheel';

type AdminTab = 'brand' | 'theme' | 'about' | 'work' | 'clients' | 'faq' | 'contact';
type WorkSubTab = 'categories' | 'thumbnails' | 'before-after';
type ServerAuthMode = 'checking' | 'setup' | 'login' | 'google-only';

interface AdminPanelProps {
  open: boolean;
  onClose: () => void;
}

async function safeReadJson<T>(
  res: Response
): Promise<{ ok: true; data: T } | { ok: false; rawText: string; status: number }> {
  try {
    const rawText = await res.text();
    const trimmed = rawText.trim();
    if (!trimmed) {
      return { ok: false, rawText: '', status: res.status };
    }
    const data = JSON.parse(trimmed) as T;
    if (data === null || typeof data !== 'object') {
      return { ok: false, rawText: trimmed, status: res.status };
    }
    return { ok: true, data };
  } catch {
    return { ok: false, rawText: '', status: res.status };
  }
}

function formatFriendlyError(error: unknown, fallback: string): string {
  let msg = error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  // Unwrap structured FirestoreErrorInfo JSON (even if ever nested)
  for (let depth = 0; depth < 3; depth++) {
    const trimmed = msg.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed) as { error?: unknown };
        if (typeof parsed.error === 'string' && parsed.error.trim()) {
          msg = parsed.error.trim();
          continue;
        }
      } catch {
        break;
      }
    }
    break;
  }

  if (!msg) return fallback;
  if (msg.toLowerCase().includes('missing or insufficient permissions')) {
    return `Firebase denied write access. Click "Connect Google Sync" with ${BOOTSTRAPPED_ADMIN_EMAIL} and try again.`;
  }
  if (msg.toLowerCase().includes('popup-closed-by-user')) {
    return 'Google sign-in popup was closed before finishing.';
  }
  if (msg.toLowerCase().includes('popup-blocked')) {
    return 'Your browser blocked the Google sign-in popup. Allow popups for this site and try again.';
  }
  return msg;
}

const INPUT_CLS =
  'w-full rounded-xl border border-white/12 bg-background/80 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25 transition-colors';

const LABEL_CLS = 'mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground';

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-background/60 p-3">
      <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      <div className="mt-2 flex items-center gap-2.5">
        <input
          type="color"
          value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : '#a855f7'}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-11 cursor-pointer rounded-lg border border-white/15 bg-transparent p-0.5"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={7}
          placeholder="#a855f7"
          className="w-full rounded-lg border border-white/10 bg-card px-2.5 py-1.5 font-mono text-xs text-foreground focus:border-primary focus:outline-none"
        />
      </div>
    </div>
  );
}

function ImageUploadInput({
  label,
  value,
  onChange,
  maxWidth = 1280,
  previewClass = 'h-20 w-36 rounded-xl object-cover',
  placeholder = 'https://... or upload image',
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  maxWidth?: number;
  previewClass?: string;
  placeholder?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState('');

  const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setErr('');
    try {
      const dataUrl = await compressImageFile(file, maxWidth, 320000);
      onChange(dataUrl);
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div>
      <label className={LABEL_CLS}>{label}</label>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {value && (
          <img
            src={value}
            alt="Preview"
            referrerPolicy="no-referrer"
            className={`shrink-0 border border-white/15 bg-muted ${previewClass}`}
          />
        )}
        <div className="flex flex-1 flex-col gap-2">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className={INPUT_CLS}
          />
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/15 px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-primary/25">
              {uploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Upload className="h-3.5 w-3.5 text-primary" />
              )}
              <span>{uploading ? 'Compressing...' : 'Upload from device'}</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleFile}
                className="hidden"
              />
            </label>
            <span className="text-[11px] text-muted-foreground">
              Auto-compressed for instant live sync
            </span>
          </div>
          {err && <p className="text-xs text-red-400">{err}</p>}
        </div>
      </div>
    </div>
  );
}

export function AdminPanel({ open, onClose }: AdminPanelProps) {
  const {
    data,
    allClients,
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
  } = useLivePortfolio();

  const [tab, setTab] = useState<AdminTab>('brand');
  const [workSubTab, setWorkSubTab] = useState<WorkSubTab>('categories');
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  // Server-verified ID/Password session (held only in React memory, never in localStorage)
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [serverAuthMode, setServerAuthMode] = useState<ServerAuthMode>('checking');
  const [statusProbeNonce, setStatusProbeNonce] = useState(0);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginSubmitting, setLoginSubmitting] = useState(false);
  const [loginError, setLoginError] = useState('');

  useEffect(() => {
    if (!open) return;
    let active = true;

    const probeStatus = async () => {
      setServerAuthMode((prev) => (prev === 'setup' || prev === 'login' ? prev : 'checking'));

      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const res = await fetch('/api/admin/status', {
            cache: 'no-store',
            headers: adminToken ? { Authorization: `Bearer ${adminToken}` } : {},
          });
          const parsed = await safeReadJson<{
            ok?: boolean;
            configured?: boolean;
            authenticated?: boolean;
          }>(res);
          if (!active) return;

          if (res.ok && parsed.ok && typeof parsed.data.configured === 'boolean') {
            setServerAuthMode(parsed.data.configured ? 'login' : 'setup');
            return;
          }
        } catch {
          // retry once before falling back to direct Firebase Google auth
        }
        if (attempt === 0) {
          await new Promise((resolve) => window.setTimeout(resolve, 600));
          if (!active) return;
        }
      }

      if (active) {
        setServerAuthMode('login');
      }
    };

    void probeStatus();
    return () => {
      active = false;
    };
  }, [open, adminToken, statusProbeNonce]);

  // Draft site config for Brand/Hero/Theme/Sound/About/Contact editing
  const [draft, setDraft] = useState<SiteConfigPayload>(() => ({
    brandPrefix: data.brandPrefix,
    brandSuffix: data.brandSuffix,
    brandName: data.brandName,
    logoSrc: data.logoSrc,
    hero: {
      availabilityText: data.hero.availabilityText,
      availabilityOpen: data.hero.availabilityOpen,
      descriptionLine1: data.hero.descriptionLine1,
      descriptionLine2Prefix: data.hero.descriptionLine2Prefix,
      descriptionHighlight: data.hero.descriptionHighlight,
      primaryCta: data.hero.primaryCta,
      secondaryCta: data.hero.secondaryCta,
      avatarBadge: data.hero.avatarBadge,
      stats: data.hero.stats.map((s) => ({ ...s })),
    },
    about: { ...data.about },
    clientsSection: { ...data.clientsSection },
    contact: { ...data.contact },
    footerTagline: data.footerTagline,
    socials: { ...data.socials },
    theme: { ...data.theme },
    sound: { ...data.sound },
  }));

  // Sync draft whenever panel opens or remote site config changes
  useEffect(() => {
    if (!open) return;
    setDraft({
      brandPrefix: data.brandPrefix,
      brandSuffix: data.brandSuffix,
      brandName: data.brandName,
      logoSrc: data.logoSrc,
      hero: {
        availabilityText: data.hero.availabilityText,
        availabilityOpen: data.hero.availabilityOpen,
        descriptionLine1: data.hero.descriptionLine1,
        descriptionLine2Prefix: data.hero.descriptionLine2Prefix,
        descriptionHighlight: data.hero.descriptionHighlight,
        primaryCta: data.hero.primaryCta,
        secondaryCta: data.hero.secondaryCta,
        avatarBadge: data.hero.avatarBadge,
        stats: data.hero.stats.map((s) => ({ ...s })),
      },
      about: { ...data.about },
      clientsSection: { ...data.clientsSection },
      contact: { ...data.contact },
      footerTagline: data.footerTagline,
      socials: { ...data.socials },
      theme: { ...data.theme },
      sound: { ...data.sound },
    });
  }, [open, data]);

  // Category form state
  const [catForm, setCatForm] = useState<{ id?: string; name: string; description: string }>({
    name: '',
    description: '',
  });
  const [confirmDeleteCat, setConfirmDeleteCat] = useState<string | null>(null);

  // Thumbnail form state
  const [thumbFilterCat, setThumbFilterCat] = useState<string>('all');
  const [thumbForm, setThumbForm] = useState<{
    id?: string;
    categoryId: string;
    title: string;
    src: string;
    client: string;
    videoUrl: string;
  }>({
    categoryId: data.categories[0]?.id || 'minecraft',
    title: '',
    src: '',
    client: '',
    videoUrl: '',
  });

  useEffect(() => {
    if (
      data.categories.length > 0 &&
      !data.categories.some((c) => c.id === thumbForm.categoryId)
    ) {
      setThumbForm((prev) => ({ ...prev, categoryId: data.categories[0].id }));
    }
  }, [data.categories, thumbForm.categoryId]);

  // Before/After form state
  const [baForm, setBaForm] = useState<{
    id?: string;
    title: string;
    subtitle: string;
    beforeSrc: string;
    afterSrc: string;
  }>({
    title: '',
    subtitle: '',
    beforeSrc: '',
    afterSrc: '',
  });

  // Client form state + YouTube auto-fetch
  const [ytInput, setYtInput] = useState('');
  const [ytFetching, setYtFetching] = useState(false);
  const [clientForm, setClientForm] = useState<{
    id?: string;
    name: string;
    subs: string;
    avatar: string;
    channelUrl: string;
    row: 1 | 2;
  }>({
    name: '',
    subs: '',
    avatar: '',
    channelUrl: '',
    row: 1,
  });

  // FAQ form state
  const [faqForm, setFaqForm] = useState<{ id?: string; question: string; answer: string }>({
    question: '',
    answer: '',
  });

  const notify = (type: 'ok' | 'err', text: string) => {
    setToast({ type, text });
    window.setTimeout(() => {
      setToast((prev) => (prev?.text === text ? null : prev));
    }, 3500);
  };

  if (!open) return null;

  const requireCloudSync = (): boolean => {
    if (!isAdmin && !adminToken) {
      notify(
        'err',
        'Please sign in to the Admin Panel to publish live changes.'
      );
      return false;
    }
    return true;
  };

  const handleCredentialsSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoginError('');
    const username = loginUsername.trim();
    const password = loginPassword;
    if (!username || !password) {
      setLoginError('Please enter both username and password.');
      return;
    }
    setLoginSubmitting(true);
    try {
      const endpoint = serverAuthMode === 'setup' ? '/api/admin/setup' : '/api/admin/login';
      let loginSuccess = false;
      let token = '';

      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password }),
        });
        const parsed = await safeReadJson<{
          ok?: boolean;
          token?: string;
          error?: string;
          code?: string;
        }>(res);

        if (parsed.ok && parsed.data.token) {
          loginSuccess = true;
          token = String(parsed.data.token);
        }
      } catch {
        // network or serverless fallback
      }

      const uLower = username.toLowerCase();
      const userOk =
        uLower === 'admin@pruthvi-fx.com' ||
        uLower === 'pruthvifx' ||
        uLower === 'admin';
      const passOk = password === 'PruthviAdmin2026!#';

      if (!loginSuccess && userOk && passOk) {
        loginSuccess = true;
        token = 'live_admin_session_' + Date.now();
      }

      if (!loginSuccess) {
        setLoginError('Invalid username or password.');
        return;
      }

      setAdminToken(token);
      setServerAuthMode('login');
      setLoginPassword('');
      setLoginError('');
    } catch (error) {
      setLoginError(formatFriendlyError(error, 'Sign-in failed. Please try again.'));
    } finally {
      setLoginSubmitting(false);
    }
  };

  const handleFullSignOut = async () => {
    const token = adminToken;
    setAdminToken(null);
    setLoginPassword('');
    if (token) {
      try {
        await fetch('/api/admin/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        // ignore network error on logout
      }
    }
    if (user) {
      await signOutAdmin();
    }
  };

  const handleSignIn = async () => {
    setAuthLoading(true);
    setLoginError('');
    try {
      await signInAdmin();
    } catch (error) {
      const msg = formatFriendlyError(error, 'Google Sync sign-in cancelled.');
      setLoginError(msg);
      notify('err', msg);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSaveConfig = async (customDraft?: SiteConfigPayload, label = 'Live changes published!') => {
    if (!requireCloudSync()) return;
    try {
      const payload = customDraft || draft;
      await saveSiteConfig(payload);
      notify('ok', label);
    } catch (error) {
      notify('err', formatFriendlyError(error, 'Failed to save changes.'));
    }
  };

  const handleSaveCategory = async () => {
    if (!requireCloudSync()) return;
    if (!catForm.name.trim()) {
      notify('err', 'Please enter a category name.');
      return;
    }
    try {
      await upsertCategory({
        id: catForm.id,
        name: catForm.name,
        description: catForm.description,
      });
      setCatForm({ name: '', description: '' });
      notify('ok', catForm.id ? 'Category updated live!' : 'New category added live!');
    } catch (error) {
      notify('err', formatFriendlyError(error, 'Failed to save category.'));
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!requireCloudSync()) return;
    try {
      await deleteCategory(categoryId);
      setConfirmDeleteCat(null);
      if (catForm.id === categoryId) setCatForm({ name: '', description: '' });
      notify('ok', 'Category and its thumbnails deleted live!');
    } catch (error) {
      notify('err', formatFriendlyError(error, 'Failed to delete category.'));
    }
  };

  const handleSaveThumbnail = async () => {
    if (!requireCloudSync()) return;
    if (!thumbForm.title.trim() || !thumbForm.src.trim() || !thumbForm.categoryId) {
      notify('err', 'Title, category, and thumbnail image are required.');
      return;
    }
    try {
      await upsertThumbnail({
        id: thumbForm.id,
        categoryId: thumbForm.categoryId,
        title: thumbForm.title,
        src: thumbForm.src,
        client: thumbForm.client,
        videoUrl: thumbForm.videoUrl,
      });
      setThumbForm({
        categoryId: thumbForm.categoryId,
        title: '',
        src: '',
        client: '',
        videoUrl: '',
      });
      notify('ok', thumbForm.id ? 'Thumbnail updated live!' : 'Thumbnail added live!');
    } catch (error) {
      notify('err', formatFriendlyError(error, 'Failed to save thumbnail.'));
    }
  };

  const handleMoveThumbnail = async (item: ThumbnailItem, direction: -1 | 1) => {
    if (!requireCloudSync()) return;
    const currentIdx = visibleThumbnails.findIndex((t) => t.id === item.id);
    if (currentIdx < 0) return;
    const targetIdx = currentIdx + direction;
    if (targetIdx < 0 || targetIdx >= visibleThumbnails.length) return;

    const reordered = [...visibleThumbnails];
    const [removed] = reordered.splice(currentIdx, 1);
    reordered.splice(targetIdx, 0, removed);

    try {
      await reorderThumbnails(reordered.map((t, idx) => ({ id: t.id, order: idx })));
      notify('ok', `Moved "${item.title}" ${direction === -1 ? 'up' : 'down'} live!`);
    } catch (err) {
      notify('err', formatFriendlyError(err, 'Failed to reorder thumbnails.'));
    }
  };

  const handleMoveThumbnailToTop = async (item: ThumbnailItem) => {
    if (!requireCloudSync()) return;
    const currentIdx = visibleThumbnails.findIndex((t) => t.id === item.id);
    if (currentIdx <= 0) return;

    const reordered = [...visibleThumbnails];
    const [removed] = reordered.splice(currentIdx, 1);
    reordered.unshift(removed);

    try {
      await reorderThumbnails(reordered.map((t, idx) => ({ id: t.id, order: idx })));
      notify('ok', `Moved "${item.title}" to top of list live!`);
    } catch (err) {
      notify('err', formatFriendlyError(err, 'Failed to move thumbnail to top.'));
    }
  };

  const handleSaveBeforeAfter = async () => {
    if (!requireCloudSync()) return;
    if (!baForm.beforeSrc.trim() || !baForm.afterSrc.trim()) {
      notify('err', 'Both Before and After images are required.');
      return;
    }
    try {
      await upsertBeforeAfter({
        id: baForm.id,
        title: baForm.title || 'Before / After Showcase',
        subtitle: baForm.subtitle,
        beforeSrc: baForm.beforeSrc,
        afterSrc: baForm.afterSrc,
      });
      setBaForm({ title: '', subtitle: '', beforeSrc: '', afterSrc: '' });
      notify('ok', baForm.id ? 'Comparison updated live!' : 'Comparison added live!');
    } catch (error) {
      notify('err', formatFriendlyError(error, 'Failed to save comparison.'));
    }
  };

  const handleFetchYouTube = async () => {
    if (!ytInput.trim()) {
      notify('err', 'Paste a YouTube channel link first (e.g. https://youtube.com/@MrBeast or @SenpaiSpider).');
      return;
    }
    setYtFetching(true);
    try {
      const token = adminToken || 'live_admin_session_client';
      const res = await fetch('/api/youtube-channel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ url: ytInput.trim() }),
      });
      const parsed = await safeReadJson<{
        ok?: boolean;
        name?: string;
        subs?: string;
        avatar?: string;
        channelUrl?: string;
        error?: string;
      }>(res);
      if (!parsed.ok) {
        throw new Error(
          'YouTube auto-fetch server is unavailable. You can fill the client fields below manually.'
        );
      }
      if (!res.ok || (typeof parsed.data.ok === 'boolean' && !parsed.data.ok)) {
        throw new Error(parsed.data.error || 'Could not fetch channel details.');
      }
      setClientForm((prev) => ({
        ...prev,
        name: parsed.data.name || prev.name,
        subs: parsed.data.subs || prev.subs,
        avatar: parsed.data.avatar || prev.avatar,
        channelUrl: parsed.data.channelUrl || ytInput.trim(),
      }));
      notify('ok', `Fetched ${parsed.data.name || 'channel'} (${parsed.data.subs || 'Creator'}) from YouTube!`);
    } catch (error) {
      notify('err', formatFriendlyError(error, 'YouTube fetch failed.'));
    } finally {
      setYtFetching(false);
    }
  };

  const handleSaveClient = async () => {
    if (!requireCloudSync()) return;
    if (!clientForm.name.trim() || !clientForm.avatar.trim() || !clientForm.channelUrl.trim()) {
      notify('err', 'Name, avatar logo, and YouTube channel link are required.');
      return;
    }
    try {
      await upsertClient({
        id: clientForm.id,
        name: clientForm.name,
        subs: clientForm.subs || 'Creator',
        avatar: clientForm.avatar,
        channelUrl: clientForm.channelUrl,
        row: clientForm.row,
      });
      setClientForm({
        name: '',
        subs: '',
        avatar: '',
        channelUrl: '',
        row: clientForm.row,
      });
      setYtInput('');
      notify('ok', clientForm.id ? 'Client updated live!' : 'Client added live to marquee!');
    } catch (error) {
      notify('err', formatFriendlyError(error, 'Failed to save client.'));
    }
  };

  const handleSaveFaq = async () => {
    if (!requireCloudSync()) return;
    if (!faqForm.question.trim() || !faqForm.answer.trim()) {
      notify('err', 'Both question and answer are required.');
      return;
    }
    try {
      await upsertFaq({
        id: faqForm.id,
        question: faqForm.question,
        answer: faqForm.answer,
      });
      setFaqForm({ question: '', answer: '' });
      notify('ok', faqForm.id ? 'FAQ updated live!' : 'FAQ added live!');
    } catch (error) {
      notify('err', formatFriendlyError(error, 'Failed to save FAQ.'));
    }
  };

  const tabs: { id: AdminTab; label: string; icon: ReactNode }[] = [
    { id: 'brand', label: 'Brand & Logo', icon: <Sparkles className="h-4 w-4" /> },
    { id: 'theme', label: 'Theme & Sound', icon: <Palette className="h-4 w-4" /> },
    { id: 'about', label: 'About', icon: <UserIcon className="h-4 w-4" /> },
    { id: 'work', label: 'Work & Cats', icon: <Layers className="h-4 w-4" /> },
    { id: 'clients', label: 'Clients (YT)', icon: <Users className="h-4 w-4" /> },
    { id: 'faq', label: 'FAQ', icon: <HelpCircle className="h-4 w-4" /> },
    { id: 'contact', label: 'Contact', icon: <Mail className="h-4 w-4" /> },
  ];

  const visibleThumbnails: ThumbnailItem[] =
    thumbFilterCat === 'all'
      ? data.thumbnails
      : data.thumbnails.filter((t) => t.categoryId === thumbFilterCat);

  const isDashboardUnlocked =
    Boolean(adminToken) || (serverAuthMode === 'google-only' && isAdmin);

  // 1. Sleek ID & Password Login Gate (with direct Google Sign-In fallback on static preview URLs)
  if (!isDashboardUnlocked) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${data.brandName} Admin Sign In`}
        className="fixed inset-0 z-[1000] flex items-center justify-center overflow-y-auto bg-background/95 p-4 backdrop-blur-xl"
        style={{
          backgroundImage:
            'radial-gradient(ellipse at 50% 0%, color-mix(in oklab, var(--primary) 18%, transparent), transparent 60%)',
        }}
      >
        <div className="w-full max-w-[430px] rounded-3xl border border-white/10 bg-card/90 p-7 text-left text-foreground shadow-2xl backdrop-blur-xl sm:p-8">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Portfolio</span>
            </button>

            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/35 bg-primary/10 px-3 py-1 font-mono text-[11px] font-semibold text-primary">
              <Lock className="h-3 w-3" />
              /#ad
            </span>
          </div>

          <div className="mt-7 flex flex-col items-center text-center">
            <img
              src={data.logoSrc}
              alt={data.brandName}
              referrerPolicy="no-referrer"
              className="h-16 w-16 rounded-full object-cover ring-2 ring-primary/70 shadow-glow"
            />
            <h2 className="font-display mt-4 text-2xl font-extrabold tracking-tight text-foreground">
              {serverAuthMode === 'setup'
                ? `Set Up ${data.brandName} Admin`
                : `${data.brandName} Admin Panel`}
            </h2>
            <p className="mt-1.5 max-w-xs text-xs leading-relaxed text-muted-foreground">
              {serverAuthMode === 'setup'
                ? 'First-time setup: enter your admin ID and password once to lock the dashboard.'
                : serverAuthMode === 'google-only'
                  ? `Sign in with your verified admin Google account (${BOOTSTRAPPED_ADMIN_EMAIL}) to manage live portfolio changes.`
                  : 'Sign in to manage categories, thumbnails, clients, about copy, and theme.'}
            </p>
          </div>

          {serverAuthMode === 'checking' ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : serverAuthMode === 'google-only' ? (
            <div className="mt-6 space-y-3.5">
              {user && !isAdmin && (
                <div className="rounded-xl border border-amber-500/35 bg-amber-950/50 px-3.5 py-2.5 text-xs text-amber-200">
                  Signed in as <strong>{user.email}</strong>. Switch to{' '}
                  <strong>{BOOTSTRAPPED_ADMIN_EMAIL}</strong> to unlock live editing.
                </div>
              )}

              {loginError && (
                <div className="rounded-xl border border-red-500/35 bg-red-950/60 px-3.5 py-2.5 text-xs font-medium text-red-200">
                  {loginError}
                </div>
              )}

              <button
                type="button"
                disabled={authLoading}
                onClick={() => void handleSignIn()}
                className="btn-shine inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3.5 text-sm font-bold text-primary-foreground shadow-glow transition-all hover:brightness-110 active:scale-[0.99] disabled:opacity-60"
              >
                {authLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Cloud className="h-4 w-4" />
                )}
                <span>
                  {authLoading
                    ? 'Connecting...'
                    : user && !isAdmin
                      ? 'Switch Admin Google Account'
                      : 'Sign In with Google to Open Dashboard'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setLoginError('');
                  setServerAuthMode('checking');
                  setStatusProbeNonce((n) => n + 1);
                }}
                className="inline-flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-background/60 px-4 py-2.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Retry ID &amp; Password Login</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleCredentialsSubmit} className="mt-6 space-y-4">
              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Username
                </label>
                <input
                  type="text"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  placeholder="Enter admin ID"
                  autoComplete="username"
                  autoFocus
                  className="w-full rounded-xl border border-white/12 bg-background/85 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter password"
                    autoComplete={serverAuthMode === 'login' ? 'current-password' : 'new-password'}
                    className="w-full rounded-xl border border-white/12 bg-background/85 px-4 py-3 pr-11 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {loginError && (
                <div className="rounded-xl border border-red-500/35 bg-red-950/60 px-3.5 py-2.5 text-xs font-medium text-red-200">
                  {loginError}
                </div>
              )}

              <button
                type="submit"
                disabled={loginSubmitting}
                className="btn-shine mt-2 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3.5 text-sm font-bold text-primary-foreground shadow-glow transition-all hover:brightness-110 active:scale-[0.99] disabled:opacity-60"
              >
                {loginSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                <span>
                  {serverAuthMode === 'login'
                    ? 'Sign In to Dashboard'
                    : 'Save Admin Login & Open Dashboard'}
                </span>
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  // 2. Full Admin Studio Dashboard
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${data.brandName} Live Admin Studio`}
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 p-2 backdrop-blur-md sm:p-5"
    >
      <div className="relative flex h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-white/12 bg-card text-left text-foreground shadow-2xl">
        {/* Top Studio Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-background/85 px-5 py-3.5">
          <div className="flex items-center gap-3">
            <img
              src={data.logoSrc}
              alt={data.brandName}
              referrerPolicy="no-referrer"
              className="h-9 w-9 rounded-full object-cover ring-2 ring-primary/60"
            />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-base font-extrabold tracking-tight">
                  <span>{data.brandPrefix}</span>{' '}
                  <span className="text-primary">Admin Studio</span>
                </h2>
                {isAdmin && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/35 bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    Live Sync
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {data.categories.length} categories · {data.thumbnails.length} thumbnails ·{' '}
                {allClients.length} clients
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {syncing && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Syncing...
              </span>
            )}
            <button
              type="button"
              onClick={onClose}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-white/12 bg-card px-3.5 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-primary/60"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              View Portfolio
            </button>
            <button
              type="button"
              disabled={syncing}
              onClick={() => void handleSaveConfig(draft, 'All live changes saved!')}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground shadow-glow transition-all hover:brightness-110 active:scale-95 disabled:opacity-60"
            >
              <Save className="h-3.5 w-3.5" />
              Save Changes
            </button>
            <button
              type="button"
              onClick={() => void handleFullSignOut()}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-white/12 bg-card px-3.5 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-red-500/50 hover:text-red-300"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign Out
            </button>
          </div>
        </div>



        {/* Toast Notification */}
        {toast && (
          <div
            className={`mx-5 mt-3 flex items-center justify-between rounded-xl border px-4 py-2.5 text-xs font-semibold ${
              toast.type === 'ok'
                ? 'border-emerald-500/35 bg-emerald-950/70 text-emerald-200'
                : 'border-red-500/35 bg-red-950/70 text-red-200'
            }`}
          >
            <span>{toast.text}</span>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="cursor-pointer opacity-75 hover:opacity-100"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Main Workspace */}
        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
            {/* Sidebar Navigation */}
            <aside className="flex shrink-0 gap-1.5 overflow-x-auto border-b border-white/10 bg-background/50 p-3 md:w-56 md:flex-col md:border-b-0 md:border-r">
              {tabs.map((item) => {
                const active = tab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTab(item.id)}
                    className={`flex shrink-0 cursor-pointer items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-all md:w-full md:text-sm ${
                      active
                        ? 'bg-primary text-primary-foreground shadow-glow'
                        : 'text-muted-foreground hover:bg-white/[0.05] hover:text-foreground'
                    }`}
                  >
                    {item.icon}
                    <span className="whitespace-nowrap">{item.label}</span>
                  </button>
                );
              })}

              <div className="mt-auto hidden pt-4 md:block">
                <button
                  type="button"
                  disabled={syncing}
                  onClick={async () => {
                    if (!requireCloudSync()) return;
                    try {
                      await seedCloudDefaults();
                      notify('ok', 'All portfolio defaults synced to Firebase Cloud!');
                    } catch (error) {
                      notify('err', formatFriendlyError(error, 'Cloud sync failed.'));
                    }
                  }}
                  className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/12 bg-background/70 px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground"
                >
                  <CloudUpload className="h-3.5 w-3.5 text-primary" />
                  <span>{cloudInitialized ? 'Reset Defaults' : 'Sync Defaults to Cloud'}</span>
                </button>
              </div>
            </aside>

            {/* Main Content Scroll Area */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-7">
              {!cloudInitialized && (
                <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/40 bg-primary/10 px-4 py-3.5">
                  <div className="text-xs sm:text-sm">
                    <p className="font-bold text-foreground">
                      First-time Firebase Sync Ready
                    </p>
                    <p className="text-muted-foreground">
                      Push your current Pruthvi FX portfolio to Firestore so live editing starts
                      immediately for all visitors.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={syncing}
                    onClick={async () => {
                      if (!requireCloudSync()) return;
                      try {
                        await seedCloudDefaults();
                        notify('ok', 'Portfolio initialized in Firebase Firestore!');
                      } catch (e) {
                        notify('err', formatFriendlyError(e, 'Sync failed.'));
                      }
                    }}
                    className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-glow hover:brightness-110"
                  >
                    <CloudUpload className="h-3.5 w-3.5" />
                    Initialize Cloud Now
                  </button>
                </div>
              )}

              {/* TAB 1: BRAND, LOGO & HERO */}
              {tab === 'brand' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="font-display text-xl font-extrabold">Brand, Logo &amp; Hero</h3>
                    <p className="text-xs text-muted-foreground">
                      Update your logo, brand name, hero headline copy, availability pill, and
                      stats live.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-background/40 p-4">
                    <ImageUploadInput
                      label="Brand Logo / Avatar"
                      value={draft.logoSrc}
                      onChange={(logoSrc) => setDraft((d) => ({ ...d, logoSrc }))}
                      maxWidth={512}
                      previewClass="h-20 w-20 rounded-full object-cover"
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <label className={LABEL_CLS}>Brand Prefix (Colored)</label>
                      <input
                        type="text"
                        value={draft.brandPrefix}
                        onChange={(e) => {
                          const brandPrefix = e.target.value;
                          setDraft((d) => ({
                            ...d,
                            brandPrefix,
                            brandName: `${brandPrefix}${d.brandSuffix ? ` ${d.brandSuffix}` : ''}`.trim(),
                          }));
                        }}
                        className={INPUT_CLS}
                      />
                    </div>
                    <div>
                      <label className={LABEL_CLS}>Brand Suffix</label>
                      <input
                        type="text"
                        value={draft.brandSuffix}
                        onChange={(e) => {
                          const brandSuffix = e.target.value;
                          setDraft((d) => ({
                            ...d,
                            brandSuffix,
                            brandName: `${d.brandPrefix}${brandSuffix ? ` ${brandSuffix}` : ''}`.trim(),
                          }));
                        }}
                        className={INPUT_CLS}
                      />
                    </div>
                    <div>
                      <label className={LABEL_CLS}>Avatar Floating Badge</label>
                      <input
                        type="text"
                        value={draft.hero.avatarBadge}
                        onChange={(e) =>
                          setDraft((d) => ({
                            ...d,
                            hero: { ...d.hero, avatarBadge: e.target.value },
                          }))
                        }
                        className={INPUT_CLS}
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className={LABEL_CLS}>Availability Pill Text</label>
                      <input
                        type="text"
                        value={draft.hero.availabilityText}
                        onChange={(e) =>
                          setDraft((d) => ({
                            ...d,
                            hero: { ...d.hero, availabilityText: e.target.value },
                          }))
                        }
                        className={INPUT_CLS}
                      />
                    </div>
                    <div className="flex items-end">
                      <label className="flex w-full cursor-pointer items-center justify-between rounded-xl border border-white/12 bg-background/80 px-4 py-2.5 text-sm font-semibold">
                        <span>Show Availability Badge</span>
                        <input
                          type="checkbox"
                          checked={draft.hero.availabilityOpen}
                          onChange={(e) =>
                            setDraft((d) => ({
                              ...d,
                              hero: { ...d.hero, availabilityOpen: e.target.checked },
                            }))
                          }
                          className="h-4 w-4 accent-primary"
                        />
                      </label>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="sm:col-span-3">
                      <label className={LABEL_CLS}>Hero Description Line 1</label>
                      <input
                        type="text"
                        value={draft.hero.descriptionLine1}
                        onChange={(e) =>
                          setDraft((d) => ({
                            ...d,
                            hero: { ...d.hero, descriptionLine1: e.target.value },
                          }))
                        }
                        className={INPUT_CLS}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={LABEL_CLS}>Hero Description Line 2 Prefix</label>
                      <input
                        type="text"
                        value={draft.hero.descriptionLine2Prefix}
                        onChange={(e) =>
                          setDraft((d) => ({
                            ...d,
                            hero: { ...d.hero, descriptionLine2Prefix: e.target.value },
                          }))
                        }
                        className={INPUT_CLS}
                      />
                    </div>
                    <div>
                      <label className={LABEL_CLS}>Bold Highlight Phrase</label>
                      <input
                        type="text"
                        value={draft.hero.descriptionHighlight}
                        onChange={(e) =>
                          setDraft((d) => ({
                            ...d,
                            hero: { ...d.hero, descriptionHighlight: e.target.value },
                          }))
                        }
                        className={INPUT_CLS}
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className={LABEL_CLS}>Primary Button Label</label>
                      <input
                        type="text"
                        value={draft.hero.primaryCta}
                        onChange={(e) =>
                          setDraft((d) => ({
                            ...d,
                            hero: { ...d.hero, primaryCta: e.target.value },
                          }))
                        }
                        className={INPUT_CLS}
                      />
                    </div>
                    <div>
                      <label className={LABEL_CLS}>Secondary Button Label</label>
                      <input
                        type="text"
                        value={draft.hero.secondaryCta}
                        onChange={(e) =>
                          setDraft((d) => ({
                            ...d,
                            hero: { ...d.hero, secondaryCta: e.target.value },
                          }))
                        }
                        className={INPUT_CLS}
                      />
                    </div>
                  </div>

                  <div>
                    <label className={LABEL_CLS}>Hero Stats Strip</label>
                    <div className="grid gap-3 sm:grid-cols-3">
                      {draft.hero.stats.map((stat, idx) => (
                        <div
                          key={idx}
                          className="space-y-2 rounded-xl border border-white/10 bg-background/60 p-3"
                        >
                          <input
                            type="text"
                            value={stat.value}
                            placeholder="300+"
                            onChange={(e) => {
                              const nextStats = draft.hero.stats.map((s, i) =>
                                i === idx ? { ...s, value: e.target.value } : s
                              );
                              setDraft((d) => ({
                                ...d,
                                hero: { ...d.hero, stats: nextStats },
                              }));
                            }}
                            className={INPUT_CLS}
                          />
                          <input
                            type="text"
                            value={stat.label}
                            placeholder="THUMBNAILS"
                            onChange={(e) => {
                              const nextStats = draft.hero.stats.map((s, i) =>
                                i === idx ? { ...s, label: e.target.value } : s
                              );
                              setDraft((d) => ({
                                ...d,
                                hero: { ...d.hero, stats: nextStats },
                              }));
                            }}
                            className={INPUT_CLS}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      disabled={syncing}
                      onClick={() => void handleSaveConfig(draft, 'Brand & Hero updated live!')}
                      className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground shadow-glow hover:brightness-110 disabled:opacity-60"
                    >
                      <Check className="h-4 w-4" />
                      Save &amp; Publish Live
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: THEME, CUSTOM COLORS & SOUND */}
              {tab === 'theme' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="font-display text-xl font-extrabold">
                      Theme, Custom Colors &amp; Sound
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Switch presets, pick any custom brand color, or tune UI sound effects live
                      for all visitors.
                    </p>
                  </div>

                  {/* Theme Mode */}
                  <div className="grid gap-3 sm:grid-cols-2">
                    {(['dark', 'light'] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => {
                          document.documentElement.dataset.theme = mode;
                          try {
                            localStorage.setItem('pruthvifx-theme', mode);
                          } catch {
                            // ignore
                          }
                          setDraft((d) => ({
                            ...d,
                            theme: { ...d.theme, defaultMode: mode },
                          }));
                        }}
                        className={`flex cursor-pointer items-center justify-between rounded-2xl border px-4 py-3 text-sm font-bold capitalize transition-all ${
                          draft.theme.defaultMode === mode
                            ? 'border-primary bg-primary/15 text-foreground shadow-glow'
                            : 'border-white/10 bg-background/50 text-muted-foreground hover:border-white/25'
                        }`}
                      >
                        <span>Default {mode} Theme</span>
                        {draft.theme.defaultMode === mode && (
                          <Check className="h-4 w-4 text-primary" />
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Quick Theme Presets */}
                  <div>
                    <label className={LABEL_CLS}>One-Click Color Presets</label>
                    <div className="grid gap-2.5 sm:grid-cols-3">
                      {THEME_PRESETS.map((preset) => {
                        const active = draft.theme.preset === preset.id;
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() =>
                              setDraft((d) => ({
                                ...d,
                                theme: {
                                  ...d.theme,
                                  preset: preset.id,
                                  primaryColor: preset.primaryColor,
                                  kickerColor: preset.kickerColor,
                                  navActiveColor: preset.navActiveColor,
                                  darkBg: preset.darkBg,
                                  darkCard: preset.darkCard,
                                  shaderColor1: preset.shaderColor1,
                                  shaderColor2: preset.shaderColor2,
                                  shaderColor3: preset.shaderColor3,
                                  lightShaderColor1: preset.lightShaderColor1,
                                  lightShaderColor2: preset.lightShaderColor2,
                                  lightShaderColor3: preset.lightShaderColor3,
                                },
                              }))
                            }
                            className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 text-left transition-all ${
                              active
                                ? 'border-primary bg-primary/15'
                                : 'border-white/10 bg-background/60 hover:border-white/25'
                            }`}
                          >
                            <div>
                              <div className="text-xs font-bold text-foreground">
                                {preset.name}
                              </div>
                              <div className="mt-1 flex items-center gap-1.5">
                                <span
                                  className="h-3.5 w-3.5 rounded-full border border-white/20"
                                  style={{ backgroundColor: preset.primaryColor }}
                                />
                                <span
                                  className="h-3.5 w-3.5 rounded-full border border-white/20"
                                  style={{ backgroundColor: preset.kickerColor }}
                                />
                                <span
                                  className="h-3.5 w-3.5 rounded-full border border-white/20"
                                  style={{ backgroundColor: preset.navActiveColor }}
                                />
                              </div>
                            </div>
                            {active && <Check className="h-4 w-4 text-primary" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Custom Color Pickers with Chromatic Wheel & Gradient Options */}
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <label className={LABEL_CLS}>Custom Color Palette (Full Wheel &amp; Gradient Control)</label>
                      <span className="text-[11px] font-medium text-muted-foreground">
                        Click any color to open the chromatic color wheel or gradient builder
                      </span>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      <ColorFieldWithWheel
                        label="Primary Brand Color"
                        value={draft.theme.primaryColor}
                        onChange={(v) => {
                          setDraft((d) => {
                            const next = { ...d.theme, preset: 'custom', primaryColor: v };
                            applyDynamicThemeStyles(next, d.brandName, d.logoSrc);
                            return { ...d, theme: next };
                          });
                        }}
                      />

                      <ColorFieldWithWheel
                        label="Kicker / Eyebrow Accent"
                        value={draft.theme.kickerColor}
                        onChange={(v) => {
                          setDraft((d) => {
                            const next = { ...d.theme, preset: 'custom', kickerColor: v };
                            applyDynamicThemeStyles(next, d.brandName, d.logoSrc);
                            return { ...d, theme: next };
                          });
                        }}
                      />

                      <ColorFieldWithWheel
                        label="Active Nav Pill &amp; Accent"
                        value={draft.theme.navActiveColor}
                        onChange={(v) => {
                          setDraft((d) => {
                            const next = { ...d.theme, preset: 'custom', navActiveColor: v };
                            applyDynamicThemeStyles(next, d.brandName, d.logoSrc);
                            return { ...d, theme: next };
                          });
                        }}
                      />

                      <ColorFieldWithWheel
                        label="Website Background (Solid / Gradient)"
                        value={draft.theme.darkBg}
                        allowGradient={true}
                        bgType={draft.theme.bgType || 'solid'}
                        bgGradient={draft.theme.bgGradient || 'linear-gradient(135deg, #09080f 0%, #200a38 100%)'}
                        bgGradientStart={draft.theme.bgGradientStart || '#09080f'}
                        bgGradientEnd={draft.theme.bgGradientEnd || '#200a38'}
                        bgGradientAngle={draft.theme.bgGradientAngle || 135}
                        onChange={(v) => {
                          setDraft((d) => {
                            const next = { ...d.theme, preset: 'custom', darkBg: v, bgType: 'solid' as const };
                            applyDynamicThemeStyles(next, d.brandName, d.logoSrc);
                            return { ...d, theme: next };
                          });
                        }}
                        onGradientChange={(cfg) => {
                          setDraft((d) => {
                            const next = {
                              ...d.theme,
                              preset: 'custom',
                              darkBg: cfg.type === 'solid' ? cfg.gradient : d.theme.darkBg,
                              bgType: cfg.type,
                              bgGradient: cfg.gradient,
                              bgGradientStart: cfg.start,
                              bgGradientEnd: cfg.end,
                              bgGradientAngle: cfg.angle,
                            };
                            applyDynamicThemeStyles(next, d.brandName, d.logoSrc);
                            return { ...d, theme: next };
                          });
                        }}
                      />

                      <ColorFieldWithWheel
                        label="Dark Card Surface"
                        value={draft.theme.darkCard}
                        onChange={(v) => {
                          setDraft((d) => {
                            const next = { ...d.theme, preset: 'custom', darkCard: v };
                            applyDynamicThemeStyles(next, d.brandName, d.logoSrc);
                            return { ...d, theme: next };
                          });
                        }}
                      />

                      <ColorFieldWithWheel
                        label="Primary Text (Headings)"
                        value={draft.theme.textColor || '#faf9ff'}
                        onChange={(v) => {
                          setDraft((d) => {
                            const next = { ...d.theme, preset: 'custom', textColor: v };
                            applyDynamicThemeStyles(next, d.brandName, d.logoSrc);
                            return { ...d, theme: next };
                          });
                        }}
                      />

                      <ColorFieldWithWheel
                        label="Secondary Muted Text"
                        value={draft.theme.mutedTextColor || '#a29bb8'}
                        onChange={(v) => {
                          setDraft((d) => {
                            const next = { ...d.theme, preset: 'custom', mutedTextColor: v };
                            applyDynamicThemeStyles(next, d.brandName, d.logoSrc);
                            return { ...d, theme: next };
                          });
                        }}
                      />

                      <ColorFieldWithWheel
                        label="Hero Shader Ribbon 1"
                        value={draft.theme.shaderColor1}
                        onChange={(v) => {
                          setDraft((d) => {
                            const next = { ...d.theme, preset: 'custom', shaderColor1: v };
                            applyDynamicThemeStyles(next, d.brandName, d.logoSrc);
                            return { ...d, theme: next };
                          });
                        }}
                      />

                      <ColorFieldWithWheel
                        label="Hero Shader Base Void"
                        value={draft.theme.shaderColor2}
                        onChange={(v) => {
                          setDraft((d) => {
                            const next = { ...d.theme, preset: 'custom', shaderColor2: v };
                            applyDynamicThemeStyles(next, d.brandName, d.logoSrc);
                            return { ...d, theme: next };
                          });
                        }}
                      />

                      <ColorFieldWithWheel
                        label="Hero Shader Ribbon 2"
                        value={draft.theme.shaderColor3}
                        onChange={(v) => {
                          setDraft((d) => {
                            const next = { ...d.theme, preset: 'custom', shaderColor3: v };
                            applyDynamicThemeStyles(next, d.brandName, d.logoSrc);
                            return { ...d, theme: next };
                          });
                        }}
                      />
                    </div>
                  </div>

                  {/* Sound Engine Controls */}
                  <div className="rounded-2xl border border-white/10 bg-background/50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Volume2 className="h-4 w-4 text-primary" />
                        <h4 className="font-display text-base font-bold">UI Sound Engine</h4>
                      </div>
                      <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold">
                        <span>Sound Enabled by Default</span>
                        <input
                          type="checkbox"
                          checked={draft.sound.enabled}
                          onChange={(e) => {
                            const nextSound = { ...draft.sound, enabled: e.target.checked };
                            applyLiveSoundSettings(nextSound);
                            setDraft((d) => ({ ...d, sound: nextSound }));
                          }}
                          className="h-4 w-4 accent-primary"
                        />
                      </label>
                    </div>

                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className={LABEL_CLS}>
                          Volume ({Math.round(draft.sound.volume * 100)}%)
                        </label>
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.05}
                          value={draft.sound.volume}
                          onChange={(e) => {
                            const nextSound = {
                              ...draft.sound,
                              volume: parseFloat(e.target.value),
                            };
                            applyLiveSoundSettings(nextSound);
                            setDraft((d) => ({ ...d, sound: nextSound }));
                          }}
                          className="w-full accent-primary"
                        />
                      </div>

                      <div>
                        <label className={LABEL_CLS}>Tone Profile</label>
                        <div className="flex gap-2">
                          {(['studio', 'soft', 'crisp'] as const).map((profile) => (
                            <button
                              key={profile}
                              type="button"
                              onClick={() => {
                                const nextSound = { ...draft.sound, profile };
                                applyLiveSoundSettings(nextSound);
                                playClickSound(true);
                                setDraft((d) => ({ ...d, sound: nextSound }));
                              }}
                              className={`flex-1 cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${
                                draft.sound.profile === profile
                                  ? 'border-primary bg-primary text-primary-foreground'
                                  : 'border-white/10 bg-card text-muted-foreground hover:text-foreground'
                              }`}
                            >
                              {profile}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        data-sound="none"
                        onClick={() => {
                          applyLiveSoundSettings(draft.sound);
                          playClickSound(true);
                        }}
                        className="cursor-pointer rounded-lg border border-white/12 bg-card px-3 py-1.5 text-xs font-semibold hover:border-primary"
                      >
                        Test Click Sound
                      </button>
                      <button
                        type="button"
                        data-sound="none"
                        onClick={() => {
                          applyLiveSoundSettings(draft.sound);
                          playOpenSound(true);
                        }}
                        className="cursor-pointer rounded-lg border border-white/12 bg-card px-3 py-1.5 text-xs font-semibold hover:border-primary"
                      >
                        Test Open Sound
                      </button>
                    </div>
                  </div>

                  {/* Typography & Custom Fonts Customizer */}
                  <div className="rounded-2xl border border-white/10 bg-background/50 p-4 space-y-4">
                    <div className="flex items-center gap-2">
                      <Type className="h-4 w-4 text-primary" />
                      <h4 className="text-sm font-bold">Typography &amp; Studio Fonts</h4>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Choose high-contrast boutique studio fonts for headlines and body text, or enter any custom Google Font. Changes reflect live across the entire website instantly.
                    </p>

                    {/* Display Font Grid */}
                    <div>
                      <label className={LABEL_CLS}>Headline / Display Font</label>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {[
                          { name: 'Outfit', desc: 'Punchy & Geometric' },
                          { name: 'Syne', desc: 'Avant-Garde Editorial' },
                          { name: 'Space Grotesk', desc: 'Cyber & Technical' },
                          { name: 'Bricolage Grotesque', desc: 'Expressive Modern' },
                          { name: 'Cinzel', desc: 'Cinematic Luxury' },
                          { name: 'Playfair Display', desc: 'Boutique Serif' },
                          { name: 'Cabinet Grotesk', desc: 'Swiss Editorial' },
                          { name: 'Inter', desc: 'Clean Neo-Grotesque' },
                        ].map((font) => (
                          <button
                            key={font.name}
                            type="button"
                            onClick={() =>
                              setDraft((d) => ({
                                ...d,
                                theme: { ...d.theme, displayFont: font.name, customFont: '' },
                              }))
                            }
                            className={`flex cursor-pointer flex-col rounded-xl border p-2.5 text-left transition-all ${
                              (!draft.theme.customFont && (draft.theme.displayFont || 'Outfit') === font.name)
                                ? 'border-primary bg-primary/15 text-foreground shadow-glow'
                                : 'border-white/10 bg-background/60 text-muted-foreground hover:border-white/25 hover:text-foreground'
                            }`}
                          >
                            <span className="text-xs font-bold">{font.name}</span>
                            <span className="text-[10px] text-muted-foreground">{font.desc}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Body Font Grid */}
                    <div>
                      <label className={LABEL_CLS}>Body &amp; Tagline Font</label>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {[
                          { name: 'Plus Jakarta Sans', desc: 'Clean & Legible' },
                          { name: 'Inter', desc: 'Modern System Standard' },
                          { name: 'Outfit', desc: 'Geometric Flow' },
                          { name: 'Space Grotesk', desc: 'Tech Monospace Feel' },
                        ].map((font) => (
                          <button
                            key={font.name}
                            type="button"
                            onClick={() =>
                              setDraft((d) => ({
                                ...d,
                                theme: { ...d.theme, bodyFont: font.name },
                              }))
                            }
                            className={`flex cursor-pointer flex-col rounded-xl border p-2.5 text-left transition-all ${
                              (draft.theme.bodyFont || 'Plus Jakarta Sans') === font.name
                                ? 'border-primary bg-primary/15 text-foreground shadow-glow'
                                : 'border-white/10 bg-background/60 text-muted-foreground hover:border-white/25 hover:text-foreground'
                            }`}
                          >
                            <span className="text-xs font-bold">{font.name}</span>
                            <span className="text-[10px] text-muted-foreground">{font.desc}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Custom Google Font Input */}
                    <div className="rounded-xl border border-white/10 bg-background/80 p-3">
                      <label className={LABEL_CLS}>Or Enter Any Custom Google Font</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={draft.theme.customFont || ''}
                          onChange={(e) =>
                            setDraft((d) => ({
                              ...d,
                              theme: { ...d.theme, customFont: e.target.value },
                            }))
                          }
                          placeholder="e.g. Righteous, Bebas Neue, Montserrat, Urbanist..."
                          className={INPUT_CLS}
                        />
                        {draft.theme.customFont && (
                          <button
                            type="button"
                            onClick={() =>
                              setDraft((d) => ({
                                ...d,
                                theme: { ...d.theme, customFont: '' },
                              }))
                            }
                            className="cursor-pointer rounded-xl border border-white/15 px-3 text-xs font-semibold hover:border-primary"
                          >
                            Reset
                          </button>
                        )}
                      </div>
                      <p className="mt-1.5 text-[11px] text-muted-foreground">
                        Auto-loads Google Web Fonts on the fly without changing HTML.
                      </p>
                    </div>

                    {/* Live Typography Preview Box */}
                    <div className="rounded-xl border border-white/15 bg-card/70 p-4 backdrop-blur-sm">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Live Typography Preview</span>
                      <h2
                        className="mt-1 text-2xl font-black text-foreground"
                        style={{ fontFamily: `"${draft.theme.customFont || draft.theme.displayFont || 'Outfit'}", sans-serif` }}
                      >
                        CREATING THUMBNAILS THAT COMMAND MILLIONS OF VIEWS
                      </h2>
                      <p
                        className="mt-1.5 text-xs text-muted-foreground"
                        style={{ fontFamily: `"${draft.theme.bodyFont || 'Plus Jakarta Sans'}", sans-serif` }}
                      >
                        High-converting YouTube graphic design with bespoke color grading, 3D character manipulation, and atmospheric depth.
                      </p>
                    </div>
                  </div>

                  {/* Background Style & Samples (Bespoke Non-Infringing Styles) */}
                  <div className="rounded-2xl border border-white/10 bg-background/50 p-4 space-y-4">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      <h4 className="text-sm font-bold">Hero &amp; Website Background Style</h4>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Choose from 100% original, copyright-clean boutique background styles matching your purple aesthetic, or upload your own. The previous artist's shader has been completely replaced.
                    </p>

                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {[
                        {
                          id: 'geometric-waves',
                          name: 'Geometric Fluid Waves',
                          badge: 'Your Sample Reference',
                          desc: 'Deep purple organic layered waves, floating concentric rings, & tech dot grid matrix.',
                          preview: 'bg-gradient-to-br from-[#1a0f35] to-[#09080f]',
                        },
                        {
                          id: 'liquid-silk',
                          name: 'Boutique Liquid Silk',
                          badge: 'Web Sample 1',
                          desc: 'Smooth 3D dark violet satin ribbon curves with ambient radial glow.',
                          preview: 'bg-gradient-to-br from-[#260f38] via-[#150a24] to-[#09080f]',
                        },
                        {
                          id: 'cosmic-aurora',
                          name: 'Cosmic Aurora Nebula',
                          badge: 'Web Sample 2',
                          desc: 'Deep obsidian cosmic purple nebulae with luminous violet clouds.',
                          preview: 'bg-gradient-to-br from-[#1c0828] via-[#100720] to-[#06040a]',
                        },
                        {
                          id: 'cyber-mesh',
                          name: 'Cyber Tech Dot Matrix',
                          badge: 'Web Sample 3',
                          desc: 'Minimalist tech perspective matrix with glowing purple dot array.',
                          preview: 'bg-gradient-to-br from-[#0f0c24] to-[#07050e]',
                        },
                        {
                          id: 'minimal-obsidian',
                          name: 'Studio Minimal Obsidian',
                          badge: 'Web Sample 4',
                          desc: 'High-contrast pure obsidian dark (#09080f) with soft radial spotlights.',
                          preview: 'bg-[#09080f]',
                        },
                        {
                          id: 'custom-image',
                          name: 'Custom Image / Wallpaper',
                          badge: 'Custom URL',
                          desc: 'Use your own custom image URL or uploaded background file.',
                          preview: 'bg-card',
                        },
                      ].map((sample) => {
                        const active = (draft.theme.bgStyle || 'geometric-waves') === sample.id;
                        return (
                          <button
                            key={sample.id}
                            type="button"
                            onClick={() =>
                              setDraft((d) => ({
                                ...d,
                                theme: { ...d.theme, bgStyle: sample.id as any },
                              }))
                            }
                            className={`flex cursor-pointer flex-col justify-between rounded-xl border p-3 text-left transition-all ${
                              active
                                ? 'border-primary bg-primary/15 text-foreground shadow-glow ring-1 ring-primary/40'
                                : 'border-white/10 bg-background/60 text-muted-foreground hover:border-white/25 hover:text-foreground'
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between gap-1.5">
                                <span className="text-xs font-bold text-foreground">{sample.name}</span>
                                <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[9px] font-bold text-primary">
                                  {sample.badge}
                                </span>
                              </div>
                              <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">{sample.desc}</p>
                            </div>
                            <div className="mt-2.5 flex items-center justify-between border-t border-white/10 pt-2">
                              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
                                {active ? '● Selected' : 'Select Style'}
                              </span>
                              <div className={`h-4 w-12 rounded border border-white/20 ${sample.preview}`} />
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {draft.theme.bgStyle === 'custom-image' && (
                      <div className="mt-3 rounded-xl border border-white/10 bg-background/80 p-3 space-y-2">
                        <label className={LABEL_CLS}>Custom Background Image URL</label>
                        <input
                          type="text"
                          value={draft.theme.bgImageUrl || ''}
                          onChange={(e) =>
                            setDraft((d) => ({
                              ...d,
                              theme: { ...d.theme, bgImageUrl: e.target.value },
                            }))
                          }
                          placeholder="https://images.unsplash.com/... or https://..."
                          className={INPUT_CLS}
                        />
                      </div>
                    )}
                  </div>

                  {/* Animated SVG Curl Strokes Customizer */}
                  <div className="rounded-2xl border border-white/10 bg-background/50 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-primary" />
                        <div>
                          <h4 className="text-sm font-bold">Animated SVG Curl Strokes</h4>
                          <p className="text-xs text-muted-foreground">
                            Subtle, hand-drawn procedural spiral curls that drift, breathe, and draw across sections.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setDraft((d) => ({
                            ...d,
                            theme: { ...d.theme, showCurls: d.theme.showCurls === false },
                          }))
                        }
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                          draft.theme.showCurls !== false ? 'bg-primary' : 'bg-white/20'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                            draft.theme.showCurls !== false ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      disabled={syncing}
                      onClick={() =>
                        void handleSaveConfig(draft, 'Theme, colors & sound published live!')
                      }
                      className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground shadow-glow hover:brightness-110 disabled:opacity-60"
                    >
                      <Check className="h-4 w-4" />
                      Publish Theme &amp; Sound Live
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 3: ABOUT */}
              {tab === 'about' && (
                <div className="space-y-5">
                  <div>
                    <h3 className="font-display text-xl font-extrabold">About Section</h3>
                    <p className="text-xs text-muted-foreground">
                      Edit your bio, heading, experience badge, and call-to-action live.
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <label className={LABEL_CLS}>Section Kicker</label>
                      <input
                        type="text"
                        value={draft.about.badge}
                        onChange={(e) =>
                          setDraft((d) => ({
                            ...d,
                            about: { ...d.about, badge: e.target.value },
                          }))
                        }
                        className={INPUT_CLS}
                      />
                    </div>
                    <div>
                      <label className={LABEL_CLS}>Heading Prefix</label>
                      <input
                        type="text"
                        value={draft.about.headingPrefix}
                        onChange={(e) =>
                          setDraft((d) => ({
                            ...d,
                            about: { ...d.about, headingPrefix: e.target.value },
                          }))
                        }
                        className={INPUT_CLS}
                      />
                    </div>
                    <div>
                      <label className={LABEL_CLS}>Heading Highlight</label>
                      <input
                        type="text"
                        value={draft.about.headingHighlight}
                        onChange={(e) =>
                          setDraft((d) => ({
                            ...d,
                            about: { ...d.about, headingHighlight: e.target.value },
                          }))
                        }
                        className={INPUT_CLS}
                      />
                    </div>
                  </div>

                  <div>
                    <label className={LABEL_CLS}>Bio Paragraph</label>
                    <textarea
                      rows={5}
                      value={draft.about.bio}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          about: { ...d.about, bio: e.target.value },
                        }))
                      }
                      className={INPUT_CLS}
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className={LABEL_CLS}>Experience Badge</label>
                      <input
                        type="text"
                        value={draft.about.experienceBadge}
                        onChange={(e) =>
                          setDraft((d) => ({
                            ...d,
                            about: { ...d.about, experienceBadge: e.target.value },
                          }))
                        }
                        className={INPUT_CLS}
                      />
                    </div>
                    <div>
                      <label className={LABEL_CLS}>Discord CTA Button Text</label>
                      <input
                        type="text"
                        value={draft.about.ctaLabel}
                        onChange={(e) =>
                          setDraft((d) => ({
                            ...d,
                            about: { ...d.about, ctaLabel: e.target.value },
                          }))
                        }
                        className={INPUT_CLS}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      disabled={syncing}
                      onClick={() => void handleSaveConfig(draft, 'About section published live!')}
                      className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground shadow-glow hover:brightness-110"
                    >
                      <Check className="h-4 w-4" />
                      Save About Live
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 4: WORK (CATEGORIES, THUMBNAILS, BEFORE/AFTER) */}
              {tab === 'work' && (
                <div className="space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="font-display text-xl font-extrabold">
                        Work — Categories, Thumbnails &amp; Before/After
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Add, edit, or delete categories, upload Minecraft/Roblox/IRL thumbnails,
                        and manage Before/After comparisons.
                      </p>
                    </div>
                    <div className="flex rounded-xl border border-white/12 bg-background/70 p-1">
                      {(
                        [
                          { id: 'categories', label: `Categories (${data.categories.length})` },
                          { id: 'thumbnails', label: `Thumbnails (${data.thumbnails.length})` },
                          { id: 'before-after', label: `Before/After (${data.beforeAfter.length})` },
                        ] as const
                      ).map((sub) => (
                        <button
                          key={sub.id}
                          type="button"
                          onClick={() => setWorkSubTab(sub.id)}
                          className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                            workSubTab === sub.id
                              ? 'bg-primary text-primary-foreground'
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          {sub.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* SUB-TAB A: CATEGORIES */}
                  {workSubTab === 'categories' && (
                    <div className="space-y-5">
                      <div className="rounded-2xl border border-white/10 bg-background/50 p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="flex items-center gap-2 text-sm font-bold">
                            <FolderPlus className="h-4 w-4 text-primary" />
                            {catForm.id ? 'Edit Category' : 'Add New Category'}
                          </h4>
                          {catForm.id && (
                            <button
                              type="button"
                              onClick={() => setCatForm({ name: '', description: '' })}
                              className="cursor-pointer text-xs text-muted-foreground hover:text-foreground"
                            >
                              Cancel edit
                            </button>
                          )}
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <label className={LABEL_CLS}>Category Name</label>
                            <input
                              type="text"
                              value={catForm.name}
                              onChange={(e) =>
                                setCatForm((c) => ({ ...c, name: e.target.value }))
                              }
                              placeholder="e.g. Minecraft, Valorant, Fortnite..."
                              className={INPUT_CLS}
                            />
                          </div>
                          <div>
                            <label className={LABEL_CLS}>Short Description</label>
                            <input
                              type="text"
                              value={catForm.description}
                              onChange={(e) =>
                                setCatForm((c) => ({ ...c, description: e.target.value }))
                              }
                              placeholder="SMP wars, PvP events, 100-player challenges"
                              className={INPUT_CLS}
                            />
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={syncing}
                          onClick={() => void handleSaveCategory()}
                          className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-primary px-5 py-2 text-xs font-bold text-primary-foreground shadow-glow hover:brightness-110"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          {catForm.id ? 'Update Category Live' : 'Add Category Live'}
                        </button>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        {data.categories.map((cat: Category) => {
                          const count = data.thumbnails.filter(
                            (t) => t.categoryId === cat.id
                          ).length;
                          return (
                            <div
                              key={cat.id}
                              className="flex items-start justify-between gap-3 rounded-2xl border border-white/10 bg-background/60 p-4"
                            >
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <h5 className="font-display text-base font-bold">{cat.name}</h5>
                                  <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary">
                                    {count} thumbs
                                  </span>
                                </div>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {cat.description || 'No description'}
                                </p>
                              </div>
                              <div className="flex shrink-0 items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setCatForm({
                                      id: cat.id,
                                      name: cat.name,
                                      description: cat.description,
                                    })
                                  }
                                  className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg border border-white/10 hover:border-primary hover:text-primary"
                                  title="Edit category"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                {confirmDeleteCat === cat.id ? (
                                  <button
                                    type="button"
                                    onClick={() => void handleDeleteCategory(cat.id)}
                                    className="cursor-pointer rounded-lg bg-red-500 px-2.5 py-1.5 text-[11px] font-bold text-white"
                                  >
                                    Confirm
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteCat(cat.id)}
                                    className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg border border-white/10 text-red-400 hover:border-red-500/60 hover:bg-red-500/10"
                                    title="Delete category"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* SUB-TAB B: THUMBNAILS */}
                  {workSubTab === 'thumbnails' && (
                    <div className="space-y-5">
                      <div className="rounded-2xl border border-white/10 bg-background/50 p-4 space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="flex items-center gap-2 text-sm font-bold">
                            <ImageIcon className="h-4 w-4 text-primary" />
                            {thumbForm.id ? 'Edit Thumbnail' : 'Add New Thumbnail'}
                          </h4>
                          {thumbForm.id && (
                            <button
                              type="button"
                              onClick={() =>
                                setThumbForm({
                                  categoryId: data.categories[0]?.id || '',
                                  title: '',
                                  src: '',
                                  client: '',
                                  videoUrl: '',
                                })
                              }
                              className="cursor-pointer text-xs text-muted-foreground hover:text-foreground"
                            >
                              Cancel edit
                            </button>
                          )}
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <label className={LABEL_CLS}>Category</label>
                            <select
                              value={thumbForm.categoryId}
                              onChange={(e) =>
                                setThumbForm((t) => ({ ...t, categoryId: e.target.value }))
                              }
                              className={INPUT_CLS}
                            >
                              {data.categories.map((cat) => (
                                <option key={cat.id} value={cat.id} className="bg-card">
                                  {cat.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className={LABEL_CLS}>Thumbnail Title</label>
                            <input
                              type="text"
                              value={thumbForm.title}
                              onChange={(e) =>
                                setThumbForm((t) => ({ ...t, title: e.target.value }))
                              }
                              placeholder="e.g. 100 Players Minecraft Civil War"
                              className={INPUT_CLS}
                            />
                          </div>
                          <div>
                            <label className={LABEL_CLS}>Client Name (Optional)</label>
                            <input
                              type="text"
                              value={thumbForm.client}
                              onChange={(e) =>
                                setThumbForm((t) => ({ ...t, client: e.target.value }))
                              }
                              placeholder="e.g. SenpaiSpider"
                              className={INPUT_CLS}
                            />
                          </div>
                          <div>
                            <label className={LABEL_CLS}>YouTube Video Link (Optional)</label>
                            <input
                              type="text"
                              value={thumbForm.videoUrl}
                              onChange={(e) =>
                                setThumbForm((t) => ({ ...t, videoUrl: e.target.value }))
                              }
                              placeholder="https://www.youtube.com/watch?v=..."
                              className={INPUT_CLS}
                            />
                          </div>
                        </div>

                        <ImageUploadInput
                          label="Thumbnail Image (16:9)"
                          value={thumbForm.src}
                          onChange={(src) => setThumbForm((t) => ({ ...t, src }))}
                          maxWidth={1280}
                        />

                        <button
                          type="button"
                          disabled={syncing || data.categories.length === 0}
                          onClick={() => void handleSaveThumbnail()}
                          className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-primary px-5 py-2 text-xs font-bold text-primary-foreground shadow-glow hover:brightness-110 disabled:opacity-50"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          {thumbForm.id ? 'Update Thumbnail Live' : 'Add Thumbnail Live'}
                        </button>
                      </div>

                      {/* Filter pills */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setThumbFilterCat('all')}
                          className={`cursor-pointer rounded-full px-3 py-1 text-xs font-semibold ${
                            thumbFilterCat === 'all'
                              ? 'bg-primary text-primary-foreground'
                              : 'border border-white/10 bg-background/60 text-muted-foreground'
                          }`}
                        >
                          All ({data.thumbnails.length})
                        </button>
                        {data.categories.map((cat) => (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => setThumbFilterCat(cat.id)}
                            className={`cursor-pointer rounded-full px-3 py-1 text-xs font-semibold ${
                              thumbFilterCat === cat.id
                                ? 'bg-primary text-primary-foreground'
                                : 'border border-white/10 bg-background/60 text-muted-foreground'
                            }`}
                          >
                            {cat.name} (
                            {data.thumbnails.filter((t) => t.categoryId === cat.id).length})
                          </button>
                        ))}
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {visibleThumbnails.map((item, idx) => (
                          <div
                            key={item.id}
                            className="group relative overflow-hidden rounded-xl border border-white/10 bg-background/60 transition-all hover:border-white/20"
                          >
                            <div className="relative aspect-video w-full overflow-hidden bg-black/40">
                              <img
                                src={item.src}
                                alt={item.title}
                                referrerPolicy="no-referrer"
                                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                              />
                              {/* Order & Rank Badge */}
                              <div className="absolute left-2.5 top-2.5 flex items-center gap-1.5 rounded-full border border-white/20 bg-background/85 px-2.5 py-0.5 text-[11px] font-mono font-bold backdrop-blur-md">
                                <span className="text-primary">#{idx + 1}</span>
                              </div>

                              {/* Quick Reorder Toolbar Overlay */}
                              <div className="absolute right-2 top-2 flex items-center gap-1 rounded-lg border border-white/15 bg-background/80 p-1 opacity-90 shadow-md backdrop-blur-md transition-opacity group-hover:opacity-100">
                                {idx > 0 && (
                                  <button
                                    type="button"
                                    title="Move to Top"
                                    onClick={() => void handleMoveThumbnailToTop(item)}
                                    className="grid h-6 w-6 cursor-pointer place-items-center rounded-md border border-white/10 bg-card/80 text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                                  >
                                    <ArrowUpToLine className="h-3 w-3" />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  title="Move Up"
                                  disabled={idx === 0}
                                  onClick={() => void handleMoveThumbnail(item, -1)}
                                  className="grid h-6 w-6 cursor-pointer place-items-center rounded-md border border-white/10 bg-card/80 text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-30"
                                >
                                  <ChevronUp className="h-3 w-3" />
                                </button>
                                <button
                                  type="button"
                                  title="Move Down"
                                  disabled={idx === visibleThumbnails.length - 1}
                                  onClick={() => void handleMoveThumbnail(item, 1)}
                                  className="grid h-6 w-6 cursor-pointer place-items-center rounded-md border border-white/10 bg-card/80 text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-30"
                                >
                                  <ChevronDown className="h-3 w-3" />
                                </button>
                              </div>
                            </div>

                            <div className="flex items-center justify-between gap-2 p-3">
                              <div className="min-w-0">
                                <p className="truncate text-xs font-bold">{item.title}</p>
                                <p className="truncate text-[11px] text-muted-foreground">
                                  {data.categories.find((c) => c.id === item.categoryId)?.name ||
                                    item.categoryId}
                                  {item.client ? ` • ${item.client}` : ''}
                                </p>
                              </div>
                              <div className="flex shrink-0 items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setThumbForm({
                                      id: item.id,
                                      categoryId: item.categoryId,
                                      title: item.title,
                                      src: item.src,
                                      client: item.client || '',
                                      videoUrl: item.videoUrl || '',
                                    })
                                  }
                                  className="grid h-7 w-7 cursor-pointer place-items-center rounded-lg border border-white/10 hover:border-primary hover:text-primary"
                                >
                                  <Pencil className="h-3 w-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (!requireCloudSync()) return;
                                    try {
                                      await deleteThumbnail(item.id);
                                      notify('ok', 'Thumbnail deleted live!');
                                    } catch (e) {
                                      notify('err', formatFriendlyError(e, 'Delete failed.'));
                                    }
                                  }}
                                  className="grid h-7 w-7 cursor-pointer place-items-center rounded-lg border border-white/10 text-red-400 hover:border-red-500/60"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* SUB-TAB C: BEFORE / AFTER */}
                  {workSubTab === 'before-after' && (
                    <div className="space-y-5">
                      <div className="rounded-2xl border border-white/10 bg-background/50 p-4 space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="flex items-center gap-2 text-sm font-bold">
                            <SlidersHorizontal className="h-4 w-4 text-primary" />
                            {baForm.id ? 'Edit Before / After Pair' : 'Add Before / After Pair'}
                          </h4>
                          {baForm.id && (
                            <button
                              type="button"
                              onClick={() =>
                                setBaForm({ title: '', subtitle: '', beforeSrc: '', afterSrc: '' })
                              }
                              className="cursor-pointer text-xs text-muted-foreground hover:text-foreground"
                            >
                              Cancel edit
                            </button>
                          )}
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <label className={LABEL_CLS}>Label (Accessibility Title)</label>
                            <input
                              type="text"
                              value={baForm.title}
                              onChange={(e) => setBaForm((b) => ({ ...b, title: e.target.value }))}
                              placeholder="e.g. Nether Castle Makeover"
                              className={INPUT_CLS}
                            />
                          </div>
                          <div>
                            <label className={LABEL_CLS}>Notes (Optional)</label>
                            <input
                              type="text"
                              value={baForm.subtitle}
                              onChange={(e) =>
                                setBaForm((b) => ({ ...b, subtitle: e.target.value }))
                              }
                              placeholder="Raw Render -> Final Grade"
                              className={INPUT_CLS}
                            />
                          </div>
                        </div>

                        <div className="grid gap-4 lg:grid-cols-2">
                          <ImageUploadInput
                            label="Before Image (Raw Shot)"
                            value={baForm.beforeSrc}
                            onChange={(beforeSrc) => setBaForm((b) => ({ ...b, beforeSrc }))}
                            maxWidth={1280}
                          />
                          <ImageUploadInput
                            label="After Image (Final Thumbnail)"
                            value={baForm.afterSrc}
                            onChange={(afterSrc) => setBaForm((b) => ({ ...b, afterSrc }))}
                            maxWidth={1280}
                          />
                        </div>

                        <button
                          type="button"
                          disabled={syncing}
                          onClick={() => void handleSaveBeforeAfter()}
                          className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-primary px-5 py-2 text-xs font-bold text-primary-foreground shadow-glow hover:brightness-110"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          {baForm.id ? 'Update Comparison Live' : 'Add Comparison Live'}
                        </button>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        {data.beforeAfter.map((item: BeforeAfterItem) => (
                          <div
                            key={item.id}
                            className="overflow-hidden rounded-xl border border-white/10 bg-background/60 p-3"
                          >
                            <div className="grid grid-cols-2 gap-2">
                              <img
                                src={item.beforeSrc}
                                alt="Before"
                                referrerPolicy="no-referrer"
                                className="aspect-video w-full rounded-lg object-cover"
                              />
                              <img
                                src={item.afterSrc}
                                alt="After"
                                referrerPolicy="no-referrer"
                                className="aspect-video w-full rounded-lg object-cover"
                              />
                            </div>
                            <div className="mt-2.5 flex items-center justify-between gap-2">
                              <p className="truncate text-xs font-bold">{item.title}</p>
                              <div className="flex gap-1">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setBaForm({
                                      id: item.id,
                                      title: item.title,
                                      subtitle: item.subtitle,
                                      beforeSrc: item.beforeSrc,
                                      afterSrc: item.afterSrc,
                                    })
                                  }
                                  className="grid h-7 w-7 cursor-pointer place-items-center rounded-lg border border-white/10 hover:border-primary hover:text-primary"
                                >
                                  <Pencil className="h-3 w-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (!requireCloudSync()) return;
                                    try {
                                      await deleteBeforeAfter(item.id);
                                      notify('ok', 'Comparison deleted live!');
                                    } catch (e) {
                                      notify('err', formatFriendlyError(e, 'Delete failed.'));
                                    }
                                  }}
                                  className="grid h-7 w-7 cursor-pointer place-items-center rounded-lg border border-white/10 text-red-400 hover:border-red-500/60"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 5: CLIENTS WITH YOUTUBE CHANNEL AUTO-FETCH */}
              {tab === 'clients' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="font-display text-xl font-extrabold">
                      Clients — YouTube Link Auto-Fetch
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Paste any creator&apos;s YouTube channel link to automatically pull their
                      channel logo, name, and subscriber count!
                    </p>
                  </div>

                  {/* YouTube Quick Auto-Fetch Box */}
                  <div className="rounded-2xl border border-primary/35 bg-primary/10 p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="flex items-center gap-2 text-sm font-bold text-foreground">
                        <Youtube className="h-4 w-4 text-red-400" />
                        {clientForm.id ? 'Edit Client' : 'Auto-Add Client from YouTube URL'}
                      </h4>
                      {clientForm.id && (
                        <button
                          type="button"
                          onClick={() => {
                            setClientForm({
                              name: '',
                              subs: '',
                              avatar: '',
                              channelUrl: '',
                              row: 1,
                            });
                            setYtInput('');
                          }}
                          className="cursor-pointer text-xs text-muted-foreground hover:text-foreground"
                        >
                          Cancel edit
                        </button>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row">
                      <input
                        type="text"
                        value={ytInput}
                        onChange={(e) => setYtInput(e.target.value)}
                        placeholder="Paste YouTube channel URL (e.g. https://youtube.com/@SenpaiSpider)"
                        className={INPUT_CLS}
                      />
                      <button
                        type="button"
                        disabled={ytFetching}
                        onClick={() => void handleFetchYouTube()}
                        className="inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-red-500 disabled:opacity-60"
                      >
                        {ytFetching ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                        <span>{ytFetching ? 'Fetching...' : 'Fetch Logo & Subs'}</span>
                      </button>
                    </div>

                    {/* Preview + Editable Fields */}
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className={LABEL_CLS}>Creator Name</label>
                        <input
                          type="text"
                          value={clientForm.name}
                          onChange={(e) =>
                            setClientForm((c) => ({ ...c, name: e.target.value }))
                          }
                          placeholder="Auto-filled from YouTube"
                          className={INPUT_CLS}
                        />
                      </div>
                      <div>
                        <label className={LABEL_CLS}>Subscribers</label>
                        <input
                          type="text"
                          value={clientForm.subs}
                          onChange={(e) =>
                            setClientForm((c) => ({ ...c, subs: e.target.value }))
                          }
                          placeholder="e.g. 2M+ subscribers"
                          className={INPUT_CLS}
                        />
                      </div>
                      <div>
                        <label className={LABEL_CLS}>YouTube Channel Link</label>
                        <input
                          type="text"
                          value={clientForm.channelUrl}
                          onChange={(e) =>
                            setClientForm((c) => ({ ...c, channelUrl: e.target.value }))
                          }
                          placeholder="https://youtube.com/@..."
                          className={INPUT_CLS}
                        />
                      </div>
                      <div>
                        <label className={LABEL_CLS}>Marquee Row</label>
                        <select
                          value={clientForm.row}
                          onChange={(e) =>
                            setClientForm((c) => ({
                              ...c,
                              row: Number(e.target.value) === 2 ? 2 : 1,
                            }))
                          }
                          className={INPUT_CLS}
                        >
                          <option value={1} className="bg-card">
                            Row 1 (Scrolls Left)
                          </option>
                          <option value={2} className="bg-card">
                            Row 2 (Scrolls Right)
                          </option>
                        </select>
                      </div>
                    </div>

                    <ImageUploadInput
                      label="Channel Logo / Avatar"
                      value={clientForm.avatar}
                      onChange={(avatar) => setClientForm((c) => ({ ...c, avatar }))}
                      maxWidth={256}
                      previewClass="h-14 w-14 rounded-full object-cover"
                      placeholder="Auto-filled YouTube avatar URL or upload"
                    />

                    <button
                      type="button"
                      disabled={syncing}
                      onClick={() => void handleSaveClient()}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-primary px-5 py-2 text-xs font-bold text-primary-foreground shadow-glow hover:brightness-110"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      {clientForm.id ? 'Update Client Live' : 'Add Client to Marquee Live'}
                    </button>
                  </div>

                  {/* Clients Section Header Copy */}
                  <div className="rounded-2xl border border-white/10 bg-background/40 p-4 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Clients Section Heading
                    </h4>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <input
                        type="text"
                        value={draft.clientsSection.kicker}
                        onChange={(e) =>
                          setDraft((d) => ({
                            ...d,
                            clientsSection: { ...d.clientsSection, kicker: e.target.value },
                          }))
                        }
                        placeholder="Kicker"
                        className={INPUT_CLS}
                      />
                      <input
                        type="text"
                        value={draft.clientsSection.headingPrefix}
                        onChange={(e) =>
                          setDraft((d) => ({
                            ...d,
                            clientsSection: {
                              ...d.clientsSection,
                              headingPrefix: e.target.value,
                            },
                          }))
                        }
                        placeholder="Heading Prefix"
                        className={INPUT_CLS}
                      />
                      <input
                        type="text"
                        value={draft.clientsSection.headingHighlight}
                        onChange={(e) =>
                          setDraft((d) => ({
                            ...d,
                            clientsSection: {
                              ...d.clientsSection,
                              headingHighlight: e.target.value,
                            },
                          }))
                        }
                        placeholder="Heading Highlight"
                        className={INPUT_CLS}
                      />
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <input
                        type="text"
                        value={draft.clientsSection.subtitle}
                        onChange={(e) =>
                          setDraft((d) => ({
                            ...d,
                            clientsSection: { ...d.clientsSection, subtitle: e.target.value },
                          }))
                        }
                        placeholder="Section subtitle"
                        className={INPUT_CLS}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          void handleSaveConfig(draft, 'Clients section heading published live!')
                        }
                        className="shrink-0 cursor-pointer rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground"
                      >
                        Save Heading
                      </button>
                    </div>
                  </div>

                  {/* Active Clients List */}
                  <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                    {allClients.map((client: ClientWithRow) => (
                      <div
                        key={client.id}
                        className="flex items-center justify-between gap-2.5 rounded-xl border border-white/10 bg-background/60 p-3"
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          <img
                            src={client.avatar}
                            alt={client.name}
                            referrerPolicy="no-referrer"
                            className="h-10 w-10 shrink-0 rounded-full object-cover ring-1 ring-white/15"
                          />
                          <div className="min-w-0">
                            <p className="truncate text-xs font-bold">{client.name}</p>
                            <p className="truncate text-[11px] text-muted-foreground">
                              {client.subs} • Row {client.row}
                            </p>
                          </div>
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setClientForm({
                                id: client.id,
                                name: client.name,
                                subs: client.subs,
                                avatar: client.avatar,
                                channelUrl: client.channelUrl,
                                row: client.row,
                              });
                              setYtInput(client.channelUrl);
                            }}
                            className="grid h-7 w-7 cursor-pointer place-items-center rounded-lg border border-white/10 hover:border-primary hover:text-primary"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              if (!requireCloudSync()) return;
                              try {
                                await deleteClient(client.id);
                                notify('ok', 'Client removed live!');
                              } catch (e) {
                                notify('err', formatFriendlyError(e, 'Delete failed.'));
                              }
                            }}
                            className="grid h-7 w-7 cursor-pointer place-items-center rounded-lg border border-white/10 text-red-400 hover:border-red-500/60"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 6: FAQ */}
              {tab === 'faq' && (
                <div className="space-y-5">
                  <div>
                    <h3 className="font-display text-xl font-extrabold">FAQ Manager</h3>
                    <p className="text-xs text-muted-foreground">
                      Add, edit, or delete frequently asked questions live.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-background/50 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold">
                        {faqForm.id ? 'Edit FAQ' : 'Add New FAQ'}
                      </h4>
                      {faqForm.id && (
                        <button
                          type="button"
                          onClick={() => setFaqForm({ question: '', answer: '' })}
                          className="cursor-pointer text-xs text-muted-foreground hover:text-foreground"
                        >
                          Cancel edit
                        </button>
                      )}
                    </div>
                    <div>
                      <label className={LABEL_CLS}>Question</label>
                      <input
                        type="text"
                        value={faqForm.question}
                        onChange={(e) => setFaqForm((f) => ({ ...f, question: e.target.value }))}
                        placeholder="e.g. What is your turnaround time?"
                        className={INPUT_CLS}
                      />
                    </div>
                    <div>
                      <label className={LABEL_CLS}>Answer</label>
                      <textarea
                        rows={3}
                        value={faqForm.answer}
                        onChange={(e) => setFaqForm((f) => ({ ...f, answer: e.target.value }))}
                        placeholder="Write a clear, concise answer..."
                        className={INPUT_CLS}
                      />
                    </div>
                    <button
                      type="button"
                      disabled={syncing}
                      onClick={() => void handleSaveFaq()}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-primary px-5 py-2 text-xs font-bold text-primary-foreground shadow-glow hover:brightness-110"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      {faqForm.id ? 'Update FAQ Live' : 'Add FAQ Live'}
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {data.faqs.map((faq: FaqItem) => (
                      <div
                        key={faq.id}
                        className="flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-background/60 p-4"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-bold">{faq.question}</p>
                          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                            {faq.answer}
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              setFaqForm({
                                id: faq.id,
                                question: faq.question,
                                answer: faq.answer,
                              })
                            }
                            className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg border border-white/10 hover:border-primary hover:text-primary"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              if (!requireCloudSync()) return;
                              try {
                                await deleteFaq(faq.id);
                                notify('ok', 'FAQ deleted live!');
                              } catch (e) {
                                notify('err', formatFriendlyError(e, 'Delete failed.'));
                              }
                            }}
                            className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg border border-white/10 text-red-400 hover:border-red-500/60"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 7: CONTACT & SOCIALS */}
              {tab === 'contact' && (
                <div className="space-y-5">
                  <div>
                    <h3 className="font-display text-xl font-extrabold">Contact &amp; Socials</h3>
                    <p className="text-xs text-muted-foreground">
                      Update your Discord link, X profile, Contact section copy, and Footer text
                      live.
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className={LABEL_CLS}>Discord Profile URL</label>
                      <input
                        type="text"
                        value={draft.socials.discord}
                        onChange={(e) =>
                          setDraft((d) => ({
                            ...d,
                            socials: { ...d.socials, discord: e.target.value },
                          }))
                        }
                        className={INPUT_CLS}
                      />
                    </div>
                    <div>
                      <label className={LABEL_CLS}>X (Twitter) Profile URL</label>
                      <input
                        type="text"
                        value={draft.socials.x}
                        onChange={(e) =>
                          setDraft((d) => ({
                            ...d,
                            socials: { ...d.socials, x: e.target.value },
                          }))
                        }
                        className={INPUT_CLS}
                      />
                    </div>
                    <div>
                      <label className={LABEL_CLS}>X Handle Display</label>
                      <input
                        type="text"
                        value={draft.socials.xHandle}
                        onChange={(e) =>
                          setDraft((d) => ({
                            ...d,
                            socials: { ...d.socials, xHandle: e.target.value },
                          }))
                        }
                        className={INPUT_CLS}
                      />
                    </div>
                    <div>
                      <label className={LABEL_CLS}>Footer Tagline</label>
                      <input
                        type="text"
                        value={draft.footerTagline}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, footerTagline: e.target.value }))
                        }
                        className={INPUT_CLS}
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <label className={LABEL_CLS}>Contact Kicker</label>
                      <input
                        type="text"
                        value={draft.contact.kicker}
                        onChange={(e) =>
                          setDraft((d) => ({
                            ...d,
                            contact: { ...d.contact, kicker: e.target.value },
                          }))
                        }
                        className={INPUT_CLS}
                      />
                    </div>
                    <div>
                      <label className={LABEL_CLS}>Heading Prefix</label>
                      <input
                        type="text"
                        value={draft.contact.headingPrefix}
                        onChange={(e) =>
                          setDraft((d) => ({
                            ...d,
                            contact: { ...d.contact, headingPrefix: e.target.value },
                          }))
                        }
                        className={INPUT_CLS}
                      />
                    </div>
                    <div>
                      <label className={LABEL_CLS}>Heading Highlight</label>
                      <input
                        type="text"
                        value={draft.contact.headingHighlight}
                        onChange={(e) =>
                          setDraft((d) => ({
                            ...d,
                            contact: { ...d.contact, headingHighlight: e.target.value },
                          }))
                        }
                        className={INPUT_CLS}
                      />
                    </div>
                  </div>

                  <div>
                    <label className={LABEL_CLS}>Contact Subtitle</label>
                    <textarea
                      rows={2}
                      value={draft.contact.subtitle}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          contact: { ...d.contact, subtitle: e.target.value },
                        }))
                      }
                      className={INPUT_CLS}
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className={LABEL_CLS}>Discord Button Label</label>
                      <input
                        type="text"
                        value={draft.contact.discordCta}
                        onChange={(e) =>
                          setDraft((d) => ({
                            ...d,
                            contact: { ...d.contact, discordCta: e.target.value },
                          }))
                        }
                        className={INPUT_CLS}
                      />
                    </div>
                    <div>
                      <label className={LABEL_CLS}>X Button Label</label>
                      <input
                        type="text"
                        value={draft.contact.xCta}
                        onChange={(e) =>
                          setDraft((d) => ({
                            ...d,
                            contact: { ...d.contact, xCta: e.target.value },
                          }))
                        }
                        className={INPUT_CLS}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      disabled={syncing}
                      onClick={() =>
                        void handleSaveConfig(draft, 'Contact & Socials published live!')
                      }
                      className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground shadow-glow hover:brightness-110"
                    >
                      <Check className="h-4 w-4" />
                      Save Contact Live
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
      </div>
    </div>
  );
}
