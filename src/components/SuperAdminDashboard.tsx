import { useState, useEffect } from 'react';
import { Business, BusinessPlan, BusinessTypeKey } from '../types';
import { api } from '../services/api';
import { BUSINESS_TYPES } from '../lib/businessTypes';
import { getSaasConfig, buildWhatsAppPlanLink } from '../lib/saasConfig';
import { PlansPricingModal } from './PlansPricingModal';
import { SuperAdminWhatsAppPricingModal } from './SuperAdminWhatsAppPricingModal';
import { SuperAdminLocationModal } from './SuperAdminLocationModal';
import { SuperAdminReceiptsInboxModal } from './SuperAdminReceiptsInboxModal';
import {
  Building2,
  Users,
  CalendarCheck,
  CheckCircle2,
  AlertTriangle,
  Plus,
  ExternalLink,
  Shield,
  Activity,
  Layers,
  Search,
  Pencil,
  X,
  Copy,
  Check,
  Link as LinkIcon,
  Share2,
  HelpCircle,
  Sparkles,
  MessageCircle,
  MapPin,
  Compass,
  Clock,
  ArrowRight,
  Eye,
  FileText,
  Download,
  Filter,
  XCircle,
} from 'lucide-react';

interface SuperAdminDashboardProps {
  onSelectBusiness: (business: Business) => void;
  onViewBusinessPublic: (business: Business) => void;
}

