'use client';
// app/admin/page.tsx

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/authContext';
import {
  LayoutDashboard, Users, Store, Shield, Ban,
  CheckCircle, XCircle, Search, Trash2, Package,
  Clock, AlertTriangle, Crown, RefreshCw, LogOut,
  X, ChevronRight, CreditCard, Tag, ChevronDown,
  Flag, AlertOctagon, ShieldAlert, Eye, EyeOff,
  TrendingUp, Star, Lock, Send, MessageSquare,
  BadgeDollarSign, CalendarDays, Bell, ShieldCheck,
} from 'lucide-react';
import '../styles/admin.css';

const API = 'https://renderbackendconsocket.onrender.com/api';
function getToken() { return typeof window !== 'undefined' ? localStorage.getItem('marketplace_token') : null; }
function authH(): Record<string, string> {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}
async function apiFetch(path: string, opts: RequestInit = {}) {
  const res = await fetch(`${API}/admin${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...authH(), ...(opts.headers || {}) },
  });
  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('application/json')) throw new Error(`Error ${res.status}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || `Error ${res.status}`);
  return data;
}

async function apiDirectFetch(path: string, opts: RequestInit = {}) {
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...authH(), ...(opts.headers || {}) },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || `Error ${res.status}`);
  return data;
}

type Tab = 'dashboard' | 'users' | 'businesses' | 'featured-biz' | 'featured-products' | 'reports' | 'product-reviews' | 'subscribers' | 'announcements' | 'business-appeals';

interface Stats { totalUsers: number; totalBusinesses: number; totalProducts: number; activeFeaturedBiz: number; activeFeaturedProducts: number; blockedUsers: number; blockedBusinesses: number; recentUsers: any[]; }
interface UserRow { _id: string; name: string; email: string; role: string; blocked?: boolean; createdAt: string; }
interface BusinessRow { _id: string; name: string; city: string; logo?: string; verified: boolean; blocked: boolean; blockedReason?: string; owner: { name: string; email: string }; featuredInfo?: any; featuredProductsCount?: number; strikeCount?: number; suspended?: boolean; cuotaSuscriptor?: boolean; fechaPago?: string; fechaFinaliza?: string; }
interface FeaturedBizRow { _id: string; business: { _id: string; name: string; city: string; logo?: string; owner: { name: string } }; type: string; startDate: string; endDate: string; note?: string; addedBy?: { name: string }; paid: boolean; days: number; }
interface FeaturedProductRow { _id: string; name: string; price: number; image?: string; category?: string; featured: boolean; featuredPaid: boolean; featuredDays: number; featuredUntil?: string; businessId?: { _id: string; name: string; city: string; logo?: string; blocked?: boolean; }; }
interface BizProduct { _id: string; name: string; price: number; image?: string; category?: string; featured: boolean; featuredPaid: boolean; featuredDays: number; featuredUntil?: string; isActivelyFeatured?: boolean; }

interface ReviewProduct {
  _id: string; name: string; description?: string; price: number; image?: string; category?: string;
  blockedReason?: string; blockType?: 'temp' | 'permanent'; reviewNote?: string; updatedAt: string;
  businessId?: { _id: string; name: string; city: string; logo?: string; owner?: string };
  user?: { name: string; email: string };
}

interface ReportRow {
  _id: string; targetType: 'product' | 'business'; targetId: string; targetName: string;
  reportedBy: { _id: string; name: string; email: string; reporterReputation?: number };
  reporterName: string; businessId?: string; businessName?: string; reason: string;
  category: string; autoBlocked: boolean; detectedKeywords: string[];
  status: 'pending' | 'reviewed' | 'dismissed' | 'action_taken';
  adminNote?: string; adminAction: string; resolvedBy?: { name: string };
  resolvedAt?: string; createdAt: string;
}

// ── Announcement interface ───────────────────────────────────────────────────
interface Announcement {
  _id: string;
  title: string;
  message: string;
  audience: 'all' | 'seller' | 'buyer';
  durationHours: number;
  link?: string;
  createdAt: string;
  expiresAt: string;
  active: boolean;
}

// ── BusinessAppeal interface ─────────────────────────────────────────────────
interface BusinessAppeal {
  _id: string;
  name: string;
  city?: string;
  logo?: string;
  blocked: boolean;
  blockedReason?: string;
  appealStatus: 'pending' | 'reviewed' | 'rejected';
  appealNote?: string;
  appealAdminNote?: string;
  appealSubmittedAt?: string;
  owner: { _id: string; name: string; email: string };
}

const CATEGORY_LABELS: Record<string, string> = {
  fraud: 'Estafa/Fraude', adult: 'Adulto', drugs: 'Drogas',
  weapons: 'Armas', violence: 'Violencia', spam: 'Spam', other: 'Otro',
};

function DetailModal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="adm-modal-overlay" onClick={onClose}>
      <div className="adm-modal" onClick={e => e.stopPropagation()}>
        <div className="adm-modal-header"><h2 style={{ fontSize: '0.95rem' }}>{title}</h2><button onClick={onClose}><X size={17} /></button></div>
        <div className="adm-modal-body">{children}</div>
      </div>
    </div>
  );
}

// ── Helper: días restantes ───────────────────────────────────────────────────
function daysLeftFrom(dateStr?: string) {
  if (!dateStr) return null;
  const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
  return diff;
}

