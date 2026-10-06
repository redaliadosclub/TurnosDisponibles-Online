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
import {
  validateStaffWorkingHoursAgainstClinic,
  type AvailabilityValidationResult,
  type WorkingHourConflict,
} from '../lib/availabilityValidation';
import {
  getProfessionalCommissionSummary,
  calculateAppointmentCommission,
  type ProfessionalCommissionSummary,
} from '../lib/commissionEngine';
import {
  getServicePriceForProfessional,
  isProfessionalAssignedToService,
} from '../lib/servicePricing';
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
  Save,
  RotateCcw,
  Sparkles,
  Sun,
  Moon,
  CalendarDays,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Info,
  CreditCard,
  Building,
  Wallet,
  DollarSign,
  Receipt,
  Percent,
  Coins,
  Calculator,
  FileText,
  Video,
  Share2,
} from 'lucide-react';
import { MedicalPrescriptionModal } from './teleconsulta/MedicalPrescriptionModal';
import { MedicalPrescription } from '../types';

interface StaffWorkspaceProps {
  business: Business;
  currentUser: User | null;
  initialCode?: string;
  initialProfId?: string;
  onLogout: () => void;
  onSwitchToOwner?: () => void;
  onUserUpdate?: (updatedUser: User) => void;
  onStartTeleconsulta?: (appointment: Appointment) => void;
}