export function SuperAdminDashboard({
  onSelectBusiness,
  onViewBusinessPublic,
}: SuperAdminDashboardProps) {
  const [stats, setStats] = useState<any>(null);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingBusiness, setEditingBusiness] = useState<Business | null>(null);
  const [filterQuery, setFilterQuery] = useState('');
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [showLinksGuide, setShowLinksGuide] = useState(false);
  const [showPlansModal, setShowPlansModal] = useState(false);
  const [showWhatsAppPricingModal, setShowWhatsAppPricingModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showReceiptsInbox, setShowReceiptsInbox] = useState(false);
  const [dashboardTab, setDashboardTab] = useState<'businesses' | 'receipts'>('businesses');
  const [receiptFilterStatus, setReceiptFilterStatus] = useState<'pending' | 'all' | 'approved' | 'rejected'>('pending');
  const [receiptSearchQuery, setReceiptSearchQuery] = useState('');
  const [processingReceiptId, setProcessingReceiptId] = useState<string | null>(null);
  const [viewingReceipt, setViewingReceipt] = useState<{
    url: string;
    fileName?: string;
    businessName: string;
    plan: string;
    expectedAmount: string;
    declaredAmount: string;
    reference: string;
    business: Business;
  } | null>(null);
  const [copiedReceiptRef, setCopiedReceiptRef] = useState<string | null>(null);

  const handleCopyReceiptRef = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedReceiptRef(text);
    setTimeout(() => setCopiedReceiptRef(null), 2500);
  };

  const saasConfig = getSaasConfig();

  const [currentDefaultLoc, setCurrentDefaultLoc] = useState<string>(() => {
    try {
      return localStorage.getItem('td_platform_default_location') || 'all';
    } catch {
      return 'all';
    }
  });

  const pendingReceiptsCount = businesses.filter(
    (b) =>
      (b.lastPlanPayment?.status ||
        (b.lastPlanPayment?.method === 'transfer' ? 'pending_approval' : 'approved')) ===
      'pending_approval'
  ).length;

  const handleBusinessUpdated = (updated: Business) => {
    setBusinesses((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
  };

  const businessesWithPayments = businesses.filter((b) => !!b.lastPlanPayment);

  const filteredReceipts = businessesWithPayments.filter((b) => {
    const payment = b.lastPlanPayment!;
    const status = payment.status || (payment.method === 'transfer' ? 'pending_approval' : 'approved');

    if (receiptFilterStatus === 'pending' && status !== 'pending_approval') return false;
    if (receiptFilterStatus === 'approved' && status !== 'approved') return false;
    if (receiptFilterStatus === 'rejected' && status !== 'rejected') return false;

    if (receiptSearchQuery.trim()) {
      const q = receiptSearchQuery.toLowerCase();
      const matchName = b.name.toLowerCase().includes(q);
      const matchSlug = b.slug.toLowerCase().includes(q);
      const matchRef = payment.reference.toLowerCase().includes(q);
      const matchPlan = payment.plan.toLowerCase().includes(q);
      return matchName || matchSlug || matchRef || matchPlan;
    }

    return true;
  });

  const handleApproveReceipt = async (business: Business) => {
    const payment = business.lastPlanPayment;
    if (!payment) return;

    if (
      !confirm(
        `¿Confirmas la acreditación del pago por ${payment.amount} (Ref: ${payment.reference}) y la activación del Plan ${payment.plan.toUpperCase()} para "${business.name}"?`
      )
    ) {
      return;
    }

    try {
      setProcessingReceiptId(business.id);
      const updated = await api.updateBusiness(business.id, {
        plan: payment.plan,
        lastPlanPayment: {
          ...payment,
          status: 'approved',
          approvedAt: new Date().toISOString(),
        },
      });
      handleBusinessUpdated(updated);
    } catch (err: any) {
      console.error(err);
      alert('Error al aprobar el comprobante: ' + (err.message || 'Error desconocido'));
    } finally {
      setProcessingReceiptId(null);
    }
  };

  const handleRejectReceipt = async (business: Business) => {
    const payment = business.lastPlanPayment;
    if (!payment) return;

    const reason = prompt(
      'Indica el motivo del rechazo del comprobante (se registrará en el historial de la clínica):',
      'Transferencia no acreditada en extracto bancario.'
    );
    if (reason === null) return;

    try {
      setProcessingReceiptId(business.id);
      const updated = await api.updateBusiness(business.id, {
        lastPlanPayment: {
          ...payment,
          status: 'rejected',
          adminNote: reason,
        },
      });
      handleBusinessUpdated(updated);
    } catch (err: any) {
      console.error(err);
      alert('Error al rechazar el comprobante: ' + (err.message || 'Error desconocido'));
    } finally {
      setProcessingReceiptId(null);
    }
  };

  const getFullPublicUrl = (slug: string) => {
    const origin = window.location.origin;
    return `${origin}/#booking-${slug}`;
  };

  const handleCopyLink = (slug: string) => {
    const url = getFullPublicUrl(slug);
    navigator.clipboard.writeText(url);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2500);
  };

  const loadStats = async () => {
    try {
      setLoading(true);
      const data = await api.getSuperAdminStats();
      setStats(data);
      setBusinesses(data.businesses || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const handleToggleStatus = async (business: Business) => {
    const nextStatus = business.status === 'active' ? 'suspended' : 'active';
    try {
      const updated = await api.updateBusiness(business.id, { status: nextStatus });
      setBusinesses((prev) => prev.map((b) => (b.id === business.id ? updated : b)));
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const handleChangePlan = async (business: Business, plan: BusinessPlan) => {
    try {
      const updated = await api.updateBusiness(business.id, { plan });
      setBusinesses((prev) => prev.map((b) => (b.id === business.id ? updated : b)));
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const filteredBusinesses = businesses.filter((b) => {
    if (!filterQuery.trim()) return true;
    const q = filterQuery.toLowerCase();
    return b.name.toLowerCase().includes(q) || b.slug.toLowerCase().includes(q) || b.businessType.includes(q);
  });

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 pb-16">
      {/* Header */}
      <header className="bg-slate-900 text-white py-6 px-4 sm:px-8 border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500 text-slate-950 flex items-center justify-center font-extrabold text-xl shadow-md">
              Ω
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold">TurnosDisponibles Platform</h1>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  SUPERADMIN
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  CLOUD FIRESTORE CONECTADO
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Control global de inquilinos (tenants), suscripciones y métricas de plataforma.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowReceiptsInbox(true)}
              className={`relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                pendingReceiptsCount > 0
                  ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/50 ring-2 ring-amber-500/30 shadow-md'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              }`}
              title="Bandeja de Aprobación de Comprobantes de Transferencias y Pagos"
            >
              <Clock className="w-4 h-4 text-amber-400" />
              <span>Bandeja Comprobantes</span>
              {pendingReceiptsCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-slate-950 animate-pulse">
                  {pendingReceiptsCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setShowLocationModal(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 text-xs font-semibold border border-indigo-500/40 transition cursor-pointer"
              title="Definir qué Ciudad o Zona se muestra filtrada por defecto cuando un usuario ingresa al portal"
            >
              <Compass className="w-4 h-4 text-indigo-300" />
              <span>Zona Inicial: {currentDefaultLoc === 'all' ? 'Todas' : currentDefaultLoc}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowWhatsAppPricingModal(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-semibold border border-emerald-500/40 transition cursor-pointer"
              title="Configurar Mercado Pago, Datos Bancarios Oficiales y WhatsApp para Planes"
            >
              <MessageCircle className="w-4 h-4 text-emerald-300" />
              <span>Cobros, Datos & WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={() => setShowPlansModal(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 text-xs font-semibold border border-teal-500/40 transition cursor-pointer"
              title="Ver tabla de precios y suscripciones SaaS (Free, Pro, Experiencia AI)"
            >
              <Sparkles className="w-4 h-4 text-teal-300" />
              <span>Ver Tabla de Planes</span>
            </button>

            <button
              type="button"
              onClick={() => setShowLinksGuide(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 transition"
              title="Ver qué links compartir y cuáles no"
            >
              <Share2 className="w-4 h-4 text-teal-400" />
              <span>Guía de Links</span>
            </button>

            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold transition shadow cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Crear Nuevo Negocio</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-6">
        {/* Pending Receipts Alert Banner */}
        {pendingReceiptsCount > 0 && (
          <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/15 to-amber-500/10 border border-amber-300 rounded-3xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm animate-in fade-in">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-md shrink-0">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-base font-extrabold text-slate-900">
                    {pendingReceiptsCount} Comprobante{pendingReceiptsCount > 1 ? 's' : ''} de Transferencia Pendiente{pendingReceiptsCount > 1 ? 's' : ''}
                  </h4>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500 text-slate-950">
                    Acción Requerida
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-0.5">
                  Dueños de clínicas han reportado pagos de suscripción por transferencia bancaria y están a la espera de conciliación.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowReceiptsInbox(true)}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer whitespace-nowrap self-stretch sm:self-auto justify-center"
            >
              <span>Abrir Bandeja de Aprobación</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Global Platform KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase">Negocios Totales</span>
            <div className="text-2xl font-extrabold text-slate-900 mt-1">{stats?.totalBusinesses || 0}</div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-[11px] font-semibold text-emerald-600 uppercase">Activos</span>
            <div className="text-2xl font-extrabold text-emerald-600 mt-1">{stats?.activeBusinesses || 0}</div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-[11px] font-semibold text-amber-600 uppercase">En Trial</span>
            <div className="text-2xl font-extrabold text-amber-600 mt-1">{stats?.trialBusinesses || 0}</div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase">Reservas Globales</span>
            <div className="text-2xl font-extrabold text-slate-900 mt-1">{stats?.totalAppointments || 0}</div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase">Profesionales</span>
            <div className="text-2xl font-extrabold text-slate-900 mt-1">{stats?.totalProfessionals || 0}</div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase">Clientes Totales</span>
            <div className="text-2xl font-extrabold text-slate-900 mt-1">{stats?.totalCustomers || 0}</div>
          </div>
        </div>

        {/* Navigation Tabs between Business Directory and Receipts Inbox */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
          <button
            type="button"
            onClick={() => setDashboardTab('businesses')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              dashboardTab === 'businesses'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Inquilinos de la Plataforma ({businesses.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setDashboardTab('receipts')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              dashboardTab === 'receipts'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Clock className="w-4 h-4 text-amber-500" />
            <span>Bandeja de Comprobantes</span>
            {pendingReceiptsCount > 0 && (
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  dashboardTab === 'receipts'
                    ? 'bg-slate-950 text-white'
                    : 'bg-amber-500 text-slate-950 animate-pulse'
                }`}
              >
                {pendingReceiptsCount} Pendiente{pendingReceiptsCount > 1 ? 's' : ''}
              </span>
            )}
          </button>
        </div>

        {dashboardTab === 'businesses' ? (
          /* Business Directory Table */
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Inquilinos de la Plataforma (Tenants)</h3>
                <p className="text-xs text-slate-500">Listado con aislamiento estricto de base de datos por negocio.</p>
              </div>

              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar por nombre, slug o nicho..."
                  value={filterQuery}
                  onChange={(e) => setFilterQuery(e.target.value)}
                  className="pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs w-64 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-[11px] uppercase font-semibold text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3.5">Negocio & Slug</th>
                    <th className="px-5 py-3.5">Nicho / Industria</th>
                    <th className="px-5 py-3.5">Plan SaaS</th>
                    <th className="px-5 py-3.5">Estado</th>
                    <th className="px-5 py-3.5">Contacto</th>
                    <th className="px-5 py-3.5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredBusinesses.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-5 py-4">
                        <div className="font-bold text-slate-900 text-sm">{b.name}</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono text-[11px] text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-100">
                            /book/{b.slug}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyLink(b.slug)}
                            className="p-1 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition cursor-pointer"
                            title="Copiar Link para compartir con pacientes/clientes"
                          >
                            {copiedSlug === b.slug ? (
                              <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold">
                                <Check className="w-3 h-3" /> Copiado
                              </span>
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          {BUSINESS_TYPES[b.businessType]?.name || b.businessType}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <select
                          value={b.plan}
                          onChange={(e) => handleChangePlan(b, e.target.value as BusinessPlan)}
                          className="px-2 py-1 rounded-lg border border-slate-200 text-xs font-bold uppercase bg-white cursor-pointer"
                        >
                          <option value="free">Free</option>
                          <option value="pro">Pro</option>
                          <option value="business">Experiencia AI</option>
                        </select>
                      </td>

                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(b)}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase cursor-pointer transition ${
                            b.status === 'active'
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              : 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                          }`}
                        >
                          {b.status === 'active' ? '● Activo' : '● Suspendido'}
                        </button>
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        <div>{b.phone}</div>
                        <div className="text-[10px] text-slate-400">WA: {b.whatsappNumber}</div>
                      </td>

                      <td className="px-5 py-4 text-right space-x-2 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onViewBusinessPublic(b)}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition cursor-pointer"
                          title="Ver página de reservas"
                        >
                          Página Pública
                        </button>

                        <button
                          type="button"
                          onClick={() => setEditingBusiness(b)}
                          className="px-2.5 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 font-semibold text-xs transition inline-flex items-center gap-1 cursor-pointer"
                          title="Editar datos del negocio"
                        >
                          <Pencil className="w-3 h-3" />
                          <span>Editar</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onSelectBusiness(b)}
                          className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-black text-white font-semibold text-xs transition cursor-pointer"
                          title="Administrar panel"
                        >
                          Gestionar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* INLINE RECEIPTS APPROVAL & VERIFICATION INTERFACE */
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden space-y-4">
            <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-slate-900 text-base">
                    Bandeja de Comprobantes & Aprobaciones Manuales
                  </h3>
                  {pendingReceiptsCount > 0 && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-500 text-slate-950 animate-pulse">
                      {pendingReceiptsCount} Pendiente{pendingReceiptsCount > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Revisa el archivo de comprobante enviado, compáralo con la tarifa oficial del plan y valida la activación del inquilino.
                </p>
              </div>

              {/* Search and Status Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar clínica, ref, plan..."
                    value={receiptSearchQuery}
                    onChange={(e) => setReceiptSearchQuery(e.target.value)}
                    className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs w-48 sm:w-56 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                  />
                </div>

                <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs">
                  <button
                    type="button"
                    onClick={() => setReceiptFilterStatus('pending')}
                    className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                      receiptFilterStatus === 'pending'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Pendientes ({pendingReceiptsCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setReceiptFilterStatus('all')}
                    className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                      receiptFilterStatus === 'all'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Todos ({businessesWithPayments.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setReceiptFilterStatus('approved')}
                    className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                      receiptFilterStatus === 'approved'
                        ? 'bg-white text-emerald-800 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Aprobados
                  </button>
                  <button
                    type="button"
                    onClick={() => setReceiptFilterStatus('rejected')}
                    className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                      receiptFilterStatus === 'rejected'
                        ? 'bg-white text-rose-800 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Rechazados
                  </button>
                </div>
              </div>
            </div>

            {/* List of Receipts */}
            <div className="p-5 pt-0 space-y-4">
              {filteredReceipts.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <Clock className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="font-bold text-slate-700 text-sm">No hay comprobantes en esta categoría</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    Cuando una clínica envíe un pago de suscripción o comprobante por transferencia aparecerá aquí de inmediato.
                  </p>
                </div>
              ) : (
                filteredReceipts.map((biz) => {
                  const payment = biz.lastPlanPayment!;
                  const status =
                    payment.status || (payment.method === 'transfer' ? 'pending_approval' : 'approved');
                  const isPending = status === 'pending_approval';
                  const isApproved = status === 'approved';
                  const isRejected = status === 'rejected';

                  const expectedAmount =
                    payment.plan === 'pro'
                      ? saasConfig.proPlan.price
                      : payment.plan === 'business'
                      ? saasConfig.aiPlan.price
                      : saasConfig.freePlan.price;

                  const cleanDecl = payment.amount.replace(/\D/g, '');
                  const cleanExp = expectedAmount.replace(/\D/g, '');
                  const isMatchingAmount = cleanDecl && cleanExp && cleanDecl === cleanExp;

                  const whatsappChat = buildWhatsAppPlanLink(
                    biz.whatsappNumber || biz.phone,
                    `Hola ${biz.name}, te escribo desde la administración de TurnosDisponibles sobre tu comprobante de suscripción (Ref: ${payment.reference}) para el Plan ${payment.plan.toUpperCase()}.`
                  );

                  return (
                    <div
                      key={biz.id}
                      className={`p-5 rounded-2xl border transition flex flex-col lg:flex-row lg:items-center justify-between gap-5 ${
                        isPending
                          ? 'bg-amber-50/40 border-amber-200 ring-1 ring-amber-300/60 shadow-xs'
                          : isApproved
                          ? 'bg-white border-slate-200'
                          : 'bg-rose-50/30 border-rose-200'
                      }`}
                    >
                      {/* Left: Info & Comparisons */}
                      <div className="space-y-3 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-slate-900 text-base">{biz.name}</span>
                          <span className="font-mono text-[11px] text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-100">
                            /book/{biz.slug}
                          </span>
                          {isPending && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-amber-700" />
                              <span>Pendiente de Conciliación</span>
                            </span>
                          )}
                          {isApproved && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Plan Activo & Aprobado</span>
                            </span>
                          )}
                          {isRejected && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 flex items-center gap-1">
                              <XCircle className="w-3 h-3 text-rose-600" />
                              <span>Comprobante Rechazado</span>
                            </span>
                          )}
                        </div>

                        {/* Amount Comparison Card */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 text-xs">
                          <div>
                            <span className="text-[10px] text-slate-400 block font-bold uppercase">
                              Plan Solicitado
                            </span>
                            <span className="font-black text-slate-900 text-sm uppercase">
                              Plan {payment.plan}
                            </span>
                          </div>

                          <div>
                            <span className="text-[10px] text-slate-400 block font-bold uppercase">
                              Tarifa Oficial Esperada
                            </span>
                            <span className="font-bold text-slate-700 text-sm">{expectedAmount}</span>
                          </div>

                          <div>
                            <span className="text-[10px] text-slate-400 block font-bold uppercase">
                              Monto Declarado / Pagado
                            </span>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-black text-emerald-700 text-sm">{payment.amount}</span>
                              {isMatchingAmount ? (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  ✓ Monto Coincide
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                                  ⚠️ Verificar Tarifa
                                </span>
                              )}
                            </div>
                          </div>

                          <div>
                            <span className="text-[10px] text-slate-400 block font-bold uppercase">
                              Método de Pago
                            </span>
                            <span className="font-semibold text-slate-800 capitalize">
                              {payment.method === 'mercadopago' ? 'Mercado Pago' : 'Transferencia Bancaria'}
                            </span>
                          </div>
                        </div>

                        {/* Attachment & Reference bar */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs pt-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-slate-500 font-medium">Nro. de Operación / Ref:</span>
                            <span className="font-mono font-black text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
                              {payment.reference}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopyReceiptRef(payment.reference)}
                              className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                              title="Copiar referencia bancaria"
                            >
                              {copiedReceiptRef === payment.reference ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <span className="text-slate-400 text-[11px]">
                              • {payment.submittedAt ? new Date(payment.submittedAt).toLocaleString('es-AR') : 'Reciente'}
                            </span>
                          </div>

                          {/* File Attachment Button */}
                          {payment.receiptUrl ? (
                            <button
                              type="button"
                              onClick={() =>
                                setViewingReceipt({
                                  url: payment.receiptUrl!,
                                  fileName: payment.receiptFileName,
                                  businessName: biz.name,
                                  plan: payment.plan,
                                  expectedAmount,
                                  declaredAmount: payment.amount,
                                  reference: payment.reference,
                                  business: biz,
                                })
                              }
                              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-bold transition cursor-pointer shadow-2xs self-start sm:self-auto"
                            >
                              {payment.receiptUrl.startsWith('data:image/') ? (
                                <img
                                  src={payment.receiptUrl}
                                  alt="Preview"
                                  className="w-6 h-6 rounded-md object-cover border border-teal-300 shadow-2xs"
                                />
                              ) : (
                                <FileText className="w-5 h-5 text-teal-700" />
                              )}
                              <Eye className="w-4 h-4" />
                              <span>Ver Archivo de Comprobante</span>
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">
                              (Sin archivo adjunto • solo Nro. Operación)
                            </span>
                          )}
                        </div>

                        {payment.adminNote && (
                          <div className="text-xs text-rose-700 bg-rose-100/50 p-2.5 rounded-xl border border-rose-200">
                            <strong>Nota del SuperAdmin:</strong> {payment.adminNote}
                          </div>
                        )}
                      </div>

                      {/* Right: Actions */}
                      <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between lg:justify-center gap-2.5 shrink-0 border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-200">
                        <a
                          href={whatsappChat}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center gap-1.5 transition"
                          title="Contactar al dueño de la clínica por WhatsApp"
                        >
                          <MessageCircle className="w-4 h-4 text-emerald-600" />
                          <span>WhatsApp Clínica</span>
                        </a>

                        {isPending && (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              disabled={processingReceiptId === biz.id}
                              onClick={() => handleRejectReceipt(biz)}
                              className="px-3.5 py-2 rounded-xl border border-rose-200 bg-white hover:bg-rose-50 text-rose-700 text-xs font-bold transition cursor-pointer"
                            >
                              Rechazar
                            </button>

                            <button
                              type="button"
                              disabled={processingReceiptId === biz.id}
                              onClick={() => handleApproveReceipt(biz)}
                              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                            >
                              <Check className="w-4 h-4" />
                              <span>Aprobar y Activar Plan</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </main>

      {/* FULLSCREEN RECEIPT VIEWER LIGHTBOX IN SUPERADMIN */}
      {viewingReceipt && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 text-white rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-700 shadow-2xl">
            {/* Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-teal-400" />
                  <span>Comprobante de {viewingReceipt.businessName}</span>
                </h4>
                <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                  <span>
                    Plan: <strong className="text-teal-300 uppercase">{viewingReceipt.plan}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Tarifa Oficial: <strong className="text-slate-300">{viewingReceipt.expectedAmount}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Declarado: <strong className="text-emerald-400">{viewingReceipt.declaredAmount}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Ref: <strong className="text-slate-200 font-mono">{viewingReceipt.reference}</strong>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={viewingReceipt.url}
                  download={viewingReceipt.fileName || `comprobante-${viewingReceipt.businessName}.png`}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                  title="Descargar comprobante"
                >
                  <Download className="w-4 h-4" />
                </a>
                <button
                  type="button"
                  onClick={() => setViewingReceipt(null)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Viewer Image / Document */}
            <div className="flex-1 p-4 overflow-auto flex items-center justify-center bg-slate-950/60 min-h-[300px]">
              {viewingReceipt.url.startsWith('data:image/') || viewingReceipt.url.startsWith('http') ? (
                <img
                  src={viewingReceipt.url}
                  alt="Comprobante en alta resolución"
                  className="max-h-[65vh] w-auto object-contain rounded-xl border border-slate-800 shadow-lg"
                />
              ) : (
                <div className="p-8 text-center space-y-3">
                  <FileText className="w-16 h-16 text-teal-400 mx-auto" />
                  <p className="text-sm font-semibold text-slate-200">
                    Documento PDF adjunto: {viewingReceipt.fileName || 'comprobante.pdf'}
                  </p>
                  <a
                    href={viewingReceipt.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-md transition"
                  >
                    <span>Abrir PDF en pestaña nueva</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-900 flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-slate-400">
                Verifica que el titular, importe y fecha coincidan con el extracto bancario.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setViewingReceipt(null)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Cerrar Visor
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const biz = viewingReceipt.business;
                    setViewingReceipt(null);
                    handleApproveReceipt(biz);
                  }}
                  className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Aprobar Este Pago Ahora</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT BUSINESS MODAL */}
      {editingBusiness && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-bold text-slate-900">Editar Negocio: {editingBusiness.name}</h3>
              <button
                type="button"
                onClick={() => setEditingBusiness(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Modifica los datos comerciales, slug de URL, teléfono y plan de suscripción.
            </p>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const formData = new FormData(form);

                try {
                  const updated = await api.updateBusiness(editingBusiness.id, {
                    name: formData.get('name') as string,
                    slug: (formData.get('slug') as string).toLowerCase().trim(),
                    businessType: formData.get('businessType') as BusinessTypeKey,
                    description: formData.get('description') as string,
                    category: formData.get('category') as string,
                    address: formData.get('address') as string,
                    phone: formData.get('phone') as string,
                    whatsappNumber: formData.get('whatsappNumber') as string,
                    plan: formData.get('plan') as BusinessPlan,
                    status: formData.get('status') as 'active' | 'trial' | 'suspended',
                  });

                  setBusinesses((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
                  setEditingBusiness(null);
                  alert(`¡Negocio "${updated.name}" actualizado con éxito!`);
                } catch (err: any) {
                  alert('Error al actualizar negocio: ' + err.message);
                }
              }}
              className="space-y-3 text-xs"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nombre Comercial *</label>
                  <input
                    type="text"
                    name="name"
                    required
                    defaultValue={editingBusiness.name}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Slug URL (/book/...) *</label>
                  <input
                    type="text"
                    name="slug"
                    required
                    defaultValue={editingBusiness.slug}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono bg-white text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nicho / Tipo de Negocio</label>
                  <select
                    name="businessType"
                    defaultValue={editingBusiness.businessType}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs"
                  >
                    {(Object.keys(BUSINESS_TYPES) as BusinessTypeKey[]).map((k) => (
                      <option key={k} value={k}>
                        {BUSINESS_TYPES[k].name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Plan de Suscripción</label>
                  <select
                    name="plan"
                    defaultValue={editingBusiness.plan}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs"
                  >
                    <option value="pro">Plan Pro</option>
                    <option value="free">Plan Gratis</option>
                    <option value="business">Plan Business</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Teléfono</label>
                  <input
                    type="text"
                    name="phone"
                    defaultValue={editingBusiness.phone}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">WhatsApp (sin +)</label>
                  <input
                    type="text"
                    name="whatsappNumber"
                    defaultValue={editingBusiness.whatsappNumber}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono bg-white text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Estado de la Cuenta</label>
                <select
                  name="status"
                  defaultValue={editingBusiness.status}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold"
                >
                  <option value="active">Activo (habilitado)</option>
                  <option value="trial">En Prueba (Trial)</option>
                  <option value="suspended">Suspendido (acceso pausado)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Categoría / Especialidad</label>
                <input
                  type="text"
                  name="category"
                  defaultValue={editingBusiness.category}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Dirección</label>
                <input
                  type="text"
                  name="address"
                  defaultValue={editingBusiness.address}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Descripción</label>
                <textarea
                  name="description"
                  rows={2}
                  defaultValue={editingBusiness.description}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs"
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingBusiness(null)}
                  className="w-1/2 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 rounded-xl bg-teal-600 text-white font-bold hover:bg-teal-700"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE BUSINESS MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Crear Nuevo Negocio (Tenant)</h3>
            <p className="text-xs text-slate-500 mb-4">
              Aprovisiona un nuevo cliente con aislamiento de datos, página de reservas y horarios.
            </p>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const formData = new FormData(form);

                try {
                  const newBiz = await api.createBusiness({
                    name: formData.get('name') as string,
                    slug: (formData.get('slug') as string).toLowerCase().trim(),
                    businessType: formData.get('businessType') as BusinessTypeKey,
                    description: formData.get('description') as string,
                    category: formData.get('category') as string,
                    address: formData.get('address') as string,
                    phone: formData.get('phone') as string,
                    whatsappNumber: formData.get('whatsappNumber') as string,
                    primaryColor: (formData.get('primaryColor') as string) || '#0284c7',
                    welcomeMessage: 'Bienvenido al portal de turnos.',
                    cancellationPolicy: 'Avisar con 2 horas de anticipación.',
                    bufferMinutes: 0,
                    plan: formData.get('plan') as BusinessPlan,
                    status: 'active',
                  });

                  setBusinesses((prev) => [newBiz, ...prev]);
                  setShowCreateModal(false);
                  alert(`¡Negocio "${newBiz.name}" creado con éxito!`);
                } catch (err: any) {
                  alert('Error al crear negocio: ' + err.message);
                }
              }}
              className="space-y-3 text-xs"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nombre Comercial *</label>
                  <input
                    type="text"
                    name="name"
                    required
                    placeholder="Ej. Odontología San Martín"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Slug URL (/book/...) *</label>
                  <input
                    type="text"
                    name="slug"
                    required
                    placeholder="odontologia-san-martin"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nicho / Tipo de Negocio *</label>
                  <select name="businessType" required className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white">
                    {(Object.keys(BUSINESS_TYPES) as BusinessTypeKey[]).map((k) => (
                      <option key={k} value={k}>
                        {BUSINESS_TYPES[k].name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Plan de Suscripción</label>
                  <select name="plan" className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white">
                    <option value="pro">Plan Pro</option>
                    <option value="free">Plan Gratis</option>
                    <option value="business">Plan Experiencia AI</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Teléfono</label>
                  <input
                    type="text"
                    name="phone"
                    defaultValue="+54 11 4000-0000"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">WhatsApp (sin +)</label>
                  <input
                    type="text"
                    name="whatsappNumber"
                    defaultValue="5491140000000"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Categoría / Especialidad</label>
                <input
                  type="text"
                  name="category"
                  defaultValue="Atención Profesional"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Dirección</label>
                <input
                  type="text"
                  name="address"
                  defaultValue="Av. Principal 123"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="w-1/2 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 rounded-xl bg-slate-900 text-white font-bold hover:bg-black"
                >
                  Crear Negocio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: GUÍA DE LINKS & PROMOCIÓN */}
      {showLinksGuide && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-teal-100 text-teal-800 flex items-center justify-center">
                  <Share2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Mapa de Enlaces (Qué compartir y qué NO)</h3>
                  <p className="text-xs text-slate-500">Guía práctica para promocionar y vender tu SaaS sin confusiones.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowLinksGuide(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* SECCIÓN 1: LINKS QUE SÍ SE COMPARTEN */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">
                  ✓
                </span>
                <h4 className="text-sm font-extrabold text-emerald-800 uppercase tracking-wide">
                  1. Links que SÍ debes compartir (Públicos)
                </h4>
              </div>

              <div className="bg-emerald-50/50 border border-emerald-200 rounded-2xl p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="font-bold text-slate-900 text-xs">Link de Reserva para Pacientes / Clientes</span>
                    <p className="text-[11px] text-slate-600">
                      Este es el link que el médico o negocio pone en su <strong>Instagram, WhatsApp Business, Google Maps o TikTok</strong>.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyLink(businesses[0]?.slug || 'demo')}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 shrink-0"
                  >
                    {copiedSlug ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSlug ? '¡Copiado!' : 'Copiar Ejemplo'}</span>
                  </button>
                </div>

                <div className="bg-white p-2.5 rounded-xl border border-emerald-200 font-mono text-xs text-emerald-900 break-all">
                  {getFullPublicUrl(businesses[0]?.slug || 'turnosmed-demo')}
                </div>

                <ul className="text-xs text-slate-600 space-y-1 pl-4 list-disc">
                  <li><strong>¿Quién lo ve?</strong> El paciente o cliente final.</li>
                  <li><strong>¿Qué ve?</strong> El logo del negocio, los doctores, días, horarios y seña con Mercado Pago.</li>
                  <li><strong>¿Es seguro?</strong> 100% seguro. No tiene acceso a datos de otros clientes ni al panel admin.</li>
                </ul>
              </div>
            </div>

            {/* SECCIÓN 2: LINKS QUE NO SE COMPARTEN */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center text-xs font-bold">
                  ✕
                </span>
                <h4 className="text-sm font-extrabold text-rose-800 uppercase tracking-wide">
                  2. Links que NUNCA debes compartir en público (Solo para ti)
                </h4>
              </div>

              <div className="bg-rose-50/50 border border-rose-200 rounded-2xl p-4 space-y-3">
                <div>
                  <div className="font-bold text-rose-950 text-xs">👑 Tu Panel de SuperAdmin Master</div>
                  <p className="text-[11px] text-slate-600">
                    Solo tú puedes entrar con tu correo <strong>agenciaclienteya@gmail.com</strong>. Si alguien más entra sin permiso, el sistema lo bloquea y lo manda al inicio.
                  </p>
                </div>

                <div className="border-t border-rose-200/60 pt-2">
                  <div className="font-bold text-rose-950 text-xs">🏢 Los Paneles de Administración de tus Clientes</div>
                  <p className="text-[11px] text-slate-600">
                    A los dueños de consultorios solo les das su <strong>correo y contraseña</strong> (o link de ingreso profesional) para que entren a su propia oficina.
                  </p>
                </div>
              </div>
            </div>

            {/* SECCIÓN 3: CÓMO PROMOCIONAR HOY MISMO */}
            <div className="bg-slate-900 text-white rounded-2xl p-4 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-teal-400">
                🚀 Estrategia Rápida para Salir a Vender Hoy
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                1. <strong>Crea un negocio demo</strong> o usa el que ya existe ("Clínica Médica" o "Estética Bella").<br />
                2. <strong>Copia su link público</strong> con el botón <Copy className="w-3 h-3 inline text-teal-300" />.<br />
                3. Escríbele a un médico o dueño de negocio por WhatsApp:<br />
                <em className="text-teal-200 text-[11px] block mt-1 bg-slate-800 p-2 rounded-lg border border-slate-700">
                  "Hola Dr., desarrollé un sistema para que sus pacientes saquen turnos con seña previa por Mercado Pago y recordatorios de WhatsApp sin que la secretaria pierda tiempo. Le dejo una demo de 1 minuto para que lo pruebe: [LINK AQUÍ]"
                </em>
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowLinksGuide(false)}
                className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition"
              >
                Entendido, cerrar guía
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PLANS & PRICING MODAL */}
      <PlansPricingModal
        isOpen={showPlansModal}
        onClose={() => setShowPlansModal(false)}
      />

      {/* WHATSAPP & SAAS PLANS TEXT CONFIGURATION MODAL */}
      <SuperAdminWhatsAppPricingModal
        isOpen={showWhatsAppPricingModal}
        onClose={() => setShowWhatsAppPricingModal(false)}
      />

      {/* DEFAULT LOCATION CONFIGURATION MODAL */}
      <SuperAdminLocationModal
        isOpen={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        businesses={businesses}
        onConfigUpdated={(newLoc) => setCurrentDefaultLoc(newLoc)}
      />

      {/* RECEIPTS APPROVAL INBOX MODAL */}
      <SuperAdminReceiptsInboxModal
        isOpen={showReceiptsInbox}
        onClose={() => setShowReceiptsInbox(false)}
        businesses={businesses}
        onBusinessUpdated={handleBusinessUpdated}
      />
    </div>
  );
}
