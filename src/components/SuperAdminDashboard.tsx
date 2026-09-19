import { useState, useEffect } from 'react';
import { Business, BusinessPlan, BusinessTypeKey } from '../types';
import { api } from '../services/api';
import { BUSINESS_TYPES } from '../lib/businessTypes';
import { PlansPricingModal } from './PlansPricingModal';
import { SuperAdminWhatsAppPricingModal } from './SuperAdminWhatsAppPricingModal';
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
              onClick={() => setShowWhatsAppPricingModal(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-semibold border border-emerald-500/40 transition cursor-pointer"
              title="Configurar número de WhatsApp y mensajes automáticos para los Planes Free, Pro y Experiencia AI"
            >
              <MessageCircle className="w-4 h-4 text-emerald-300" />
              <span>WhatsApp & Textos Planes</span>
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

        {/* Business Directory Table */}
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
                          className="p-1 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition"
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
                        className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition"
                        title="Ver página de reservas"
                      >
                        Página Pública
                      </button>

                      <button
                        type="button"
                        onClick={() => setEditingBusiness(b)}
                        className="px-2.5 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 font-semibold text-xs transition inline-flex items-center gap-1"
                        title="Editar datos del negocio"
                      >
                        <Pencil className="w-3 h-3" />
                        <span>Editar</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onSelectBusiness(b)}
                        className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-black text-white font-semibold text-xs transition"
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
      </main>

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
    </div>
  );
}