export default function AdminPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  const [tab, setTab]               = useState<Tab>('dashboard');
  const [stats, setStats]           = useState<Stats | null>(null);
  const [users, setUsers]           = useState<UserRow[]>([]);
  const [businesses, setBusinesses] = useState<BusinessRow[]>([]);
  const [featuredBiz, setFeaturedBiz]     = useState<FeaturedBizRow[]>([]);
  const [featuredProds, setFeaturedProds] = useState<FeaturedProductRow[]>([]);
  const [search, setSearch]   = useState('');
  const [fetching, setFetching] = useState(false);

  // Suscriptores
  const [subscribers, setSubscribers]           = useState<BusinessRow[]>([]);
  const [subSearch, setSubSearch]               = useState('');
  const [subModal, setSubModal]                 = useState(false);
  const [subBizId, setSubBizId]                 = useState('');
  const [subBizName, setSubBizName]             = useState('');
  const [subFechaPago, setSubFechaPago]         = useState('');
  const [subFechaFinaliza, setSubFechaFinaliza] = useState('');
  const [subSaving, setSubSaving]               = useState(false);

  // Anuncios
  const [announcements, setAnnouncements]     = useState<Announcement[]>([]);
  const [annTitle, setAnnTitle]               = useState('');
  const [annMessage, setAnnMessage]           = useState('');
  const [annAudience, setAnnAudience]         = useState<'all'|'seller'|'buyer'>('all');
  const [annDuration, setAnnDuration]         = useState('24');
  const [annLink, setAnnLink]                 = useState('');
  const [annSaving, setAnnSaving]             = useState(false);

  // Productos bajo revision
  const [reviewProds, setReviewProds] = useState<ReviewProduct[]>([]);
  const [moderateOpen, setModerateOpen] = useState<string | null>(null);
  const [moderateAction, setModerateAction] = useState<'unblock'|'keep_blocked'|'permanent_block'|''>('');
  const [moderateNote, setModerateNote] = useState('');
  const [moderateSaving, setModerateSaving] = useState(false);

  // Reportes
  const [reports, setReports]           = useState<ReportRow[]>([]);
  const [reportFilter, setReportFilter] = useState<'all'|'pending'|'action_taken'|'dismissed'>('pending');
  const [reportTypeFilter, setReportTypeFilter] = useState<'all'|'product'|'business'>('all');
  const [resolveOpen, setResolveOpen]   = useState<string | null>(null);
  const [resolveActions, setResolveActions] = useState<string[]>([]);
  const [resolveNote, setResolveNote]   = useState('');
  const [resolveSaving, setResolveSaving] = useState(false);

  // Apelaciones de negocios
  const [businessAppeals, setBusinessAppeals]         = useState<BusinessAppeal[]>([]);
  const [appealResolveOpen, setAppealResolveOpen]     = useState<string | null>(null);
  const [appealAction, setAppealAction]               = useState<'approve'|'reject'|''>('');
  const [appealAdminNote, setAppealAdminNote]         = useState('');
  const [appealResolveSaving, setAppealResolveSaving] = useState(false);

  // Modales varios
  const [featBizModal, setFeatBizModal] = useState(false);
  const [featBizId, setFeatBizId]     = useState('');
  const [featBizName, setFeatBizName] = useState('');
  const [featBizType, setFeatBizType] = useState<'daily'|'weekly'|'monthly'|'custom'>('weekly');
  const [featBizDays, setFeatBizDays] = useState('7');
  const [featBizNote, setFeatBizNote] = useState('');
  const [featBizPaid, setFeatBizPaid] = useState(false);
  const [featBizSaving, setFeatBizSaving] = useState(false);

  const [bizProdModal, setBizProdModal]     = useState(false);
  const [bizProdBizId, setBizProdBizId]     = useState('');
  const [bizProdBizName, setBizProdBizName] = useState('');
  const [bizProdItems, setBizProdItems]     = useState<BizProduct[]>([]);
  const [bizProdLoading, setBizProdLoading] = useState(false);
  const [bizProdFilter, setBizProdFilter]   = useState('');
  const [selectedProdIds, setSelectedProdIds] = useState<Set<string>>(new Set());
  const [bizProdDays, setBizProdDays] = useState('7');
  const [bizProdNote, setBizProdNote] = useState('');
  const [bizProdPaid, setBizProdPaid] = useState(false);
  const [bizProdSaving, setBizProdSaving] = useState(false);

  const [featProdModal, setFeatProdModal] = useState(false);
  const [prodSearch, setProdSearch]   = useState('');
  const [prodResults, setProdResults] = useState<any[]>([]);
  const [prodSearching, setProdSearching] = useState(false);
  const [selectedProd, setSelectedProd] = useState<any | null>(null);
  const [featProdDays, setFeatProdDays] = useState('7');
  const [featProdNote, setFeatProdNote] = useState('');
  const [featProdPaid, setFeatProdPaid] = useState(false);
  const [featProdSaving, setFeatProdSaving] = useState(false);
  const prodSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [blockModal, setBlockModal]   = useState(false);
  const [blockBizId, setBlockBizId]   = useState('');
  const [blockReason, setBlockReason] = useState('');

  const [userDetail, setUserDetail]     = useState<UserRow | null>(null);
  const [bizDetail, setBizDetail]       = useState<BusinessRow | null>(null);
  const [recentUserDetail, setRecentUserDetail] = useState<any | null>(null);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) router.push('/');
  }, [user, loading]);

  const toast = useCallback(async (icon: 'success'|'error'|'warning', title: string) => {
    const Swal = (await import('sweetalert2')).default;
    Swal.fire({ icon, title, timer: 2200, showConfirmButton: false, toast: true, position: 'top-end' });
  }, []);

  const loadStats       = useCallback(async () => { try { setStats(await apiFetch('/stats')); } catch (e: any) { toast('error', e.message); } }, []);
  const loadUsers       = useCallback(async () => { setFetching(true); try { const d = await apiFetch(`/users?search=${search}&limit=50`); setUsers(d.users); } catch (e: any) { toast('error', e.message); } finally { setFetching(false); } }, [search]);
  const loadBusinesses  = useCallback(async () => { setFetching(true); try { const d = await apiFetch(`/businesses?search=${search}&limit=50`); setBusinesses(d.businesses); } catch (e: any) { toast('error', e.message); } finally { setFetching(false); } }, [search]);
  const loadFeaturedBiz = useCallback(async () => { setFetching(true); try { setFeaturedBiz(await apiFetch('/featured-businesses')); } catch (e: any) { toast('error', e.message); } finally { setFetching(false); } }, []);
  const loadFeaturedProds = useCallback(async () => { setFetching(true); try { setFeaturedProds(await apiFetch('/featured-products')); } catch (e: any) { toast('error', e.message); } finally { setFetching(false); } }, []);

  const loadReports = useCallback(async () => {
    setFetching(true);
    try {
      const params = new URLSearchParams({ limit: '60' });
      if (reportFilter !== 'all') params.set('status', reportFilter);
      if (reportTypeFilter !== 'all') params.set('targetType', reportTypeFilter);
      const d = await apiFetch(`/reports?${params}`);
      setReports(d.reports || []);
    } catch (e: any) { toast('error', e.message); }
    finally { setFetching(false); }
  }, [reportFilter, reportTypeFilter]);

  const loadReviewProds = useCallback(async () => {
    setFetching(true);
    try {
      const d = await apiFetch('/products/under-review');
      setReviewProds(d.products || []);
    } catch (e: any) { toast('error', e.message); }
    finally { setFetching(false); }
  }, []);

  // ── Cargar suscriptores ──────────────────────────────────────────────────
  const loadSubscribers = useCallback(async () => {
    setFetching(true);
    try {
      const d = await apiFetch(`/subscribers?search=${subSearch}&limit=100`);
      setSubscribers(d.businesses || []);
    } catch (e: any) { toast('error', e.message); }
    finally { setFetching(false); }
  }, [subSearch]);

  // ── Cargar anuncios ──────────────────────────────────────────────────────
  const loadAnnouncements = useCallback(async () => {
    setFetching(true);
    try {
      const d = await apiFetch('/announcements');
      setAnnouncements(d.announcements || []);
    } catch (e: any) { toast('error', e.message); }
    finally { setFetching(false); }
  }, []);

  // ── Cargar apelaciones de negocios ───────────────────────────────────────
  const loadBusinessAppeals = useCallback(async () => {
    setFetching(true);
    try {
      const d = await apiFetch('/business-appeals');
      setBusinessAppeals(d.businesses || []);
    } catch (e: any) { toast('error', e.message); }
    finally { setFetching(false); }
  }, []);

  useEffect(() => {
    if (!user || user.role !== 'admin') return;
    if (tab === 'dashboard')              loadStats();
    else if (tab === 'users')             loadUsers();
    else if (tab === 'businesses')        loadBusinesses();
    else if (tab === 'featured-biz')      loadFeaturedBiz();
    else if (tab === 'featured-products') loadFeaturedProds();
    else if (tab === 'reports')           loadReports();
    else if (tab === 'product-reviews')   loadReviewProds();
    else if (tab === 'subscribers')       loadSubscribers();
    else if (tab === 'announcements')     loadAnnouncements();
    else if (tab === 'business-appeals')  loadBusinessAppeals();
  }, [tab, user]);

  useEffect(() => {
    if (tab === 'users') loadUsers();
    else if (tab === 'businesses') loadBusinesses();
  }, [search]);

  useEffect(() => { if (tab === 'reports') loadReports(); }, [reportFilter, reportTypeFilter]);
  useEffect(() => { if (tab === 'subscribers') loadSubscribers(); }, [subSearch]);

  useEffect(() => {
    if (!prodSearch.trim()) { setProdResults([]); return; }
    if (prodSearchTimer.current) clearTimeout(prodSearchTimer.current);
    prodSearchTimer.current = setTimeout(async () => {
      setProdSearching(true);
      try { const r = await apiFetch(`/products/search?q=${encodeURIComponent(prodSearch)}&limit=20`); setProdResults(r); }
      catch { /* silencioso */ }
      finally { setProdSearching(false); }
    }, 400);
  }, [prodSearch]);

  // ── Usuarios ──────────────────────────────────────────────────────────────
  const blockUser = async (id: string, name: string, cur: boolean) => {
    const Swal = (await import('sweetalert2')).default;
    const { isConfirmed } = await Swal.fire({ title: cur ? `Desbloquear a ${name}?` : `Bloquear a ${name}?`, icon: 'warning', showCancelButton: true, confirmButtonText: cur ? 'Desbloquear' : 'Bloquear', cancelButtonText: 'Cancelar', confirmButtonColor: cur ? '#16a34a' : '#ef4444' });
    if (!isConfirmed) return;
    try {
      await apiFetch(`/users/${id}/block`, { method: 'PATCH' });
      setUsers(prev => prev.map(u => u._id === id ? { ...u, blocked: !u.blocked } : u));
      if (userDetail?._id === id) setUserDetail(prev => prev ? { ...prev, blocked: !prev.blocked } : null);
      toast('success', cur ? 'Usuario desbloqueado' : 'Usuario bloqueado');
    } catch (e: any) { toast('error', e.message); }
  };

  const changeRole = async (id: string, role: string) => {
    try {
      await apiFetch(`/users/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) });
      setUsers(prev => prev.map(u => u._id === id ? { ...u, role } : u));
      if (userDetail?._id === id) setUserDetail(prev => prev ? { ...prev, role } : null);
      toast('success', 'Rol actualizado');
    } catch (e: any) { toast('error', e.message); }
  };

  // ── Negocios ──────────────────────────────────────────────────────────────
  const verifyBusiness = async (id: string, cur: boolean) => {
    try {
      await apiFetch(`/businesses/${id}/verify`, { method: 'PATCH' });
      setBusinesses(prev => prev.map(b => b._id === id ? { ...b, verified: !cur } : b));
      if (bizDetail?._id === id) setBizDetail(prev => prev ? { ...prev, verified: !cur } : null);
      toast('success', cur ? 'Verificacion removida' : 'Negocio verificado!');
    } catch (e: any) { toast('error', e.message); }
  };

  const openBlockBiz = (id: string) => { setBlockBizId(id); setBlockReason(''); setBlockModal(true); };
  const confirmBlockBiz = async () => {
    try {
      const biz = businesses.find(b => b._id === blockBizId);
      await apiFetch(`/businesses/${blockBizId}/block`, { method: 'PATCH', body: JSON.stringify({ reason: blockReason }) });
      setBusinesses(prev => prev.map(b => b._id === blockBizId ? { ...b, blocked: !b.blocked, blockedReason: blockReason } : b));
      if (bizDetail?._id === blockBizId) setBizDetail(prev => prev ? { ...prev, blocked: !prev.blocked, blockedReason: blockReason } : null);
      toast('success', biz?.blocked ? 'Negocio desbloqueado' : 'Negocio bloqueado');
      setBlockModal(false);
    } catch (e: any) { toast('error', e.message); }
  };

  // ── Suscriptores ──────────────────────────────────────────────────────────
  const openSubModal = (biz: BusinessRow) => {
    setSubBizId(biz._id);
    setSubBizName(biz.name);
    const fp = biz.fechaPago ? new Date(biz.fechaPago).toISOString().split('T')[0] : '';
    const ff = biz.fechaFinaliza ? new Date(biz.fechaFinaliza).toISOString().split('T')[0] : '';
    setSubFechaPago(fp);
    setSubFechaFinaliza(ff);
    setSubModal(true);
  };

  const submitSubscription = async () => {
    if (!subFechaPago || !subFechaFinaliza) { toast('warning', 'Completá las fechas'); return; }
    setSubSaving(true);
    try {
      await apiFetch(`/businesses/${subBizId}/subscription`, {
        method: 'PATCH',
        body: JSON.stringify({
          cuotaSuscriptor: true,
          fechaPago: subFechaPago,
          fechaFinaliza: subFechaFinaliza,
        }),
      });
      setSubscribers(prev => prev.map(b => b._id === subBizId
        ? { ...b, cuotaSuscriptor: true, fechaPago: subFechaPago, fechaFinaliza: subFechaFinaliza }
        : b
      ));
      toast('success', 'Suscripcion actualizada y notificacion enviada');
      setSubModal(false);
    } catch (e: any) { toast('error', e.message); }
    finally { setSubSaving(false); }
  };

  const removeSubscription = async (bizId: string, bizName: string) => {
    const Swal = (await import('sweetalert2')).default;
    const { isConfirmed } = await Swal.fire({ title: `Quitar suscripcion de "${bizName}"?`, icon: 'warning', showCancelButton: true, confirmButtonText: 'Quitar', cancelButtonText: 'Cancelar', confirmButtonColor: '#ef4444' });
    if (!isConfirmed) return;
    try {
      await apiFetch(`/businesses/${bizId}/subscription`, {
        method: 'PATCH',
        body: JSON.stringify({ cuotaSuscriptor: false, fechaPago: null, fechaFinaliza: null }),
      });
      setSubscribers(prev => prev.map(b => b._id === bizId
        ? { ...b, cuotaSuscriptor: false, fechaPago: undefined, fechaFinaliza: undefined }
        : b
      ));
      toast('success', 'Suscripcion removida');
    } catch (e: any) { toast('error', e.message); }
  };

  // ── Anuncios ──────────────────────────────────────────────────────────────
  const submitAnnouncement = async () => {
    if (!annTitle.trim() || !annMessage.trim()) { toast('warning', 'Completá titulo y mensaje'); return; }
    setAnnSaving(true);
    try {
      const d = await apiFetch('/announcements', {
        method: 'POST',
        body: JSON.stringify({
          title: annTitle.trim(),
          message: annMessage.trim(),
          audience: annAudience,
          durationHours: Number(annDuration),
          link: annLink.trim() || undefined,
        }),
      });
      setAnnouncements(prev => [d.announcement, ...prev]);
      setAnnTitle(''); setAnnMessage(''); setAnnLink(''); setAnnDuration('24'); setAnnAudience('all');
      toast('success', 'Anuncio creado y enviado');
    } catch (e: any) { toast('error', e.message); }
    finally { setAnnSaving(false); }
  };

  const deleteAnnouncement = async (id: string) => {
    const Swal = (await import('sweetalert2')).default;
    const { isConfirmed } = await Swal.fire({ title: 'Eliminar anuncio?', icon: 'warning', showCancelButton: true, confirmButtonText: 'Eliminar', cancelButtonText: 'Cancelar', confirmButtonColor: '#ef4444' });
    if (!isConfirmed) return;
    try {
      await apiFetch(`/announcements/${id}`, { method: 'DELETE' });
      setAnnouncements(prev => prev.filter(a => a._id !== id));
      toast('success', 'Anuncio eliminado');
    } catch (e: any) { toast('error', e.message); }
  };

  // ── Apelaciones de negocios ───────────────────────────────────────────────
  const handleResolveAppeal = async (bizId: string, action: 'approve' | 'reject', adminNote: string) => {
    setAppealResolveSaving(true);
    try {
      const res = await fetch(`https://vercel-backend-ochre-nine.vercel.app/api/admin/businesses/${bizId}/appeal`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('marketplace_token')}`,
        },
        body: JSON.stringify({ action, adminNote }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error');

      setBusinessAppeals(prev => prev.filter(b => b._id !== bizId));
      toast('success', action === 'approve' ? '✅ Negocio desbloqueado y vendedor notificado' : '❌ Apelación rechazada');
      setAppealResolveOpen(null);
      setAppealAction('');
      setAppealAdminNote('');
    } catch (e: any) {
      toast('error', e.message);
    } finally {
      setAppealResolveSaving(false);
    }
  };

  // ── Moderacion de PRODUCTO BAJO REVISION ─────────────────────────────────
  const handleModerateProduct = async (productId: string) => {
    if (!moderateAction) { toast('warning', 'Selecciona una accion'); return; }
    setModerateSaving(true);
    try {
      await apiFetch(`/products/${productId}/moderate`, {
        method: 'PATCH',
        body: JSON.stringify({ action: moderateAction, adminNote: moderateNote }),
      });
      setReviewProds(prev => prev.filter(p => p._id !== productId));
      const msg = moderateAction === 'unblock' ? 'Producto desbloqueado y visible al publico'
        : moderateAction === 'permanent_block' ? 'Bloqueo permanente aplicado'
        : 'Producto mantenido bloqueado (revision rechazada)';
      toast('success', msg);
      setModerateOpen(null); setModerateAction(''); setModerateNote('');
    } catch (e: any) { toast('error', e.message); }
    finally { setModerateSaving(false); }
  };

  const handleAdminDeleteProduct = async (productId: string, name: string) => {
    const Swal = (await import('sweetalert2')).default;
    const { isConfirmed } = await Swal.fire({ title: `Eliminar "${name}"?`, text: 'Esta accion no se puede deshacer.', icon: 'warning', showCancelButton: true, confirmButtonText: 'Eliminar', cancelButtonText: 'Cancelar', confirmButtonColor: '#ef4444' });
    if (!isConfirmed) return;
    try {
      await apiFetch(`/products/${productId}`, { method: 'DELETE' });
      setReviewProds(prev => prev.filter(p => p._id !== productId));
      toast('success', 'Producto eliminado');
    } catch (e: any) { toast('error', e.message); }
  };

  // ── Destacados ────────────────────────────────────────────────────────────
  const openFeatBiz = (biz: BusinessRow) => { setFeatBizId(biz._id); setFeatBizName(biz.name); setFeatBizType('weekly'); setFeatBizDays('7'); setFeatBizNote(''); setFeatBizPaid(false); setFeatBizModal(true); };
  const submitFeatBiz = async () => {
    setFeatBizSaving(true);
    try {
      await apiFetch('/featured-businesses', { method: 'POST', body: JSON.stringify({ businessId: featBizId, type: featBizType, days: featBizDays, note: featBizNote, paid: featBizPaid }) });
      toast('success', featBizPaid ? 'Negocio destacado!' : 'Destacado creado (pendiente de pago)');
      setFeatBizModal(false); loadBusinesses(); loadFeaturedBiz();
    } catch (e: any) { toast('error', e.message); }
    finally { setFeatBizSaving(false); }
  };
  const confirmBizPayment = async (featuredId: string) => {
    const Swal = (await import('sweetalert2')).default;
    const { isConfirmed } = await Swal.fire({ title: 'Confirmar pago de negocio?', icon: 'question', showCancelButton: true, confirmButtonText: 'Confirmar', cancelButtonText: 'Cancelar', confirmButtonColor: '#22c55e' });
    if (!isConfirmed) return;
    try {
      await apiFetch(`/featured-businesses/${featuredId}/confirm-payment`, { method: 'PATCH' });
      setFeaturedBiz(prev => prev.map(f => f._id === featuredId ? { ...f, paid: true } : f));
      toast('success', 'Pago confirmado!');
    } catch (e: any) { toast('error', e.message); }
  };
  const removeFeatBiz = async (businessId: string) => {
    const Swal = (await import('sweetalert2')).default;
    const { isConfirmed } = await Swal.fire({ title: 'Quitar destacado?', icon: 'question', showCancelButton: true, confirmButtonText: 'Quitar', cancelButtonText: 'Cancelar', confirmButtonColor: '#ef4444' });
    if (!isConfirmed) return;
    try {
      await apiFetch(`/featured-businesses/${businessId}`, { method: 'DELETE' });
      setFeaturedBiz(prev => prev.filter(f => f.business._id !== businessId));
      toast('success', 'Destacado de negocio removido');
    } catch (e: any) { toast('error', e.message); }
  };

  const openBizProdModal = async (biz: BusinessRow) => {
    setBizProdBizId(biz._id); setBizProdBizName(biz.name);
    setBizProdFilter(''); setSelectedProdIds(new Set());
    setBizProdDays('7'); setBizProdNote(''); setBizProdPaid(false);
    setBizProdModal(true); setBizProdLoading(true);
    try { const products = await apiFetch(`/businesses/${biz._id}/products`); setBizProdItems(products); }
    catch (e: any) { toast('error', e.message); }
    finally { setBizProdLoading(false); }
  };
  const toggleProdSelect = (id: string) => { setSelectedProdIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; }); };
  const selectAllFiltered = () => { const filtered = bizProdItems.filter(p => !bizProdFilter || p.name.toLowerCase().includes(bizProdFilter.toLowerCase())); setSelectedProdIds(prev => { const next = new Set(prev); filtered.forEach(p => next.add(p._id)); return next; }); };
  const deselectAll = () => setSelectedProdIds(new Set());
  const submitBizProds = async () => {
    if (!selectedProdIds.size) return;
    setBizProdSaving(true);
    try {
      const result = await apiFetch('/featured-products/bulk', { method: 'POST', body: JSON.stringify({ productIds: [...selectedProdIds], days: bizProdDays, note: bizProdNote, paid: bizProdPaid }) });
      toast('success', result.message); setBizProdModal(false); loadFeaturedProds();
    } catch (e: any) { toast('error', e.message); }
    finally { setBizProdSaving(false); }
  };
  const removeSingleBizProd = async (productId: string) => {
    try {
      await apiFetch(`/featured-products/${productId}`, { method: 'DELETE' });
      setBizProdItems(prev => prev.map(p => p._id === productId ? { ...p, featured: false, featuredPaid: false, isActivelyFeatured: false } : p));
      toast('success', 'Destacado removido');
    } catch (e: any) { toast('error', e.message); }
  };

  const openFeatProd = () => { setProdSearch(''); setProdResults([]); setSelectedProd(null); setFeatProdDays('7'); setFeatProdNote(''); setFeatProdPaid(false); setFeatProdModal(true); };
  const submitFeatProd = async () => {
    if (!selectedProd) return;
    setFeatProdSaving(true);
    try {
      await apiFetch('/featured-products', { method: 'POST', body: JSON.stringify({ productId: selectedProd._id, days: featProdDays, note: featProdNote, paid: featProdPaid }) });
      toast('success', featProdPaid ? 'Producto destacado!' : 'Producto marcado (pendiente de pago)');
      setFeatProdModal(false); loadFeaturedProds();
    } catch (e: any) { toast('error', e.message); }
    finally { setFeatProdSaving(false); }
  };
  const confirmProdPayment = async (productId: string) => {
    const Swal = (await import('sweetalert2')).default;
    const { isConfirmed } = await Swal.fire({ title: 'Confirmar pago?', icon: 'question', showCancelButton: true, confirmButtonText: 'Confirmar', cancelButtonText: 'Cancelar', confirmButtonColor: '#22c55e' });
    if (!isConfirmed) return;
    try {
      await apiFetch(`/featured-products/${productId}/confirm-payment`, { method: 'PATCH' });
      setFeaturedProds(prev => prev.map(p => p._id === productId ? { ...p, featuredPaid: true } : p));
      toast('success', 'Pago confirmado!');
    } catch (e: any) { toast('error', e.message); }
  };
  const removeFeatProd = async (productId: string) => {
    const Swal = (await import('sweetalert2')).default;
    const { isConfirmed } = await Swal.fire({ title: 'Quitar destacado del producto?', icon: 'question', showCancelButton: true, confirmButtonText: 'Quitar', cancelButtonText: 'Cancelar', confirmButtonColor: '#ef4444' });
    if (!isConfirmed) return;
    try {
      await apiFetch(`/featured-products/${productId}`, { method: 'DELETE' });
      setFeaturedProds(prev => prev.filter(p => p._id !== productId));
      toast('success', 'Destacado de producto removido');
    } catch (e: any) { toast('error', e.message); }
  };

  // ── Reportes ──────────────────────────────────────────────────────────────
  const handleResolveReport = async (reportId: string) => {
    if (!resolveActions.length) { toast('warning', 'Selecciona al menos una accion'); return; }
    setResolveSaving(true);
    try {
      const res = await apiFetch(`/reports/${reportId}/resolve`, { method: 'PATCH', body: JSON.stringify({ actions: resolveActions, adminNote: resolveNote }) });
      setReports(prev => prev.map(r => r._id === reportId ? { ...r, ...res.report } : r));
      toast('success', `Acciones ejecutadas: ${resolveActions.join(' + ')}`);
      setResolveOpen(null); setResolveActions([]); setResolveNote('');
    } catch (e: any) { toast('error', e.message); }
    finally { setResolveSaving(false); }
  };

  const handleDeleteReport = async (reportId: string) => {
    const Swal = (await import('sweetalert2')).default;
    const { isConfirmed } = await Swal.fire({ title: 'Eliminar reporte?', icon: 'warning', showCancelButton: true, confirmButtonText: 'Eliminar', cancelButtonText: 'Cancelar', confirmButtonColor: '#ef4444' });
    if (!isConfirmed) return;
    try {
      await apiFetch(`/reports/${reportId}`, { method: 'DELETE' });
      setReports(prev => prev.filter(r => r._id !== reportId));
      toast('success', 'Reporte eliminado');
    } catch (e: any) { toast('error', e.message); }
  };

  const daysLeft = (d: string) => Math.max(0, Math.ceil((new Date(d).getTime() - Date.now()) / 86400000));

  const toggleAction = (action: string) => {
    if (action === 'dismiss') { setResolveActions(prev => prev.includes('dismiss') ? [] : ['dismiss']); return; }
    setResolveActions(prev => {
      const withoutDismiss = prev.filter(a => a !== 'dismiss');
      if (action === 'block_product')    return [...withoutDismiss.filter(a => a !== 'unblock_product'), action].filter((v,i,arr) => arr.indexOf(v) === i);
      if (action === 'unblock_product')  return [...withoutDismiss.filter(a => a !== 'block_product'), action].filter((v,i,arr) => arr.indexOf(v) === i);
      if (action === 'block_business')   return [...withoutDismiss.filter(a => a !== 'unblock_business'), action].filter((v,i,arr) => arr.indexOf(v) === i);
      if (action === 'unblock_business') return [...withoutDismiss.filter(a => a !== 'block_business'), action].filter((v,i,arr) => arr.indexOf(v) === i);
      if (withoutDismiss.includes(action)) return withoutDismiss.filter(a => a !== action);
      return [...withoutDismiss, action];
    });
  };

  if (loading || !user) return null;
  if (user.role !== 'admin') return null;

  const paidBiz      = featuredBiz.filter(f => f.paid).length;
  const pendingBiz   = featuredBiz.filter(f => !f.paid).length;
  const paidProds    = featuredProds.filter(p => p.featuredPaid).length;
  const pendingProds = featuredProds.filter(p => !p.featuredPaid).length;
  const filteredBizProds = bizProdItems.filter(p => !bizProdFilter || p.name.toLowerCase().includes(bizProdFilter.toLowerCase()));
  const pendingReports = reports.filter(r => r.status === 'pending').length;
  const activeSubscribers = subscribers.filter(b => b.cuotaSuscriptor).length;
  const expiringSubscribers = subscribers.filter(b => {
    if (!b.fechaFinaliza) return false;
    const d = daysLeftFrom(b.fechaFinaliza);
    return d !== null && d <= 3 && d >= 0;
  }).length;

  const filteredSubscribers = subscribers.filter(b =>
    !subSearch || b.name.toLowerCase().includes(subSearch.toLowerCase()) || b.owner?.name?.toLowerCase().includes(subSearch.toLowerCase())
  );

  const navItems: { id: Tab; icon: any; label: string; badge?: number }[] = [
    { id: 'dashboard',        icon: LayoutDashboard,   label: 'Dashboard' },
    { id: 'users',            icon: Users,             label: 'Usuarios' },
    { id: 'businesses',       icon: Store,             label: 'Negocios' },
    { id: 'subscribers',      icon: BadgeDollarSign,   label: 'Suscriptores',      badge: expiringSubscribers },
    { id: 'featured-biz',     icon: Crown,             label: 'Dest. Negocios' },
    { id: 'featured-products',icon: Tag,               label: 'Dest. Productos' },
    { id: 'reports',          icon: Flag,              label: 'Reportes',           badge: pendingReports },
    { id: 'product-reviews',  icon: Package,           label: 'Prod. Revisados',   badge: reviewProds.length },
    { id: 'business-appeals', icon: ShieldAlert,       label: 'Apel. Negocios',    badge: businessAppeals.length },
    { id: 'announcements',    icon: Bell,              label: 'Anuncios' },
  ];

  const statusInfo = (s: string) => {
    if (s === 'pending')      return { label: 'Pendiente',     cls: 'pending'     };
    if (s === 'action_taken') return { label: 'Accion tomada', cls: 'action_taken' };
    if (s === 'dismissed')    return { label: 'Desestimado',   cls: 'dismissed'   };
    return { label: s, cls: 'reviewed' };
  };

  const audienceLabel = (a: string) => ({ all: 'Todos', seller: 'Vendedores', buyer: 'Compradores' }[a] || a);
  const audienceColor = (a: string) => ({ all: '#f97316', seller: '#8b5cf6', buyer: '#06b6d4' }[a] || '#888');

  return (
    <div className="adm-root">
      {/* Sidebar */}
      <aside className="adm-sidebar">
        <div className="adm-sidebar-top-row">
          <div className="adm-logo"><Shield size={22} /><span>Admin Panel</span></div>
          <div className="adm-sidebar-footer">
            <div className="adm-user-chip">
              <div className="adm-user-dot" />
              <div><div className="adm-user-name">{user.name}</div><div className="adm-user-role">Administrador</div></div>
            </div>
            <button className="adm-logout" onClick={() => { logout(); router.push('/'); }}><LogOut size={15} /></button>
          </div>
        </div>
        <nav className="adm-nav">
          {navItems.map(({ id, icon: Icon, label, badge }) => (
            <button key={id} className={`adm-nav-item ${tab === id ? 'active' : ''}`} onClick={() => setTab(id)} style={{ position: 'relative' }}>
              <Icon size={17} /><span>{label}</span>
              {badge !== undefined && badge > 0 && (
                <span style={{ position: 'absolute', top: 6, right: 8, background: id === 'product-reviews' ? '#f59e0b' : id === 'subscribers' ? '#f97316' : id === 'business-appeals' ? '#ef4444' : '#ef4444', color: '#fff', borderRadius: '50%', width: 17, height: 17, fontSize: '0.65rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {badge > 9 ? '9+' : badge}
                </span>
              )}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main */}
      <main className="adm-main">
        <div className="adm-topbar">
          <div>
            <h1 className="adm-page-title">
              {tab === 'dashboard' && 'Dashboard'}
              {tab === 'users' && 'Usuarios'}
              {tab === 'businesses' && 'Negocios'}
              {tab === 'subscribers' && 'Suscriptores'}
              {tab === 'featured-biz' && 'Destacados - Negocios'}
              {tab === 'featured-products' && 'Destacados - Productos'}
              {tab === 'reports' && 'Reportes y Moderacion'}
              {tab === 'product-reviews' && 'Productos Enviados a Revision'}
              {tab === 'business-appeals' && 'Apelaciones de Negocios'}
              {tab === 'announcements' && 'Anuncios y Notificaciones'}
            </h1>
            <p className="adm-page-sub">{new Date().toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          <button className="adm-refresh" onClick={() => {
            if (tab === 'dashboard') loadStats();
            else if (tab === 'users') loadUsers();
            else if (tab === 'businesses') loadBusinesses();
            else if (tab === 'featured-biz') loadFeaturedBiz();
            else if (tab === 'featured-products') loadFeaturedProds();
            else if (tab === 'reports') loadReports();
            else if (tab === 'product-reviews') loadReviewProds();
            else if (tab === 'subscribers') loadSubscribers();
            else if (tab === 'announcements') loadAnnouncements();
            else if (tab === 'business-appeals') loadBusinessAppeals();
          }}><RefreshCw size={15} /></button>
        </div>

        {/* ════ DASHBOARD ════ */}
        {tab === 'dashboard' && stats && (
          <div className="adm-content">
            <div className="adm-stats-grid">
              {[
                { label: 'Usuarios',             value: stats.totalUsers,             icon: Users,           color: 'blue'   },
                { label: 'Negocios',             value: stats.totalBusinesses,        icon: Store,           color: 'orange' },
                { label: 'Productos',            value: stats.totalProducts,          icon: Package,         color: 'green'  },
                { label: 'Negocios destacados',  value: stats.activeFeaturedBiz,      icon: Crown,           color: 'gold'   },
                { label: 'Productos destacados', value: stats.activeFeaturedProducts, icon: Tag,             color: 'gold'   },
                { label: 'Negocios bloqueados',  value: stats.blockedBusinesses,      icon: AlertTriangle,   color: 'red'    },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className={`adm-stat-card adm-stat-${color}`}>
                  <div className="adm-stat-icon"><Icon size={20} /></div>
                  <div className="adm-stat-num">{value}</div>
                  <div className="adm-stat-label">{label}</div>
                </div>
              ))}
            </div>
            <div className="adm-card">
              <h3 className="adm-card-title"><Users size={16} /> Usuarios recientes</h3>
              <div className="adm-table-wrap adm-desktop-only">
                <table className="adm-table">
                  <thead><tr><th>Nombre</th><th>Email</th><th>Rol</th><th>Registrado</th></tr></thead>
                  <tbody>
                    {stats.recentUsers.map((u: any) => (
                      <tr key={u._id}>
                        <td><div className="adm-user-cell"><div className="adm-avatar-sm">{u.name[0]}</div><span>{u.name}</span></div></td>
                        <td className="adm-muted">{u.email}</td>
                        <td><span className={`adm-role-badge adm-role-${u.role} adm-role-fixed`}>{u.role}</span></td>
                        <td className="adm-muted">{new Date(u.createdAt).toLocaleDateString('es-AR')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ════ USUARIOS ════ */}
        {tab === 'users' && (
          <div className="adm-content">
            <div className="adm-search-bar"><Search size={16} /><input placeholder="Buscar por nombre o email..." value={search} onChange={e => setSearch(e.target.value)} /></div>
            <div className="adm-card">
              {fetching ? <div className="adm-loading"><div className="adm-spinner" /></div> : (
                <div className="adm-table-wrap adm-desktop-only">
                  <table className="adm-table">
                    <thead><tr><th>Usuario</th><th>Email</th><th>Rol</th><th>Estado</th><th>Acciones</th></tr></thead>
                    <tbody>
                      {users.map(u => (
                        <tr key={u._id} className={u.blocked ? 'adm-row-blocked' : ''}>
                          <td><div className="adm-user-cell"><div className="adm-avatar-sm">{u.name[0]}</div><span>{u.name}</span></div></td>
                          <td className="adm-muted">{u.email}</td>
                          <td><select className={`adm-role-select adm-role-${u.role}`} value={u.role} onChange={e => changeRole(u._id, e.target.value)} disabled={u.role === 'admin'}><option value="user">user</option><option value="seller">seller</option><option value="admin">admin</option></select></td>
                          <td>{u.blocked ? <span className="adm-status blocked"><Ban size={12} /> Bloqueado</span> : <span className="adm-status active"><CheckCircle size={12} /> Activo</span>}</td>
                          <td><button className={`adm-btn-sm ${u.blocked ? 'green' : 'red'}`} onClick={() => blockUser(u._id, u.name, !!u.blocked)} disabled={u.role === 'admin'}>{u.blocked ? <><CheckCircle size={13} /> Desbloquear</> : <><Ban size={13} /> Bloquear</>}</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ════ NEGOCIOS ════ */}
        {tab === 'businesses' && (
          <div className="adm-content">
            <div className="adm-search-bar"><Search size={16} /><input placeholder="Buscar negocio..." value={search} onChange={e => setSearch(e.target.value)} /></div>
            <div className="adm-card">
              {fetching ? <div className="adm-loading"><div className="adm-spinner" /></div> : (
                <div className="adm-table-wrap adm-desktop-only">
                  <table className="adm-table">
                    <thead><tr><th>Negocio</th><th>Dueno</th><th>Ciudad</th><th>Estado</th><th>Strikes</th><th>Destacados</th><th>Acciones</th></tr></thead>
                    <tbody>
                      {businesses.map(b => (
                        <tr key={b._id} className={b.blocked ? 'adm-row-blocked' : ''}>
                          <td><div className="adm-biz-cell"><img src={b.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(b.name)}&size=36&background=f97316&color=fff`} alt="" className="adm-biz-logo" /><div><div className="adm-biz-name">{b.name}</div>{b.verified && <span className="adm-verified-chip"><CheckCircle size={10} /> Verificado</span>}</div></div></td>
                          <td><div className="adm-muted">{b.owner?.name}</div><div className="adm-muted" style={{fontSize:'0.75rem'}}>{b.owner?.email}</div></td>
                          <td className="adm-muted">{b.city || '—'}</td>
                          <td>{b.blocked ? <span className="adm-status blocked"><Ban size={12} /> Bloqueado</span> : <span className="adm-status active"><CheckCircle size={12} /> Activo</span>}</td>
                          <td>
                            <div style={{display:'flex',alignItems:'center',gap:4}}>
                              {[1,2,3].map(n => (<div key={n} style={{ width:12, height:12, borderRadius:'50%', background: n <= (b.strikeCount||0) ? '#ef4444' : 'var(--adm-border2)' }} />))}
                              <span style={{fontSize:'0.72rem',color:'var(--adm-muted2)',marginLeft:3}}>{b.strikeCount||0}/3</span>
                            </div>
                          </td>
                          <td>
                            {b.featuredInfo ? <span className="adm-featured-chip"><Crown size={11} /> {daysLeft(b.featuredInfo.endDate)}d</span> : null}
                            {(b.featuredProductsCount ?? 0) > 0 && <span style={{fontSize:'0.72rem',color:'#f97316',fontWeight:600}}><Tag size={10} /> {b.featuredProductsCount}</span>}
                            {!b.featuredInfo && !b.featuredProductsCount && <span className="adm-muted" style={{fontSize:'0.78rem'}}>—</span>}
                          </td>
                          <td><div className="adm-action-group">
                            <button className={`adm-btn-sm ${b.verified ? 'orange' : 'green'}`} onClick={() => verifyBusiness(b._id, b.verified)}>{b.verified ? <><XCircle size={12}/> Quitar</> : <><CheckCircle size={12}/> Verificar</>}</button>
                            <button className="adm-btn-sm gold" onClick={() => openBizProdModal(b)}><Tag size={12} /> Dest. productos</button>
                            <button className="adm-btn-sm" style={{background:'rgba(249,115,22,0.12)',color:'#f97316',border:'1px solid rgba(249,115,22,0.3)'}} onClick={() => openFeatBiz(b)}><Crown size={12} /> Plan negocio</button>
                            <button className={`adm-btn-sm ${b.blocked ? 'green' : 'red'}`} onClick={() => openBlockBiz(b._id)}>{b.blocked ? <><CheckCircle size={12}/> Desbloquear</> : <><Ban size={12}/> Bloquear</>}</button>
                          </div></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ════ SUSCRIPTORES ════ */}
        {tab === 'subscribers' && (
          <div className="adm-content">
            {/* Resumen */}
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
              {[
                { label: 'Total suscriptores', value: activeSubscribers, color: '#22c55e', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.25)' },
                { label: 'Vencen en 3 dias', value: expiringSubscribers, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)' },
                { label: 'Sin suscripcion', value: subscribers.length - activeSubscribers, color: 'var(--adm-muted2)', bg: 'var(--adm-surface2)', border: 'var(--adm-border)' },
              ].map(s => (
                <div key={s.label} style={{ flex: 1, minWidth: 130, background: s.bg, border: `1px solid ${s.border}`, borderRadius: 12, padding: '0.85rem 1.1rem', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: '1.5rem', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--adm-muted2)', fontWeight: 600 }}>{s.label}</span>
                </div>
              ))}
            </div>

            <div className="adm-search-bar" style={{ marginBottom: '0.75rem' }}>
              <Search size={16} />
              <input placeholder="Buscar negocio o dueño..." value={subSearch} onChange={e => setSubSearch(e.target.value)} />
            </div>

            {fetching ? <div className="adm-loading"><div className="adm-spinner" /></div> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {filteredSubscribers.map(b => {
                  const dl = daysLeftFrom(b.fechaFinaliza);
                  const isActive = b.cuotaSuscriptor && dl !== null && dl >= 0;
                  const isExpiring = isActive && dl !== null && dl <= 3;
                  const isExpired = b.cuotaSuscriptor && dl !== null && dl < 0;

                  return (
                    <div key={b._id} style={{
                      background: 'var(--adm-surface)',
                      border: `1px solid ${isExpiring ? 'rgba(245,158,11,0.4)' : isExpired ? 'rgba(239,68,68,0.3)' : 'var(--adm-border)'}`,
                      borderLeft: `3px solid ${isActive && !isExpiring ? '#22c55e' : isExpiring ? '#f59e0b' : isExpired ? '#ef4444' : 'var(--adm-border)'}`,
                      borderRadius: 14,
                      padding: '1rem 1.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                      flexWrap: 'wrap',
                    }}>
                      <img
                        src={b.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(b.name)}&size=52&background=f97316&color=fff`}
                        alt={b.name}
                        style={{ width: 52, height: 52, borderRadius: 10, objectFit: 'cover', border: '1px solid var(--adm-border2)', flexShrink: 0 }}
                      />
                      <div style={{ flex: 1, minWidth: 180 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.2rem' }}>
                          <span style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--adm-text)' }}>{b.name}</span>
                          {b.verified && <span className="adm-verified-chip"><CheckCircle size={10} /> Verificado</span>}
                          {isActive && !isExpiring && (
                            <span style={{ fontSize: '0.68rem', fontWeight: 700, background: 'rgba(34,197,94,0.12)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 20, padding: '0.1rem 0.5rem' }}>
                              Suscriptor activo
                            </span>
                          )}
                          {isExpiring && (
                            <span style={{ fontSize: '0.68rem', fontWeight: 700, background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 20, padding: '0.1rem 0.5rem', display: 'flex', alignItems: 'center', gap: 3 }}>
                              <AlertTriangle size={9} /> Vence en {dl} dia{dl !== 1 ? 's' : ''}
                            </span>
                          )}
                          {isExpired && (
                            <span style={{ fontSize: '0.68rem', fontWeight: 700, background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 20, padding: '0.1rem 0.5rem' }}>
                              Vencido
                            </span>
                          )}
                          {!b.cuotaSuscriptor && (
                            <span style={{ fontSize: '0.68rem', fontWeight: 700, background: 'var(--adm-surface2)', color: 'var(--adm-muted)', border: '1px solid var(--adm-border)', borderRadius: 20, padding: '0.1rem 0.5rem' }}>
                              Sin suscripcion
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.78rem', color: 'var(--adm-muted2)' }}>{b.owner?.name} · {b.city || 'Sin ciudad'}</span>
                        </div>
                        {b.fechaPago && (
                          <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.35rem', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--adm-muted2)', display: 'flex', alignItems: 'center', gap: 4 }}>
                              <CalendarDays size={11} /> Pago: <strong style={{ color: 'var(--adm-text)' }}>{new Date(b.fechaPago).toLocaleDateString('es-AR')}</strong>
                            </span>
                            {b.fechaFinaliza && (
                              <span style={{ fontSize: '0.75rem', color: isExpiring ? '#f59e0b' : isExpired ? '#f87171' : 'var(--adm-muted2)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Clock size={11} /> Vence: <strong style={{ color: isExpiring ? '#f59e0b' : isExpired ? '#f87171' : 'var(--adm-text)' }}>{new Date(b.fechaFinaliza).toLocaleDateString('es-AR')}</strong>
                                {dl !== null && dl >= 0 && (
                                  <span style={{ marginLeft: 4, fontSize: '0.7rem', fontWeight: 700, color: isExpiring ? '#f59e0b' : '#4ade80' }}>
                                    ({dl === 0 ? 'hoy' : `${dl}d`})
                                  </span>
                                )}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        <button className="adm-btn-sm green" onClick={() => openSubModal(b)} title="Gestionar suscripcion">
                          <BadgeDollarSign size={12} /> {b.cuotaSuscriptor ? 'Editar' : 'Dar suscripcion'}
                        </button>
                        {b.cuotaSuscriptor && (
                          <button className="adm-btn-sm red" onClick={() => removeSubscription(b._id, b.name)}>
                            <X size={12} /> Quitar
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
                {filteredSubscribers.length === 0 && (
                  <div className="adm-empty">
                    <BadgeDollarSign size={48} strokeWidth={1} style={{ opacity: 0.4 }} />
                    <p style={{ marginTop: '0.75rem', color: 'var(--adm-muted)' }}>
                      {subSearch ? 'Sin resultados' : 'No hay negocios cargados'}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ════ APELACIONES DE NEGOCIOS ════ */}
        {tab === 'business-appeals' && (
          <div className="adm-content">
            <div style={{ marginBottom: '0.75rem' }}>
              <p className="adm-muted" style={{ fontSize: '0.82rem' }}>
                {businessAppeals.length === 0
                  ? 'No hay apelaciones pendientes.'
                  : `${businessAppeals.length} apelación${businessAppeals.length !== 1 ? 'es' : ''} pendiente${businessAppeals.length !== 1 ? 's' : ''} de revisión.`}
              </p>
            </div>

            {fetching ? (
              <div className="adm-loading"><div className="adm-spinner" /></div>
            ) : businessAppeals.length === 0 ? (
              <div className="adm-empty">
                <ShieldCheck size={48} strokeWidth={1} style={{ opacity: 0.4 }} />
                <p style={{ marginTop: '0.75rem', color: 'var(--adm-muted)' }}>
                  Sin apelaciones pendientes — todo en orden
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {businessAppeals.map(b => {
                  const isOpen = appealResolveOpen === b._id;
                  return (
                    <div key={b._id} style={{
                      background: 'var(--adm-surface)',
                      border: '1px solid rgba(239,68,68,0.3)',
                      borderLeft: '3px solid #ef4444',
                      borderRadius: 14,
                      overflow: 'hidden',
                    }}>
                      {/* Info del negocio */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', padding: '1rem 1.25rem' }}>
                        <img
                          src={b.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(b.name)}&size=60&background=f97316&color=fff`}
                          alt={b.name}
                          style={{ width: 60, height: 60, borderRadius: 10, objectFit: 'cover', border: '1px solid var(--adm-border2)', flexShrink: 0 }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.3rem' }}>
                            <span style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--adm-text)' }}>{b.name}</span>
                            <span style={{
                              fontSize: '0.68rem', fontWeight: 700,
                              background: 'rgba(239,68,68,0.12)', color: '#f87171',
                              border: '1px solid rgba(239,68,68,0.25)',
                              borderRadius: 20, padding: '0.1rem 0.5rem',
                              display: 'flex', alignItems: 'center', gap: 3,
                            }}>
                              <Lock size={9} /> Bloqueado
                            </span>
                            <span style={{
                              fontSize: '0.68rem', fontWeight: 700,
                              background: 'rgba(245,158,11,0.12)', color: '#f59e0b',
                              border: '1px solid rgba(245,158,11,0.25)',
                              borderRadius: 20, padding: '0.1rem 0.5rem',
                              display: 'flex', alignItems: 'center', gap: 3,
                            }}>
                              <Clock size={9} /> Apelación pendiente
                            </span>
                          </div>
                          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
                            <span style={{ fontSize: '0.78rem', color: 'var(--adm-muted2)' }}>
                              Dueño: <strong style={{ color: 'var(--adm-text)' }}>{b.owner?.name}</strong>
                            </span>
                            <span style={{ fontSize: '0.78rem', color: 'var(--adm-muted2)' }}>{b.owner?.email}</span>
                            {b.city && <span style={{ fontSize: '0.78rem', color: 'var(--adm-muted2)' }}>{b.city}</span>}
                          </div>
                          {b.blockedReason && (
                            <div style={{
                              background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.18)',
                              borderRadius: 8, padding: '0.4rem 0.7rem', marginBottom: '0.4rem',
                            }}>
                              <span style={{ fontSize: '0.72rem', color: '#f87171', fontWeight: 700 }}>Motivo del bloqueo: </span>
                              <span style={{ fontSize: '0.72rem', color: 'rgba(252,165,165,0.8)' }}>{b.blockedReason}</span>
                            </div>
                          )}
                          {b.appealNote && (
                            <div style={{
                              background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)',
                              borderRadius: 8, padding: '0.4rem 0.7rem',
                            }}>
                              <span style={{ fontSize: '0.72rem', color: '#f59e0b', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                                <MessageSquare size={11} /> Mensaje del dueño:
                              </span>
                              <p style={{ margin: '0.2rem 0 0', fontSize: '0.78rem', color: 'rgba(253,186,116,0.85)', fontStyle: 'italic', lineHeight: 1.5 }}>
                                "{b.appealNote}"
                              </p>
                            </div>
                          )}
                          {b.appealSubmittedAt && (
                            <span style={{ fontSize: '0.68rem', color: 'var(--adm-muted)', fontFamily: 'monospace', marginTop: '0.3rem', display: 'block' }}>
                              Enviada: {new Date(b.appealSubmittedAt).toLocaleString('es-AR')}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Panel de decisión */}
                      {isOpen ? (
                        <div style={{
                          borderTop: '1px solid var(--adm-border)',
                          background: 'var(--adm-surface2)',
                          padding: '1rem 1.25rem',
                          display: 'flex', flexDirection: 'column', gap: '0.75rem',
                        }}>
                          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--adm-text)' }}>
                            ¿Qué hacés con esta apelación?
                          </div>
                          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                            {([
                              {
                                value: 'approve' as const,
                                label: 'Aprobar y desbloquear',
                                desc: 'El negocio vuelve a estar activo y el dueño es notificado',
                                color: '#22c55e', bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.3)',
                              },
                              {
                                value: 'reject' as const,
                                label: 'Rechazar apelación',
                                desc: 'El negocio sigue bloqueado. Podés dejar una nota explicativa',
                                color: '#ef4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)',
                              },
                            ]).map(opt => (
                              <button
                                key={opt.value}
                                onClick={() => setAppealAction(opt.value)}
                                style={{
                                  flex: 1, minWidth: 180,
                                  display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                                  padding: '0.7rem 1rem', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                                  border: `1.5px solid ${appealAction === opt.value ? opt.color : opt.border}`,
                                  background: appealAction === opt.value ? opt.bg : 'transparent',
                                  transition: 'all 0.15s',
                                }}
                              >
                                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: appealAction === opt.value ? opt.color : 'var(--adm-muted2)', marginBottom: 3 }}>
                                  {appealAction === opt.value && '✓ '}{opt.label}
                                </span>
                                <span style={{ fontSize: '0.7rem', color: 'var(--adm-muted)', lineHeight: 1.4 }}>{opt.desc}</span>
                              </button>
                            ))}
                          </div>

                          <div>
                            <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--adm-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.35rem' }}>
                              Nota para el vendedor (opcional)
                            </label>
                            <input
                              type="text"
                              className="adm-input"
                              placeholder={appealAction === 'approve' ? 'Ej: Revisamos el contenido y cumple con las políticas' : 'Ej: El contenido aún viola las normas de la sección 3.2'}
                              value={appealAdminNote}
                              onChange={e => setAppealAdminNote(e.target.value)}
                            />
                          </div>

                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <button
                              className="adm-btn-cancel"
                              onClick={() => { setAppealResolveOpen(null); setAppealAction(''); setAppealAdminNote(''); }}
                            >
                              Cancelar
                            </button>
                            <button
                              className={`adm-btn-confirm ${appealAction === 'approve' ? 'green' : 'red'}`}
                              onClick={() => handleResolveAppeal(b._id, appealAction as 'approve' | 'reject', appealAdminNote)}
                              disabled={!appealAction || appealResolveSaving}
                            >
                              <ShieldAlert size={14} />
                              {appealResolveSaving ? 'Guardando...' : appealAction === 'approve' ? 'Desbloquear negocio' : 'Rechazar apelación'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ borderTop: '1px solid var(--adm-border)', padding: '0.6rem 1.25rem', display: 'flex', justifyContent: 'flex-end' }}>
                          <button
                            className="adm-btn-sm"
                            style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}
                            onClick={() => { setAppealResolveOpen(b._id); setAppealAction(''); setAppealAdminNote(''); }}
                          >
                            <Eye size={12} /> Revisar apelación
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ════ ANUNCIOS ════ */}
        {tab === 'announcements' && (
          <div className="adm-content">
            {/* Formulario crear anuncio */}
            <div className="adm-card" style={{ marginBottom: '1.5rem', borderLeft: '3px solid #f97316' }}>
              <h3 className="adm-card-title" style={{ marginBottom: '1rem' }}><Bell size={16} /> Nuevo anuncio</h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div className="adm-field" style={{ margin: 0 }}>
                  <label className="adm-label">Titulo</label>
                  <input type="text" className="adm-input" placeholder="Ej: Mantenimiento programado" value={annTitle} onChange={e => setAnnTitle(e.target.value)} />
                </div>
                <div className="adm-field" style={{ margin: 0 }}>
                  <label className="adm-label">Audiencia</label>
                  <select className="adm-input" style={{ cursor: 'pointer' }} value={annAudience} onChange={e => setAnnAudience(e.target.value as any)}>
                    <option value="all">Todos los usuarios</option>
                    <option value="seller">Solo vendedores</option>
                    <option value="buyer">Solo compradores</option>
                  </select>
                </div>
                <div className="adm-field" style={{ margin: 0 }}>
                  <label className="adm-label">Duracion (horas)</label>
                  <input type="number" min="1" max="720" className="adm-input" value={annDuration} onChange={e => setAnnDuration(e.target.value)} />
                </div>
              </div>

              <div className="adm-field" style={{ margin: '0 0 0.75rem' }}>
                <label className="adm-label">Mensaje</label>
                <textarea
                  className="adm-input"
                  placeholder="Escribi el mensaje del anuncio..."
                  value={annMessage}
                  onChange={e => setAnnMessage(e.target.value)}
                  rows={3}
                  style={{ resize: 'vertical', minHeight: 80 }}
                />
              </div>

              <div className="adm-field" style={{ margin: '0 0 1rem' }}>
                <label className="adm-label">Link (opcional)</label>
                <input type="url" className="adm-input" placeholder="https://..." value={annLink} onChange={e => setAnnLink(e.target.value)} />
              </div>

              {annTitle && annMessage && (
                <div style={{ background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.2)', borderRadius: 10, padding: '0.75rem 1rem', marginBottom: '0.75rem' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--adm-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.35rem' }}>Vista previa</div>
                  <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#f97316', marginBottom: '0.2rem' }}>{annTitle}</div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--adm-muted2)', lineHeight: 1.5 }}>{annMessage}</div>
                  <div style={{ marginTop: '0.4rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.68rem', background: 'rgba(249,115,22,0.12)', color: '#f97316', border: '1px solid rgba(249,115,22,0.2)', borderRadius: 20, padding: '0.1rem 0.5rem', fontWeight: 700 }}>
                      {audienceLabel(annAudience)}
                    </span>
                    <span style={{ fontSize: '0.68rem', background: 'var(--adm-surface2)', color: 'var(--adm-muted2)', border: '1px solid var(--adm-border)', borderRadius: 20, padding: '0.1rem 0.5rem', fontWeight: 700 }}>
                      {annDuration}h de duracion
                    </span>
                    {annLink && (
                      <span style={{ fontSize: '0.68rem', background: 'rgba(6,182,212,0.1)', color: '#06b6d4', border: '1px solid rgba(6,182,212,0.2)', borderRadius: 20, padding: '0.1rem 0.5rem', fontWeight: 700 }}>
                        Con link
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  className="adm-btn-confirm"
                  style={{ background: 'linear-gradient(135deg,#f97316,#ea580c)', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', gap: 6 }}
                  onClick={submitAnnouncement}
                  disabled={annSaving || !annTitle.trim() || !annMessage.trim()}
                >
                  <Send size={14} />
                  {annSaving ? 'Enviando...' : 'Publicar anuncio'}
                </button>
              </div>
            </div>

            {/* Lista de anuncios activos */}
            <h3 className="adm-card-title" style={{ marginBottom: '0.75rem' }}><Bell size={15} /> Anuncios activos</h3>
            {fetching ? <div className="adm-loading"><div className="adm-spinner" /></div> : announcements.length === 0 ? (
              <div className="adm-empty">
                <Bell size={44} strokeWidth={1} style={{ opacity: 0.4 }} />
                <p style={{ marginTop: '0.75rem', color: 'var(--adm-muted)' }}>No hay anuncios activos</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {announcements.map(ann => {
                  const expHours = Math.max(0, Math.ceil((new Date(ann.expiresAt).getTime() - Date.now()) / 3600000));
                  const isExpired = new Date(ann.expiresAt) < new Date();
                  return (
                    <div key={ann._id} style={{
                      background: 'var(--adm-surface)',
                      border: `1px solid ${isExpired ? 'rgba(239,68,68,0.25)' : 'var(--adm-border)'}`,
                      borderLeft: `3px solid ${isExpired ? '#ef4444' : audienceColor(ann.audience)}`,
                      borderRadius: 12,
                      padding: '1rem 1.25rem',
                      opacity: isExpired ? 0.7 : 1,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
                            <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--adm-text)' }}>{ann.title}</span>
                            <span style={{ fontSize: '0.68rem', fontWeight: 700, background: `rgba(${ann.audience === 'all' ? '249,115,22' : ann.audience === 'seller' ? '139,92,246' : '6,182,212'},0.12)`, color: audienceColor(ann.audience), border: `1px solid ${audienceColor(ann.audience)}40`, borderRadius: 20, padding: '0.1rem 0.5rem' }}>
                              {audienceLabel(ann.audience)}
                            </span>
                            {isExpired
                              ? <span style={{ fontSize: '0.68rem', fontWeight: 700, background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 20, padding: '0.1rem 0.5rem' }}>Expirado</span>
                              : <span style={{ fontSize: '0.68rem', fontWeight: 700, background: 'rgba(34,197,94,0.1)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 20, padding: '0.1rem 0.5rem', display: 'flex', alignItems: 'center', gap: 3 }}>
                                  <Clock size={9} /> {expHours}h restantes
                                </span>
                            }
                          </div>
                          <p style={{ fontSize: '0.82rem', color: 'var(--adm-muted2)', lineHeight: 1.5, margin: '0 0 0.35rem' }}>{ann.message}</p>
                          {ann.link && (
                            <a href={ann.link} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.75rem', color: '#06b6d4', fontWeight: 600 }}>{ann.link}</a>
                          )}
                          <div style={{ fontSize: '0.68rem', color: 'var(--adm-muted)', marginTop: '0.35rem', fontFamily: 'monospace' }}>
                            Creado: {new Date(ann.createdAt).toLocaleString('es-AR')} · Expira: {new Date(ann.expiresAt).toLocaleString('es-AR')}
                          </div>
                        </div>
                        <button className="adm-remove-feat" onClick={() => deleteAnnouncement(ann._id)}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ════ DESTACADOS NEGOCIO ════ */}
        {tab === 'featured-biz' && (
          <div className="adm-content">
            <div className="adm-featured-header"><p className="adm-muted">{paidBiz} pagados{pendingBiz > 0 && <span style={{color:'#f59e0b',marginLeft:'0.75rem'}}>· {pendingBiz} pendientes</span>}</p></div>
            {fetching ? <div className="adm-loading"><div className="adm-spinner" /></div> : featuredBiz.length === 0 ? (
              <div className="adm-empty"><Crown size={48} strokeWidth={1} /><p>No hay negocios destacados activos</p></div>
            ) : (
              <div className="adm-featured-grid">
                {featuredBiz.map(f => (
                  <div key={f._id} className="adm-featured-card" style={!f.paid ? { borderColor: 'rgba(245,158,11,0.4)', opacity: 0.85 } : undefined}>
                    <div className="adm-featured-card-top">
                      <img src={f.business.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(f.business.name)}&size=56&background=f97316&color=fff`} alt={f.business.name} className="adm-featured-logo" />
                      <div className="adm-featured-info">
                        <div className="adm-featured-name">{f.business.name}</div>
                        {f.paid ? <span style={{display:'inline-flex',alignItems:'center',gap:3,background:'rgba(34,197,94,0.12)',color:'#4ade80',border:'1px solid rgba(34,197,94,0.25)',borderRadius:20,padding:'0.12rem 0.5rem',fontSize:'0.68rem',fontWeight:700,marginTop:4}}><CheckCircle size={9} /> Pagado</span>
                          : <span style={{display:'inline-flex',alignItems:'center',gap:3,background:'rgba(245,158,11,0.12)',color:'#f59e0b',border:'1px solid rgba(245,158,11,0.3)',borderRadius:20,padding:'0.12rem 0.5rem',fontSize:'0.68rem',fontWeight:700,marginTop:4}}>Pendiente de pago</span>}
                        {f.note && <div className="adm-featured-note">"{f.note}"</div>}
                      </div>
                      <button className="adm-remove-feat" onClick={() => removeFeatBiz(f.business._id)}><Trash2 size={14} /></button>
                    </div>
                    <div className="adm-featured-card-footer">
                      <span className="adm-feat-type">{f.type} - {f.days}d</span>
                      <span className="adm-feat-days"><Clock size={12} /> {daysLeft(f.endDate)} dias restantes</span>
                      {!f.paid && <button onClick={() => confirmBizPayment(f._id)} style={{display:'inline-flex',alignItems:'center',gap:4,background:'rgba(34,197,94,0.15)',color:'#4ade80',border:'1px solid rgba(34,197,94,0.3)',borderRadius:8,padding:'0.3rem 0.75rem',fontSize:'0.75rem',fontWeight:700,cursor:'pointer',marginLeft:'auto'}}><CreditCard size={12} /> Confirmar pago</button>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ════ DESTACADOS PRODUCTO ════ */}
        {tab === 'featured-products' && (
          <div className="adm-content">
            <div className="adm-featured-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p className="adm-muted">{paidProds} pagados{pendingProds > 0 && <span style={{color:'#f59e0b',marginLeft:'0.75rem'}}>· {pendingProds} pendientes</span>}</p>
              <button className="adm-btn-sm gold" onClick={openFeatProd}><Tag size={13} /> Destacar producto</button>
            </div>
            {fetching ? <div className="adm-loading"><div className="adm-spinner" /></div> : featuredProds.length === 0 ? (
              <div className="adm-empty"><Tag size={48} strokeWidth={1} /><p>No hay productos destacados activos</p></div>
            ) : (
              <div className="adm-featured-grid">
                {featuredProds.map(p => (
                  <div key={p._id} className="adm-featured-card" style={!p.featuredPaid ? { borderColor: 'rgba(245,158,11,0.4)', opacity: 0.85 } : undefined}>
                    <div className="adm-featured-card-top">
                      <img src={p.image || `https://via.placeholder.com/56x56?text=${encodeURIComponent(p.name[0])}`} alt={p.name} style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 10, border: '1px solid var(--adm-border2)', flexShrink: 0 }} />
                      <div className="adm-featured-info">
                        <div className="adm-featured-name">{p.name}</div>
                        <div className="adm-muted" style={{fontSize:'0.78rem'}}>{p.businessId?.name}{p.businessId?.city ? ` - ${p.businessId.city}` : ''}</div>
                        <div className="adm-muted" style={{fontSize:'0.75rem',marginTop:2}}>${p.price?.toLocaleString()} - {p.category}</div>
                        {p.featuredPaid ? <span style={{display:'inline-flex',alignItems:'center',gap:3,background:'rgba(34,197,94,0.12)',color:'#4ade80',border:'1px solid rgba(34,197,94,0.25)',borderRadius:20,padding:'0.12rem 0.5rem',fontSize:'0.68rem',fontWeight:700,marginTop:4}}><CheckCircle size={9} /> Pagado</span>
                          : <span style={{display:'inline-flex',alignItems:'center',gap:3,background:'rgba(245,158,11,0.12)',color:'#f59e0b',border:'1px solid rgba(245,158,11,0.3)',borderRadius:20,padding:'0.12rem 0.5rem',fontSize:'0.68rem',fontWeight:700,marginTop:4}}>Pendiente</span>}
                      </div>
                      <button className="adm-remove-feat" onClick={() => removeFeatProd(p._id)}><Trash2 size={14} /></button>
                    </div>
                    <div className="adm-featured-card-footer">
                      <span className="adm-feat-type">{p.featuredDays}d contratados</span>
                      {p.featuredUntil && <span className="adm-feat-days"><Clock size={12} /> {daysLeft(p.featuredUntil)} dias restantes</span>}
                      {!p.featuredPaid && <button onClick={() => confirmProdPayment(p._id)} style={{display:'inline-flex',alignItems:'center',gap:4,background:'rgba(34,197,94,0.15)',color:'#4ade80',border:'1px solid rgba(34,197,94,0.3)',borderRadius:8,padding:'0.3rem 0.75rem',fontSize:'0.75rem',fontWeight:700,cursor:'pointer',marginLeft:'auto'}}><CreditCard size={12} /> Confirmar pago</button>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ════ PRODUCTOS BAJO REVISION ════ */}
        {tab === 'product-reviews' && (
          <div className="adm-content">
            <div style={{ marginBottom: '0.75rem' }}>
              <p className="adm-muted" style={{ fontSize: '0.82rem' }}>
                {reviewProds.length === 0 ? 'No hay productos pendientes de revision.' : `${reviewProds.length} producto${reviewProds.length !== 1 ? 's' : ''} enviado${reviewProds.length !== 1 ? 's' : ''} a revision por sus vendedores.`}
              </p>
            </div>
            {fetching ? (
              <div className="adm-loading"><div className="adm-spinner" /></div>
            ) : reviewProds.length === 0 ? (
              <div className="adm-empty">
                <Package size={48} strokeWidth={1} style={{ opacity: 0.4 }} />
                <p style={{ marginTop: '0.75rem', color: 'var(--adm-muted)' }}>Todo en orden — ningun producto pendiente de revision</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {reviewProds.map(p => {
                  const isOpen = moderateOpen === p._id;
                  return (
                    <div key={p._id} style={{ background: 'var(--adm-surface)', border: '1px solid var(--adm-border)', borderRadius: 14, overflow: 'hidden', borderLeft: '3px solid #f59e0b' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', padding: '1rem 1.25rem' }}>
                        {p.image && <img src={p.image} alt={p.name} style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 10, border: '1px solid var(--adm-border2)', flexShrink: 0 }} />}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
                            <span style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--adm-text)' }}>{p.name}</span>
                            <span style={{ fontSize: '0.68rem', fontWeight: 700, background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 20, padding: '0.1rem 0.5rem', display: 'flex', alignItems: 'center', gap: 3 }}>
                              <Clock size={9} /> Pendiente de revision
                            </span>
                          </div>
                          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
                            <span style={{ fontSize: '0.78rem', color: 'var(--adm-muted2)' }}>Negocio: <strong style={{ color: 'var(--adm-text)' }}>{p.businessId?.name || '—'}</strong></span>
                            {p.businessId?.city && <span style={{ fontSize: '0.78rem', color: 'var(--adm-muted2)' }}>{p.businessId.city}</span>}
                            <span style={{ fontSize: '0.78rem', color: 'var(--adm-muted2)' }}>Vendedor: <strong style={{ color: 'var(--adm-text)' }}>{p.user?.name || '—'}</strong></span>
                            <span style={{ fontSize: '0.78rem', color: 'var(--adm-muted2)' }}>${p.price?.toLocaleString()} · {p.category}</span>
                          </div>
                          {p.blockedReason && (
                            <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '0.4rem 0.7rem', marginBottom: '0.35rem' }}>
                              <span style={{ fontSize: '0.72rem', color: '#f87171', fontWeight: 700 }}>Motivo del bloqueo: </span>
                              <span style={{ fontSize: '0.72rem', color: 'rgba(252,165,165,0.85)' }}>{p.blockedReason}</span>
                            </div>
                          )}
                          {p.reviewNote && (
                            <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8, padding: '0.4rem 0.7rem', marginBottom: '0.35rem' }}>
                              <span style={{ fontSize: '0.72rem', color: '#f59e0b', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}><MessageSquare size={11} /> Mensaje del vendedor:</span>
                              <p style={{ margin: '0.2rem 0 0', fontSize: '0.78rem', color: 'rgba(253,186,116,0.85)', fontStyle: 'italic', lineHeight: 1.5 }}>"{p.reviewNote}"</p>
                            </div>
                          )}
                          <span style={{ fontSize: '0.68rem', color: 'var(--adm-muted)', fontFamily: 'monospace' }}>Enviado: {new Date(p.updatedAt).toLocaleString('es-AR')}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flexShrink: 0 }}>
                          <button onClick={() => handleAdminDeleteProduct(p._id, p.name)} className="adm-btn-sm red" title="Eliminar producto permanentemente"><Trash2 size={12} /> Eliminar</button>
                        </div>
                      </div>
                      {isOpen ? (
                        <div style={{ borderTop: '1px solid var(--adm-border)', background: 'var(--adm-surface2)', padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--adm-text)' }}>Tomar decision sobre este producto</div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                            {([
                              { value: 'unblock',         label: 'Aprobar y desbloquear',  desc: 'El producto vuelve a ser visible al publico',          color: '#22c55e', bg: 'rgba(34,197,94,0.12)',  border: 'rgba(34,197,94,0.3)' },
                              { value: 'keep_blocked',    label: 'Rechazar revision',      desc: 'El producto sigue bloqueado temporalmente',             color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)' },
                              { value: 'permanent_block', label: 'Bloqueo permanente',     desc: 'El vendedor no podra solicitar revision nuevamente',    color: '#ef4444', bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.3)' },
                            ] as const).map(opt => (
                              <button key={opt.value} onClick={() => setModerateAction(opt.value)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '0.65rem 1rem', borderRadius: 10, cursor: 'pointer', border: `1.5px solid ${moderateAction === opt.value ? opt.color : opt.border}`, background: moderateAction === opt.value ? opt.bg : 'transparent', minWidth: 160, flex: 1, textAlign: 'left', transition: 'all 0.15s' }}>
                                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: moderateAction === opt.value ? opt.color : 'var(--adm-muted2)', marginBottom: 2 }}>{moderateAction === opt.value && '✓ '}{opt.label}</span>
                                <span style={{ fontSize: '0.7rem', color: 'var(--adm-muted)', lineHeight: 1.3 }}>{opt.desc}</span>
                              </button>
                            ))}
                          </div>
                          <div>
                            <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--adm-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.35rem' }}>Nota para el vendedor (opcional)</label>
                            <input type="text" className="adm-input" placeholder="Ej: El contenido sigue sin cumplir las politicas..." value={moderateNote} onChange={e => setModerateNote(e.target.value)} />
                          </div>
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <button className="adm-btn-cancel" onClick={() => { setModerateOpen(null); setModerateAction(''); setModerateNote(''); }}>Cancelar</button>
                            <button className={`adm-btn-confirm ${moderateAction === 'unblock' ? 'green' : moderateAction === 'permanent_block' ? 'red' : ''}`} onClick={() => handleModerateProduct(p._id)} disabled={!moderateAction || moderateSaving}><ShieldAlert size={14} />{moderateSaving ? 'Guardando...' : 'Confirmar decision'}</button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ borderTop: '1px solid var(--adm-border)', padding: '0.6rem 1.25rem', display: 'flex', justifyContent: 'flex-end' }}>
                          <button className="adm-btn-sm" style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }} onClick={() => { setModerateOpen(p._id); setModerateAction(''); setModerateNote(''); }}>
                            <Eye size={12} /> Revisar y decidir
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ════ REPORTES ════ */}
        {tab === 'reports' && (
          <div className="adm-content">
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '0.5rem' }}>
              <div className="adm-report-filters">
                <span style={{ fontSize: '0.78rem', color: 'var(--adm-muted)', fontWeight: 600 }}>Estado:</span>
                {(['all','pending','action_taken','dismissed'] as const).map(f => (
                  <button key={f} className={`adm-filter-btn ${reportFilter === f ? 'active' : ''}`} onClick={() => setReportFilter(f)}>
                    {f === 'all' ? 'Todos' : f === 'pending' ? 'Pendientes' : f === 'action_taken' ? 'Resueltos' : 'Desestimados'}
                  </button>
                ))}
              </div>
              <div className="adm-report-filters">
                <span style={{ fontSize: '0.78rem', color: 'var(--adm-muted)', fontWeight: 600 }}>Tipo:</span>
                {(['all','product','business'] as const).map(f => (
                  <button key={f} className={`adm-filter-btn ${reportTypeFilter === f ? 'active' : ''}`} onClick={() => setReportTypeFilter(f)}>
                    {f === 'all' ? 'Todos' : f === 'product' ? 'Productos' : 'Negocios'}
                  </button>
                ))}
              </div>
            </div>
            {fetching ? <div className="adm-loading"><div className="adm-spinner" /></div> : reports.length === 0 ? (
              <div className="adm-empty"><Flag size={48} strokeWidth={1} /><p>No hay reportes con este filtro</p></div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {reports.map(r => {
                  const si = statusInfo(r.status);
                  const isOpen = resolveOpen === r._id;
                  return (
                    <div key={r._id} className={`adm-report-card ${r.autoBlocked ? 'auto-blocked' : ''} ${r.status !== 'pending' ? 'resolved' : ''}`}>
                      <div className="adm-report-card-header">
                        <span className={`adm-report-type-badge ${r.targetType}`}>{r.targetType === 'product' ? <Package size={10} /> : <Store size={10} />}{r.targetType === 'product' ? 'Producto' : 'Negocio'}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="adm-report-target-name">{r.targetName || '—'}</div>
                          {r.businessName && r.targetType === 'product' && <div style={{ fontSize: '0.73rem', color: 'var(--adm-muted2)', marginTop: 2 }}>Negocio: <strong>{r.businessName}</strong></div>}
                        </div>
                        {r.autoBlocked && <span className="adm-report-auto-chip"><AlertOctagon size={10} /> Auto-bloqueado</span>}
                        <span className={`adm-report-status ${si.cls}`}>{si.label}</span>
                        <span style={{ fontSize: '0.68rem', color: 'var(--adm-muted2)', background: 'var(--adm-surface2)', padding: '0.15rem 0.5rem', borderRadius: 999, border: '1px solid var(--adm-border2)', whiteSpace: 'nowrap' }}>{CATEGORY_LABELS[r.category] || r.category}</span>
                      </div>
                      <div className="adm-report-meta">
                        <div className="adm-report-meta-row"><span className="adm-report-meta-label">Reportado por:</span><span className="adm-report-meta-val highlight">{r.reportedBy?.name || r.reporterName}</span><span className="adm-report-meta-val">{r.reportedBy?.email}</span></div>
                        <div className="adm-report-meta-row"><span className="adm-report-meta-label">Fecha:</span><span className="adm-report-meta-val">{new Date(r.createdAt).toLocaleString('es-AR')}</span></div>
                        {r.adminNote && <div className="adm-report-meta-row"><span className="adm-report-meta-label">Nota:</span><span className="adm-report-meta-val" style={{ color: '#fdba74', fontStyle: 'italic' }}>"{r.adminNote}"</span></div>}
                        {r.adminAction && r.adminAction !== 'none' && <div className="adm-report-meta-row"><span className="adm-report-meta-label">Acciones:</span><span className="adm-report-meta-val" style={{ color: '#f97316', fontWeight: 700 }}>{r.adminAction.split(',').map(a => a.trim()).join(' - ')}</span></div>}
                      </div>
                      <div className="adm-report-reason-box">"{r.reason}"</div>
                      {r.detectedKeywords?.length > 0 && <div className="adm-report-keywords"><span style={{ fontSize: '0.68rem', color: '#f87171', fontWeight: 700, marginRight: 2 }}>Palabras detectadas:</span>{r.detectedKeywords.map(kw => <span key={kw} className="adm-keyword-chip">{kw}</span>)}</div>}
                      {r.status === 'pending' && isOpen && (
                        <div className="adm-resolve-form">
                          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--adm-text)', marginBottom: '0.2rem' }}>Elegí una o mas acciones</div>
                          <div style={{ marginBottom: '0.75rem' }}>
                            <div style={{ fontSize: '0.68rem', color: 'var(--adm-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.4rem' }}>Sobre el contenido {r.targetType === 'product' ? '(producto)' : '(negocio)'}</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
                              {r.targetType === 'product' && (<>
                                <button onClick={() => toggleAction('block_product')} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '0.38rem 0.85rem', borderRadius: 8, fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', border: `1.5px solid ${resolveActions.includes('block_product') ? '#ef4444' : 'rgba(239,68,68,0.3)'}`, background: resolveActions.includes('block_product') ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.07)', color: resolveActions.includes('block_product') ? '#fca5a5' : 'rgba(239,68,68,0.7)' }}>{resolveActions.includes('block_product') && '✓ '}Bloquear producto</button>
                                <button onClick={() => toggleAction('unblock_product')} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '0.38rem 0.85rem', borderRadius: 8, fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', border: `1.5px solid ${resolveActions.includes('unblock_product') ? '#22c55e' : 'rgba(34,197,94,0.3)'}`, background: resolveActions.includes('unblock_product') ? 'rgba(34,197,94,0.2)' : 'rgba(34,197,94,0.07)', color: resolveActions.includes('unblock_product') ? '#4ade80' : 'rgba(74,222,128,0.7)' }}>{resolveActions.includes('unblock_product') && '✓ '}Desbloquear producto</button>
                              </>)}
                              {(r.targetType === 'business' || !!r.businessId) && (<>
                                <button onClick={() => toggleAction('block_business')} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '0.38rem 0.85rem', borderRadius: 8, fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', border: `1.5px solid ${resolveActions.includes('block_business') ? '#dc2626' : 'rgba(220,38,38,0.3)'}`, background: resolveActions.includes('block_business') ? 'rgba(220,38,38,0.2)' : 'rgba(220,38,38,0.07)', color: resolveActions.includes('block_business') ? '#fca5a5' : 'rgba(220,38,38,0.7)' }}>{resolveActions.includes('block_business') && '✓ '}Bloquear negocio</button>
                                <button onClick={() => toggleAction('unblock_business')} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '0.38rem 0.85rem', borderRadius: 8, fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', border: `1.5px solid ${resolveActions.includes('unblock_business') ? '#22c55e' : 'rgba(34,197,94,0.3)'}`, background: resolveActions.includes('unblock_business') ? 'rgba(34,197,94,0.2)' : 'rgba(34,197,94,0.07)', color: resolveActions.includes('unblock_business') ? '#4ade80' : 'rgba(74,222,128,0.7)' }}>{resolveActions.includes('unblock_business') && '✓ '}Desbloquear negocio</button>
                              </>)}
                            </div>
                          </div>
                          <div style={{ marginBottom: '0.75rem' }}>
                            <div style={{ fontSize: '0.68rem', color: 'var(--adm-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.4rem' }}>Sancion al vendedor</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
                              <button onClick={() => toggleAction('warn')} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '0.38rem 0.85rem', borderRadius: 8, fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', border: `1.5px solid ${resolveActions.includes('warn') ? '#f59e0b' : 'rgba(245,158,11,0.3)'}`, background: resolveActions.includes('warn') ? 'rgba(245,158,11,0.2)' : 'rgba(245,158,11,0.07)', color: resolveActions.includes('warn') ? '#fbbf24' : 'rgba(251,191,36,0.7)' }}>{resolveActions.includes('warn') && '✓ '}Advertencia</button>
                              <button onClick={() => toggleAction('strike')} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '0.38rem 0.85rem', borderRadius: 8, fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', border: `1.5px solid ${resolveActions.includes('strike') ? '#f97316' : 'rgba(249,115,22,0.3)'}`, background: resolveActions.includes('strike') ? 'rgba(249,115,22,0.2)' : 'rgba(249,115,22,0.07)', color: resolveActions.includes('strike') ? '#fdba74' : 'rgba(253,186,116,0.7)' }}>{resolveActions.includes('strike') && '✓ '}Strike al negocio</button>
                            </div>
                          </div>
                          <div style={{ marginBottom: '0.75rem' }}>
                            <div style={{ fontSize: '0.68rem', color: 'var(--adm-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.4rem' }}>Sin accion (reporte invalido)</div>
                            <button onClick={() => toggleAction('dismiss')} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '0.38rem 0.85rem', borderRadius: 8, fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', border: `1.5px solid ${resolveActions.includes('dismiss') ? 'rgba(107,114,128,0.8)' : 'rgba(107,114,128,0.3)'}`, background: resolveActions.includes('dismiss') ? 'rgba(107,114,128,0.15)' : 'transparent', color: resolveActions.includes('dismiss') ? '#d1d5db' : 'rgba(156,163,175,0.7)' }}>{resolveActions.includes('dismiss') && '✓ '}Desestimar reporte</button>
                          </div>
                          {resolveActions.length > 0 && (
                            <div style={{ background: 'rgba(249,115,22,0.07)', border: '1px solid rgba(249,115,22,0.2)', borderRadius: 8, padding: '0.6rem 0.9rem', marginBottom: '0.75rem' }}>
                              <span style={{ fontSize: '0.75rem', color: '#fdba74', fontWeight: 700 }}>Acciones a ejecutar:</span>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginTop: '0.3rem' }}>
                                {resolveActions.map(a => <span key={a} style={{ fontSize: '0.7rem', fontWeight: 700, background: 'rgba(249,115,22,0.15)', border: '1px solid rgba(249,115,22,0.3)', borderRadius: 20, padding: '0.15rem 0.55rem', color: '#f97316' }}>{a}</span>)}
                              </div>
                            </div>
                          )}
                          <div style={{ marginBottom: '0.65rem' }}>
                            <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--adm-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.35rem' }}>Nota para el usuario (opcional)</label>
                            <input type="text" className="adm-input" placeholder="Ej: Contenido que viola nuestras politicas..." value={resolveNote} onChange={e => setResolveNote(e.target.value)} />
                          </div>
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <button className="adm-btn-cancel" onClick={() => { setResolveOpen(null); setResolveActions([]); setResolveNote(''); }}>Cancelar</button>
                            <button className={`adm-btn-confirm ${resolveActions.includes('dismiss') ? '' : resolveActions.some(a => ['block_product','block_business','strike'].includes(a)) ? 'red' : 'green'}`} onClick={() => handleResolveReport(r._id)} disabled={!resolveActions.length || resolveSaving}><ShieldAlert size={14} />{resolveSaving ? 'Ejecutando...' : `Ejecutar ${resolveActions.length} accion${resolveActions.length !== 1 ? 'es' : ''}`}</button>
                          </div>
                        </div>
                      )}
                      <div className="adm-report-footer">
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          {r.status === 'pending' && (
                            <button className="adm-btn-sm" style={{ background: isOpen ? 'var(--adm-border)' : 'rgba(249,115,22,0.12)', color: isOpen ? 'var(--adm-muted2)' : '#f97316', border: `1px solid ${isOpen ? 'var(--adm-border2)' : 'rgba(249,115,22,0.3)'}` }} onClick={() => { if (isOpen) { setResolveOpen(null); setResolveActions([]); setResolveNote(''); } else { setResolveOpen(r._id); setResolveActions([]); setResolveNote(''); } }}>
                              {isOpen ? <><EyeOff size={12} /> Cerrar</> : <><Eye size={12} /> Resolver</>}
                            </button>
                          )}
                          <button className="adm-btn-sm red" onClick={() => handleDeleteReport(r._id)}><Trash2 size={12} /> Eliminar</button>
                        </div>
                        <span style={{ fontSize: '0.72rem', color: 'var(--adm-muted)', fontFamily: 'monospace' }}>#{r._id.slice(-8).toUpperCase()}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── Modal: suscripcion ──────────────────────────────────────────────── */}
      {subModal && (
        <div className="adm-modal-overlay" onClick={() => setSubModal(false)}>
          <div className="adm-modal" onClick={e => e.stopPropagation()}>
            <div className="adm-modal-header">
              <h2><BadgeDollarSign size={18} /> Suscripcion — {subBizName}</h2>
              <button onClick={() => setSubModal(false)}><X size={17} /></button>
            </div>
            <div className="adm-modal-body">
              <p style={{ fontSize: '0.82rem', color: 'var(--adm-muted2)', marginBottom: '1rem', lineHeight: 1.5 }}>
                Al confirmar, se activara la suscripcion del negocio y se enviara una notificacion al vendedor con las fechas configuradas.
                Cuando queden 3 dias para el vencimiento, el sistema enviara automaticamente un aviso al chat del vendedor.
              </p>

              <div className="adm-field">
                <label className="adm-label">Fecha de pago</label>
                <input
                  type="date"
                  className="adm-input"
                  value={subFechaPago}
                  onChange={e => setSubFechaPago(e.target.value)}
                />
              </div>

              <div className="adm-field">
                <label className="adm-label">Fecha de vencimiento</label>
                <input
                  type="date"
                  className="adm-input"
                  value={subFechaFinaliza}
                  onChange={e => setSubFechaFinaliza(e.target.value)}
                />
              </div>

              {subFechaPago && subFechaFinaliza && (
                <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 10, padding: '0.75rem 1rem', marginBottom: '0.75rem' }}>
                  <div style={{ fontSize: '0.78rem', color: '#4ade80', fontWeight: 700, marginBottom: '0.3rem' }}>Resumen de suscripcion</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--adm-muted2)' }}>
                    Duracion: <strong style={{ color: 'var(--adm-text)' }}>
                      {Math.ceil((new Date(subFechaFinaliza).getTime() - new Date(subFechaPago).getTime()) / 86400000)} dias
                    </strong>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--adm-muted)', marginTop: '0.2rem' }}>
                    Se notificara al vendedor 3 dias antes del vencimiento.
                  </div>
                </div>
              )}

              <div className="adm-modal-footer">
                <button className="adm-btn-cancel" onClick={() => setSubModal(false)}>Cancelar</button>
                <button className="adm-btn-confirm green" onClick={submitSubscription} disabled={subSaving || !subFechaPago || !subFechaFinaliza}>
                  <BadgeDollarSign size={15} />
                  {subSaving ? 'Guardando...' : 'Activar suscripcion'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modales previos sin cambio: detalle usuario */}
      {userDetail && (
        <DetailModal title={`Usuario: ${userDetail.name}`} onClose={() => setUserDetail(null)}>
          <div className="adm-detail-row"><span className="adm-detail-label">Email</span><span className="adm-detail-val adm-muted">{userDetail.email}</span></div>
          <div className="adm-detail-row"><span className="adm-detail-label">Estado</span><span className="adm-detail-val">{userDetail.blocked ? <span className="adm-status blocked"><Ban size={12} /> Bloqueado</span> : <span className="adm-status active"><CheckCircle size={12} /> Activo</span>}</span></div>
          <div className="adm-detail-row"><span className="adm-detail-label">Rol</span><span className="adm-detail-val"><select className={`adm-role-select adm-role-${userDetail.role}`} value={userDetail.role} onChange={e => changeRole(userDetail._id, e.target.value)} disabled={userDetail.role === 'admin'} style={{fontSize:'0.85rem',padding:'0.35rem 0.7rem'}}><option value="user">user</option><option value="seller">seller</option><option value="admin">admin</option></select></span></div>
          <div className="adm-modal-footer" style={{paddingTop:'0.75rem'}}>
            <button className="adm-btn-cancel" onClick={() => setUserDetail(null)}>Cerrar</button>
            <button className={`adm-btn-confirm ${userDetail.blocked ? 'green' : 'red'}`} onClick={() => blockUser(userDetail._id, userDetail.name, !!userDetail.blocked)} disabled={userDetail.role === 'admin'}>{userDetail.blocked ? <><CheckCircle size={14} /> Desbloquear</> : <><Ban size={14} /> Bloquear</>}</button>
          </div>
        </DetailModal>
      )}

      {bizDetail && (
        <DetailModal title={bizDetail.name} onClose={() => setBizDetail(null)}>
          <div className="adm-detail-row"><span className="adm-detail-label">Dueno</span><span className="adm-detail-val adm-muted">{bizDetail.owner?.name}</span></div>
          <div className="adm-detail-row"><span className="adm-detail-label">Estado</span><span className="adm-detail-val">{bizDetail.blocked ? <span className="adm-status blocked"><Ban size={12} /> Bloqueado</span> : <span className="adm-status active"><CheckCircle size={12} /> Activo</span>}</span></div>
          <div style={{display:'flex',flexDirection:'column',gap:'0.5rem',paddingTop:'0.75rem'}}>
            <button className={`adm-btn-sm ${bizDetail.verified ? 'orange' : 'green'}`} style={{justifyContent:'center',padding:'0.55rem'}} onClick={() => verifyBusiness(bizDetail._id, bizDetail.verified)}>{bizDetail.verified ? <><XCircle size={14}/> Quitar verificacion</> : <><CheckCircle size={14}/> Verificar</>}</button>
            <button className="adm-btn-sm gold" style={{justifyContent:'center',padding:'0.55rem'}} onClick={() => { setBizDetail(null); openBizProdModal(bizDetail); }}><Tag size={14} /> Destacar productos</button>
            <button className="adm-btn-sm" style={{justifyContent:'center',padding:'0.55rem',background:'rgba(249,115,22,0.12)',color:'#f97316',border:'1px solid rgba(249,115,22,0.3)'}} onClick={() => { setBizDetail(null); openFeatBiz(bizDetail); }}><Crown size={14} /> Plan negocio</button>
            <button className={`adm-btn-sm ${bizDetail.blocked ? 'green' : 'red'}`} style={{justifyContent:'center',padding:'0.55rem'}} onClick={() => { setBizDetail(null); openBlockBiz(bizDetail._id); }}>{bizDetail.blocked ? <><CheckCircle size={14}/> Desbloquear</> : <><Ban size={14}/> Bloquear</>}</button>
            <button className="adm-btn-cancel" style={{textAlign:'center'}} onClick={() => setBizDetail(null)}>Cerrar</button>
          </div>
        </DetailModal>
      )}

      {/* Modal: destacar productos de negocio */}
      {bizProdModal && (
        <div className="adm-modal-overlay" onClick={() => setBizProdModal(false)}>
          <div className="adm-modal" onClick={e => e.stopPropagation()} style={{maxWidth:580}}>
            <div className="adm-modal-header"><h2><Tag size={18} /> Productos de "{bizProdBizName}"</h2><button onClick={() => setBizProdModal(false)}><X size={17} /></button></div>
            <div className="adm-modal-body">
              <div className="adm-search-bar" style={{marginBottom:'0.75rem'}}><Search size={15} /><input placeholder="Filtrar productos..." value={bizProdFilter} onChange={e => setBizProdFilter(e.target.value)} /></div>
              <div style={{display:'flex',gap:'0.5rem',marginBottom:'0.75rem',alignItems:'center',flexWrap:'wrap'}}>
                <span style={{fontSize:'0.78rem',color:'var(--adm-muted)',flex:1}}>{selectedProdIds.size > 0 ? `${selectedProdIds.size} seleccionados` : 'Selecciona los productos'}</span>
                <button onClick={selectAllFiltered} style={{fontSize:'0.72rem',padding:'0.25rem 0.6rem',background:'rgba(249,115,22,0.12)',color:'#f97316',border:'1px solid rgba(249,115,22,0.3)',borderRadius:6,cursor:'pointer',fontWeight:700}}>Todos ({filteredBizProds.length})</button>
                {selectedProdIds.size > 0 && <button onClick={deselectAll} style={{fontSize:'0.72rem',padding:'0.25rem 0.6rem',background:'var(--adm-surface2)',color:'var(--adm-muted2)',border:'1px solid var(--adm-border2)',borderRadius:6,cursor:'pointer'}}>Deseleccionar</button>}
              </div>
              {bizProdLoading ? <div className="adm-loading" style={{height:120}}><div className="adm-spinner" /></div> : filteredBizProds.length === 0 ? (
                <div style={{textAlign:'center',padding:'1.5rem',color:'var(--adm-muted)',fontSize:'0.85rem'}}>Sin productos</div>
              ) : (
                <div style={{maxHeight:260,overflowY:'auto',border:'1px solid var(--adm-border2)',borderRadius:10,marginBottom:'1rem'}}>
                  {filteredBizProds.map(p => {
                    const isSelected = selectedProdIds.has(p._id);
                    const isActive   = p.isActivelyFeatured;
                    return (
                      <div key={p._id} style={{display:'flex',alignItems:'center',gap:'0.65rem',padding:'0.65rem 0.85rem',borderBottom:'1px solid var(--adm-border)',background:isSelected?'rgba(249,115,22,0.08)':'transparent',cursor:'pointer'}} onClick={() => !isActive && toggleProdSelect(p._id)}>
                        <div style={{width:18,height:18,borderRadius:5,flexShrink:0,border:`2px solid ${isSelected?'#f97316':'var(--adm-border2)'}`,background:isSelected?'#f97316':'transparent',display:'flex',alignItems:'center',justifyContent:'center',opacity:isActive?0.4:1}}>
                          {isSelected && <CheckCircle size={12} color="#fff" strokeWidth={3} />}
                        </div>
                        <img src={p.image || `https://via.placeholder.com/36?text=${p.name[0]}`} alt="" style={{width:36,height:36,objectFit:'cover',borderRadius:7,border:'1px solid var(--adm-border2)',flexShrink:0}} />
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontWeight:700,fontSize:'0.85rem',color:'var(--adm-text)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{p.name}</div>
                          <div style={{fontSize:'0.73rem',color:'var(--adm-muted2)'}}>${p.price?.toLocaleString()} - {p.category}</div>
                        </div>
                        {isActive && <><span style={{fontSize:'0.65rem',color:'#4ade80',fontWeight:700}}><Crown size={10} /> Activo</span><button onClick={e => { e.stopPropagation(); removeSingleBizProd(p._id); }} style={{background:'rgba(239,68,68,0.12)',color:'#f87171',border:'1px solid rgba(239,68,68,0.25)',borderRadius:6,padding:'0.2rem 0.5rem',fontSize:'0.7rem',cursor:'pointer',flexShrink:0}}><Trash2 size={11} /></button></>}
                      </div>
                    );
                  })}
                </div>
              )}
              {selectedProdIds.size > 0 && (
                <div style={{borderTop:'1px solid var(--adm-border)',paddingTop:'0.85rem',display:'flex',flexDirection:'column',gap:'0.65rem'}}>
                  <div className="adm-field" style={{marginBottom:0}}><label className="adm-label">Dias de destacado</label><input type="number" min="1" max="365" value={bizProdDays} onChange={e => setBizProdDays(e.target.value)} className="adm-input" /></div>
                  <div className="adm-field" style={{marginBottom:0}}><label className="adm-label">Nota interna (opcional)</label><input type="text" value={bizProdNote} onChange={e => setBizProdNote(e.target.value)} className="adm-input" /></div>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0.65rem 0.85rem',background:bizProdPaid?'rgba(34,197,94,0.08)':'rgba(245,158,11,0.08)',border:`1px solid ${bizProdPaid?'rgba(34,197,94,0.25)':'rgba(245,158,11,0.25)'}`,borderRadius:10}}>
                    <p style={{fontWeight:700,fontSize:'0.82rem',color:bizProdPaid?'#4ade80':'#f59e0b',margin:0}}>{bizProdPaid?'Pago confirmado':'Pendiente de pago'}</p>
                    <label style={{flexShrink:0,cursor:'pointer',display:'flex',alignItems:'center',gap:'0.5rem'}}><input type="checkbox" checked={bizProdPaid} onChange={e => setBizProdPaid(e.target.checked)} style={{width:18,height:18,accentColor:'#22c55e',cursor:'pointer'}} /><span style={{fontSize:'0.8rem',color:'var(--adm-muted2)',fontWeight:600}}>Pagado</span></label>
                  </div>
                  <div className="adm-modal-footer" style={{paddingTop:0}}>
                    <button className="adm-btn-cancel" onClick={() => setBizProdModal(false)}>Cancelar</button>
                    <button className={`adm-btn-confirm ${bizProdPaid?'green':'gold'}`} onClick={submitBizProds} disabled={bizProdSaving||!bizProdDays}><Tag size={15} />{bizProdSaving?'Guardando...':bizProdPaid?`Destacar ${selectedProdIds.size} ahora`:`Crear ${selectedProdIds.size} pendientes`}</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: destacar negocio */}
      {featBizModal && (
        <div className="adm-modal-overlay" onClick={() => setFeatBizModal(false)}>
          <div className="adm-modal" onClick={e => e.stopPropagation()}>
            <div className="adm-modal-header"><h2><Crown size={18} /> Plan negocio "{featBizName}"</h2><button onClick={() => setFeatBizModal(false)}><X size={17} /></button></div>
            <div className="adm-modal-body">
              <label className="adm-label">Duracion</label>
              <div className="adm-feat-options">
                {(['daily','weekly','monthly','custom'] as const).map(t => (<button key={t} className={`adm-feat-opt ${featBizType===t?'active':''}`} onClick={() => setFeatBizType(t)}>{t==='daily'&&'1 dia'}{t==='weekly'&&'1 semana'}{t==='monthly'&&'1 mes'}{t==='custom'&&'Personalizado'}</button>))}
              </div>
              {featBizType==='custom'&&<div className="adm-field"><label className="adm-label">Dias</label><input type="number" min="1" max="365" value={featBizDays} onChange={e=>setFeatBizDays(e.target.value)} className="adm-input" /></div>}
              <div className="adm-field"><label className="adm-label">Nota interna</label><input type="text" value={featBizNote} onChange={e=>setFeatBizNote(e.target.value)} className="adm-input" /></div>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0.75rem',background:featBizPaid?'rgba(34,197,94,0.08)':'rgba(245,158,11,0.08)',border:`1px solid ${featBizPaid?'rgba(34,197,94,0.25)':'rgba(245,158,11,0.25)'}`,borderRadius:10}}>
                <p style={{fontWeight:700,fontSize:'0.85rem',color:featBizPaid?'#4ade80':'#f59e0b',margin:0}}>{featBizPaid?'Pago confirmado':'Pendiente de pago'}</p>
                <label style={{flexShrink:0,cursor:'pointer',display:'flex',alignItems:'center',gap:'0.5rem'}}><input type="checkbox" checked={featBizPaid} onChange={e=>setFeatBizPaid(e.target.checked)} style={{width:18,height:18,accentColor:'#22c55e',cursor:'pointer'}} /><span style={{fontSize:'0.8rem',color:'var(--adm-muted2)',fontWeight:600}}>Pagado</span></label>
              </div>
              <div className="adm-modal-footer"><button className="adm-btn-cancel" onClick={()=>setFeatBizModal(false)}>Cancelar</button><button className={`adm-btn-confirm ${featBizPaid?'green':'gold'}`} onClick={submitFeatBiz} disabled={featBizSaving}><Crown size={15} /> {featBizSaving?'Guardando...':featBizPaid?'Activar ahora':'Crear pendiente'}</button></div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: destacar producto individual */}
      {featProdModal && (
        <div className="adm-modal-overlay" onClick={() => setFeatProdModal(false)}>
          <div className="adm-modal" onClick={e => e.stopPropagation()} style={{maxWidth:520}}>
            <div className="adm-modal-header"><h2><Tag size={18} /> Destacar producto individual</h2><button onClick={() => setFeatProdModal(false)}><X size={17} /></button></div>
            <div className="adm-modal-body">
              {!selectedProd ? (
                <>
                  <label className="adm-label">Buscar producto</label>
                  <div className="adm-search-bar" style={{marginBottom:'0.75rem'}}><Search size={15} /><input autoFocus placeholder="Nombre del producto..." value={prodSearch} onChange={e=>setProdSearch(e.target.value)} />{prodSearching&&<div className="adm-spinner" style={{width:16,height:16,borderWidth:2,flexShrink:0}} />}</div>
                  {prodResults.length > 0 && (
                    <div style={{maxHeight:260,overflowY:'auto',border:'1px solid var(--adm-border2)',borderRadius:10}}>
                      {prodResults.map(p => (
                        <button key={p._id} onClick={() => setSelectedProd(p)} style={{display:'flex',alignItems:'center',gap:'0.65rem',padding:'0.7rem 1rem',width:'100%',background:'transparent',border:'none',borderBottom:'1px solid var(--adm-border)',cursor:'pointer',textAlign:'left'}}>
                          <img src={p.image||`https://via.placeholder.com/40?text=${p.name[0]}`} alt="" style={{width:40,height:40,objectFit:'cover',borderRadius:8,border:'1px solid var(--adm-border2)',flexShrink:0}} />
                          <div style={{flex:1,minWidth:0}}><div style={{fontWeight:700,fontSize:'0.88rem',color:'var(--adm-text)'}}>{p.name}</div><div style={{fontSize:'0.75rem',color:'var(--adm-muted2)'}}>{p.businessId?.name} - ${p.price?.toLocaleString()}</div></div>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div style={{display:'flex',alignItems:'center',gap:'0.75rem',padding:'0.75rem',background:'var(--adm-surface2)',borderRadius:10,border:'1px solid var(--adm-border2)',marginBottom:'0.75rem'}}>
                    <img src={selectedProd.image||`https://via.placeholder.com/48?text=${selectedProd.name[0]}`} alt="" style={{width:48,height:48,objectFit:'cover',borderRadius:8,border:'1px solid var(--adm-border2)',flexShrink:0}} />
                    <div style={{flex:1,minWidth:0}}><div style={{fontWeight:700,color:'var(--adm-text)',fontSize:'0.9rem'}}>{selectedProd.name}</div><div style={{fontSize:'0.78rem',color:'var(--adm-muted2)'}}>{selectedProd.businessId?.name} - ${selectedProd.price?.toLocaleString()}</div></div>
                    <button onClick={()=>setSelectedProd(null)} style={{background:'transparent',border:'none',color:'var(--adm-muted2)',cursor:'pointer',padding:4}}><X size={15} /></button>
                  </div>
                  <div className="adm-field"><label className="adm-label">Dias de destacado</label><input type="number" min="1" max="365" value={featProdDays} onChange={e=>setFeatProdDays(e.target.value)} className="adm-input" /></div>
                  <div className="adm-field"><label className="adm-label">Nota interna (opcional)</label><input type="text" value={featProdNote} onChange={e=>setFeatProdNote(e.target.value)} className="adm-input" /></div>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0.75rem',background:featProdPaid?'rgba(34,197,94,0.08)':'rgba(245,158,11,0.08)',border:`1px solid ${featProdPaid?'rgba(34,197,94,0.25)':'rgba(245,158,11,0.25)'}`,borderRadius:10}}>
                    <p style={{fontWeight:700,fontSize:'0.85rem',color:featProdPaid?'#4ade80':'#f59e0b',margin:0}}>{featProdPaid?'Pago confirmado':'Pendiente de pago'}</p>
                    <label style={{flexShrink:0,cursor:'pointer',display:'flex',alignItems:'center',gap:'0.5rem'}}><input type="checkbox" checked={featProdPaid} onChange={e=>setFeatProdPaid(e.target.checked)} style={{width:18,height:18,accentColor:'#22c55e',cursor:'pointer'}} /><span style={{fontSize:'0.8rem',color:'var(--adm-muted2)',fontWeight:600}}>Pagado</span></label>
                  </div>
                  <div className="adm-modal-footer"><button className="adm-btn-cancel" onClick={()=>setFeatProdModal(false)}>Cancelar</button><button className={`adm-btn-confirm ${featProdPaid?'green':'gold'}`} onClick={submitFeatProd} disabled={featProdSaving||!featProdDays}><Tag size={15} /> {featProdSaving?'Guardando...':featProdPaid?'Destacar ahora':'Crear pendiente'}</button></div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: bloquear negocio */}
      {blockModal && (
        <div className="adm-modal-overlay" onClick={() => setBlockModal(false)}>
          <div className="adm-modal" onClick={e => e.stopPropagation()}>
            <div className="adm-modal-header"><h2><Ban size={18} /> Bloquear negocio</h2><button onClick={() => setBlockModal(false)}><X size={17} /></button></div>
            <div className="adm-modal-body">
              <div className="adm-field"><label className="adm-label">Motivo</label><input type="text" placeholder="Incumplimiento de terminos..." value={blockReason} onChange={e => setBlockReason(e.target.value)} className="adm-input" /></div>
              <div className="adm-modal-footer"><button className="adm-btn-cancel" onClick={() => setBlockModal(false)}>Cancelar</button><button className="adm-btn-confirm red" onClick={confirmBlockBiz}><Ban size={15} /> Confirmar bloqueo</button></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}