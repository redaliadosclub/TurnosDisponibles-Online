import { useState, useEffect, useMemo } from 'react';
import {
  Business,
  Professional,
  Service,
  Appointment,
  Customer,
  WorkingHours,
  TimeOff,
  User,
} from '../types';
import { api } from '../services/api';
import { formatDateShort } from '../utils/dateUtils';
import { generateWaMeLink } from '../lib/notifications';
import {
  Calendar as CalendarIcon,
  Users,
  Briefcase,
  Clock,
  BarChart3,
  MessageCircle,
  Plus,
  Check,
  X,
  Search,
  Lock,
  KeyRound,
  Stethoscope,
  LogOut,
  AlertCircle,
  Phone,
  Mail,
  Edit2,
  Trash2,
  CheckCircle2,
  CalendarCheck,
  Building2,
  ArrowLeft,
  Copy,
} from 'lucide-react';

interface StaffWorkspaceProps {
  business: Business;
  currentUser: User | null;
  initialCode?: string;
  onLogout: () => void;
  onSwitchToOwner?: () => void;
  onUserUpdate?: (updatedUser: User) => void;
}

export function StaffWorkspace({
  business,
  currentUser,
  initialCode = '',
  onLogout,
  onSwitchToOwner,
  onUserUpdate,
}: StaffWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<'agenda' | 'customers' | 'hours' | 'services' | 'analytics'>('agenda');
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [workingHours, setWorkingHours] = useState<WorkingHours[]>([]);
  const [timeOffs, setTimeOffs] = useState<TimeOff[]>([]);
  const [loading, setLoading] = useState(true);

  // Staff linking states
  const [linkCodeInput, setLinkCodeInput] = useState(initialCode);
  const [isLinking, setIsLinking] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [linkSuccess, setLinkSuccess] = useState<string | null>(null);

  // Agenda filters
  const [agendaDateFilter, setAgendaDateFilter] = useState<'today' | 'tomorrow' | 'all'>('today');
  const [searchPatient, setSearchPatient] = useState('');

  // Modals
  const [showNewAppointmentModal, setShowNewAppointmentModal] = useState(false);
  const [showTimeOffModal, setShowTimeOffModal] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

  // Load Business Data
  const loadData = async () => {
    try {
      setLoading(true);
      const [profs, srvs, apps, custs, hours, tos] = await Promise.all([
        api.getProfessionals(business.id),
        api.getServices(business.id),
        api.getAppointments(business.id),
        api.getCustomers(business.id),
        api.getWorkingHours(business.id),
        api.getTimeOffs(business.id),
      ]);
      setProfessionals(profs);
      setServices(srvs);
      setAppointments(apps);
      setCustomers(custs);
      setWorkingHours(hours);
      setTimeOffs(tos);
    } catch (err) {
      console.error('Error al cargar datos del consultorio staff:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [business.id]);

  // Identify assigned professional
  const assignedProfessional = useMemo(() => {
    if (!currentUser) return null;

    if (currentUser.professionalId) {
      const found = professionals.find((p) => p.id === currentUser.professionalId);
      if (found) return found;
    }
    if (currentUser.accessCode) {
      const cleanUserCode = currentUser.accessCode.replace(/[\s-_]/g, '').toLowerCase();
      const found = professionals.find(
        (p) => p.accessCode && p.accessCode.replace(/[\s-_]/g, '').toLowerCase() === cleanUserCode
      );
      if (found) return found;
    }
    if (currentUser.email) {
      const found = professionals.find(
        (p) => p.email && p.email.trim().toLowerCase() === currentUser.email.trim().toLowerCase()
      );
      if (found) return found;
    }
    if (currentUser.id) {
      const found = professionals.find((p) => p.userId === currentUser.id);
      if (found) return found;
    }

    // Auto-match for standard demo accounts
    if (currentUser.email === 'staff@consultorio.com') {
      const found = professionals.find(
        (p) => p.id === 'prof_camila_dermato' || p.name.toLowerCase().includes('camila')
      );
      if (found) return found;
    }

    return null;
  }, [professionals, currentUser]);

  // Auto-link if initialCode passed in URL and matches
  useEffect(() => {
    if (initialCode && !assignedProfessional && professionals.length > 0) {
      handleLinkWithCode(initialCode);
    }
  }, [initialCode, assignedProfessional, professionals]);

  // Perform Staff linking with Key
  const handleLinkWithCode = async (codeToUse?: string) => {
    const raw = (codeToUse || linkCodeInput).trim();
    if (!raw) {
      setLinkError('Por favor ingresa la Clave Única proporcionada por la Dirección de la clínica.');
      return;
    }

    setLinkError(null);
    setLinkSuccess(null);
    setIsLinking(true);

    try {
      const cleanInput = raw.replace(/[\s-_]/g, '').toLowerCase();

      // Flexible matching: exact, cleaned, or demo keys
      const matched = professionals.find((p) => {
        if (!p.accessCode) return false;
        const pClean = p.accessCode.replace(/[\s-_]/g, '').toLowerCase();
        return pClean === cleanInput || p.accessCode.trim().toLowerCase() === raw.toLowerCase();
      }) || (cleanInput === 'cons1001' || cleanInput === '1001'
        ? professionals.find((p) => p.id === 'prof_mariana_dermato' || p.name.toLowerCase().includes('mariana'))
        : undefined)
        || (cleanInput === 'staff2002' || cleanInput === 'cons2002' || cleanInput === '2002'
        ? professionals.find((p) => p.id === 'prof_camila_dermato' || p.name.toLowerCase().includes('camila'))
        : undefined);

      if (!matched) {
        setLinkError(
          `No se encontró ningún consultorio con la clave "${raw}" en ${business.name}. Pídele al Director Clínico que verifique tu clave en la pestaña "Profesionales & Consultorios".`
        );
        setIsLinking(false);
        return;
      }

      // Update in API & storage
      const updated = await api.updateProfessional(business.id, matched.id, {
        userId: currentUser?.id,
        email: currentUser?.email || matched.email,
        accessCode: matched.accessCode || raw.toUpperCase(),
      });

      setProfessionals((prev) => prev.map((p) => (p.id === matched.id ? updated : p)));

      if (currentUser) {
        const updatedUser: User = {
          ...currentUser,
          professionalId: matched.id,
          officeNumber: matched.officeNumber || 'Consultorio Asignado',
          accessCode: matched.accessCode || raw.toUpperCase(),
        };
        try {
          localStorage.setItem('td_session_user', JSON.stringify(updatedUser));
        } catch {}
        if (onUserUpdate) onUserUpdate(updatedUser);
      }

      setLinkSuccess(`¡Vinculación confirmada! Bienvenido/a Dr./Lic. ${matched.name} (${matched.officeNumber || 'Consultorio'}).`);
      setLinkCodeInput('');
      setTimeout(() => setLinkSuccess(null), 3500);
    } catch (err: any) {
      setLinkError(err.message || 'Error al vincular el consultorio.');
    } finally {
      setIsLinking(false);
    }
  };

  // Dates
  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
  }, []);

  const tomorrowStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
  }, []);

  // Filtered Appointments (strictly for this doctor)
  const myAppointments = useMemo(() => {
    if (!assignedProfessional) return [];
    return appointments.filter((a) => a.professionalId === assignedProfessional.id);
  }, [appointments, assignedProfessional]);

  const displayedAppointments = useMemo(() => {
    return myAppointments.filter((app) => {
      if (agendaDateFilter === 'today' && app.date !== todayStr) return false;
      if (agendaDateFilter === 'tomorrow' && app.date !== tomorrowStr) return false;

      if (searchPatient.trim()) {
        const q = searchPatient.toLowerCase();
        const matchName = app.customerName.toLowerCase().includes(q);
        const matchPhone = app.customerPhone.includes(q);
        const matchCode = app.bookingCode.toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchCode) return false;
      }
      return true;
    });
  }, [myAppointments, agendaDateFilter, searchPatient, todayStr, tomorrowStr]);

  // Today stats for this doctor
  const todayCount = useMemo(() => myAppointments.filter((a) => a.date === todayStr && a.status !== 'cancelled').length, [myAppointments, todayStr]);
  const waitingOrConfirmedCount = useMemo(() => myAppointments.filter((a) => a.date === todayStr && (a.status === 'confirmed' || a.status === 'pending')).length, [myAppointments, todayStr]);
  const completedTodayCount = useMemo(() => myAppointments.filter((a) => a.date === todayStr && a.status === 'completed').length, [myAppointments, todayStr]);
  const cancelledTodayCount = useMemo(() => myAppointments.filter((a) => a.date === todayStr && a.status === 'cancelled').length, [myAppointments, todayStr]);

  // Patients of this doctor
  const myCustomers = useMemo(() => {
    if (!assignedProfessional) return [];
    const myCustIds = new Set(myAppointments.map((a) => a.customerId));
    return customers.filter((c) => myCustIds.has(c.id));
  }, [customers, myAppointments, assignedProfessional]);

  // Services of this doctor
  const myServices = useMemo(() => {
    if (!assignedProfessional) return services;
    return services.filter(
      (s) =>
        s.assignedProfessionalIds.includes(assignedProfessional.id) ||
        assignedProfessional.serviceIds.includes(s.id)
    );
  }, [services, assignedProfessional]);

  // Personal time offs
  const myTimeOffs = useMemo(() => {
    if (!assignedProfessional) return [];
    return timeOffs.filter((to) => to.professionalId === assignedProfessional.id);
  }, [timeOffs, assignedProfessional]);

  // Update appointment status
  const handleUpdateStatus = async (appId: string, newStatus: Appointment['status']) => {
    try {
      const updated = await api.updateAppointmentStatus(appId, newStatus);
      setAppointments((prev) => prev.map((a) => (a.id === appId ? updated : a)));
    } catch (err: any) {
      alert('Error al actualizar estado del turno: ' + err.message);
    }
  };

  // WhatsApp reminder message
  const handleSendWhatsApp = (app: Appointment) => {
    const srv = services.find((s) => s.id === app.serviceId);
    const doctorName = assignedProfessional?.name || 'su especialista';
    const text = `¡Hola ${app.customerName}! 👋 Le escribo desde el Consultorio de ${doctorName} en ${business.name} para confirmar su turno de ${srv?.name || 'consulta'} el día ${formatDateShort(app.date)} a las ${app.startTime} hs. Código de turno: ${app.bookingCode}. ¡Le esperamos puntualmente!`;
    const url = generateWaMeLink(app.customerPhone, text);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* Pristine Medical & Staff Header (Completely isolated from Owner / Platform clutter) */}
      <header className="bg-slate-950/95 border-b border-slate-800 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          {/* Brand & Clinic Info */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/10 border border-teal-500/30 text-teal-400 flex items-center justify-center shrink-0 shadow-xs">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-extrabold tracking-wider text-teal-400">
                  Portal Médico & Staff
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                  Privado & Autónomo
                </span>
              </div>
              <h1 className="text-sm sm:text-base font-extrabold text-white leading-tight">
                {business.name}
              </h1>
            </div>
          </div>

          {/* Assigned Office & Professional Pill */}
          {assignedProfessional ? (
            <div className="flex items-center gap-2.5 bg-slate-900/90 px-3.5 py-1.5 rounded-2xl border border-slate-800">
              <img
                src={assignedProfessional.photoUrl}
                alt={assignedProfessional.name}
                className="w-8 h-8 rounded-full object-cover border border-teal-500/50"
              />
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white">{assignedProfessional.name}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300 font-mono font-bold">
                    {assignedProfessional.officeNumber || 'Consultorio'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  <span>{assignedProfessional.specialty}</span>
                  <span>•</span>
                  <span className="font-mono text-teal-400">Clave: {assignedProfessional.accessCode}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-semibold">
              <Lock className="w-3.5 h-3.5" />
              <span>Consultorio Pendiente de Clave Única</span>
            </div>
          )}

          {/* Actions: Owner Return / Logout */}
          <div className="flex items-center gap-2">
            {onSwitchToOwner && (
              <button
                type="button"
                onClick={onSwitchToOwner}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition cursor-pointer border border-slate-700"
                title="Volver al Panel General del Dueño"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Panel Dirección</span>
              </button>
            )}

            <button
              type="button"
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 hover:text-rose-200 text-xs font-semibold transition cursor-pointer border border-rose-500/20"
              title="Cerrar sesión de staff"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </div>

        {/* Clean Specialist Tabs */}
        {assignedProfessional && (
          <div className="max-w-7xl mx-auto mt-3 flex items-center gap-1 overflow-x-auto border-t border-slate-800/80 pt-2 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('agenda')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-bold transition cursor-pointer whitespace-nowrap ${
                activeTab === 'agenda'
                  ? 'bg-teal-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>Agenda del Consultorio ({todayCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('customers')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-bold transition cursor-pointer whitespace-nowrap ${
                activeTab === 'customers'
                  ? 'bg-teal-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Mis Pacientes ({myCustomers.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('hours')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-bold transition cursor-pointer whitespace-nowrap ${
                activeTab === 'hours'
                  ? 'bg-teal-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Mis Horarios & Días Libres</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('services')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-bold transition cursor-pointer whitespace-nowrap ${
                activeTab === 'services'
                  ? 'bg-teal-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>Mis Servicios & Tarifas ({myServices.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-bold transition cursor-pointer whitespace-nowrap ${
                activeTab === 'analytics'
                  ? 'bg-teal-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Métricas de Atención</span>
            </button>
          </div>
        )}
      </header>

      {/* Main Workspace Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {/* Unassigned Staff Screen (Direct Activation Gateway) */}
        {!assignedProfessional ? (
          <div className="max-w-xl mx-auto my-10 bg-slate-950 rounded-3xl p-8 border border-slate-800 shadow-2xl text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-teal-500/10 text-teal-400 border border-teal-500/20 flex items-center justify-center mx-auto shadow-xs">
              <KeyRound className="w-8 h-8" />
            </div>

            <div>
              <span className="text-[11px] uppercase font-extrabold tracking-wider px-3 py-1 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/20">
                Activación de Consultorio Staff
              </span>
              <h2 className="text-xl font-extrabold text-white mt-3">
                Ingresa tu Clave Única de Acceso
              </h2>
              <p className="text-xs text-slate-400 mt-2 max-w-md mx-auto leading-relaxed">
                Cada consultorio en <strong>{business.name}</strong> es un espacio de trabajo 100% privado y autónomo. Para ingresar a tu agenda personal, pacientes y horarios, ingresa la clave única proporcionada por la Dirección de la clínica.
              </p>
            </div>

            <div className="bg-slate-900/90 rounded-2xl p-5 border border-slate-800 text-left space-y-3">
              <label className="block text-xs font-bold text-slate-200">
                Clave Única de Acceso asignada:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ej: CONS-1001 o STAFF-2002"
                  value={linkCodeInput}
                  onChange={(e) => {
                    setLinkCodeInput(e.target.value);
                    setLinkError(null);
                  }}
                  className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-white text-xs font-mono font-bold focus:ring-2 focus:ring-teal-500 focus:outline-none uppercase"
                />
                <button
                  type="button"
                  disabled={isLinking || !linkCodeInput.trim()}
                  onClick={() => handleLinkWithCode()}
                  className="px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-slate-950 text-xs font-bold transition shadow-xs cursor-pointer shrink-0"
                >
                  {isLinking ? 'Verificando...' : 'Activar Consultorio'}
                </button>
              </div>

              {linkError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{linkError}</span>
                </div>
              )}

              {linkSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-medium flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{linkSuccess}</span>
                </div>
              )}

              {/* Quick 1-click presets for demo/registered doctors */}
              {professionals.length > 0 && (
                <div className="pt-3 border-t border-slate-800">
                  <p className="text-[11px] text-slate-400 mb-2 font-semibold">
                    Consultorios registrados en {business.name} (clic rápido para vincular):
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {professionals.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setLinkCodeInput(p.accessCode || 'CONS-1001');
                          handleLinkWithCode(p.accessCode || 'CONS-1001');
                        }}
                        className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-teal-500/20 hover:text-teal-300 hover:border-teal-500/40 border border-slate-700 text-slate-300 transition cursor-pointer font-medium text-left flex items-center gap-1.5"
                      >
                        <span>🏢 {p.officeNumber || 'Consultorio'}:</span>
                        <strong className="text-white">{p.name}</strong>
                        <span className="font-mono text-teal-400">({p.accessCode || 'CONS-1001'})</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Active Consultorio Workspace */
          <div className="space-y-6">
            {/* Top Workspace KPI Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 shadow-xs">
                <div className="flex items-center justify-between text-slate-400 text-xs">
                  <span>Turnos de Hoy</span>
                  <CalendarIcon className="w-4 h-4 text-teal-400" />
                </div>
                <div className="text-2xl font-black text-white mt-1">{todayCount}</div>
                <div className="text-[11px] text-slate-400 mt-1">En tu consultorio</div>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 shadow-xs">
                <div className="flex items-center justify-between text-slate-400 text-xs">
                  <span>En Espera / Confirmados</span>
                  <Clock className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-2xl font-black text-amber-400 mt-1">{waitingOrConfirmedCount}</div>
                <div className="text-[11px] text-slate-400 mt-1">Listos para atender</div>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 shadow-xs">
                <div className="flex items-center justify-between text-slate-400 text-xs">
                  <span>Atendidos Hoy</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-black text-emerald-400 mt-1">{completedTodayCount}</div>
                <div className="text-[11px] text-slate-400 mt-1">Consultas completadas</div>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 shadow-xs">
                <div className="flex items-center justify-between text-slate-400 text-xs">
                  <span>Cancelados / Ausentes</span>
                  <X className="w-4 h-4 text-rose-400" />
                </div>
                <div className="text-2xl font-black text-rose-400 mt-1">{cancelledTodayCount}</div>
                <div className="text-[11px] text-slate-400 mt-1">Hoy</div>
              </div>
            </div>

            {/* TAB 1: AGENDA DEL CONSULTORIO */}
            {activeTab === 'agenda' && (
              <div className="bg-slate-950 rounded-3xl p-5 sm:p-6 border border-slate-800 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                  <div>
                    <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                      <CalendarCheck className="w-4 h-4 text-teal-400" />
                      <span>Agenda de {assignedProfessional.name}</span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Entorno privado de atención • {assignedProfessional.officeNumber || 'Consultorio'}
                    </p>
                  </div>

                  {/* Actions & Filters */}
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex bg-slate-900 rounded-xl p-1 border border-slate-800 text-xs">
                      <button
                        type="button"
                        onClick={() => setAgendaDateFilter('today')}
                        className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                          agendaDateFilter === 'today'
                            ? 'bg-teal-500 text-slate-950 shadow-xs'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Hoy ({todayCount})
                      </button>
                      <button
                        type="button"
                        onClick={() => setAgendaDateFilter('tomorrow')}
                        className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                          agendaDateFilter === 'tomorrow'
                            ? 'bg-teal-500 text-slate-950 shadow-xs'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Mañana
                      </button>
                      <button
                        type="button"
                        onClick={() => setAgendaDateFilter('all')}
                        className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                          agendaDateFilter === 'all'
                            ? 'bg-teal-500 text-slate-950 shadow-xs'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Todos ({myAppointments.length})
                      </button>
                    </div>

                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
                      <input
                        type="text"
                        placeholder="Buscar paciente..."
                        value={searchPatient}
                        onChange={(e) => setSearchPatient(e.target.value)}
                        className="pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowNewAppointmentModal(true)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs transition cursor-pointer shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Nueva Cita</span>
                    </button>
                  </div>
                </div>

                {/* Appointment Cards List */}
                {displayedAppointments.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 space-y-2">
                    <CalendarIcon className="w-10 h-10 mx-auto text-slate-600" />
                    <p className="text-sm font-semibold text-slate-400">
                      No hay citas registradas para este filtro en tu consultorio.
                    </p>
                    <p className="text-xs text-slate-500">
                      Los pacientes que reserven contigo en el portal público aparecerán aquí en tiempo real.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {displayedAppointments.map((app) => {
                      const srv = services.find((s) => s.id === app.serviceId);
                      const isCompleted = app.status === 'completed';
                      const isCancelled = app.status === 'cancelled';
                      const isConfirmed = app.status === 'confirmed';

                      return (
                        <div
                          key={app.id}
                          className={`p-4 rounded-2xl border transition flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                            isCompleted
                              ? 'bg-emerald-950/20 border-emerald-800/40'
                              : isCancelled
                              ? 'bg-rose-950/20 border-rose-800/40 opacity-70'
                              : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          {/* Time & Patient Info */}
                          <div className="flex items-start gap-3.5">
                            <div className="bg-slate-950 px-3 py-2 rounded-xl border border-slate-800 text-center shrink-0">
                              <span className="block text-xs font-mono font-bold text-teal-400">
                                {app.startTime}
                              </span>
                              <span className="block text-[10px] text-slate-500">
                                {app.endTime} hs
                              </span>
                            </div>

                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="text-sm font-bold text-white">{app.customerName}</h4>
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                                  #{app.bookingCode}
                                </span>
                                <span
                                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                    isCompleted
                                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                      : isCancelled
                                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                      : isConfirmed
                                      ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  }`}
                                >
                                  {isCompleted
                                    ? 'Atendido'
                                    : isCancelled
                                    ? 'Cancelado'
                                    : isConfirmed
                                    ? 'Confirmado'
                                    : 'En Espera'}
                                </span>
                              </div>

                              <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 flex-wrap">
                                <span className="font-semibold text-slate-300">
                                  {srv?.name || 'Consulta'}
                                </span>
                                <span>•</span>
                                <span>{formatDateShort(app.date)}</span>
                                <span>•</span>
                                <span className="flex items-center gap-1 text-slate-400">
                                  <Phone className="w-3 h-3 text-slate-500" />
                                  {app.customerPhone}
                                </span>
                              </div>

                              {app.notes && (
                                <p className="text-[11px] text-slate-400 mt-1 italic bg-slate-950/60 px-2 py-1 rounded border border-slate-800/80">
                                  "{app.notes}"
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Quick Actions */}
                          <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                            {/* WhatsApp Button */}
                            <button
                              type="button"
                              onClick={() => handleSendWhatsApp(app)}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-xs font-semibold transition cursor-pointer"
                              title="Enviar recordatorio WhatsApp"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">WhatsApp</span>
                            </button>

                            {/* Status Change Buttons */}
                            {!isCompleted && !isCancelled && (
                              <button
                                type="button"
                                onClick={() => handleUpdateStatus(app.id, 'completed')}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 text-xs font-bold transition cursor-pointer shadow-xs"
                                title="Marcar como Atendido"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Atendido</span>
                              </button>
                            )}

                            {!isCancelled && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm(`¿Marcar turno de ${app.customerName} como cancelado?`)) {
                                    handleUpdateStatus(app.id, 'cancelled');
                                  }
                                }}
                                className="p-1.5 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 text-xs transition cursor-pointer"
                                title="Cancelar turno"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: MIS PACIENTES */}
            {activeTab === 'customers' && (
              <div className="bg-slate-950 rounded-3xl p-5 sm:p-6 border border-slate-800 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                  <div>
                    <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                      <Users className="w-4 h-4 text-teal-400" />
                      <span>Ficha de Pacientes de {assignedProfessional.name}</span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Historial exclusivo de pacientes atendidos en tu consultorio privado
                    </p>
                  </div>
                  <span className="text-xs px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-300 font-mono font-bold">
                    Total: {myCustomers.length} pacientes
                  </span>
                </div>

                {myCustomers.length === 0 ? (
                  <div className="py-12 text-center text-slate-500">
                    <Users className="w-10 h-10 mx-auto text-slate-600 mb-2" />
                    <p className="text-sm font-semibold text-slate-400">
                      Aún no hay pacientes registrados en tu consultorio.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {myCustomers.map((cust) => {
                      const visits = myAppointments.filter((a) => a.customerId === cust.id);
                      const completedVisits = visits.filter((a) => a.status === 'completed');

                      return (
                        <div
                          key={cust.id}
                          className="bg-slate-900/90 rounded-2xl p-4 border border-slate-800 space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-bold text-white">{cust.name}</h4>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20 font-bold">
                              {completedVisits.length} consultas
                            </span>
                          </div>

                          <div className="space-y-1 text-xs text-slate-400">
                            <div className="flex items-center gap-2">
                              <Phone className="w-3.5 h-3.5 text-slate-500" />
                              <span>{cust.phone}</span>
                            </div>
                            {cust.email && (
                              <div className="flex items-center gap-2">
                                <Mail className="w-3.5 h-3.5 text-slate-500" />
                                <span className="truncate">{cust.email}</span>
                              </div>
                            )}
                          </div>

                          <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                            <span className="text-[11px] text-slate-500">
                              Última visita: {visits[0]?.date ? formatDateShort(visits[0].date) : 'N/D'}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                const url = generateWaMeLink(cust.phone, `Hola ${cust.name}, le escribo desde el Consultorio de ${assignedProfessional.name}.`);
                                window.open(url, '_blank', 'noopener,noreferrer');
                              }}
                              className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-xs transition cursor-pointer"
                              title="Contactar por WhatsApp"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: MIS HORARIOS & DÍAS LIBRES */}
            {activeTab === 'hours' && (
              <div className="bg-slate-950 rounded-3xl p-5 sm:p-6 border border-slate-800 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                  <div>
                    <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                      <Clock className="w-4 h-4 text-teal-400" />
                      <span>Horarios y Días Libres de {assignedProfessional.name}</span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Gestiona tus turnos de atención y bloquea tus vacaciones o licencias personales sin afectar el resto de la clínica.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowTimeOffModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs transition cursor-pointer shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Bloquear Días Libres / Vacaciones</span>
                  </button>
                </div>

                {/* Personal Time Offs List */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                    Mis Ausencias & Vacaciones Programadas:
                  </h4>
                  {myTimeOffs.length === 0 ? (
                    <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-center text-xs text-slate-500">
                      No tienes bloqueos de vacaciones o ausencias activas.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {myTimeOffs.map((to) => (
                        <div
                          key={to.id}
                          className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                        >
                          <div>
                            <span className="font-bold text-white block">{to.reason || 'Día Libre / Ausencia'}</span>
                            <span className="text-[11px] text-teal-400">
                              {formatDateShort(to.startDate)} al {formatDateShort(to.endDate)}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={async () => {
                              if (confirm('¿Eliminar este bloqueo de días libres?')) {
                                await api.deleteTimeOff(business.id, to.id);
                                setTimeOffs((prev) => prev.filter((t) => t.id !== to.id));
                              }
                            }}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 4: MIS SERVICIOS & HONORARIOS */}
            {activeTab === 'services' && (
              <div className="bg-slate-950 rounded-3xl p-5 sm:p-6 border border-slate-800 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                  <div>
                    <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-teal-400" />
                      <span>Servicios del Consultorio</span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Tratamientos y consultas que tus pacientes pueden reservar contigo
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingService(null);
                      setShowServiceModal(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Agregar Servicio</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {myServices.map((srv) => (
                    <div
                      key={srv.id}
                      className="bg-slate-900 rounded-2xl p-4 border border-slate-800 flex items-start justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-white">{srv.name}</h4>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                            {srv.durationMinutes} min
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 line-clamp-2">{srv.description}</p>
                        <div className="text-sm font-black text-teal-400 mt-2">
                          ${srv.price.toLocaleString('es-AR')}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setEditingService(srv);
                          setShowServiceModal(true);
                        }}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer shrink-0"
                        title="Editar servicio"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 5: MÉTRICAS DE MI CONSULTORIO */}
            {activeTab === 'analytics' && (
              <div className="bg-slate-950 rounded-3xl p-5 sm:p-6 border border-slate-800 shadow-sm space-y-6">
                <div>
                  <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-teal-400" />
                    <span>Rendimiento de {assignedProfessional.name}</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Estadísticas exclusivas de atención para tu consultorio ({assignedProfessional.officeNumber || 'Consultorio'})
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                    <span className="text-xs text-slate-400">Total Pacientes Atendidos</span>
                    <div className="text-2xl font-black text-white mt-1">
                      {myAppointments.filter((a) => a.status === 'completed').length}
                    </div>
                    <span className="text-[11px] text-teal-400">Consultas completadas</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                    <span className="text-xs text-slate-400">Tasa de Concreción</span>
                    <div className="text-2xl font-black text-emerald-400 mt-1">
                      {myAppointments.length > 0
                        ? Math.round(
                            (myAppointments.filter((a) => a.status === 'completed').length /
                              myAppointments.length) *
                              100
                          )
                        : 100}
                      %
                    </div>
                    <span className="text-[11px] text-slate-400">Asistencia efectiva</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                    <span className="text-xs text-slate-400">Pacientes Únicos</span>
                    <div className="text-2xl font-black text-white mt-1">{myCustomers.length}</div>
                    <span className="text-[11px] text-slate-400">En tu cartera</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modal: New Appointment (Pre-locked to this doctor) */}
      {showNewAppointmentModal && assignedProfessional && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 shadow-2xl max-w-md w-full space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-teal-400" />
                <span>Nuevo Turno para {assignedProfessional.name}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowNewAppointmentModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const formData = new FormData(form);
                const srvId = formData.get('serviceId') as string;
                const custName = (formData.get('customerName') as string).trim();
                const custPhone = (formData.get('customerPhone') as string).trim();
                const date = formData.get('date') as string;
                const startTime = formData.get('startTime') as string;
                const notes = formData.get('notes') as string;

                try {
                  const res = await api.bookAppointment({
                    businessId: business.id,
                    professionalId: assignedProfessional.id,
                    serviceId: srvId,
                    customer: {
                      firstName: custName,
                      lastName: '',
                      phone: custPhone,
                    },
                    date,
                    startTime,
                    notes,
                  });
                  setAppointments((prev) => [res.appointment, ...prev]);
                  setShowNewAppointmentModal(false);
                  alert(`¡Turno creado con éxito! Código: ${res.appointment.bookingCode}`);
                } catch (err: any) {
                  alert('Error al crear turno: ' + err.message);
                }
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Servicio</label>
                <select
                  name="serviceId"
                  required
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                >
                  {myServices.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} (${s.price} • {s.durationMinutes}m)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Nombre del Paciente</label>
                <input
                  type="text"
                  name="customerName"
                  required
                  placeholder="Ej: Laura Martínez"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Teléfono WhatsApp</label>
                <input
                  type="tel"
                  name="customerPhone"
                  required
                  placeholder="Ej: +54 9 11 5566-7788"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Fecha</label>
                  <input
                    type="date"
                    name="date"
                    required
                    defaultValue={todayStr}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Hora Inicio</label>
                  <input
                    type="time"
                    name="startTime"
                    required
                    defaultValue="10:00"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Notas / Motivo de consulta</label>
                <textarea
                  name="notes"
                  rows={2}
                  placeholder="Notas clínicas adicionales..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewAppointmentModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold"
                >
                  Confirmar Turno
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Time Off / Vacaciones */}
      {showTimeOffModal && assignedProfessional && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 shadow-2xl max-w-md w-full space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-teal-400" />
                <span>Bloquear Días Libres o Vacaciones</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowTimeOffModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const formData = new FormData(form);
                const startDate = formData.get('startDate') as string;
                const endDate = formData.get('endDate') as string;
                const reason = formData.get('reason') as string;

                try {
                  const created = await api.createTimeOff(business.id, {
                    professionalId: assignedProfessional.id,
                    startDate,
                    endDate,
                    reason,
                    type: 'vacation',
                  });
                  setTimeOffs((prev) => [...prev, created]);
                  setShowTimeOffModal(false);
                } catch (err: any) {
                  alert('Error al guardar días libres: ' + err.message);
                }
              }}
              className="space-y-3"
            >
              <p className="text-slate-400 text-[11px]">
                Este bloqueo se aplicará únicamente a tu consultorio (<strong>{assignedProfessional.officeNumber}</strong>). No afectará a otros especialistas de la clínica.
              </p>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Motivo / Descripción</label>
                <input
                  type="text"
                  name="reason"
                  required
                  placeholder="Ej: Vacaciones de invierno / Franco"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Desde</label>
                  <input
                    type="date"
                    name="startDate"
                    required
                    defaultValue={todayStr}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Hasta</label>
                  <input
                    type="date"
                    name="endDate"
                    required
                    defaultValue={todayStr}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowTimeOffModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold"
                >
                  Guardar Bloqueo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Service Edit/Create */}
      {showServiceModal && assignedProfessional && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 shadow-2xl max-w-md w-full space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-teal-400" />
                <span>{editingService ? 'Editar Servicio' : 'Nuevo Servicio del Consultorio'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowServiceModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const formData = new FormData(form);
                const name = (formData.get('name') as string).trim();
                const description = (formData.get('description') as string).trim();
                const price = Number(formData.get('price'));
                const durationMinutes = Number(formData.get('durationMinutes'));

                try {
                  if (editingService) {
                    const updated = await api.updateService(business.id, editingService.id, {
                      name,
                      description,
                      price,
                      durationMinutes,
                    });
                    setServices((prev) => prev.map((s) => (s.id === editingService.id ? updated : s)));
                  } else {
                    const created = await api.createService(business.id, {
                      name,
                      description,
                      price,
                      durationMinutes,
                      currency: 'ARS',
                      active: true,
                      assignedProfessionalIds: [assignedProfessional.id],
                    });
                    setServices((prev) => [...prev, created]);
                  }
                  setShowServiceModal(false);
                } catch (err: any) {
                  alert('Error al guardar servicio: ' + err.message);
                }
              }}
              className="space-y-3"
            >
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Nombre del Servicio</label>
                <input
                  type="text"
                  name="name"
                  required
                  defaultValue={editingService?.name || ''}
                  placeholder="Ej: Consulta Médica / Sesión Facial"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Descripción</label>
                <textarea
                  name="description"
                  rows={2}
                  defaultValue={editingService?.description || ''}
                  placeholder="Detalle de lo que incluye la consulta..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Precio ($)</label>
                  <input
                    type="number"
                    name="price"
                    required
                    min={0}
                    defaultValue={editingService?.price ?? 15000}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Duración (min)</label>
                  <input
                    type="number"
                    name="durationMinutes"
                    required
                    min={10}
                    step={5}
                    defaultValue={editingService?.durationMinutes ?? 30}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowServiceModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