export function StaffWorkspace({
  business,
  currentUser,
  initialCode = '',
  initialProfId = '',
  onLogout,
  onSwitchToOwner,
  onUserUpdate,
  onStartTeleconsulta,
}: StaffWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<'agenda' | 'customers' | 'hours' | 'payments' | 'services' | 'analytics'>('agenda');
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

  // Working Hours State for this Doctor / Consultorio
  const [myHoursDraft, setMyHoursDraft] = useState<WorkingHours[]>([]);
  const [isEditingMyHours, setIsEditingMyHours] = useState(false);
  const [savingMyHours, setSavingMyHours] = useState(false);
  const [myHoursMessage, setMyHoursMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [validationResult, setValidationResult] = useState<AvailabilityValidationResult | null>(null);

  // Payments, Deposit & Mercado Pago State for this Staff Specialist
  const [useCustomPayments, setUseCustomPayments] = useState<boolean>(false);
  const [staffPaymentsEnabled, setStaffPaymentsEnabled] = useState<boolean>(false);
  const [staffDepositRequired, setStaffDepositRequired] = useState<boolean>(false);
  const [staffDepositType, setStaffDepositType] = useState<'fixed' | 'percentage'>('fixed');
  const [staffDepositAmount, setStaffDepositAmount] = useState<number>(5000);
  const [staffMpAlias, setStaffMpAlias] = useState<string>('');
  const [staffMpPaymentLink, setStaffMpPaymentLink] = useState<string>('');
  const [staffMpPublicKey, setStaffMpPublicKey] = useState<string>('');
  const [staffMpAccessToken, setStaffMpAccessToken] = useState<string>('');
  const [staffBankName, setStaffBankName] = useState<string>('Banco Santander');
  const [staffBankAccountHolder, setStaffBankAccountHolder] = useState<string>('');
  const [staffBankAlias, setStaffBankAlias] = useState<string>('');
  const [staffBankCbu, setStaffBankCbu] = useState<string>('');
  const [staffPaymentInstructions, setStaffPaymentInstructions] = useState<string>('');
  const [savingStaffPayments, setSavingStaffPayments] = useState<boolean>(false);
  const [staffPaymentMessage, setStaffPaymentMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const DAYS_ORDER = [
    { day: 1, label: 'Lunes' },
    { day: 2, label: 'Martes' },
    { day: 3, label: 'Miércoles' },
    { day: 4, label: 'Jueves' },
    { day: 5, label: 'Viernes' },
    { day: 6, label: 'Sábado' },
    { day: 0, label: 'Domingo' },
  ];

  // Modals & Tools
  const [showNewAppointmentModal, setShowNewAppointmentModal] = useState(false);
  const [showTimeOffModal, setShowTimeOffModal] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [simulatedPrice, setSimulatedPrice] = useState<number>(20000);
  const [selectedAppointmentForReceipt, setSelectedAppointmentForReceipt] = useState<Appointment | null>(null);
  const [copiedReceiptText, setCopiedReceiptText] = useState(false);
  const [selectedAppointmentForPrescription, setSelectedAppointmentForPrescription] = useState<Appointment | null>(null);
  const [copiedTeleconsultaAppId, setCopiedTeleconsultaAppId] = useState<string | null>(null);

  const handleStartCall = (app: Appointment) => {
    if (onStartTeleconsulta) {
      onStartTeleconsulta(app);
    } else {
      window.location.hash = `#teleconsulta?room=${app.bookingCode}&role=doctor`;
    }
  };

  const handleCopyPatientLink = (app: Appointment) => {
    const url = `${window.location.origin}/#teleconsulta?room=${app.bookingCode}&role=patient`;
    navigator.clipboard.writeText(url);
    setCopiedTeleconsultaAppId(app.id);
    setTimeout(() => setCopiedTeleconsultaAppId(null), 3000);
  };

  const handleSendTeleconsultaWhatsApp = (app: Appointment) => {
    const srv = services.find((s) => s.id === app.serviceId);
    const roomUrl = `${window.location.origin}/#teleconsulta?room=${app.bookingCode}&role=patient`;
    const text = `¡Hola ${app.customerName}! 👋 Le saluda ${assignedProfessional?.name || 'su especialista'}. Ya estoy en la sala virtual para nuestra Teleconsulta de ${srv?.name || 'atención médica'}.\n\n🔗 Puede ingresar directamente aquí: ${roomUrl}\n\n¡Le espero conectado!`;
    const url = generateWaMeLink(app.customerPhone, text);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

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

  // Auto-link if initialProfId or initialCode passed in URL and matches
  useEffect(() => {
    if (!assignedProfessional && professionals.length > 0) {
      if (initialProfId) {
        const found = professionals.find((p) => p.id === initialProfId);
        if (found) {
          handleLinkWithProfessional(found);
          return;
        }
      }
      if (initialCode) {
        handleLinkWithCode(initialCode);
      }
    }
  }, [initialProfId, initialCode, assignedProfessional, professionals]);

  // Direct 1-click Link with a detected Professional
  const handleLinkWithProfessional = async (matched: Professional) => {
    try {
      setIsLinking(true);
      const directStaffUser: User = currentUser
        ? {
            ...currentUser,
            role: 'staff',
            businessId: business.id,
            professionalId: matched.id,
            officeNumber: matched.officeNumber || 'Consultorio Asignado',
            accessCode: matched.accessCode || 'CONS-1001',
          }
        : {
            id: `usr_staff_${matched.id}`,
            name: matched.name,
            email: matched.email || `staff_${matched.id}@consultorio.com`,
            role: 'staff',
            businessId: business.id,
            professionalId: matched.id,
            officeNumber: matched.officeNumber || 'Consultorio Asignado',
            accessCode: matched.accessCode || 'CONS-1001',
            phone: matched.phone,
          };

      try {
        localStorage.setItem('td_auth_token', `td_tok_staff_${matched.id}_${Date.now()}`);
        localStorage.setItem('td_session_user', JSON.stringify(directStaffUser));
      } catch {}

      if (onUserUpdate) onUserUpdate(directStaffUser);
      setLinkSuccess(`¡Acceso directo concedido! Bienvenido/a Dr./Lic. ${matched.name} (${matched.officeNumber || 'Consultorio'}).`);
      setTimeout(() => setLinkSuccess(null), 3000);
    } catch (err: any) {
      console.warn('Error en enlace directo de staff:', err);
    } finally {
      setIsLinking(false);
    }
  };

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

      const directStaffUser: User = currentUser
        ? {
            ...currentUser,
            role: 'staff',
            businessId: business.id,
            professionalId: matched.id,
            officeNumber: matched.officeNumber || 'Consultorio Asignado',
            accessCode: matched.accessCode || raw.toUpperCase(),
          }
        : {
            id: `usr_staff_${matched.id}`,
            name: matched.name,
            email: matched.email || `staff_${matched.id}@consultorio.com`,
            role: 'staff',
            businessId: business.id,
            professionalId: matched.id,
            officeNumber: matched.officeNumber || 'Consultorio Asignado',
            accessCode: matched.accessCode || raw.toUpperCase(),
            phone: matched.phone,
          };

      try {
        localStorage.setItem('td_auth_token', `td_tok_staff_${matched.id}_${Date.now()}`);
        localStorage.setItem('td_session_user', JSON.stringify(directStaffUser));
      } catch {}

      if (onUserUpdate) onUserUpdate(directStaffUser);

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

  // Toggle service active in my consultorio
  const handleToggleServiceForMe = async (srv: Service) => {
    if (!assignedProfessional) return;
    const isCurrentlyAssigned = isProfessionalAssignedToService(assignedProfessional, srv);

    const currentProfServiceIds =
      assignedProfessional.serviceIds && assignedProfessional.serviceIds.length > 0
        ? assignedProfessional.serviceIds
        : services.map((s) => s.id);

    const newServiceIds = isCurrentlyAssigned
      ? currentProfServiceIds.filter((id) => id !== srv.id)
      : [...currentProfServiceIds.filter((id) => id !== srv.id), srv.id];

    const currentSrvProfIds =
      srv.assignedProfessionalIds && srv.assignedProfessionalIds.length > 0
        ? srv.assignedProfessionalIds
        : professionals.map((p) => p.id);

    const newAssignedProfs = isCurrentlyAssigned
      ? currentSrvProfIds.filter((id) => id !== assignedProfessional.id)
      : [...currentSrvProfIds.filter((id) => id !== assignedProfessional.id), assignedProfessional.id];

    try {
      const updatedProf = await api.updateProfessional(business.id, assignedProfessional.id, {
        serviceIds: newServiceIds,
      });
      const updatedSrv = await api.updateService(business.id, srv.id, {
        assignedProfessionalIds: newAssignedProfs,
      });

      setProfessionals((prev) => prev.map((p) => (p.id === assignedProfessional.id ? updatedProf : p)));
      setServices((prev) => prev.map((s) => (s.id === srv.id ? updatedSrv : s)));
    } catch (e: any) {
      alert('Error al actualizar servicio: ' + e.message);
    }
  };

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

  // Working hours: General Clinic vs Custom Staff Hours
  const clinicGeneralHours = useMemo(() => {
    return workingHours.filter((w) => w.professionalId === null);
  }, [workingHours]);

  const myCustomHours = useMemo(() => {
    if (!assignedProfessional) return [];
    return workingHours.filter((w) => w.professionalId === assignedProfessional.id);
  }, [workingHours, assignedProfessional]);

  const hasCustomHours = useMemo(() => {
    return myCustomHours.length > 0 && myCustomHours.some((h) => h.enabled && h.shifts.length > 0);
  }, [myCustomHours]);

  // Displayed hours in read-only mode (either custom or clinic fallback)
  const displayedWeeklyHours = useMemo(() => {
    if (!assignedProfessional) return [];
    const source = hasCustomHours ? myCustomHours : clinicGeneralHours;
    return DAYS_ORDER.map((d) => {
      const found = source.find((h) => h.dayOfWeek === d.day);
      return {
        day: d.day,
        label: d.label,
        enabled: found ? found.enabled : false,
        shifts: found ? found.shifts : [],
      };
    });
  }, [assignedProfessional, hasCustomHours, myCustomHours, clinicGeneralHours, DAYS_ORDER]);

  // Validación lógica en tiempo real de los horarios del staff frente a la inactividad y feriados de la clínica
  const liveValidation = useMemo(() => {
    if (!isEditingMyHours || !assignedProfessional) return null;
    return validateStaffWorkingHoursAgainstClinic(myHoursDraft, clinicGeneralHours, timeOffs);
  }, [isEditingMyHours, myHoursDraft, clinicGeneralHours, timeOffs, assignedProfessional]);

  // Resumen de horarios y días de inactividad de la clínica para referencia del staff
  const clinicScheduleSummary = useMemo(() => {
    return DAYS_ORDER.map((d) => {
      const found = clinicGeneralHours.find((c) => c.dayOfWeek === d.day);
      if (!found || !found.enabled || found.shifts.length === 0) {
        return { day: d.day, label: d.label, active: false, text: 'Inactivo / Cerrado' };
      }
      const shiftsText = found.shifts.map((s) => `${s.start} a ${s.end} hs`).join(', ');
      return { day: d.day, label: d.label, active: true, text: shiftsText };
    });
  }, [clinicGeneralHours, DAYS_ORDER]);

  // Auto-ajuste de turnos a los días de apertura y límites de inactividad de la clínica
  const handleAutoFitToClinicHours = () => {
    if (!assignedProfessional) return;
    setMyHoursDraft((prev) =>
      prev.map((item) => {
        const cDay = clinicGeneralHours.find((c) => c.dayOfWeek === item.dayOfWeek);
        if (!cDay || !cDay.enabled || cDay.shifts.length === 0) {
          return { ...item, enabled: false, shifts: [] };
        }
        const cMin = cDay.shifts[0].start;
        const cMax = cDay.shifts[cDay.shifts.length - 1].end;
        const currentShifts = item.shifts.length > 0 ? item.shifts : cDay.shifts;
        const clampedShifts = currentShifts.map((s) => ({
          start: s.start < cMin ? cMin : s.start,
          end: s.end > cMax ? cMax : s.end,
        }));
        return { ...item, enabled: true, shifts: clampedShifts };
      })
    );
    setMyHoursMessage({
      type: 'success',
      text: 'Se ajustaron tus turnos automáticamente a los días de apertura y límites de inactividad de la clínica.',
    });
  };

  // Staff Payment Settings Sync
  useEffect(() => {
    if (assignedProfessional) {
      const hasCustom =
        assignedProfessional.paymentsEnabled !== undefined ||
        assignedProfessional.depositRequired !== undefined ||
        Boolean(assignedProfessional.mpAlias) ||
        Boolean(assignedProfessional.mpPaymentLink) ||
        Boolean(assignedProfessional.bankCbu) ||
        Boolean(assignedProfessional.bankAlias);
      setUseCustomPayments(hasCustom);
      setStaffPaymentsEnabled(
        assignedProfessional.paymentsEnabled ?? business.paymentsEnabled ?? true
      );
      setStaffDepositRequired(
        assignedProfessional.depositRequired ?? business.depositRequired ?? false
      );
      setStaffDepositType(
        assignedProfessional.depositType ?? business.depositType ?? 'fixed'
      );
      setStaffDepositAmount(
        assignedProfessional.depositAmount ?? business.depositAmount ?? 5000
      );
      setStaffMpAlias(assignedProfessional.mpAlias || '');
      setStaffMpPaymentLink(assignedProfessional.mpPaymentLink || '');
      setStaffMpPublicKey(assignedProfessional.mpPublicKey || '');
      setStaffMpAccessToken(assignedProfessional.mpAccessToken || '');
      setStaffBankName(assignedProfessional.bankName || 'Banco Santander');
      setStaffBankAccountHolder(assignedProfessional.bankAccountHolder || assignedProfessional.name);
      setStaffBankAlias(assignedProfessional.bankAlias || '');
      setStaffBankCbu(assignedProfessional.bankCbu || '');
      setStaffPaymentInstructions(assignedProfessional.paymentInstructions || '');
    }
  }, [assignedProfessional, business]);

  // Handler for Saving Specialist's Payments & Mercado Pago Configuration
  const handleSaveStaffPayments = async () => {
    if (!assignedProfessional) return;
    try {
      setSavingStaffPayments(true);
      setStaffPaymentMessage(null);
      const updated = await api.updateProfessional(business.id, assignedProfessional.id, {
        paymentsEnabled: staffPaymentsEnabled,
        depositRequired: staffDepositRequired,
        depositType: staffDepositType,
        depositAmount: Number(staffDepositAmount),
        mpAlias: staffMpAlias.trim(),
        mpPaymentLink: staffMpPaymentLink.trim(),
        mpPublicKey: staffMpPublicKey.trim(),
        mpAccessToken: staffMpAccessToken.trim(),
        bankName: staffBankName.trim(),
        bankAccountHolder: staffBankAccountHolder.trim(),
        bankAlias: staffBankAlias.trim(),
        bankCbu: staffBankCbu.trim(),
        paymentInstructions: staffPaymentInstructions.trim(),
      });
      setProfessionals((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      setUseCustomPayments(true);
      setStaffPaymentMessage({
        type: 'success',
        text: '¡Configuración de señas y Mercado Pago guardada con éxito para tu consultorio! Los pacientes verán tus datos y montos de seña al reservar contigo.',
      });
    } catch (err: any) {
      setStaffPaymentMessage({
        type: 'error',
        text: err.message || 'Error al guardar la configuración de cobros.',
      });
    } finally {
      setSavingStaffPayments(false);
    }
  };

  const handleResetStaffPaymentsToClinic = async () => {
    if (!assignedProfessional) return;
    if (
      !confirm(
        '¿Deseas volver a usar los datos generales de seña y Mercado Pago de la clínica? Se restablecerán tus datos bancarios y montos propios.'
      )
    ) {
      return;
    }
    try {
      setSavingStaffPayments(true);
      const updated = await api.updateProfessional(business.id, assignedProfessional.id, {
        paymentsEnabled: undefined,
        depositRequired: undefined,
        depositType: undefined,
        depositAmount: undefined,
        mpAlias: undefined,
        mpPaymentLink: undefined,
        mpPublicKey: undefined,
        mpAccessToken: undefined,
        bankName: undefined,
        bankAccountHolder: undefined,
        bankAlias: undefined,
        bankCbu: undefined,
        paymentInstructions: undefined,
      });
      setProfessionals((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      setUseCustomPayments(false);
      setStaffPaymentsEnabled(business.paymentsEnabled ?? true);
      setStaffDepositRequired(business.depositRequired ?? false);
      setStaffDepositType(business.depositType ?? 'fixed');
      setStaffDepositAmount(business.depositAmount ?? 5000);
      setStaffMpAlias(business.mpAlias || '');
      setStaffMpPaymentLink(business.mpPaymentLink || '');
      setStaffBankName(business.bankName || 'Banco Santander');
      setStaffBankAccountHolder(business.bankAccountHolder || business.name);
      setStaffBankAlias(business.bankAlias || '');
      setStaffBankCbu(business.bankCbu || '');
      setStaffPaymentMessage({
        type: 'success',
        text: 'Se han restablecido los cobros. Tu consultorio vuelve a utilizar las cuentas y señas generales de la clínica.',
      });
    } catch (err: any) {
      setStaffPaymentMessage({
        type: 'error',
        text: err.message || 'Error al restablecer la configuración.',
      });
    } finally {
      setSavingStaffPayments(false);
    }
  };

  // Commission Summary calculation for this doctor's appointments
  const staffCommissionSummary = useMemo(() => {
    if (!assignedProfessional) return null;
    return getProfessionalCommissionSummary(assignedProfessional, appointments, services);
  }, [assignedProfessional, appointments, services]);

  const generateAppointmentReceiptText = (app: Appointment) => {
    if (!assignedProfessional) return '';
    const srv = services.find((s) => s.id === app.serviceId);
    const calc = calculateAppointmentCommission(app, assignedProfessional, srv);
    const dateStr = formatDateShort(app.date);

    return `*🧾 COMPROBANTE DE TURNO & DESGLOSE DE HONORARIOS*
🏛️ *${business.name}*
👨‍⚕️ *Especialista:* ${assignedProfessional.name} (${assignedProfessional.officeNumber || 'Consultorio'})
👤 *Paciente:* ${app.customerName}
🔢 *Código de Reserva:* #${app.bookingCode}
📅 *Fecha:* ${dateStr} a las ${app.startTime} hs
💼 *Servicio:* ${srv?.name || 'Consulta Médica'}

━━━━━━━━━━━━━━━━━━━━━━━━━━
💰 *DESGLOSE FINANCIERO:*
• *Valor Total de la Consulta:* $${calc.servicePrice.toLocaleString('es-AR')}
• *Comisión de la Clínica:* ${
      calc.commissionEnabled
        ? `-$${calc.clinicCommission.toLocaleString('es-AR')} (${calc.commissionType === 'fixed' ? 'Monto Fijo' : `${calc.commissionRate}%`})`
        : '$0 (Sin comisión / 100% especialista)'
    }
• *HONORARIO NETO MÉDICO:* +$${calc.professionalNet.toLocaleString('es-AR')}
━━━━━━━━━━━━━━━━━━━━━━━━━━
💳 *ESTADO DE COBROS & SEÑAS:*
• *Seña Previa:* $${calc.depositAmount.toLocaleString('es-AR')} (${app.paymentMethod === 'mercadopago' ? 'Mercado Pago' : app.paymentMethod === 'transfer' ? 'Transferencia Bancaria' : 'Efectivo / No requerida'})
• *Saldo a Cobrar en Consultorio:* $${calc.balanceToPayInOffice.toLocaleString('es-AR')}
📌 *Liquidación:* ${calc.settlementNote}`;
  };

  const handleCopyReceiptText = (app: Appointment) => {
    const text = generateAppointmentReceiptText(app);
    navigator.clipboard.writeText(text);
    setCopiedReceiptText(true);
    setTimeout(() => setCopiedReceiptText(false), 2500);
  };

  const handleSendWhatsAppReceipt = (app: Appointment) => {
    const text = generateAppointmentReceiptText(app);
    const cleanPhone = (app.customerPhone || '').replace(/[^0-9]/g, '');
    const waLink = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}` : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(waLink, '_blank');
  };

  // Helper to ensure all 7 days exist for editing
  const ensureAllDaysForStaff = (sourceHours: WorkingHours[], profId: string): WorkingHours[] => {
    const profHours = sourceHours.filter((w) => w.professionalId === profId);
    const clinicHours = sourceHours.filter((w) => w.professionalId === null);
    const result: WorkingHours[] = [];

    for (let day = 0; day <= 6; day++) {
      const existingProf = profHours.find((w) => w.dayOfWeek === day);
      if (existingProf) {
        result.push({
          ...existingProf,
          professionalId: profId,
          shifts: existingProf.shifts.map((s) => ({ ...s })),
        });
      } else {
        const existingClinic = clinicHours.find((w) => w.dayOfWeek === day);
        if (existingClinic) {
          result.push({
            id: `wh_prof_${profId}_day_${day}`,
            businessId: business.id,
            professionalId: profId,
            dayOfWeek: day,
            enabled: existingClinic.enabled,
            shifts: existingClinic.shifts.map((s) => ({ ...s })),
          });
        } else {
          result.push({
            id: `wh_prof_${profId}_day_${day}`,
            businessId: business.id,
            professionalId: profId,
            dayOfWeek: day,
            enabled: day >= 1 && day <= 5,
            shifts:
              day >= 1 && day <= 5
                ? [{ start: '09:00', end: '13:00' }, { start: '14:00', end: '18:00' }]
                : day === 6
                ? [{ start: '09:00', end: '13:00' }]
                : [],
          });
        }
      }
    }
    return result;
  };

  const handleStartEditingMyHours = () => {
    if (!assignedProfessional) return;
    setMyHoursDraft(ensureAllDaysForStaff(workingHours, assignedProfessional.id));
    setIsEditingMyHours(true);
    setMyHoursMessage(null);
    setValidationResult(null);
  };

  const handleCancelEditingMyHours = () => {
    setIsEditingMyHours(false);
    setMyHoursMessage(null);
    setValidationResult(null);
  };

  const handleToggleMyDay = (dayNum: number) => {
    setMyHoursDraft((prev) =>
      prev.map((item) => {
        if (item.dayOfWeek === dayNum) {
          const nextEnabled = !item.enabled;
          let shifts = item.shifts;
          if (nextEnabled && shifts.length === 0) {
            shifts = [{ start: '09:00', end: '17:00' }];
          }
          return { ...item, enabled: nextEnabled, shifts };
        }
        return item;
      })
    );
  };

  const handleAddShiftToMyDay = (dayNum: number) => {
    setMyHoursDraft((prev) =>
      prev.map((item) => {
        if (item.dayOfWeek === dayNum) {
          const lastShift = item.shifts[item.shifts.length - 1];
          const newStart = lastShift ? '15:00' : '09:00';
          const newEnd = lastShift ? '19:00' : '13:00';
          return {
            ...item,
            enabled: true,
            shifts: [...item.shifts, { start: newStart, end: newEnd }],
          };
        }
        return item;
      })
    );
  };

  const handleRemoveShiftFromMyDay = (dayNum: number, shiftIdx: number) => {
    setMyHoursDraft((prev) =>
      prev.map((item) => {
        if (item.dayOfWeek === dayNum) {
          const nextShifts = item.shifts.filter((_, idx) => idx !== shiftIdx);
          return {
            ...item,
            enabled: nextShifts.length > 0,
            shifts: nextShifts,
          };
        }
        return item;
      })
    );
  };

  const handleShiftTimeChange = (
    dayNum: number,
    shiftIdx: number,
    field: 'start' | 'end',
    val: string
  ) => {
    setMyHoursDraft((prev) =>
      prev.map((item) => {
        if (item.dayOfWeek === dayNum) {
          const nextShifts = item.shifts.map((s, idx) => {
            if (idx === shiftIdx) {
              return { ...s, [field]: val };
            }
            return s;
          });
          return { ...item, shifts: nextShifts };
        }
        return item;
      })
    );
  };

  const handleCopyMondayToWeek = () => {
    const monday = myHoursDraft.find((h) => h.dayOfWeek === 1);
    if (!monday) return;
    setMyHoursDraft((prev) =>
      prev.map((item) => {
        if (item.dayOfWeek >= 2 && item.dayOfWeek <= 5) {
          return {
            ...item,
            enabled: monday.enabled,
            shifts: JSON.parse(JSON.stringify(monday.shifts)),
          };
        }
        return item;
      })
    );
    setMyHoursMessage({
      type: 'success',
      text: 'Se copió la configuración del Lunes a Martes, Miércoles, Jueves y Viernes.',
    });
  };

  const handleImportClinicHours = () => {
    if (!assignedProfessional) return;
    const clinicHours = workingHours.filter((w) => w.professionalId === null);
    const imported = ensureAllDaysForStaff(clinicHours, assignedProfessional.id);
    setMyHoursDraft(imported);
    setMyHoursMessage({
      type: 'success',
      text: 'Se copiaron los horarios generales de la clínica en tu borrador. Puedes ajustarlos o cambiarlos a tu conveniencia antes de guardar.',
    });
  };

  const handleApplyPreset = (preset: 'manana' | 'tarde' | 'partido') => {
    setMyHoursDraft((prev) =>
      prev.map((item) => {
        if (item.dayOfWeek >= 1 && item.dayOfWeek <= 5) {
          return {
            ...item,
            enabled: true,
            shifts:
              preset === 'manana'
                ? [{ start: '08:30', end: '13:00' }]
                : preset === 'tarde'
                ? [{ start: '14:00', end: '19:30' }]
                : [
                    { start: '09:00', end: '13:00' },
                    { start: '15:00', end: '19:00' },
                  ],
          };
        }
        if (item.dayOfWeek === 6) {
          return {
            ...item,
            enabled: preset === 'manana' || preset === 'partido',
            shifts: preset === 'manana' || preset === 'partido' ? [{ start: '09:00', end: '13:00' }] : [],
          };
        }
        return {
          ...item,
          enabled: false,
          shifts: [],
        };
      })
    );
    setMyHoursMessage({
      type: 'success',
      text:
        preset === 'manana'
          ? 'Plantilla aplicada: Turno Mañana (Lun a Sáb 08:30 a 13:00)'
          : preset === 'tarde'
          ? 'Plantilla aplicada: Turno Tarde (Lun a Vie 14:00 a 19:30)'
          : 'Plantilla aplicada: Turno Partido (Lun a Vie 09:00-13:00 y 15:00-19:00, Sáb 09:00-13:00)',
    });
  };

  const handleSaveMyHours = async () => {
    if (!assignedProfessional) return;
    try {
      setSavingMyHours(true);
      setMyHoursMessage(null);
      const payload = myHoursDraft.map((wh) => ({
        ...wh,
        businessId: business.id,
        professionalId: assignedProfessional.id,
      }));

      // Validación lógica a través de la capa de servicios contra inactividad y feriados de la clínica
      const validation = await api.validateStaffAvailability(business.id, payload, {
        strictOperatingHours: true,
      });

      if (!validation.valid) {
        setValidationResult(validation);
        setMyHoursMessage({
          type: 'error',
          text: `Conflicto de disponibilidad: se encontraron ${validation.errors.length} inconsistencia(s) con las horas de inactividad o días de cierre de la clínica. Revisa los días marcados antes de guardar.`,
        });
        setSavingMyHours(false);
        return;
      }

      await api.updateWorkingHours(business.id, payload);
      const reloaded = await api.getWorkingHours(business.id);
      setWorkingHours(reloaded);
      setIsEditingMyHours(false);
      setValidationResult(validation);

      let successText =
        '¡Disponibilidad y rangos de atención guardados con éxito de forma independiente a la clínica! Los pacientes solo podrán agendar en tus franjas activas.';
      if (validation.warnings.length > 0) {
        successText += ` (Se detectaron ${validation.warnings.length} aviso(s) sobre feriados de la clínica que mantendrán la agenda pausada en esas fechas específicas).`;
      }

      setMyHoursMessage({
        type: 'success',
        text: successText,
      });
    } catch (err: any) {
      setMyHoursMessage({ type: 'error', text: err.message || 'Error al guardar disponibilidad' });
    } finally {
      setSavingMyHours(false);
    }
  };

  const handleResetToClinicHours = async () => {
    if (!assignedProfessional) return;
    if (
      !confirm(
        '¿Deseas volver a usar los horarios generales de la clínica? Esto eliminará tus rangos horarios personalizados de este consultorio.'
      )
    ) {
      return;
    }
    try {
      setSavingMyHours(true);
      await api.resetProfessionalWorkingHours(business.id, assignedProfessional.id);
      const reloaded = await api.getWorkingHours(business.id);
      setWorkingHours(reloaded);
      setIsEditingMyHours(false);
      setMyHoursMessage({
        type: 'success',
        text: 'Se han restablecido los horarios. Tu consultorio vuelve a utilizar los horarios de atención generales de la clínica.',
      });
    } catch (err: any) {
      setMyHoursMessage({ type: 'error', text: err.message || 'Error al restablecer horarios' });
    } finally {
      setSavingMyHours(false);
    }
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
              <span>Configuración de Disponibilidad</span>
              {hasCustomHours && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('payments')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-bold transition cursor-pointer whitespace-nowrap ${
                activeTab === 'payments'
                  ? 'bg-teal-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Señas & Mercado Pago</span>
              {useCustomPayments && staffDepositRequired && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              )}
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
            {/* Top Financial & Commission Summary Card */}
            {staffCommissionSummary && (
              <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 p-4 sm:p-5 rounded-3xl border border-slate-800 shadow-sm space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-800/80">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Wallet className="w-4 h-4 text-teal-400" />
                      <span>Liquidación & Honorarios de {assignedProfessional.name}</span>
                    </span>
                    {!staffCommissionSummary.commissionEnabled || staffCommissionSummary.commissionType === 'none' ? (
                      <span className="text-[10px] font-bold text-emerald-300 bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                        🎉 Sin comisión de clínica (100% honorario propio)
                      </span>
                    ) : staffCommissionSummary.commissionType === 'fixed' ? (
                      <span className="text-[10px] font-bold text-sky-300 bg-sky-950/60 px-2.5 py-0.5 rounded-full border border-sky-500/30">
                        🏷️ Comisión Clínica: ${staffCommissionSummary.commissionRate.toLocaleString('es-AR')} Fijo / turno
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-amber-300 bg-amber-950/60 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                        📊 Comisión Clínica: {staffCommissionSummary.commissionRate}% por consulta
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {assignedProfessional.officeNumber || 'Consultorio'} • Clave: {assignedProfessional.accessCode}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                  <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800/90">
                    <span className="text-slate-400 text-[11px] block">Facturación Bruta:</span>
                    <span className="text-base font-extrabold text-white">
                      ${staffCommissionSummary.grossRevenue.toLocaleString('es-AR')}
                    </span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">
                      {staffCommissionSummary.completedAppointments || staffCommissionSummary.totalAppointments} turnos registrados
                    </span>
                  </div>

                  <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800/90">
                    <span className="text-slate-400 text-[11px] block">Deducción Clínica:</span>
                    <span className="text-base font-extrabold text-teal-400">
                      -${staffCommissionSummary.totalClinicCommission.toLocaleString('es-AR')}
                    </span>
                    <span className="text-[10px] text-teal-500/80 block mt-0.5">
                      {staffCommissionSummary.commissionRateDisplay}
                    </span>
                  </div>

                  <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800/90">
                    <span className="text-slate-400 text-[11px] block">Mis Honorarios Netos:</span>
                    <span className="text-base font-extrabold text-emerald-400">
                      +${staffCommissionSummary.totalProfessionalNet.toLocaleString('es-AR')}
                    </span>
                    <span className="text-[10px] text-emerald-500/80 block mt-0.5">
                      Ganancia profesional neta
                    </span>
                  </div>

                  <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800/90">
                    <span className="text-slate-400 text-[11px] block">Señas Cobradas:</span>
                    <span className="text-base font-extrabold text-amber-400">
                      ${staffCommissionSummary.totalDepositsCollected.toLocaleString('es-AR')}
                    </span>
                    <span className="text-[10px] text-amber-500/80 block mt-0.5">
                      Mercado Pago / Banco
                    </span>
                  </div>
                </div>
              </div>
            )}

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

                                {(srv?.modality === 'online' || app.modality === 'online' || Boolean(app.teleconsultaRoomUrl)) && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                                    <Video className="w-3 h-3 text-cyan-400" />
                                    <span>Teleconsulta 1a1</span>
                                  </span>
                                )}
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

                              {srv && (
                                <div className="flex items-center gap-2 mt-1.5 flex-wrap text-[11px]">
                                  <span className="font-mono font-bold text-white bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                                    Honorario: ${srv.price.toLocaleString('es-AR')}
                                  </span>
                                  {assignedProfessional.commissionEnabled !== false && assignedProfessional.commissionType !== 'none' ? (
                                    <>
                                      <span className="text-teal-400 bg-teal-950/60 px-2 py-0.5 rounded border border-teal-500/20 font-medium">
                                        Comisión: ${calculateAppointmentCommission(app, assignedProfessional, srv).clinicCommission.toLocaleString('es-AR')}
                                      </span>
                                      <span className="text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/20 font-bold">
                                        Tu Neto: ${calculateAppointmentCommission(app, assignedProfessional, srv).professionalNet.toLocaleString('es-AR')}
                                      </span>
                                    </>
                                  ) : (
                                    <span className="text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/20 font-bold">
                                      100% Neto (${srv.price.toLocaleString('es-AR')})
                                    </span>
                                  )}
                                  {app.depositAmount ? (
                                    <span className="text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/20">
                                      Seña pagada: ${app.depositAmount.toLocaleString('es-AR')} (Cobrar: ${Math.max(0, srv.price - app.depositAmount).toLocaleString('es-AR')})
                                    </span>
                                  ) : null}
                                </div>
                              )}

                              {app.notes && (
                                <p className="text-[11px] text-slate-400 mt-1.5 italic bg-slate-950/60 px-2 py-1 rounded border border-slate-800/80">
                                  "{app.notes}"
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Quick Actions */}
                          <div className="flex items-center gap-2 self-end md:self-center shrink-0 flex-wrap">
                            {/* Native WebRTC Teleconsulta Live Button */}
                            <button
                              type="button"
                              onClick={() => handleStartCall(app)}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 text-xs font-extrabold transition cursor-pointer shadow-md"
                              title="Iniciar videollamada 1 a 1 nativa WebRTC con este paciente"
                            >
                              <Video className="w-3.5 h-3.5" />
                              <span>Teleconsulta</span>
                            </button>

                            {/* Digital Prescription Button */}
                            <button
                              type="button"
                              onClick={() => setSelectedAppointmentForPrescription(app)}
                              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                                app.prescription
                                  ? 'bg-emerald-950/50 text-emerald-300 border-emerald-500/40 hover:bg-emerald-900/50'
                                  : 'bg-slate-800 hover:bg-slate-700 text-teal-300 border-slate-700'
                              }`}
                              title="Emitir o consultar Receta Médica Digital con QR y firma"
                            >
                              <FileText className="w-3.5 h-3.5 text-teal-400" />
                              <span className="hidden sm:inline">{app.prescription ? 'Ver Receta' : 'Receta'}</span>
                            </button>

                            {/* Share Teleconsulta link via WhatsApp */}
                            <button
                              type="button"
                              onClick={() => handleSendTeleconsultaWhatsApp(app)}
                              className="p-1.5 rounded-xl bg-slate-800 hover:bg-cyan-500/20 text-slate-400 hover:text-cyan-300 text-xs transition cursor-pointer"
                              title="Compartir link de acceso a la sala por WhatsApp al paciente"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Receipt / Financial Breakdown Button */}
                            <button
                              type="button"
                              onClick={() => setSelectedAppointmentForReceipt(app)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-300 border border-slate-700 text-xs font-semibold transition cursor-pointer"
                              title="Ver desglose financiero, liquidación y recibo de honorarios"
                            >
                              <Receipt className="w-3.5 h-3.5 text-teal-400" />
                              <span className="hidden sm:inline">Desglose & Cobro</span>
                            </button>

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

            {/* TAB 3: CONFIGURACIÓN DE DISPONIBILIDAD */}
            {activeTab === 'hours' && (
              <div className="bg-slate-950 rounded-3xl p-5 sm:p-6 border border-slate-800 shadow-sm space-y-6">
                {/* Header & Status */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                        <Clock className="w-4 h-4 text-teal-400" />
                        <span>Configuración de Disponibilidad: {assignedProfessional.name}</span>
                      </h3>
                      {hasCustomHours ? (
                        <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Disponibilidad Independiente Activa</span>
                        </span>
                      ) : (
                        <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-sky-500/15 text-sky-400 border border-sky-500/30 font-bold flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          <span>Heredados de la Clínica (Por Defecto)</span>
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400">
                      Define tus propios rangos horarios y días de atención específicos. Estos datos se guardan de forma 100% independiente a la configuración general de la clínica, validándose automáticamente contra las horas de inactividad o días feriados configurados por el dueño en el BusinessDashboard.
                    </p>
                  </div>

                  {/* Actions Header */}
                  <div className="flex flex-wrap items-center gap-2">
                    {!isEditingMyHours ? (
                      <>
                        {hasCustomHours && (
                          <button
                            type="button"
                            onClick={handleResetToClinicHours}
                            disabled={savingMyHours}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 text-xs font-semibold transition cursor-pointer"
                            title="Volver a utilizar los horarios generales de la clínica"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Restablecer a Clínica</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setShowTimeOffModal(true)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-teal-400 border border-teal-500/30 text-xs font-semibold transition cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>+ Vacaciones / Días Libres</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleStartEditingMyHours}
                          className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs transition cursor-pointer shadow-xs"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Editar Disponibilidad & Días</span>
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={handleCancelEditingMyHours}
                          disabled={savingMyHours}
                          className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition cursor-pointer border border-slate-800"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveMyHours}
                          disabled={savingMyHours || (liveValidation?.errors.length ?? 0) > 0}
                          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer shadow-xs ${
                            (liveValidation?.errors.length ?? 0) > 0
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 cursor-not-allowed'
                              : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                          }`}
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>{savingMyHours ? 'Guardando...' : 'Guardar Disponibilidad'}</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Feedback Message */}
                {myHoursMessage && (
                  <div
                    className={`p-3.5 rounded-2xl text-xs flex items-center justify-between gap-3 animate-in fade-in ${
                      myHoursMessage.type === 'success'
                        ? 'bg-emerald-950/40 border border-emerald-800/60 text-emerald-300'
                        : 'bg-rose-950/40 border border-rose-800/60 text-rose-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {myHoursMessage.type === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                      ) : (
                        <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                      )}
                      <span>{myHoursMessage.text}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setMyHoursMessage(null)}
                      className="text-slate-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Clinic Reference Guide: Operating Hours & Inactive Days */}
                <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-teal-400" />
                      <span>Marco de Funcionamiento de la Clínica (Configurado por Dirección):</span>
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Tus horarios propios deben operar en los días y dentro de los límites de apertura del establecimiento
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1 text-[11px]">
                    {clinicScheduleSummary.map((c) => (
                      <span
                        key={c.day}
                        className={`px-2.5 py-1 rounded-xl font-mono border ${
                          c.active
                            ? 'bg-slate-950/80 border-slate-800 text-slate-300'
                            : 'bg-rose-950/20 border-rose-900/40 text-rose-400 font-semibold'
                        }`}
                      >
                        <span className="font-sans font-bold text-slate-400 mr-1">{c.label}:</span>
                        {c.text}
                      </span>
                    ))}
                  </div>
                </div>

                {/* VALIDATION CONFLICTS BANNER (WHEN EDITING) */}
                {isEditingMyHours && liveValidation?.hasConflicts && (
                  <div className="space-y-3 animate-in fade-in">
                    {/* Blocking Errors: Inactivity or Clinic Closed Days */}
                    {liveValidation.errors.length > 0 && (
                      <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-800/80 text-xs text-rose-200 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2 font-bold text-rose-300">
                            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                            <span>
                              Conflicto con Horas de Inactividad o Cierres de la Clínica ({liveValidation.errors.length}):
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={handleAutoFitToClinicHours}
                            className="flex items-center gap-1 px-3 py-1 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/40 font-semibold transition cursor-pointer self-start sm:self-auto text-[11px]"
                          >
                            <Sparkles className="w-3 h-3" />
                            <span>Ajustar Automáticamente a Horarios de la Clínica</span>
                          </button>
                        </div>
                        <ul className="space-y-1.5 pl-6 list-disc">
                          {liveValidation.errors.map((err, idx) => (
                            <li key={idx} className="text-slate-300">
                              <strong className="text-rose-300">{err.dayLabel}:</strong> {err.message}
                              {err.suggestedAction && (
                                <span className="block text-[11px] text-teal-400 font-sans mt-0.5">
                                  💡 Sugerencia: {err.suggestedAction}
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Non-blocking Warnings: Clinic Holidays or General Blocks */}
                    {liveValidation.warnings.length > 0 && (
                      <div className="p-3.5 rounded-2xl bg-amber-950/30 border border-amber-800/50 text-xs text-amber-200 space-y-2">
                        <div className="flex items-center gap-2 font-bold text-amber-300">
                          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                          <span>
                            Avisos de Feriados y Bloqueos Institucionales Programados ({liveValidation.warnings.length}):
                          </span>
                        </div>
                        <ul className="space-y-1 pl-5 list-disc text-slate-300 text-[11px]">
                          {liveValidation.warnings.map((w, idx) => (
                            <li key={idx}>
                              <strong className="text-amber-300">{w.dayLabel}:</strong> {w.message}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* MODE 1: READ ONLY SCHEDULE VIEW */}
                {!isEditingMyHours && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                      {displayedWeeklyHours.map((item) => (
                        <div
                          key={item.day}
                          className={`p-4 rounded-2xl border transition ${
                            item.enabled && item.shifts.length > 0
                              ? 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                              : 'bg-slate-950/50 border-slate-900 opacity-60'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-white uppercase tracking-wider">
                              {item.label}
                            </span>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                item.enabled && item.shifts.length > 0
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : 'bg-slate-800 text-slate-500'
                              }`}
                            >
                              {item.enabled && item.shifts.length > 0 ? 'Atiende' : 'No atiende'}
                            </span>
                          </div>

                          {item.enabled && item.shifts.length > 0 ? (
                            <div className="space-y-1.5 mt-2">
                              {item.shifts.map((s, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center justify-between bg-slate-950 px-2.5 py-1.5 rounded-xl border border-slate-800/80 text-xs font-mono"
                                >
                                  <span className="text-teal-400 font-bold">{s.start} hs</span>
                                  <span className="text-slate-600">a</span>
                                  <span className="text-teal-400 font-bold">{s.end} hs</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-[11px] text-slate-500 italic mt-3 py-1">
                              Día de descanso en este consultorio
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="p-4 rounded-2xl bg-teal-950/20 border border-teal-800/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2.5">
                        <Sparkles className="w-4 h-4 text-teal-400 shrink-0" />
                        <span className="text-slate-300">
                          ¿Deseas configurar tus propios días u horarios de atención específicos?
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleStartEditingMyHours}
                        className="px-3.5 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs transition cursor-pointer self-start sm:self-auto shrink-0 shadow-xs"
                      >
                        Configurar Mi Disponibilidad
                      </button>
                    </div>
                  </div>
                )}

                {/* MODE 2: INTERACTIVE SCHEDULE & AVAILABILITY EDITOR */}
                {isEditingMyHours && (
                  <div className="space-y-5 animate-in fade-in">
                    {/* Presets and Helpers Bar */}
                    <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                          <span>Plantillas rápidas para tu consultorio:</span>
                        </span>
                        <span className="text-[11px] text-slate-500">
                          Aplica una base y edita los días o turnos específicos que desees
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleApplyPreset('manana')}
                          className="flex items-center gap-1 px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition cursor-pointer"
                        >
                          <Sun className="w-3.5 h-3.5 text-amber-400" />
                          <span>Turno Mañana (08:30 a 13:00)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleApplyPreset('tarde')}
                          className="flex items-center gap-1 px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition cursor-pointer"
                        >
                          <Moon className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Turno Tarde (14:00 a 19:30)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleApplyPreset('partido')}
                          className="flex items-center gap-1 px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition cursor-pointer"
                        >
                          <Clock className="w-3.5 h-3.5 text-teal-400" />
                          <span>Turno Doble (09-13 / 15-19)</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleCopyMondayToWeek}
                          className="flex items-center gap-1 px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Copiar Lunes a Mar-Vie</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleImportClinicHours}
                          className="flex items-center gap-1 px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition cursor-pointer"
                        >
                          <Building2 className="w-3.5 h-3.5 text-sky-400" />
                          <span>Copiar de la Clínica</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleAutoFitToClinicHours}
                          className="flex items-center gap-1 px-3 py-1 rounded-xl bg-teal-500/15 hover:bg-teal-500/25 text-teal-300 border border-teal-500/30 text-xs font-semibold transition cursor-pointer"
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
                          <span>Ajustar a Límites de Clínica</span>
                        </button>
                      </div>
                    </div>

                    {/* Day by Day Configuration Cards */}
                    <div className="space-y-3">
                      {DAYS_ORDER.map(({ day, label }) => {
                        const daySchedule = myHoursDraft.find((h) => h.dayOfWeek === day);
                        const isEnabled = daySchedule?.enabled ?? false;
                        const shifts = daySchedule?.shifts ?? [];

                        const dayErrors = liveValidation?.errors.filter((e) => e.dayOfWeek === day) || [];
                        const dayWarnings = liveValidation?.warnings.filter((w) => w.dayOfWeek === day) || [];
                        const hasDayError = dayErrors.length > 0;
                        const hasDayWarning = dayWarnings.length > 0;

                        return (
                          <div
                            key={day}
                            className={`p-4 rounded-2xl border transition ${
                              hasDayError
                                ? 'bg-rose-950/20 border-rose-500/70 shadow-sm'
                                : isEnabled
                                ? 'bg-slate-900 border-slate-800 shadow-xs'
                                : 'bg-slate-950/60 border-slate-900 opacity-60'
                            }`}
                          >
                            {/* Day Header */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
                              <div className="flex items-center gap-3">
                                <label className="relative inline-flex items-center cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={isEnabled}
                                    onChange={() => handleToggleMyDay(day)}
                                    className="sr-only peer"
                                  />
                                  <div className="w-10 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-500"></div>
                                </label>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold text-white uppercase tracking-wider">
                                      {label}
                                    </span>
                                    {hasDayError && (
                                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold flex items-center gap-1">
                                        <ShieldAlert className="w-3 h-3 text-rose-400" />
                                        <span>Conflicto con Clínica</span>
                                      </span>
                                    )}
                                  </div>
                                  <span className="block text-[11px] text-slate-400">
                                    {isEnabled
                                      ? `${shifts.length} ${shifts.length === 1 ? 'rango de atención' : 'rangos horarios'}`
                                      : 'No atiende en la clínica este día'}
                                  </span>
                                </div>
                              </div>

                              {isEnabled && (
                                <button
                                  type="button"
                                  onClick={() => handleAddShiftToMyDay(day)}
                                  className="flex items-center gap-1 px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-400 text-xs font-semibold transition cursor-pointer self-start sm:self-auto"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>+ Agregar Turno / Franja</span>
                                </button>
                              )}
                            </div>

                            {/* Specific Conflict Badges for this day */}
                            {hasDayError && (
                              <div className="mt-3 p-2.5 rounded-xl bg-rose-950/40 border border-rose-800/60 text-xs text-rose-200 space-y-1">
                                {dayErrors.map((err, idx) => (
                                  <div key={idx} className="flex items-start gap-1.5">
                                    <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                                    <div>
                                      <span className="font-semibold">{err.message}</span>
                                      {err.suggestedAction && (
                                        <p className="text-[11px] text-teal-400 mt-0.5">
                                          Sugerencia: {err.suggestedAction}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {hasDayWarning && !hasDayError && (
                              <div className="mt-3 p-2 rounded-xl bg-amber-950/30 border border-amber-800/50 text-[11px] text-amber-300 space-y-1">
                                {dayWarnings.map((w, idx) => (
                                  <div key={idx} className="flex items-start gap-1.5">
                                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                                    <span>{w.message}</span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Shifts Inputs */}
                            {isEnabled ? (
                              <div className="pt-3 space-y-2.5">
                                {shifts.map((shift, sIdx) => (
                                  <div
                                    key={sIdx}
                                    className="flex items-center gap-3 flex-wrap bg-slate-950 p-2.5 rounded-xl border border-slate-800"
                                  >
                                    <span className="text-xs font-semibold text-slate-400 w-16">
                                      Turno {sIdx + 1}:
                                    </span>

                                    <div className="flex items-center gap-2">
                                      <span className="text-[11px] text-slate-500">Desde:</span>
                                      <input
                                        type="time"
                                        value={shift.start}
                                        onChange={(e) =>
                                          handleShiftTimeChange(day, sIdx, 'start', e.target.value)
                                        }
                                        className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white font-mono focus:outline-none focus:border-teal-500"
                                      />
                                    </div>

                                    <div className="flex items-center gap-2">
                                      <span className="text-[11px] text-slate-500">Hasta:</span>
                                      <input
                                        type="time"
                                        value={shift.end}
                                        onChange={(e) =>
                                          handleShiftTimeChange(day, sIdx, 'end', e.target.value)
                                        }
                                        className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white font-mono focus:outline-none focus:border-teal-500"
                                      />
                                    </div>

                                    {shifts.length > 1 && (
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveShiftFromMyDay(day, sIdx)}
                                        className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer ml-auto"
                                        title="Eliminar este turno"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="pt-3 flex items-center justify-between text-xs text-slate-500">
                                <span>Día no laborable para tu consultorio.</span>
                                <button
                                  type="button"
                                  onClick={() => handleToggleMyDay(day)}
                                  className="text-teal-400 hover:text-teal-300 font-semibold cursor-pointer"
                                >
                                  Activar este día
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Bottom Save / Cancel Bar */}
                    <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={handleCancelEditingMyHours}
                        disabled={savingMyHours}
                        className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold transition cursor-pointer border border-slate-800"
                      >
                        Cancelar
                      </button>

                      <div className="flex items-center gap-2">
                        {liveValidation?.errors.length ? (
                          <span className="text-xs text-rose-400 font-semibold">
                            Corrige los conflictos señalados para habilitar el guardado
                          </span>
                        ) : null}
                        <button
                          type="button"
                          onClick={handleSaveMyHours}
                          disabled={savingMyHours || (liveValidation?.errors.length ?? 0) > 0}
                          className={`flex items-center gap-2 px-5 py-2 rounded-xl font-bold text-xs transition cursor-pointer shadow-md ${
                            (liveValidation?.errors.length ?? 0) > 0
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 cursor-not-allowed'
                              : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                          }`}
                        >
                          <Save className="w-4 h-4" />
                          <span>{savingMyHours ? 'Guardando...' : 'Guardar Disponibilidad'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Personal Time Offs List (Ausencias y Vacaciones) */}
                <div className="pt-6 border-t border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Mis Ausencias & Vacaciones Programadas:
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Bloquea días específicos en los que no atenderás por congresos, feriados o vacaciones personales.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowTimeOffModal(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-teal-400 border border-teal-500/30 text-xs font-semibold transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Bloquear Días</span>
                    </button>
                  </div>

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

            {/* TAB 4: SEÑAS Y MERCADO PAGO */}
            {activeTab === 'payments' && (
              <div className="space-y-6 animate-in fade-in">
                {/* Header & Status Card */}
                <div className="bg-slate-950 rounded-3xl p-5 sm:p-6 border border-slate-800 shadow-sm space-y-4">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-teal-400" />
                          <span>Señas y Cobro con Mercado Pago: {assignedProfessional.name}</span>
                        </h3>
                        {useCustomPayments && staffDepositRequired ? (
                          <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Seña Propia Activa</span>
                          </span>
                        ) : useCustomPayments ? (
                          <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 font-bold flex items-center gap-1">
                            <span>Cobros Propios (Sin Seña Obligatoria)</span>
                          </span>
                        ) : (
                          <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-sky-500/15 text-sky-400 border border-sky-500/30 font-bold flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            <span>Heredado de la Clínica</span>
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 max-w-3xl">
                        Personaliza los montos de seña previa y tus cuentas de cobro directo (Mercado Pago y CBU). Tus pacientes verán tus datos exclusivos al reservar turno con vos.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {useCustomPayments && (
                        <button
                          type="button"
                          onClick={handleResetStaffPaymentsToClinic}
                          disabled={savingStaffPayments}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 text-xs font-semibold transition cursor-pointer"
                          title="Volver a utilizar los datos de pago y señas generales de la clínica"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Restablecer a Clínica</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleSaveStaffPayments}
                        disabled={savingStaffPayments}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs transition cursor-pointer shadow-xs"
                      >
                        {savingStaffPayments ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                            <span>Guardando...</span>
                          </>
                        ) : (
                          <>
                            <Save className="w-3.5 h-3.5" />
                            <span>Guardar Cobros & Seña</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Feedback Message */}
                  {staffPaymentMessage && (
                    <div
                      className={`p-3.5 rounded-2xl text-xs flex items-center justify-between gap-3 animate-in fade-in ${
                        staffPaymentMessage.type === 'success'
                          ? 'bg-emerald-950/40 border border-emerald-800/60 text-emerald-300'
                          : 'bg-rose-950/40 border border-rose-800/60 text-rose-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {staffPaymentMessage.type === 'success' ? (
                          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                        ) : (
                          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                        )}
                        <span>{staffPaymentMessage.text}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setStaffPaymentMessage(null)}
                        className="text-slate-400 hover:text-white"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Commission Calculation & Direct Collection Preparation Card */}
                  {staffCommissionSummary && (() => {
                    const simService: Service = {
                      price: simulatedPrice,
                      id: 'sim_srv',
                      businessId: business.id,
                      name: 'Simulación de Consulta',
                      description: 'Servicio de prueba para simulación',
                      durationMinutes: 30,
                      currency: 'ARS',
                      active: true,
                      assignedProfessionalIds: [],
                    };
                    const simDeposit = staffDepositRequired && staffPaymentsEnabled
                      ? staffDepositType === 'percentage'
                        ? Math.round((simulatedPrice * (staffDepositAmount || 30)) / 100)
                        : Number(staffDepositAmount || 5000)
                      : 0;
                    const simCalc = calculateAppointmentCommission({ depositAmount: simDeposit }, assignedProfessional, simService);

                    return (
                      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 p-5 sm:p-6 rounded-2xl border border-teal-500/20 space-y-5 shadow-sm">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/30">
                                Lógica de Comisiones & Liquidación
                              </span>
                              {!staffCommissionSummary.commissionEnabled || staffCommissionSummary.commissionType === 'none' ? (
                                <span className="text-[11px] font-bold text-emerald-400 bg-emerald-950/60 px-2.5 py-0.5 rounded-md border border-emerald-500/30">
                                  🎉 Sin comisión (100% para ti)
                                </span>
                              ) : staffCommissionSummary.commissionType === 'fixed' ? (
                                <span className="text-[11px] font-bold text-sky-400 bg-sky-950/60 px-2.5 py-0.5 rounded-md border border-sky-500/30">
                                  🏷️ ${staffCommissionSummary.commissionRate.toLocaleString('es-AR')} fijo por consulta
                                </span>
                              ) : (
                                <span className="text-[11px] font-bold text-amber-400 bg-amber-950/60 px-2.5 py-0.5 rounded-md border border-amber-500/30">
                                  📊 {staffCommissionSummary.commissionRate}% de comisión por consulta
                                </span>
                              )}
                            </div>
                            <h4 className="text-sm font-bold text-white mt-1.5 flex items-center gap-2">
                              <Wallet className="w-4 h-4 text-teal-400" />
                              <span>Resumen de Honorarios & Saldo Acumulado</span>
                            </h4>
                          </div>
                          <span className="text-[11px] text-slate-400 italic">
                            {assignedProfessional.officeNumber || 'Consultorio'} • {assignedProfessional.specialty}
                          </span>
                        </div>

                        {/* Consolidated KPI Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                          <div className="bg-slate-950/90 p-3.5 rounded-xl border border-slate-800">
                            <span className="text-slate-400 text-[11px] block">Facturación Bruta:</span>
                            <span className="text-base font-extrabold text-white">
                              ${staffCommissionSummary.grossRevenue.toLocaleString('es-AR')}
                            </span>
                            <span className="text-[10px] text-slate-500 block mt-0.5">
                              {staffCommissionSummary.totalAppointments} turnos registrados
                            </span>
                          </div>

                          <div className="bg-slate-950/90 p-3.5 rounded-xl border border-slate-800">
                            <span className="text-slate-400 text-[11px] block">
                              Comisión Clínica ({staffCommissionSummary.commissionEnabled ? staffCommissionSummary.commissionType === 'fixed' ? `$${staffCommissionSummary.commissionRate.toLocaleString('es-AR')}` : `${staffCommissionSummary.commissionRate}%` : '0%'}):
                            </span>
                            <span className="text-base font-extrabold text-teal-400">
                              ${staffCommissionSummary.totalClinicCommission.toLocaleString('es-AR')}
                            </span>
                            <span className="text-[10px] text-teal-500/80 block mt-0.5">
                              Retención de la clínica
                            </span>
                          </div>

                          <div className="bg-slate-950/90 p-3.5 rounded-xl border border-slate-800">
                            <span className="text-slate-400 text-[11px] block">Tu Ganancia Neta:</span>
                            <span className="text-base font-extrabold text-emerald-400">
                              ${staffCommissionSummary.totalProfessionalNet.toLocaleString('es-AR')}
                            </span>
                            <span className="text-[10px] text-emerald-500/80 block mt-0.5">
                              Honorarios netos para ti
                            </span>
                          </div>

                          <div className="bg-slate-950/90 p-3.5 rounded-xl border border-slate-800">
                            <span className="text-slate-400 text-[11px] block">Señas Recaudadas:</span>
                            <span className="text-base font-extrabold text-amber-400">
                              ${staffCommissionSummary.totalDepositsCollected.toLocaleString('es-AR')}
                            </span>
                            <span className="text-[10px] text-amber-500/80 block mt-0.5">
                              Anticipos ingresados
                            </span>
                          </div>
                        </div>

                        {/* Settlement Status Banner */}
                        <div className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                          staffCommissionSummary.pendingSettlementToProfessional > 0
                            ? 'bg-emerald-950/40 text-emerald-200 border-emerald-500/30'
                            : staffCommissionSummary.pendingSettlementToClinic > 0
                            ? 'bg-amber-950/40 text-amber-200 border-amber-500/30'
                            : 'bg-slate-950/60 text-slate-300 border-slate-800'
                        }`}>
                          <div className="flex items-center gap-2">
                            <Coins className="w-4 h-4 text-teal-400 shrink-0" />
                            <span>
                              <strong>Estado de Liquidación: </strong>
                              {staffCommissionSummary.pendingSettlementToProfessional > 0
                                ? `Saldo acumulado a tu favor: $${staffCommissionSummary.pendingSettlementToProfessional.toLocaleString('es-AR')} (la clínica te transferirá este monto recaudado en señas).`
                                : staffCommissionSummary.pendingSettlementToClinic > 0
                                ? `Saldo acumulado a favor de la clínica: $${staffCommissionSummary.pendingSettlementToClinic.toLocaleString('es-AR')} (por honorarios cobrados presencialmente).`
                                : 'Cuentas perfectamente equilibradas y al día ($0 pendiente).'}
                            </span>
                          </div>
                        </div>

                        {/* Interactive Real-Time Split Simulator */}
                        <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800/90 space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <Calculator className="w-4 h-4 text-teal-400" />
                              <span className="text-xs font-bold text-white">
                                Simulador Interactivo de Honorarios & Split
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400">
                              Prueba cualquier monto de consulta y observa el desglose exacto
                            </span>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="relative w-44">
                              <span className="absolute left-3 top-2 font-bold text-teal-400 text-xs">$</span>
                              <input
                                type="number"
                                min={1000}
                                step={1000}
                                value={simulatedPrice}
                                onChange={(e) => setSimulatedPrice(Math.max(0, Number(e.target.value)))}
                                className="w-full pl-7 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-bold text-xs"
                              />
                            </div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {[10000, 15000, 20000, 30000, 50000].map((val) => (
                                <button
                                  key={val}
                                  type="button"
                                  onClick={() => setSimulatedPrice(val)}
                                  className={`px-2 py-1 rounded-md text-[10px] font-bold transition cursor-pointer ${
                                    simulatedPrice === val
                                      ? 'bg-teal-500 text-slate-950'
                                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                  }`}
                                >
                                  ${(val / 1000).toFixed(0)}k
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Simulation Result Split */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800/80 text-[11px]">
                            <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                              <span className="text-slate-400 block text-[10px]">Valor Consulta:</span>
                              <span className="font-extrabold text-white text-xs">
                                ${simCalc.servicePrice.toLocaleString('es-AR')}
                              </span>
                            </div>
                            <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                              <span className="text-slate-400 block text-[10px]">Comisión Clínica:</span>
                              <span className="font-extrabold text-teal-400 text-xs">
                                ${simCalc.clinicCommission.toLocaleString('es-AR')}
                              </span>
                            </div>
                            <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                              <span className="text-slate-400 block text-[10px]">Tu Honorario Neto:</span>
                              <span className="font-extrabold text-emerald-400 text-xs">
                                ${simCalc.professionalNet.toLocaleString('es-AR')}
                              </span>
                            </div>
                            <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                              <span className="text-slate-400 block text-[10px]">A Cobrar en Mano:</span>
                              <span className="font-extrabold text-amber-300 text-xs">
                                ${simCalc.balanceToPayInOffice.toLocaleString('es-AR')}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="text-[11px] text-slate-400 bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/80 flex items-start gap-2">
                          <Info className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                          <span>
                            <strong>Transparencia Total:</strong> Cada consulta calcula de forma automática la comisión de la clínica ({staffCommissionSummary.commissionRateDisplay}) y tu ingreso neto. Si activas señas previas con Mercado Pago, el sistema soporta la retención automática para simplificar las liquidaciones.
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Form Body */}
                <div className="bg-slate-950 rounded-3xl p-5 sm:p-7 border border-slate-800 space-y-6">
                  {/* Toggle Seña Previa */}
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
                    <div>
                      <h4 className="font-bold text-white text-sm flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-teal-400" />
                        <span>Exigir Seña Previa para Confirmar Turnos en mi Consultorio</span>
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Si se activa, los pacientes deberán abonar una seña (vía Mercado Pago o CBU) para asegurar su turno contigo.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={staffDepositRequired && staffPaymentsEnabled}
                        onChange={(e) => {
                          setStaffDepositRequired(e.target.checked);
                          setStaffPaymentsEnabled(e.target.checked);
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-500"></div>
                    </label>
                  </div>

                  {/* Modalidad y Monto de la Seña */}
                  {(staffDepositRequired || staffPaymentsEnabled) && (
                    <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 animate-in fade-in">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-teal-400 text-xs uppercase tracking-wide flex items-center gap-2">
                          <DollarSign className="w-3.5 h-3.5" />
                          <span>1. Modalidad y Monto de la Seña</span>
                        </h4>
                        <span className="text-[11px] text-slate-500">
                          Configuración exclusiva de tu consultorio
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-300 mb-1">
                            Tipo de Seña
                          </label>
                          <select
                            value={staffDepositType}
                            onChange={(e) => setStaffDepositType(e.target.value as 'fixed' | 'percentage')}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-xs font-medium text-white focus:outline-none focus:border-teal-500"
                          >
                            <option value="fixed">Monto Fijo en Pesos ($ ARS)</option>
                            <option value="percentage">Porcentaje del Servicio (%)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-300 mb-1">
                            {staffDepositType === 'fixed' ? 'Monto de Seña ($ ARS)' : 'Porcentaje de Seña (%)'}
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              min="0"
                              step={staffDepositType === 'fixed' ? '500' : '5'}
                              value={staffDepositAmount}
                              onChange={(e) => setStaffDepositAmount(Number(e.target.value))}
                              className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-xs font-bold text-white font-mono focus:outline-none focus:border-teal-500"
                            />
                            <span className="absolute left-3 top-2.5 text-xs text-slate-500 font-bold">
                              {staffDepositType === 'fixed' ? '$' : '%'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-[11px] text-slate-300 bg-slate-950 p-3 rounded-xl border border-slate-800">
                        💡 <strong>Ejemplo en reservas:</strong>{' '}
                        {staffDepositType === 'fixed' ? (
                          <span>
                            Cualquier turno agendado contigo solicitará una seña fija de <strong>${staffDepositAmount.toLocaleString('es-AR')} ARS</strong>. El saldo restante se cobra presencialmente en el consultorio.
                          </span>
                        ) : (
                          <span>
                            Para una consulta de $25.000 con el <strong>{staffDepositAmount}%</strong>, el paciente abonará una seña de <strong>${((25000 * staffDepositAmount) / 100).toLocaleString('es-AR')} ARS</strong> para reservar.
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Mercado Pago Section */}
                  <div className="space-y-4 pt-4 border-t border-slate-800">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center justify-center font-bold text-xs">
                        MP
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-sm">Mercado Pago (Cobro Directo)</h4>
                        <p className="text-xs text-slate-400">
                          El paciente podrá transferirte la seña abriendo su app de Mercado Pago o mediante tu link de pago.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Alias de Mercado Pago / CVU *
                        </label>
                        <input
                          type="text"
                          placeholder="ej. camila.dermato.mp"
                          value={staffMpAlias}
                          onChange={(e) => setStaffMpAlias(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-900 text-xs font-mono text-white focus:outline-none focus:border-teal-500"
                        />
                        <span className="text-[10px] text-slate-500 mt-1 block">
                          El paciente podrá copiar tu Alias con 1 solo clic en su celular.
                        </span>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Link de Pago Directo (opcional)
                        </label>
                        <input
                          type="url"
                          placeholder="https://mpago.la/..."
                          value={staffMpPaymentLink}
                          onChange={(e) => setStaffMpPaymentLink(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-900 text-xs text-white focus:outline-none focus:border-teal-500"
                        />
                        <span className="text-[10px] text-slate-500 mt-1 block">
                          Link generado desde tu app de Mercado Pago para cobro con tarjeta o débito.
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bank Transfer Section */}
                  <div className="space-y-4 pt-4 border-t border-slate-800">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/20 flex items-center justify-center font-bold text-xs">
                        <Building className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-sm">Transferencia Bancaria Directa (CBU / Alias)</h4>
                        <p className="text-xs text-slate-400">
                          Para pacientes que prefieran transferirte desde Santander, Galicia, BBVA, Nación, Brubank, etc.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Banco
                        </label>
                        <input
                          type="text"
                          placeholder="ej. Banco Santander / Galicia / BBVA"
                          value={staffBankName}
                          onChange={(e) => setStaffBankName(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-900 text-xs text-white focus:outline-none focus:border-teal-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Titular de la Cuenta
                        </label>
                        <input
                          type="text"
                          placeholder={`ej. ${assignedProfessional.name}`}
                          value={staffBankAccountHolder}
                          onChange={(e) => setStaffBankAccountHolder(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-900 text-xs text-white focus:outline-none focus:border-teal-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Alias CBU / CVU
                        </label>
                        <input
                          type="text"
                          placeholder="ej. DRA.CAMILA.CONSULTORIO"
                          value={staffBankAlias}
                          onChange={(e) => setStaffBankAlias(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-900 text-xs font-mono text-white focus:outline-none focus:border-teal-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          CBU / CVU (22 dígitos)
                        </label>
                        <input
                          type="text"
                          maxLength={22}
                          placeholder="ej. 0720000000000000000000"
                          value={staffBankCbu}
                          onChange={(e) => setStaffBankCbu(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-900 text-xs font-mono text-white focus:outline-none focus:border-teal-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Instrucciones de Pago */}
                  <div className="space-y-2 pt-4 border-t border-slate-800">
                    <label className="block text-xs font-semibold text-slate-300">
                      Instrucciones de Pago para el Paciente (opcional)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="ej. Una vez abonada la seña, favor de enviar el comprobante por WhatsApp para validar tu reserva en el consultorio."
                      value={staffPaymentInstructions}
                      onChange={(e) => setStaffPaymentInstructions(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-900 text-xs text-white focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  {/* Bottom Save Button */}
                  <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-xs text-slate-500 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Tus datos de pago son privados y solo se mostrarán a tus pacientes al agendar.</span>
                    </div>

                    <button
                      type="button"
                      onClick={handleSaveStaffPayments}
                      disabled={savingStaffPayments}
                      className="w-full sm:w-auto px-6 py-2.5 rounded-2xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-md transition cursor-pointer flex items-center justify-center gap-2"
                    >
                      {savingStaffPayments ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                          <span>Guardando cambios...</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          <span>Guardar Configuración de Señas & Cobro</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Turnos & Commission Deduction History Table */}
                <div className="bg-slate-950 rounded-3xl p-5 sm:p-6 border border-slate-800 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <FileText className="w-4 h-4 text-teal-400" />
                        <span>Historial de Turnos & Deducciones de Comisión</span>
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Registro transparente de cada turno atendido, el split de comisión aplicado y tu ganancia neta.
                      </p>
                    </div>
                    <span className="text-[11px] text-teal-400 font-mono bg-slate-900 px-3 py-1 rounded-full border border-slate-800 self-start sm:self-center">
                      Regla: {staffCommissionSummary?.commissionRateDisplay || 'Sin comisión'}
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-slate-900 text-[10px] uppercase font-semibold text-slate-400 border-b border-slate-800">
                        <tr>
                          <th className="px-3 py-2.5">Fecha / Turno</th>
                          <th className="px-3 py-2.5">Paciente</th>
                          <th className="px-3 py-2.5">Servicio</th>
                          <th className="px-3 py-2.5 text-right">Valor Consulta</th>
                          <th className="px-3 py-2.5 text-right text-teal-400">Deducción Clínica</th>
                          <th className="px-3 py-2.5 text-right text-emerald-400 font-bold">Tu Honorario Neto</th>
                          <th className="px-3 py-2.5 text-right text-amber-400">Seña</th>
                          <th className="px-3 py-2.5 text-right text-slate-400">A Cobrar en Mano</th>
                          <th className="px-3 py-2.5 text-center">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {myAppointments.filter((a) => a.status !== 'cancelled').length === 0 ? (
                          <tr>
                            <td colSpan={9} className="text-center py-6 text-slate-500 text-xs">
                              No hay turnos registrados en este consultorio aún.
                            </td>
                          </tr>
                        ) : (
                          myAppointments
                            .filter((a) => a.status !== 'cancelled')
                            .map((app) => {
                              const srv = services.find((s) => s.id === app.serviceId);
                              const calc = calculateAppointmentCommission(app, assignedProfessional, srv);
                              const isCompleted = app.status === 'completed';

                              return (
                                <tr key={app.id} className="hover:bg-slate-900/60 transition">
                                  <td className="px-3 py-2.5 font-mono text-[11px] text-slate-300">
                                    {formatDateShort(app.date)} {app.startTime}
                                  </td>
                                  <td className="px-3 py-2.5">
                                    <div className="font-semibold text-white">{app.customerName}</div>
                                    <div className="text-[10px] text-slate-500 font-mono">#{app.bookingCode}</div>
                                  </td>
                                  <td className="px-3 py-2.5 text-slate-300">
                                    {srv?.name || 'Consulta'}
                                  </td>
                                  <td className="px-3 py-2.5 text-right font-medium text-white">
                                    ${calc.servicePrice.toLocaleString('es-AR')}
                                  </td>
                                  <td className="px-3 py-2.5 text-right font-medium text-teal-400">
                                    {calc.commissionEnabled ? `-$${calc.clinicCommission.toLocaleString('es-AR')}` : '$0'}
                                  </td>
                                  <td className="px-3 py-2.5 text-right font-extrabold text-emerald-400">
                                    +${calc.professionalNet.toLocaleString('es-AR')}
                                  </td>
                                  <td className="px-3 py-2.5 text-right text-amber-400 font-medium">
                                    ${calc.depositAmount.toLocaleString('es-AR')}
                                  </td>
                                  <td className="px-3 py-2.5 text-right text-slate-300 font-medium">
                                    ${calc.balanceToPayInOffice.toLocaleString('es-AR')}
                                  </td>
                                  <td className="px-3 py-2.5 text-center">
                                    <button
                                      type="button"
                                      onClick={() => setSelectedAppointmentForReceipt(app)}
                                      className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-teal-300 border border-slate-700 text-[10px] font-bold transition cursor-pointer"
                                      title="Ver recibo y desglose"
                                    >
                                      Recibo
                                    </button>
                                  </td>
                                </tr>
                              );
                            })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: MIS SERVICIOS & HONORARIOS */}
            {activeTab === 'services' && (
              <div className="bg-slate-950 rounded-3xl p-5 sm:p-6 border border-slate-800 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                  <div>
                    <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-teal-400" />
                      <span>Servicios del Consultorio</span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Tratamientos y consultas que tus pacientes pueden reservar contigo en {assignedProfessional.officeNumber || 'tu consultorio'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingService(null);
                      setShowServiceModal(true);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs transition cursor-pointer shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Agregar Servicio Exclusivo</span>
                  </button>
                </div>

                {/* Staff Pricing Autonomy Policy Notice */}
                {business.allowStaffCustomPrices === false ? (
                  <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-slate-300 flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 shrink-0 border border-amber-500/20">
                      <Lock className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-white block">Política de Aranceles Centralizada</span>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        La Dirección de la clínica gestiona los precios institucionales. Puedes activar o pausar qué servicios atiendes en tu consultorio.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-2xl bg-teal-950/60 border border-teal-800/80 text-xs text-teal-300 flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-teal-500/20 text-teal-300 shrink-0 border border-teal-500/30">
                      <Sparkles className="w-4 h-4 text-teal-400" />
                    </div>
                    <div>
                      <span className="font-bold text-white block">Autonomía de Honorarios Habilitada</span>
                      <p className="text-[11px] text-teal-300/80 mt-0.5">
                        La Dirección te autoriza a personalizar tus propios aranceles y honorarios para cada tratamiento de tu consultorio.
                      </p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                  {services.map((srv) => {
                    const isAssigned = isProfessionalAssignedToService(assignedProfessional, srv);
                    const effectivePrice = getServicePriceForProfessional(srv, assignedProfessional);
                    const hasCustomFee =
                      (srv.customPrices && typeof srv.customPrices[assignedProfessional.id] === 'number') ||
                      (assignedProfessional.customServicePrices &&
                        typeof assignedProfessional.customServicePrices[srv.id] === 'number');

                    const isExclusive =
                      srv.assignedProfessionalIds?.length === 1 &&
                      srv.assignedProfessionalIds[0] === assignedProfessional.id;

                    return (
                      <div
                        key={srv.id}
                        className={`rounded-2xl p-4 border transition flex flex-col justify-between gap-3 ${
                          isAssigned
                            ? 'bg-slate-900 border-slate-700/80'
                            : 'bg-slate-900/40 border-slate-800/60 opacity-75'
                        }`}
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-bold text-white">{srv.name}</h4>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                                  {srv.durationMinutes} min
                                </span>
                              </div>
                              {isExclusive && (
                                <span className="inline-block mt-1 text-[10px] font-bold text-teal-300 bg-teal-950 px-2 py-0.5 rounded-md border border-teal-800">
                                  ★ Servicio Exclusivo de tu Consultorio
                                </span>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => handleToggleServiceForMe(srv)}
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition cursor-pointer shrink-0 ${
                                isAssigned
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800 hover:bg-emerald-900'
                                  : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 border border-slate-700'
                              }`}
                              title={isAssigned ? 'Haz clic para pausar este servicio en tu consultorio' : 'Haz clic para comenzar a atender este servicio'}
                            >
                              {isAssigned ? '● Atiendo en Consultorio' : '○ Pausado'}
                            </button>
                          </div>

                          {srv.description && (
                            <p className="text-xs text-slate-400 line-clamp-2">{srv.description}</p>
                          )}

                          <div className="flex items-center gap-2 pt-2">
                            <div className="text-sm font-black text-teal-400">
                              ${effectivePrice.toLocaleString('es-AR')}
                            </div>
                            {hasCustomFee ? (
                              <span className="text-[10px] text-indigo-300 bg-indigo-950/80 px-2 py-0.5 rounded-md border border-indigo-800 font-medium">
                                Tu honorario personalizado
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-md font-medium">
                                Arancel base clínica
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                          <span className="text-[11px] text-slate-500">
                            {isAssigned ? 'Disponible para tus pacientes' : 'No visible en tu agenda'}
                          </span>

                          <button
                            type="button"
                            onClick={() => {
                              setEditingService(srv);
                              setShowServiceModal(true);
                            }}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition cursor-pointer"
                            title={business.allowStaffCustomPrices !== false ? 'Personalizar arancel o detalles' : 'Ver detalle'}
                          >
                            <Edit2 className="w-3 h-3 text-teal-400" />
                            <span>{business.allowStaffCustomPrices !== false ? 'Ajustar Honorario' : 'Detalles'}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
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
      {showServiceModal && assignedProfessional && (() => {
        const isSharedClinicService = editingService && (
          !editingService.assignedProfessionalIds?.length ||
          editingService.assignedProfessionalIds.length > 1 ||
          editingService.assignedProfessionalIds[0] !== assignedProfessional.id
        );
        const effectiveMyPrice = editingService
          ? getServicePriceForProfessional(editingService, assignedProfessional)
          : 15000;
        const canEditPrice = business.allowStaffCustomPrices !== false;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
            <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 shadow-2xl max-w-md w-full space-y-4 text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-teal-400" />
                  <span>
                    {editingService
                      ? isSharedClinicService
                        ? 'Ajustar Arancel del Servicio'
                        : 'Editar Servicio Exclusivo'
                      : 'Nuevo Servicio Exclusivo del Consultorio'}
                  </span>
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
                  const price = Number(formData.get('price'));

                  try {
                    if (editingService) {
                      if (isSharedClinicService) {
                        if (!canEditPrice) {
                          setShowServiceModal(false);
                          return;
                        }
                        const updatedCustomPrices = {
                          ...(editingService.customPrices || {}),
                          [assignedProfessional.id]: price,
                        };
                        const updated = await api.updateService(business.id, editingService.id, {
                          customPrices: updatedCustomPrices,
                        });
                        const updatedProfCustomPrices = {
                          ...(assignedProfessional.customServicePrices || {}),
                          [editingService.id]: price,
                        };
                        const updatedProf = await api.updateProfessional(business.id, assignedProfessional.id, {
                          customServicePrices: updatedProfCustomPrices,
                        });
                        setProfessionals((prev) => prev.map((p) => (p.id === assignedProfessional.id ? updatedProf : p)));
                        setServices((prev) => prev.map((s) => (s.id === editingService.id ? updated : s)));
                      } else {
                        const name = (formData.get('name') as string).trim();
                        const description = (formData.get('description') as string).trim();
                        const durationMinutes = Number(formData.get('durationMinutes'));
                        const updated = await api.updateService(business.id, editingService.id, {
                          name,
                          description,
                          price,
                          durationMinutes,
                        });
                        setServices((prev) => prev.map((s) => (s.id === editingService.id ? updated : s)));
                      }
                    } else {
                      const name = (formData.get('name') as string).trim();
                      const description = (formData.get('description') as string).trim();
                      const durationMinutes = Number(formData.get('durationMinutes'));
                      const created = await api.createService(business.id, {
                        name,
                        description,
                        price,
                        durationMinutes,
                        currency: '$',
                        active: true,
                        assignedProfessionalIds: [assignedProfessional.id],
                      });
                      setServices((prev) => [...prev, created]);
                      // Add to doctor's serviceIds as well
                      const updatedProf = await api.updateProfessional(business.id, assignedProfessional.id, {
                        serviceIds: [...(assignedProfessional.serviceIds || []), created.id],
                      });
                      setProfessionals((prev) => prev.map((p) => (p.id === assignedProfessional.id ? updatedProf : p)));
                    }
                    setShowServiceModal(false);
                  } catch (err: any) {
                    alert('Error al guardar servicio: ' + err.message);
                  }
                }}
                className="space-y-3"
              >
                {isSharedClinicService ? (
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                    <span className="text-[10px] text-teal-400 font-bold uppercase tracking-wider block">
                      Servicio Institucional de la Clínica
                    </span>
                    <h4 className="text-white font-bold text-sm">{editingService.name}</h4>
                    <p className="text-slate-400 text-xs">{editingService.description || 'Sin descripción'}</p>
                    <span className="text-[11px] text-slate-500 block pt-1">
                      Duración: {editingService.durationMinutes} minutos • Arancel base clínica: ${editingService.price.toLocaleString('es-AR')}
                    </span>
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block font-semibold text-slate-300 mb-1">Nombre del Servicio *</label>
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
                  </>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">
                      {isSharedClinicService ? 'Tu Arancel Propio ($)' : 'Precio ($)'}
                    </label>
                    <input
                      type="number"
                      name="price"
                      required
                      min={0}
                      disabled={isSharedClinicService && !canEditPrice}
                      defaultValue={effectiveMyPrice}
                      className={`w-full px-3 py-2 rounded-xl border text-white font-mono ${
                        isSharedClinicService && !canEditPrice
                          ? 'bg-slate-900 border-slate-800 text-slate-500 cursor-not-allowed'
                          : 'bg-slate-950 border-slate-800'
                      }`}
                    />
                    {isSharedClinicService && !canEditPrice && (
                      <p className="text-[10px] text-amber-400 mt-1">
                        🔒 Arancel fijado por la Dirección de la clínica.
                      </p>
                    )}
                    {isSharedClinicService && canEditPrice && (
                      <p className="text-[10px] text-teal-400 mt-1">
                        ✓ Este valor solo se cobrará en turnos con tu consultorio.
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Duración (min)</label>
                    <input
                      type="number"
                      name="durationMinutes"
                      required={!isSharedClinicService}
                      disabled={Boolean(isSharedClinicService)}
                      min={10}
                      step={5}
                      defaultValue={editingService?.durationMinutes ?? 30}
                      className={`w-full px-3 py-2 rounded-xl border text-white ${
                        isSharedClinicService
                          ? 'bg-slate-900 border-slate-800 text-slate-500 cursor-not-allowed'
                          : 'bg-slate-950 border-slate-800'
                      }`}
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowServiceModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold transition cursor-pointer shadow-xs"
                  >
                    Guardar
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* MODAL: DESGLOSE FINANCIERO Y COBRO DE TURNO (STAFF) */}
      {selectedAppointmentForReceipt && assignedProfessional && (() => {
        const srv = services.find((s) => s.id === selectedAppointmentForReceipt.serviceId);
        const calc = calculateAppointmentCommission(selectedAppointmentForReceipt, assignedProfessional, srv);
        const isCompleted = selectedAppointmentForReceipt.status === 'completed';

        return (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-800 space-y-5">
              {/* Header */}
              <div className="flex items-start justify-between pb-3.5 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-teal-500/10 text-teal-400 border border-teal-500/20 flex items-center justify-center font-bold">
                    <Receipt className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">
                      Comprobante & Desglose de Honorarios
                    </h3>
                    <p className="text-xs text-slate-400">
                      Turno #{selectedAppointmentForReceipt.bookingCode} • {formatDateShort(selectedAppointmentForReceipt.date)} - {selectedAppointmentForReceipt.startTime} hs
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedAppointmentForReceipt(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Patient & Service Summary */}
              <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/90 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Paciente:</span>
                  <span className="font-bold text-white text-sm">{selectedAppointmentForReceipt.customerName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Teléfono:</span>
                  <span className="font-mono text-slate-300">{selectedAppointmentForReceipt.customerPhone}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Servicio / Tratamiento:</span>
                  <span className="font-semibold text-teal-300">{srv?.name || 'Consulta Médica'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Consultorio:</span>
                  <span className="font-medium text-slate-200">{assignedProfessional.officeNumber || 'Consultorio'}</span>
                </div>
              </div>

              {/* Financial Calculation Cards */}
              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/90 border border-slate-800">
                  <span className="text-slate-300 font-medium">1. Valor Total del Servicio:</span>
                  <span className="text-base font-extrabold text-white">
                    ${calc.servicePrice.toLocaleString('es-AR')}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-teal-950/30 border border-teal-500/20">
                  <div>
                    <span className="text-teal-300 font-semibold block">2. Deducción Comisión Clínica:</span>
                    <span className="text-[10px] text-teal-500/80">
                      {calc.commissionEnabled
                        ? `Regla: ${calc.commissionType === 'fixed' ? `$${calc.commissionRate.toLocaleString('es-AR')} fijo` : `${calc.commissionRate}% por consulta`}`
                        : 'Sin comisión (100% especialista)'}
                    </span>
                  </div>
                  <span className="text-base font-extrabold text-teal-400">
                    {calc.commissionEnabled ? `-$${calc.clinicCommission.toLocaleString('es-AR')}` : '$0'}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/20">
                  <div>
                    <span className="text-emerald-300 font-bold block">3. Tu Honorario Neto a Percibir:</span>
                    <span className="text-[10px] text-emerald-500/80">Ganancia neta del especialista</span>
                  </div>
                  <span className="text-lg font-black text-emerald-400">
                    +${calc.professionalNet.toLocaleString('es-AR')}
                  </span>
                </div>

                {/* Deposit Split Info */}
                <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Seña Abonada por Paciente:</span>
                    <span className="font-bold text-amber-400">
                      ${calc.depositAmount.toLocaleString('es-AR')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Saldo Restante a Cobrar en Consultorio:</span>
                    <span className="font-bold text-white">
                      ${calc.balanceToPayInOffice.toLocaleString('es-AR')}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 italic pt-1 border-t border-slate-800/80">
                    💡 {calc.settlementNote}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => handleCopyReceiptText(selectedAppointmentForReceipt)}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>{copiedReceiptText ? '¡Copiado!' : 'Copiar para WhatsApp'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSendWhatsAppReceipt(selectedAppointmentForReceipt)}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Enviar por WhatsApp</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MEDICAL PRESCRIPTION DIGITAL MODAL */}
      {selectedAppointmentForPrescription && assignedProfessional && (
        <MedicalPrescriptionModal
          isOpen={Boolean(selectedAppointmentForPrescription)}
          onClose={() => setSelectedAppointmentForPrescription(null)}
          appointment={selectedAppointmentForPrescription}
          business={business}
          professional={assignedProfessional}
          initialPrescription={selectedAppointmentForPrescription.prescription}
          onPrescriptionSaved={async (prescription) => {
            await api.savePrescription(selectedAppointmentForPrescription.id, prescription);
            setAppointments((prev) =>
              prev.map((a) =>
                a.id === selectedAppointmentForPrescription.id ? { ...a, prescription } : a
              )
            );
            setSelectedAppointmentForPrescription(null);
          }}
        />
      )}
    </div>
  );
}
