import { useState, useEffect, useMemo } from 'react';
import {
  Business,
  Professional,
  Service,
  Appointment,
  Customer,
  WorkingHours,
  TimeOff,
  Role,
  BusinessTypeKey,
} from '../types';
import { getBusinessLabels, BUSINESS_TYPES } from '../lib/businessTypes';
import { api } from '../services/api';
import { formatDateSpanish, formatDateShort } from '../utils/dateUtils';
import { generateWaMeLink } from '../lib/notifications';
import { getSaasConfig } from '../lib/saasConfig';
import {
  getBusinessTrialStatus,
  getMonthlyAppointmentsCount,
  checkAppointmentCreationLimit,
  checkProfessionalLimit,
} from '../lib/planLimits';
import {
  generateGoogleCalendarUrl,
  generateAgendaIcsContent,
  downloadIcsFile,
} from '../lib/calendarExport';
import { AIConfigPanel } from './AIConfigPanel';
import {
  Calendar as CalendarIcon,
  Users,
  Briefcase,
  Clock,
  Settings,
  BarChart3,
  MessageCircle,
  Plus,
  Check,
  X,
  UserCheck,
  UserX,
  Search,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  Phone,
  Mail,
  Edit2,
  Trash2,
  Sparkles,
  ShieldCheck,
  Sliders,
  DollarSign,
  Share2,
  Copy,
  CreditCard,
  Building,
  Bot,
  Send,
  CalendarPlus,
  Download,
  Zap,
  Award,
  QrCode,
  CheckCircle,
} from 'lucide-react';

interface BusinessDashboardProps {
  business: Business;
  userRole: Role;
  onUpdateBusiness: (updated: Business) => void;
  onViewPublicPage: () => void;
}

export function BusinessDashboard({
  business,
  userRole,
  onUpdateBusiness,
  onViewPublicPage,
}: BusinessDashboardProps) {
  const labels = useMemo(() => getBusinessLabels(business), [business]);

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<
    | 'agenda'
    | 'professionals'
    | 'services'
    | 'hours'
    | 'customers'
    | 'branding'
    | 'whatsapp'
    | 'analytics'
    | 'plans'
    | 'payments'
  >('agenda');

  // Calendar View: 'day' | 'week' | 'list'
  const [calendarView, setCalendarView] = useState<'day' | 'week' | 'list'>('day');
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
  });

  // State collections
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [workingHours, setWorkingHours] = useState<WorkingHours[]>([]);
  const [timeOffs, setTimeOffs] = useState<TimeOff[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);

  // Filters
  const [filterProfId, setFilterProfId] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showCreateTurnoModal, setShowCreateTurnoModal] = useState(false);
  const [showProfModal, setShowProfModal] = useState(false);
  const [editingProf, setEditingProf] = useState<Professional | null>(null);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [showTimeOffModal, setShowTimeOffModal] = useState(false);
  const [selectedCustomerForHistory, setSelectedCustomerForHistory] = useState<Customer | null>(null);

  // Loading indicator
  const [loading, setLoading] = useState(true);
  const [copiedPublicLink, setCopiedPublicLink] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  const getPublicBookingUrl = () => {
    const origin = window.location.origin;
    return `${origin}/#booking-${business.slug}`;
  };

  const handleCopyPublicBookingLink = () => {
    const url = getPublicBookingUrl();
    navigator.clipboard.writeText(url);
    setCopiedPublicLink(true);
    setShowShareModal(true);
    setTimeout(() => setCopiedPublicLink(false), 2500);
  };

  // Flaxxa WAPI / Flowomatic Automation State
  const [wapiEnabled, setWapiEnabled] = useState<boolean>(business.wapiEnabled !== undefined ? Boolean(business.wapiEnabled) : true);
  const [wapiProvider, setWapiProvider] = useState<'evolution' | 'flaxxa' | 'flowomatic' | 'custom'>(business.wapiProvider || 'evolution');
  const [wapiWebhookUrl, setWapiWebhookUrl] = useState<string>(
    business.wapiWebhookUrl || 'https://evoapicloudevolution-apiv236-production-0197.up.railway.app'
  );
  const [wapiApiKey, setWapiApiKey] = useState<string>(business.wapiApiKey || 'turnosdisponibles_secret_2026');
  const [wapiInstanceId, setWapiInstanceId] = useState<string>(business.wapiInstanceId || business.slug || 'dermatocosmiatria_spa');
  const [wapiTestPhone, setWapiTestPhone] = useState<string>(business.whatsappNumber || '+5491148219900');
  const [wapiTesting, setWapiTesting] = useState<boolean>(false);
  const [wapiStatusMessage, setWapiStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [wapiSaving, setWapiSaving] = useState<boolean>(false);

  // Evolution QR Code State
  const [evolutionQrModalOpen, setEvolutionQrModalOpen] = useState<boolean>(false);
  const [evolutionQrLoading, setEvolutionQrLoading] = useState<boolean>(false);
  const [evolutionQrCode, setEvolutionQrCode] = useState<string | null>(null);
  const [evolutionState, setEvolutionState] = useState<'open' | 'connecting' | 'close' | 'unknown'>('unknown');
  const [evolutionStatusText, setEvolutionStatusText] = useState<string>('');

  const handleSaveWapi = async () => {
    try {
      setWapiSaving(true);
      await api.updateBusiness(business.id, {
        wapiEnabled,
        wapiProvider,
        wapiWebhookUrl,
        wapiApiKey,
        wapiInstanceId,
      });
      setWapiStatusMessage({ type: 'success', text: '¡Configuración de automatización guardada correctamente!' });
    } catch (err: any) {
      setWapiStatusMessage({ type: 'error', text: err.message || 'Error al guardar configuración' });
    } finally {
      setWapiSaving(false);
    }
  };

  const handleTestWapi = async () => {
    try {
      setWapiTesting(true);
      setWapiStatusMessage(null);
      const res = await api.testWapi(business.id, {
        webhookUrl: wapiWebhookUrl,
        apiKey: wapiApiKey,
        instanceId: wapiInstanceId,
        testPhone: wapiTestPhone,
      });
      if (res.success) {
        setWapiStatusMessage({
          type: 'success',
          text: `✅ ${res.message || 'Evento enviado exitosamente al webhook/FlaxxaWAPI.'}`,
        });
      } else {
        setWapiStatusMessage({
          type: 'error',
          text: `❌ ${res.error || 'No se pudo contactar el webhook.'}`,
        });
      }
    } catch (err: any) {
      setWapiStatusMessage({
        type: 'error',
        text: `❌ Error al probar conexión: ${err.message}`,
      });
    } finally {
      setWapiTesting(false);
    }
  };

  const handleOpenEvolutionQr = async () => {
    setEvolutionQrModalOpen(true);
    setEvolutionQrLoading(true);
    setEvolutionQrCode(null);
    setEvolutionStatusText('Contactando Evolution API y generando código QR...');

    try {
      const targetUrl = wapiWebhookUrl || 'https://evoapicloudevolution-apiv236-production-0197.up.railway.app';
      const targetKey = wapiApiKey || 'turnosdisponibles_secret_2026';
      const targetInstance = wapiInstanceId || business.slug || 'dermatocosmiatria_spa';

      const res = await api.getEvolutionQr({
        webhookUrl: targetUrl,
        apiKey: targetKey,
        instanceId: targetInstance,
      });

      if (res && res.success) {
        if (res.qrcode) {
          setEvolutionQrCode(res.qrcode);
          setEvolutionState('connecting');
          setEvolutionStatusText('¡Código QR listo! Abrí WhatsApp en tu celular y escanealo ahora.');
        } else if (res.state === 'open') {
          setEvolutionState('open');
          setEvolutionStatusText('¡Esta instancia de WhatsApp ya está conectada y activa!');
        } else {
          setEvolutionStatusText(res.message || 'Código QR generado. Actualizá si no carga la imagen.');
        }
      } else {
        setEvolutionStatusText(res?.error || 'No se pudo generar el código QR.');
      }
    } catch (err: any) {
      console.error('Error fetching QR:', err);
      setEvolutionStatusText(`Error de conexión: ${err.message || 'Reintentá en unos segundos'}`);
    } finally {
      setEvolutionQrLoading(false);
    }
  };

  const checkEvolutionState = async () => {
    try {
      const stateRes = await api.getEvolutionState(
        wapiInstanceId || business.slug || 'dermatocosmiatria_spa',
        wapiWebhookUrl,
        wapiApiKey
      );
      if (stateRes.connected) {
        setEvolutionState('open');
        setEvolutionStatusText('🎉 ¡WhatsApp Conectado Exitosamente!');
      }
    } catch {}
  };

  // Payment / Deposit Configuration State
  const [paymentsEnabled, setPaymentsEnabled] = useState<boolean>(Boolean(business.paymentsEnabled));
  const [depositRequired, setDepositRequired] = useState<boolean>(Boolean(business.depositRequired));
  const [depositType, setDepositType] = useState<'fixed' | 'percentage'>(business.depositType || 'fixed');
  const [depositAmount, setDepositAmount] = useState<number>(business.depositAmount ?? 5000);
  const [mpAlias, setMpAlias] = useState<string>(business.mpAlias || '');
  const [mpPaymentLink, setMpPaymentLink] = useState<string>(business.mpPaymentLink || '');
  const [mpPublicKey, setMpPublicKey] = useState<string>(business.mpPublicKey || '');
  const [mpAccessToken, setMpAccessToken] = useState<string>(business.mpAccessToken || '');
  const [bankName, setBankName] = useState<string>(business.bankName || 'Banco Santander');
  const [bankAccountHolder, setBankAccountHolder] = useState<string>(business.bankAccountHolder || business.name);
  const [bankCbu, setBankCbu] = useState<string>(business.bankCbu || '');
  const [bankAlias, setBankAlias] = useState<string>(business.bankAlias || '');
  const [paymentSaving, setPaymentSaving] = useState<boolean>(false);
  const [paymentStatusMessage, setPaymentStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    setPaymentsEnabled(Boolean(business.paymentsEnabled));
    setDepositRequired(Boolean(business.depositRequired));
    setDepositType(business.depositType || 'fixed');
    setDepositAmount(business.depositAmount ?? 5000);
    setMpAlias(business.mpAlias || '');
    setMpPaymentLink(business.mpPaymentLink || '');
    setMpPublicKey(business.mpPublicKey || '');
    setMpAccessToken(business.mpAccessToken || '');
    setBankName(business.bankName || 'Banco Santander');
    setBankAccountHolder(business.bankAccountHolder || business.name);
    setBankCbu(business.bankCbu || '');
    setBankAlias(business.bankAlias || '');
  }, [business]);

  const handleSavePayments = async () => {
    try {
      setPaymentSaving(true);
      setPaymentStatusMessage(null);
      const updated = await api.updateBusiness(business.id, {
        paymentsEnabled,
        depositRequired,
        depositType,
        depositAmount: Number(depositAmount),
        mpAlias,
        mpPaymentLink,
        mpPublicKey,
        mpAccessToken,
        bankName,
        bankAccountHolder,
        bankCbu,
        bankAlias,
      });
      onUpdateBusiness(updated);
      setPaymentStatusMessage({ type: 'success', text: '¡Configuración de señas y cobros guardada exitosamente!' });
    } catch (err: any) {
      setPaymentStatusMessage({ type: 'error', text: err.message || 'Error al guardar la configuración de pagos.' });
    } finally {
      setPaymentSaving(false);
    }
  };

  // AI Bot & WhatsApp 24/7 Simulator State (Plan Experiencia AI)
  const [aiBotEnabled, setAiBotEnabled] = useState<boolean>(business.aiBotEnabled ?? true);
  const [aiBotName, setAiBotName] = useState<string>(business.aiBotName || 'Sofía');
  const [aiBotTone, setAiBotTone] = useState<'professional' | 'warm' | 'commercial'>(business.aiBotTone || 'warm');
  const [aiBotAutoCancel, setAiBotAutoCancel] = useState<boolean>(business.aiBotAutoCancel ?? true);
  const [aiBotSaving, setAiBotSaving] = useState(false);
  const [aiBotSavedMessage, setAiBotSavedMessage] = useState<string | null>(null);

  // Chatbot Live Simulator
  const [aiChatMessages, setAiChatMessages] = useState<Array<{ id: string; sender: 'user' | 'bot'; text: string; time: string }>>([
    {
      id: 'welcome-1',
      sender: 'bot',
      text: `👋 ¡Hola! Soy ${business.aiBotName || 'Sofía'}, asistente virtual inteligente de ${business.name}. ¿En qué te puedo ayudar hoy? Podés consultar precios, pedir turnos, o ver información de señas.`,
      time: '10:00',
    },
  ]);
  const [aiInputText, setAiInputText] = useState('');
  const [aiSending, setAiSending] = useState(false);

  // Gap Campaign Generator (IA)
  const [gapCampaignModalOpen, setGapCampaignModalOpen] = useState(false);
  const [gapCampaignLoading, setGapCampaignLoading] = useState(false);
  const [gapCampaignResult, setGapCampaignResult] = useState<{
    success?: boolean;
    campaignMessage: string;
    targetBusiness?: string;
    suggestedChannels?: string[];
  } | null>(null);
  const [gapCampaignCopied, setGapCampaignCopied] = useState(false);
  const [profLimitModalOpen, setProfLimitModalOpen] = useState(false);

  const handleSaveAiBot = async () => {
    try {
      setAiBotSaving(true);
      setAiBotSavedMessage(null);
      const updated = await api.updateBusiness(business.id, {
        aiBotEnabled,
        aiBotName,
        aiBotTone,
        aiBotAutoCancel,
      });
      onUpdateBusiness(updated);
      setAiBotSavedMessage('¡Configuración del Asistente Virtual guardada exitosamente!');
      setTimeout(() => setAiBotSavedMessage(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Error al guardar configuración de IA');
    } finally {
      setAiBotSaving(false);
    }
  };

  const handleSendAiChatMessage = async (presetText?: string) => {
    const textToSend = presetText || aiInputText;
    if (!textToSend.trim() || aiSending) return;

    const userMsg = {
      id: 'user-' + Date.now(),
      sender: 'user' as const,
      text: textToSend.trim(),
      time: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
    };

    setAiChatMessages((prev) => [...prev, userMsg]);
    if (!presetText) setAiInputText('');
    setAiSending(true);

    try {
      const res = await api.chatWithAi(business.id, userMsg.text);
      const botMsg = {
        id: 'bot-' + Date.now(),
        sender: 'bot' as const,
        text: res.reply,
        time: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
      };
      setAiChatMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      const errMsg = {
        id: 'bot-err-' + Date.now(),
        sender: 'bot' as const,
        text: 'Lo siento, tuve un problema al procesar tu solicitud. Por favor intenta de nuevo.',
        time: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
      };
      setAiChatMessages((prev) => [...prev, errMsg]);
    } finally {
      setAiSending(false);
    }
  };

  const handleGenerateGapCampaign = async () => {
    try {
      setGapCampaignLoading(true);
      setGapCampaignModalOpen(true);
      const res = await api.generateGapCampaign(business.id);
      setGapCampaignResult(res);
    } catch (err: any) {
      alert(err.message || 'Error al generar campaña de huecos.');
    } finally {
      setGapCampaignLoading(false);
    }
  };

  // Working Hours Schedule Editor State
  const [isEditingSchedule, setIsEditingSchedule] = useState(false);
  const [scheduleDraft, setScheduleDraft] = useState<WorkingHours[]>([]);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [scheduleMessage, setScheduleMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const ensureAllDays = (list: WorkingHours[], bizId: string): WorkingHours[] => {
    const result: WorkingHours[] = [];
    for (let day = 0; day <= 6; day++) {
      const found = list.find((h) => h.dayOfWeek === day && h.professionalId === null);
      if (found) {
        result.push(JSON.parse(JSON.stringify(found)));
      } else {
        result.push({
          id: `wh_${bizId}_${day}`,
          businessId: bizId,
          professionalId: null,
          dayOfWeek: day,
          enabled: day >= 1 && day <= 5,
          shifts:
            day >= 1 && day <= 5
              ? [
                  { start: '08:00', end: '12:00' },
                  { start: '14:00', end: '18:00' },
                ]
              : day === 6
              ? [{ start: '09:00', end: '13:00' }]
              : [],
        });
      }
    }
    return result;
  };

  const handleStartEditingSchedule = () => {
    setScheduleDraft(ensureAllDays(workingHours, business.id));
    setIsEditingSchedule(true);
    setScheduleMessage(null);
  };

  const handleCancelEditingSchedule = () => {
    setScheduleDraft(ensureAllDays(workingHours, business.id));
    setIsEditingSchedule(false);
    setScheduleMessage(null);
  };

  const handleToggleScheduleDay = (dayNum: number) => {
    setScheduleDraft((prev) =>
      prev.map((item) => {
        if (item.dayOfWeek === dayNum) {
          const nextEnabled = !item.enabled;
          let shifts = item.shifts;
          if (nextEnabled && shifts.length === 0) {
            shifts = [{ start: '09:00', end: '18:00' }];
          }
          return { ...item, enabled: nextEnabled, shifts };
        }
        return item;
      })
    );
  };

  const handleAddShiftToDay = (dayNum: number) => {
    setScheduleDraft((prev) =>
      prev.map((item) => {
        if (item.dayOfWeek === dayNum) {
          const lastShift = item.shifts[item.shifts.length - 1];
          const newStart = lastShift ? '14:00' : '09:00';
          const newEnd = lastShift ? '18:00' : '13:00';
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

  const handleRemoveShiftFromDay = (dayNum: number, shiftIdx: number) => {
    setScheduleDraft((prev) =>
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
    value: string
  ) => {
    setScheduleDraft((prev) =>
      prev.map((item) => {
        if (item.dayOfWeek === dayNum) {
          const nextShifts = item.shifts.map((s, idx) => {
            if (idx === shiftIdx) {
              return { ...s, [field]: value };
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
    const monday = scheduleDraft.find((h) => h.dayOfWeek === 1);
    if (!monday) return;
    setScheduleDraft((prev) =>
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
    setScheduleMessage({ type: 'success', text: 'Se copió la configuración del Lunes a Martes, Miércoles, Jueves y Viernes.' });
  };

  const handleApplyPresetSchedule = (preset: 'corrido' | 'partido') => {
    setScheduleDraft((prev) =>
      prev.map((item) => {
        if (item.dayOfWeek >= 1 && item.dayOfWeek <= 5) {
          return {
            ...item,
            enabled: true,
            shifts:
              preset === 'corrido'
                ? [{ start: '09:00', end: '18:00' }]
                : [
                    { start: '08:00', end: '12:00' },
                    { start: '14:00', end: '18:00' },
                  ],
          };
        }
        if (item.dayOfWeek === 6) {
          return {
            ...item,
            enabled: true,
            shifts: [{ start: '09:00', end: '13:00' }],
          };
        }
        // Sunday
        return {
          ...item,
          enabled: false,
          shifts: [],
        };
      })
    );
    setScheduleMessage({
      type: 'success',
      text:
        preset === 'corrido'
          ? 'Plantilla aplicada: Horario Corrido (Lun a Vie 09:00 - 18:00, Sáb 09:00 - 13:00)'
          : 'Plantilla aplicada: Horario Partido (Lun a Vie 08:00-12:00 y 14:00-18:00, Sáb 09:00 - 13:00)',
    });
  };

  const handleSaveWorkingHours = async () => {
    try {
      setSavingSchedule(true);
      setScheduleMessage(null);
      const updated = await api.updateWorkingHours(business.id, scheduleDraft);
      setWorkingHours(updated);
      setIsEditingSchedule(false);
      setScheduleMessage({ type: 'success', text: '¡Horarios laborales guardados correctamente!' });
    } catch (err: any) {
      setScheduleMessage({ type: 'error', text: err.message || 'Error al guardar horarios laborales' });
    } finally {
      setSavingSchedule(false);
    }
  };

  // Fetch all business data
  const loadData = async () => {
    try {
      setLoading(true);
      const [apps, profs, srvs, custs, hours, tos, stats] = await Promise.all([
        api.getAppointments(business.id),
        api.getProfessionals(business.id),
        api.getServices(business.id),
        api.getCustomers(business.id),
        api.getWorkingHours(business.id),
        api.getTimeOffs(business.id),
        api.getAnalytics(business.id),
      ]);
      setAppointments(apps);
      setProfessionals(profs);
      setServices(srvs);
      setCustomers(custs);
      const fullHours = ensureAllDays(hours, business.id);
      setWorkingHours(fullHours);
      setScheduleDraft(fullHours);
      setTimeOffs(tos);
      setAnalytics(stats);
    } catch (err) {
      console.error('Failed to load dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [business.id]);

  // Derived Today / Tomorrow stats
  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
  }, []);

  const tomorrowStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
  }, []);

  const todayAppointments = useMemo(
    () => appointments.filter((a) => a.date === todayStr && a.status !== 'cancelled'),
    [appointments, todayStr]
  );

  const tomorrowAppointments = useMemo(
    () => appointments.filter((a) => a.date === tomorrowStr && a.status !== 'cancelled'),
    [appointments, tomorrowStr]
  );

  const pendingAppointments = useMemo(
    () => appointments.filter((a) => a.status === 'pending'),
    [appointments]
  );

  const cancelledAppointments = useMemo(
    () => appointments.filter((a) => a.status === 'cancelled'),
    [appointments]
  );

  // Hybrid Strategy status and monthly limits
  const trialStatus = useMemo(() => getBusinessTrialStatus(business), [business]);
  const monthlyCount = useMemo(() => getMonthlyAppointmentsCount(appointments, business.id), [appointments, business.id]);
  const profLimit = useMemo(() => checkProfessionalLimit(business, professionals.length), [business, professionals.length]);

  const handleExportAgendaIcs = () => {
    const content = generateAgendaIcsContent(appointments, business, services, professionals);
    downloadIcsFile(`Agenda_${business.slug}_${todayStr}.ics`, content);
  };

  // Status update handler
  const handleUpdateStatus = async (appointmentId: string, newStatus: Appointment['status']) => {
    try {
      const updated = await api.updateAppointmentStatus(appointmentId, newStatus);
      setAppointments((prev) => prev.map((a) => (a.id === appointmentId ? updated : a)));
    } catch (err: any) {
      alert('Error al actualizar estado: ' + err.message);
    }
  };

  // WhatsApp Contact Helper
  const handleContactCustomerWhatsApp = (appointment: Appointment) => {
    const prof = professionals.find((p) => p.id === appointment.professionalId);
    const srv = services.find((s) => s.id === appointment.serviceId);
    const text = `Hola ${appointment.customerName}, le escribimos desde ${business.name} para recordar su ${labels.appointmentLabel.toLowerCase()} con ${prof?.name || 'su especialista'} el día ${formatDateShort(appointment.date)} a las ${appointment.startTime} hs. Código: ${appointment.bookingCode}. ¡Muchas gracias!`;
    const url = generateWaMeLink(appointment.customerPhone, text);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Filtered Appointments for the calendar / list
  const filteredAppointments = useMemo(() => {
    return appointments.filter((app) => {
      if (calendarView === 'day' && app.date !== selectedDate) return false;
      if (filterProfId !== 'all' && app.professionalId !== filterProfId) return false;
      if (filterStatus !== 'all' && app.status !== filterStatus) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = app.customerName.toLowerCase().includes(q);
        const matchPhone = app.customerPhone.includes(q);
        const matchCode = app.bookingCode.toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchCode) return false;
      }
      return true;
    });
  }, [appointments, calendarView, selectedDate, filterProfId, filterStatus, searchQuery]);

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 pb-20">
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-xs"
              style={{ backgroundColor: business.primaryColor || '#0284c7' }}
            >
              {business.name.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-extrabold text-slate-900">{business.name}</h1>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                  {BUSINESS_TYPES[business.businessType]?.name || business.businessType}
                </span>
                <button
                  type="button"
                  onClick={() => setActiveTab('plans')}
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 hover:bg-emerald-200 text-emerald-800 transition cursor-pointer flex items-center gap-1"
                  title="Haz clic para ver y cambiar planes de suscripción"
                >
                  <Sparkles className="w-2.5 h-2.5 text-emerald-600" />
                  <span>Plan {business.plan.toUpperCase()}</span>
                </button>
              </div>
              <p className="text-xs text-slate-500">
                Panel de Administración • Rol: <span className="font-semibold">{userRole}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              type="button"
              onClick={handleCopyPublicBookingLink}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition ${
                copiedPublicLink
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : 'bg-teal-50 hover:bg-teal-100 text-teal-800 border-teal-200'
              }`}
              title="Copiar link directo para compartir en WhatsApp o Instagram"
            >
              {copiedPublicLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-teal-600" />}
              <span>{copiedPublicLink ? '¡Link Copiado!' : 'Copiar Link de Reservas'}</span>
            </button>

            <button
              type="button"
              onClick={onViewPublicPage}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 transition"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Ver Página Pública</span>
            </button>

            {userRole !== 'customer' && (
              <button
                type="button"
                onClick={() => setShowCreateTurnoModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-semibold shadow-xs transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Nuevo {labels.appointmentLabel}</span>
              </button>
            )}
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-1 overflow-x-auto scrollbar-none border-t border-slate-100 text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveTab('agenda')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-2 whitespace-nowrap transition cursor-pointer ${
              activeTab === 'agenda'
                ? 'border-slate-900 text-slate-900 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <CalendarIcon className="w-4 h-4" />
            <span>Agenda & {labels.appointmentsLabel}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('professionals')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-2 whitespace-nowrap transition cursor-pointer ${
              activeTab === 'professionals'
                ? 'border-slate-900 text-slate-900 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>{labels.professionalsLabel}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('services')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-2 whitespace-nowrap transition cursor-pointer ${
              activeTab === 'services'
                ? 'border-slate-900 text-slate-900 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            <span>{labels.servicesLabel}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('hours')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-2 whitespace-nowrap transition cursor-pointer ${
              activeTab === 'hours'
                ? 'border-slate-900 text-slate-900 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Horarios & Ausencias</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('customers')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-2 whitespace-nowrap transition cursor-pointer ${
              activeTab === 'customers'
                ? 'border-slate-900 text-slate-900 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>{labels.clientsLabel} ({customers.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('branding')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-2 whitespace-nowrap transition cursor-pointer ${
              activeTab === 'branding'
                ? 'border-slate-900 text-slate-900 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Personalización & Nicho</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('payments')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-2 whitespace-nowrap transition cursor-pointer ${
              activeTab === 'payments'
                ? 'border-slate-900 text-slate-900 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Señas & Mercado Pago</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('whatsapp')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-2 whitespace-nowrap transition cursor-pointer ${
              activeTab === 'whatsapp'
                ? 'border-slate-900 text-slate-900 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <MessageCircle className="w-4 h-4" />
            <span>WhatsApp & WAPI</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('analytics')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-2 whitespace-nowrap transition cursor-pointer ${
              activeTab === 'analytics'
                ? 'border-slate-900 text-slate-900 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Métricas</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('plans')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-2 whitespace-nowrap transition cursor-pointer ${
              activeTab === 'plans'
                ? 'border-slate-900 text-slate-900 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>SaaS Planes</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Hybrid Commercial Strategy Status Banner */}
        {business.plan === 'free' && trialStatus.isTrial && (
          <div className="mb-6 p-4 rounded-3xl bg-gradient-to-r from-teal-500/10 via-emerald-500/10 to-teal-500/5 border border-teal-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-2xl bg-teal-600 text-white shrink-0 shadow-xs">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-extrabold text-slate-900 text-sm">
                    Prueba Gratis Pro Activa (Quedan {trialStatus.daysRemaining} días)
                  </h4>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 border border-teal-200">
                    Turnos Ilimitados
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-0.5">
                  Estás disfrutando de todas las funciones del Plan Pro (turnos ilimitados, cobro de señas por Mercado Pago/CBU y recordatorios automáticos con código). Al culminar los 15 días tu cuenta pasa automáticamente al <strong>Plan Base Free (hasta 20 turnos/mes)</strong> sin perder tus datos.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('plans')}
              className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition shrink-0 cursor-pointer shadow-xs"
            >
              Asegurar Plan Pro ($24.900/mes)
            </button>
          </div>
        )}

        {business.plan === 'free' && !trialStatus.isTrial && (
          <div className="mb-6 p-4 rounded-3xl bg-white border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-amber-50 text-amber-600 shrink-0 border border-amber-200">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-extrabold text-slate-900 text-sm">
                    Plan Base Free • {monthlyCount} de 20 turnos usados este mes
                  </h4>
                  {monthlyCount >= 20 ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-200">
                      Tope Mensual Alcanzado
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                      {Math.max(0, 20 - monthlyCount)} turnos restantes
                    </span>
                  )}
                </div>
                <div className="w-full max-w-md bg-slate-100 rounded-full h-2 mt-2 overflow-hidden">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${
                      monthlyCount >= 20 ? 'bg-rose-500' : monthlyCount >= 15 ? 'bg-amber-500' : 'bg-teal-500'
                    }`}
                    style={{ width: `${Math.min(100, (monthlyCount / 20) * 100)}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Tu negocio creció. Al superar los 20 turnos mensuales, ascendé al Plan Pro Ilimitado para continuar recibiendo reservas automáticas online sin tope.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('plans')}
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition shrink-0 cursor-pointer shadow-xs flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-teal-400" />
              <span>Subir a Plan Pro Ilimitado ($24.900/mes)</span>
            </button>
          </div>
        )}

        {business.plan === 'pro' && (
          <div className="mb-6 p-3.5 rounded-3xl bg-teal-50/80 border border-teal-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 text-teal-900">
              <Award className="w-4 h-4 text-teal-600 shrink-0" />
              <span>
                <strong>Plan Pro Ilimitado Activo:</strong> Turnos ilimitados sin tope mensual, hasta 5 profesionales, cobro de señas integrado (Mercado Pago + CBU) y exportación de agenda.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('plans')}
              className="text-teal-700 hover:text-teal-900 font-bold underline shrink-0 cursor-pointer text-xs"
            >
              Ver detalles de suscripción
            </button>
          </div>
        )}

        {business.plan === 'business' && (
          <div className="mb-6 p-3.5 rounded-3xl bg-slate-900 text-white shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 text-slate-200">
              <Bot className="w-4 h-4 text-teal-400 shrink-0" />
              <span>
                <strong>Plan Experiencia AI Activo:</strong> Asistente Virtual WhatsApp Bot 24/7, turnos y profesionales ilimitados, y campañas inteligentes para rellenar huecos.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('whatsapp')}
              className="px-3 py-1 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold shrink-0 cursor-pointer text-xs"
            >
              Simulador Asistente IA
            </button>
          </div>
        )}

        {/* KPI Summary Cards */}
        <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="text-[11px] font-semibold uppercase text-slate-500">{labels.appointmentsLabel} Hoy</div>
            <div className="text-2xl font-extrabold text-slate-900 mt-1">{todayAppointments.length}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">{formatDateShort(todayStr)}</div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="text-[11px] font-semibold uppercase text-slate-500">{labels.appointmentsLabel} Mañana</div>
            <div className="text-2xl font-extrabold text-slate-900 mt-1">{tomorrowAppointments.length}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">{formatDateShort(tomorrowStr)}</div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="text-[11px] font-semibold uppercase text-amber-600">Pendientes</div>
            <div className="text-2xl font-extrabold text-amber-600 mt-1">{pendingAppointments.length}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Por confirmar</div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="text-[11px] font-semibold uppercase text-slate-500">{labels.clientsLabel} Registrados</div>
            <div className="text-2xl font-extrabold text-slate-900 mt-1">{customers.length}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Directorio</div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs col-span-2 sm:col-span-1">
            <div className="text-[11px] font-semibold uppercase text-emerald-600">Ocupación Agenda</div>
            <div className="text-2xl font-extrabold text-emerald-600 mt-1">
              {todayAppointments.length > 0 ? `${Math.min(todayAppointments.length * 20, 95)}%` : '0%'}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Estimada para hoy</div>
          </div>
        </section>

        {/* TAB 1: AGENDA & APPOINTMENTS */}
        {activeTab === 'agenda' && (
          <div className="space-y-4">
            {/* Control bar: Calendar View, Date picker, Filters */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Date & View Toggle */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setCalendarView('day')}
                    className={`px-3 py-1.5 rounded-lg transition ${
                      calendarView === 'day' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    Día
                  </button>
                  <button
                    type="button"
                    onClick={() => setCalendarView('list')}
                    className={`px-3 py-1.5 rounded-lg transition ${
                      calendarView === 'list' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    Todos (Lista)
                  </button>
                </div>

                {calendarView === 'day' && (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => setSelectedDate(todayStr)}
                      className="px-2.5 py-1.5 rounded-xl text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700"
                    >
                      Hoy
                    </button>
                  </div>
                )}
              </div>

              {/* Filters & Search */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Professional Filter */}
                <select
                  value={filterProfId}
                  onChange={(e) => setFilterProfId(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium bg-white focus:outline-none"
                >
                  <option value="all">Todos los {labels.professionalsLabel}</option>
                  {professionals.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>

                {/* Status Filter */}
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium bg-white focus:outline-none"
                >
                  <option value="all">Todos los estados</option>
                  <option value="pending">Pendiente</option>
                  <option value="confirmed">Confirmado</option>
                  <option value="completed">Atendido</option>
                  <option value="no_show">No presentado</option>
                  <option value="cancelled">Cancelado</option>
                </select>

                {/* Search */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder={`Buscar ${labels.clientLabel.toLowerCase()} o código...`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs w-44 sm:w-56 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Appointments Cards / Table */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                    {calendarView === 'day' ? `Turnos del ${formatDateSpanish(selectedDate)}` : 'Listado Completo de Turnos'}
                  </h3>
                  <span className="text-xs text-slate-500">
                    {filteredAppointments.length} resultados en vista
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleExportAgendaIcs}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 transition cursor-pointer"
                    title="Descargar archivo .ics compatible con Google Calendar, Apple Calendar y Outlook"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-600" />
                    <span>Exportar iCal (.ics)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleGenerateGapCampaign}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 text-xs font-bold border border-purple-200 transition cursor-pointer shadow-xs"
                    title="Detectar huecos libres y redactar campaña WhatsApp con IA"
                  >
                    <Zap className="w-3.5 h-3.5 text-purple-600" />
                    <span>Huecos Libres (IA)</span>
                  </button>
                </div>
              </div>

              {filteredAppointments.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <CalendarIcon className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p className="text-sm">No hay turnos registrados con estos filtros.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filteredAppointments.map((app) => {
                    const prof = professionals.find((p) => p.id === app.professionalId);
                    const srv = services.find((s) => s.id === app.serviceId);

                    return (
                      <div
                        key={app.id}
                        className="p-4 sm:p-5 hover:bg-slate-50/80 transition flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                      >
                        {/* Left: Time & Customer */}
                        <div className="flex items-start gap-4">
                          <div className="text-center px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-900 shrink-0">
                            <span className="text-base font-bold block">{app.startTime}</span>
                            <span className="text-[10px] text-slate-500">{app.endTime} hs</span>
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 text-sm sm:text-base">
                                {app.customerName}
                              </span>
                              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                                {app.bookingCode}
                              </span>
                              <span
                                className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                                  app.status === 'confirmed'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : app.status === 'completed'
                                    ? 'bg-blue-100 text-blue-800'
                                    : app.status === 'pending'
                                    ? 'bg-amber-100 text-amber-800'
                                    : app.status === 'no_show'
                                    ? 'bg-purple-100 text-purple-800'
                                    : 'bg-rose-100 text-rose-800'
                                }`}
                              >
                                {app.status === 'pending' && 'Pendiente'}
                                {app.status === 'confirmed' && 'Confirmado'}
                                {app.status === 'completed' && 'Atendido'}
                                {app.status === 'no_show' && 'No presentado'}
                                {app.status === 'cancelled' && 'Cancelado'}
                              </span>

                              {Boolean(app.depositAmount) && (
                                <span
                                  className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full flex items-center gap-1 ${
                                    app.paymentStatus === 'deposit_paid' || app.paymentStatus === 'fully_paid'
                                      ? 'bg-teal-100 text-teal-800 border border-teal-200'
                                      : 'bg-amber-100 text-amber-800 border border-amber-200'
                                  }`}
                                >
                                  <CreditCard className="w-3 h-3" />
                                  <span>
                                    {app.paymentStatus === 'deposit_paid' || app.paymentStatus === 'fully_paid'
                                      ? `Seña Pagada ($${app.depositAmount?.toLocaleString('es-AR')})`
                                      : `Seña Pendiente ($${app.depositAmount?.toLocaleString('es-AR')})`}
                                  </span>
                                </span>
                              )}
                            </div>

                            <div className="text-xs text-slate-600 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                              <span>
                                <strong>{labels.serviceLabel}:</strong> {srv?.name || 'Servicio'}
                              </span>
                              <span>•</span>
                              <span>
                                <strong>{labels.professionalLabel}:</strong> {prof?.name || 'Profesional'}
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3 text-slate-400" /> {app.customerPhone}
                              </span>
                              {srv && (
                                <>
                                  <span>•</span>
                                  <span className="text-slate-700 font-medium">
                                    Total: ${srv.price?.toLocaleString('es-AR')}
                                  </span>
                                  {Boolean(app.depositAmount) && (
                                    <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                      Saldo en local: ${Math.max(0, srv.price - (app.depositAmount || 0)).toLocaleString('es-AR')}
                                    </span>
                                  )}
                                </>
                              )}
                            </div>

                            {app.notes && (
                              <div className="text-xs text-slate-500 italic mt-1.5 bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                                Motivo: "{app.notes}"
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Right: Actions */}
                        <div className="flex flex-wrap items-center gap-2 shrink-0 self-end lg:self-center">
                          {/* Google Calendar Link */}
                          <a
                            href={generateGoogleCalendarUrl(app, business, srv, prof)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-semibold flex items-center gap-1 transition"
                            title="Sincronizar y guardar en Google Calendar"
                          >
                            <CalendarPlus className="w-3.5 h-3.5 text-blue-600" />
                            <span className="hidden sm:inline">Google Cal</span>
                          </a>

                          {/* WhatsApp Reminder Button with Booking Code */}
                          <button
                            type="button"
                            onClick={() => {
                              const reminderMsg = `Hola ${app.customerName}! 👋 Te recordamos tu turno de ${srv?.name || 'atención'} en ${business.name} con ${prof?.name || 'el profesional'} para el ${formatDateSpanish(app.date)} a las ${app.startTime} hs.\n\n📌 Código de Reserva: ${app.bookingCode}\n📍 Dirección: ${business.address || 'Consultorio'}${app.depositAmount ? `\n💳 Seña: $${app.depositAmount.toLocaleString('es-AR')} (${app.paymentStatus === 'deposit_paid' ? 'Abonada' : 'Pendiente'})` : ''}\n\nPor favor confirma tu asistencia respondiendo a este mensaje. ¡Te esperamos!`;
                              const url = generateWaMeLink(app.customerPhone, reminderMsg);
                              window.open(url, '_blank', 'noopener,noreferrer');
                            }}
                            className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-semibold flex items-center gap-1 transition"
                            title="Enviar recordatorio automático por WhatsApp con código de turno"
                          >
                            <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Recordar</span>
                          </button>

                          {/* Mark Deposit Paid */}
                          {Boolean(app.depositAmount && app.paymentStatus === 'deposit_pending') && (
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  await api.updateAppointmentStatus(app.id, 'confirmed');
                                  setAppointments((prev) =>
                                    prev.map((a) =>
                                      a.id === app.id
                                        ? { ...a, paymentStatus: 'deposit_paid', status: 'confirmed' }
                                        : a
                                    )
                                  );
                                } catch (err: any) {
                                  alert(err.message || 'Error al actualizar seña');
                                }
                              }}
                              className="px-2.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold transition cursor-pointer flex items-center gap-1"
                              title="Confirmar cobro de la seña"
                            >
                              <Check className="w-3 h-3" />
                              <span>Seña Cobrada</span>
                            </button>
                          )}

                          {/* Action toggles */}
                          {app.status === 'pending' && (!app.depositAmount || app.paymentStatus !== 'deposit_pending') && (
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(app.id, 'confirmed')}
                              className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition"
                            >
                              Confirmar
                            </button>
                          )}

                          {app.status !== 'completed' && app.status !== 'cancelled' && (
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(app.id, 'completed')}
                              className="px-2.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition"
                            >
                              Atendido
                            </button>
                          )}

                          {app.status !== 'no_show' && app.status !== 'completed' && app.status !== 'cancelled' && (
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(app.id, 'no_show')}
                              className="px-2.5 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-semibold transition"
                            >
                              No presentado
                            </button>
                          )}

                          {app.status !== 'cancelled' && (
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm('¿Cancelar este turno?')) {
                                  handleUpdateStatus(app.id, 'cancelled');
                                }
                              }}
                              className="p-1.5 rounded-xl hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition"
                              title="Cancelar turno"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: PROFESSIONALS */}
        {activeTab === 'professionals' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900">
                    Gestión de {labels.professionalsLabel}
                  </h3>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                    profLimit.allowed ? 'bg-slate-100 text-slate-700' : 'bg-rose-100 text-rose-800 border border-rose-200'
                  }`}>
                    {business.plan === 'free' && !trialStatus.isTrial
                      ? `${professionals.length}/1 Profesional (Plan Free)`
                      : business.plan === 'pro' || trialStatus.isTrial
                      ? `${professionals.length}/5 Profesionales (Plan Pro)`
                      : `${professionals.length} Profesionales (Ilimitados)`}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {business.plan === 'free' && !trialStatus.isTrial
                    ? 'El Plan Base Free incluye 1 especialista. Para habilitar agendas de hasta 5 profesionales, ascendé al Plan Pro.'
                    : 'Cada profesional cuenta con agenda propia, sincronización de turnos y franjas horarias personalizadas.'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!profLimit.allowed) {
                    setProfLimitModalOpen(true);
                  } else {
                    setEditingProf(null);
                    setShowProfModal(true);
                  }
                }}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  profLimit.allowed
                    ? 'bg-slate-900 text-white hover:bg-black'
                    : 'bg-amber-100 text-amber-900 hover:bg-amber-200 border border-amber-300'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Agregar {labels.professionalLabel}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {professionals.map((prof) => (
                <div key={prof.id} className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs">
                  <div className="flex items-start gap-3.5">
                    <img
                      src={prof.photoUrl || 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=120'}
                      alt={prof.name}
                      className="w-14 h-14 rounded-2xl object-cover border border-slate-200 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-slate-900 text-sm truncate">{prof.name}</h4>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            prof.active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {prof.active ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 font-medium">{prof.specialty || prof.title}</p>
                      <p className="text-[11px] text-slate-400 mt-1 truncate">{prof.email}</p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-500">
                      {prof.serviceIds?.length || 0} servicios asociados
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingProf(prof);
                          setShowProfModal(true);
                        }}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                        title="Editar"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: SERVICES */}
        {activeTab === 'services' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                Gestión de {labels.servicesLabel}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setEditingService(null);
                  setShowServiceModal(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-black transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Crear {labels.serviceLabel}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {services.map((srv) => (
                <div key={srv.id} className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-bold text-slate-900 text-sm">{srv.name}</h4>
                      <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold shrink-0">
                        <Clock className="w-3 h-3 inline mr-1" /> {srv.durationMinutes} min
                      </span>
                    </div>
                    {srv.description && (
                      <p className="text-xs text-slate-500 mt-2 line-clamp-2">{srv.description}</p>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900 text-sm">
                      {srv.currency} {srv.price.toLocaleString('es-AR')}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingService(srv);
                        setShowServiceModal(true);
                      }}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                      title="Editar"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: WORKING HOURS & TIME OFF */}
        {activeTab === 'hours' && (
          <div className="space-y-6">
            {/* Weekly Schedule */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">
                      Configuración de Horarios Laborales
                    </h3>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                        isEditingSchedule
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-teal-50 text-teal-700 border border-teal-200'
                      }`}
                    >
                      {isEditingSchedule ? '● Modo Edición' : 'Solo Lectura'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Define los días y turnos de apertura. Se admiten múltiples franjas en un mismo día (ej. mañana y tarde).
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {!isEditingSchedule ? (
                    <button
                      type="button"
                      onClick={handleStartEditingSchedule}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Modificar Horarios</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={savingSchedule}
                        onClick={handleCancelEditingSchedule}
                        className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        disabled={savingSchedule}
                        onClick={handleSaveWorkingHours}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{savingSchedule ? 'Guardando...' : 'Guardar Horarios'}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {scheduleMessage && (
                <div
                  className={`p-3 rounded-2xl text-xs font-medium flex items-center justify-between ${
                    scheduleMessage.type === 'success'
                      ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                      : 'bg-rose-50 text-rose-900 border border-rose-200'
                  }`}
                >
                  <span>{scheduleMessage.text}</span>
                  <button
                    type="button"
                    onClick={() => setScheduleMessage(null)}
                    className="text-slate-400 hover:text-slate-700 text-xs"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Quick Presets Toolbar when in Edit Mode */}
              {isEditingSchedule && (
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-bold text-slate-700 flex items-center gap-1">
                    <Sliders className="w-3.5 h-3.5 text-teal-600" />
                    Plantillas rápidas:
                  </span>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleApplyPresetSchedule('partido')}
                      className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 font-semibold text-slate-800 transition cursor-pointer"
                    >
                      ⚡ Horario Partido (08-12 y 14-18)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPresetSchedule('corrido')}
                      className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 font-semibold text-slate-800 transition cursor-pointer"
                    >
                      ⚡ Horario Corrido (09 a 18)
                    </button>
                    <button
                      type="button"
                      onClick={handleCopyMondayToWeek}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 font-semibold text-slate-800 transition cursor-pointer"
                      title="Copia la configuración del Lunes a Martes, Miércoles, Jueves y Viernes"
                    >
                      <Copy className="w-3 h-3 text-slate-500" />
                      <span>Copiar Lunes a Mar-Vie</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Days Schedule List */}
              <div className="space-y-3">
                {[1, 2, 3, 4, 5, 6, 0].map((dayNum) => {
                  const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
                  const targetList = isEditingSchedule ? scheduleDraft : workingHours;
                  const wh = targetList.find((h) => h.dayOfWeek === dayNum && h.professionalId === null);
                  const isEnabled = wh ? wh.enabled : false;
                  const shifts = wh?.shifts || [];

                  return (
                    <div
                      key={dayNum}
                      className={`p-3.5 rounded-2xl border transition ${
                        isEnabled
                          ? 'bg-white border-slate-200 shadow-2xs'
                          : 'bg-slate-50/70 border-slate-200/60 opacity-85'
                      }`}
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                        {/* Day Name & Toggle */}
                        <div className="flex items-center gap-3 w-48">
                          <span className="text-xs font-bold text-slate-900 w-24">{dayNames[dayNum]}</span>

                          {isEditingSchedule ? (
                            <button
                              type="button"
                              onClick={() => handleToggleScheduleDay(dayNum)}
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase transition cursor-pointer ${
                                isEnabled
                                  ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                  : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                              }`}
                            >
                              {isEnabled ? '● Abierto' : '○ Cerrado'}
                            </button>
                          ) : (
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                isEnabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-500'
                              }`}
                            >
                              {isEnabled ? 'Abierto' : 'Cerrado'}
                            </span>
                          )}
                        </div>

                        {/* Shifts List / Editor */}
                        <div className="flex-1">
                          {!isEnabled ? (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-400 italic">Día no laboral / Cerrado</span>
                              {isEditingSchedule && (
                                <button
                                  type="button"
                                  onClick={() => handleToggleScheduleDay(dayNum)}
                                  className="text-[11px] font-semibold text-teal-600 hover:underline cursor-pointer ml-2"
                                >
                                  + Habilitar este día
                                </button>
                              )}
                            </div>
                          ) : isEditingSchedule ? (
                            <div className="flex flex-wrap items-center gap-2.5">
                              {shifts.map((s, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center gap-1.5 p-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                                >
                                  <input
                                    type="time"
                                    value={s.start}
                                    onChange={(e) =>
                                      handleShiftTimeChange(dayNum, idx, 'start', e.target.value)
                                    }
                                    className="px-2 py-1 rounded-lg bg-white border border-slate-200 font-mono text-xs font-semibold focus:ring-2 focus:ring-teal-500 focus:outline-none"
                                  />
                                  <span className="text-slate-400 font-bold text-[11px]">a</span>
                                  <input
                                    type="time"
                                    value={s.end}
                                    onChange={(e) =>
                                      handleShiftTimeChange(dayNum, idx, 'end', e.target.value)
                                    }
                                    className="px-2 py-1 rounded-lg bg-white border border-slate-200 font-mono text-xs font-semibold focus:ring-2 focus:ring-teal-500 focus:outline-none"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveShiftFromDay(dayNum, idx)}
                                    className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                                    title="Eliminar esta franja"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))}

                              <button
                                type="button"
                                onClick={() => handleAddShiftToDay(dayNum)}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer border border-dashed border-slate-300"
                              >
                                <Plus className="w-3 h-3" />
                                <span>+ Franja (Turno Tarde)</span>
                              </button>
                            </div>
                          ) : (
                            <div className="flex flex-wrap items-center gap-2">
                              {shifts.map((s, idx) => (
                                <span
                                  key={idx}
                                  className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 font-mono text-xs font-semibold text-slate-800"
                                >
                                  {s.start} - {s.end}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Status / Summary */}
                        <div className="text-xs text-slate-400 text-right lg:w-32">
                          {isEnabled ? `${shifts.length} franja(s)` : 'Cerrado'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Actions when in Edit Mode */}
              {isEditingSchedule && (
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
                  <span className="text-xs text-slate-500">
                    * Los cambios impactan de inmediato en la disponibilidad de turnos en tiempo real.
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={savingSchedule}
                      onClick={handleCancelEditingSchedule}
                      className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      disabled={savingSchedule}
                      onClick={handleSaveWorkingHours}
                      className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{savingSchedule ? 'Guardando...' : 'Guardar Horarios Laborales'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Time Off & Excepciones */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Ausencias, Vacaciones y Bloqueos
                  </h3>
                  <p className="text-xs text-slate-500">
                    Días en los que no se ofrecerán turnos (feriados, congresos, licencias).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowTimeOffModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-black"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Agregar Excepción</span>
                </button>
              </div>

              {timeOffs.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs bg-slate-50 rounded-2xl">
                  No hay bloqueos ni ausencias programadas.
                </div>
              ) : (
                <div className="space-y-2">
                  {timeOffs.map((to) => (
                    <div
                      key={to.id}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-slate-900">{to.reason}</span>
                        <span className="text-slate-500 ml-2">
                          ({to.startDate} al {to.endDate})
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          if (confirm('¿Eliminar esta excepción?')) {
                            await api.deleteTimeOff(business.id, to.id);
                            setTimeOffs((prev) => prev.filter((t) => t.id !== to.id));
                          }
                        }}
                        className="text-rose-600 hover:text-rose-800"
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

        {/* TAB 5: CUSTOMERS */}
        {activeTab === 'customers' && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                Directorio de {labels.clientsLabel}
              </h3>
              <span className="text-xs text-slate-500">{customers.length} registrados</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-[11px] uppercase font-semibold text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Nombre</th>
                    <th className="px-4 py-3">Teléfono</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3 text-center">Cant. Turnos</th>
                    <th className="px-4 py-3">Último Turno</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {customers.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {c.firstName} {c.lastName}
                      </td>
                      <td className="px-4 py-3">{c.phone}</td>
                      <td className="px-4 py-3 text-slate-500">{c.email || '—'}</td>
                      <td className="px-4 py-3 text-center font-bold">{c.totalAppointments || 1}</td>
                      <td className="px-4 py-3 text-slate-500">{c.lastAppointmentDate || '—'}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedCustomerForHistory(c)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px]"
                        >
                          Ver Historial
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 6: BRANDING & MULTI-NICHE */}
        {activeTab === 'branding' && (
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs max-w-3xl space-y-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Personalización de Marca & Nicho Multi-Tenant
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Adapta la identidad del negocio y la terminología automáticamente según tu nicho.
              </p>
            </div>

            {/* Business Type Selector */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                Nicho / Tipo de Negocio (Multi-Industria)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {(Object.keys(BUSINESS_TYPES) as BusinessTypeKey[]).map((key) => {
                  const item = BUSINESS_TYPES[key];
                  const isSelected = business.businessType === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={async () => {
                        const updated = await api.updateBusiness(business.id, { businessType: key });
                        onUpdateBusiness(updated);
                      }}
                      className={`p-3 rounded-xl border text-left text-xs transition cursor-pointer ${
                        isSelected
                          ? 'border-teal-600 bg-teal-50 text-teal-900 font-bold ring-1 ring-teal-600'
                          : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <div className="font-bold">{item.name}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {item.defaultLabels.clientLabel} • {item.defaultLabels.professionalLabel}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Dynamic terminology preview */}
              <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
                <span className="font-bold text-slate-800">Terminología activa en la interfaz:</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-1">
                  <div>Cliente: <strong>{labels.clientLabel}</strong></div>
                  <div>Profesional: <strong>{labels.professionalLabel}</strong></div>
                  <div>Servicio: <strong>{labels.serviceLabel}</strong></div>
                  <div>Turno: <strong>{labels.appointmentLabel}</strong></div>
                </div>
              </div>
            </div>

            {/* Settings Form */}
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const formData = new FormData(form);
                const updates: Partial<Business> = {
                  name: formData.get('name') as string,
                  slug: formData.get('slug') as string,
                  category: formData.get('category') as string,
                  description: formData.get('description') as string,
                  address: formData.get('address') as string,
                  phone: formData.get('phone') as string,
                  whatsappNumber: formData.get('whatsappNumber') as string,
                  primaryColor: formData.get('primaryColor') as string,
                  welcomeMessage: formData.get('welcomeMessage') as string,
                  cancellationPolicy: formData.get('cancellationPolicy') as string,
                  bufferMinutes: Number(formData.get('bufferMinutes') || 0),
                };

                try {
                  const updated = await api.updateBusiness(business.id, updates);
                  onUpdateBusiness(updated);
                  alert('¡Configuración guardada con éxito!');
                } catch (err: any) {
                  alert('Error al guardar: ' + err.message);
                }
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre del Negocio</label>
                  <input
                    type="text"
                    name="name"
                    defaultValue={business.name}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Slug URL Pública (/book/...)
                  </label>
                  <input
                    type="text"
                    name="slug"
                    defaultValue={business.slug}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Especialidad / Categoría</label>
                  <input
                    type="text"
                    name="category"
                    defaultValue={business.category}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Color de Marca (Hex)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      name="primaryColor"
                      defaultValue={business.primaryColor || '#0284c7'}
                      className="w-9 h-9 rounded-lg border border-slate-300 p-0.5 cursor-pointer"
                    />
                    <span className="text-xs font-mono text-slate-600">{business.primaryColor}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Teléfono</label>
                  <input
                    type="text"
                    name="phone"
                    defaultValue={business.phone}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Número de WhatsApp (con código de país sin +)
                  </label>
                  <input
                    type="text"
                    name="whatsappNumber"
                    defaultValue={business.whatsappNumber}
                    placeholder="Ej. 5491148219900"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Dirección Física</label>
                <input
                  type="text"
                  name="address"
                  defaultValue={business.address}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Descripción</label>
                <textarea
                  name="description"
                  rows={2}
                  defaultValue={business.description}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Mensaje de Bienvenida</label>
                  <input
                    type="text"
                    name="welcomeMessage"
                    defaultValue={business.welcomeMessage}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Margen entre turnos (min)</label>
                  <input
                    type="number"
                    name="bufferMinutes"
                    defaultValue={business.bufferMinutes || 0}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Política de Cancelación</label>
                <input
                  type="text"
                  name="cancellationPolicy"
                  defaultValue={business.cancellationPolicy}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                />
              </div>

              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition shadow-xs cursor-pointer"
              >
                Guardar Cambios
              </button>
            </form>
          </div>
        )}

        {/* TAB 7: WHATSAPP & WAPI INTEGRATION */}
        {activeTab === 'whatsapp' && (
          <div className="space-y-6">
            {/* Architecture Explanation Card */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center gap-2 text-emerald-600">
                <MessageCircle className="w-5 h-5" />
                <h3 className="text-base font-bold text-slate-900">
                  Capa de Notificaciones Desacoplada (WhatsApp & Flaxxa WAPI)
                </h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                El sistema cuenta con una arquitectura de notificaciones modular (
                <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800">NotificationService</code>
                ). Actualmente opera en modo <strong>WhatsAppManual</strong> mediante enlaces <code className="bg-slate-100 px-1 py-0.5 rounded">wa.me</code> con mensajes pre-armados, permitiendo comercializar de inmediato sin costo de API.
              </p>

              {/* Sample Messages Preview */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 text-xs space-y-2">
                  <div className="font-bold text-emerald-900 flex items-center gap-1.5">
                    <span>Mensaje para el Cliente (Confirmación)</span>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-emerald-100 text-slate-800 italic leading-relaxed font-sans text-[11px]">
                    "Hola, soy Carlos. Quiero confirmar mi turno con el Dr. Juan Pérez para el martes 15/09 a las 10:30. Código de reserva: TM-4821."
                  </div>
                  <span className="text-[10px] text-emerald-700 block">
                    Se abre automáticamente al pulsar "Enviar confirmación" en la pantalla de éxito.
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200/80 text-xs space-y-2">
                  <div className="font-bold text-blue-900 flex items-center gap-1.5">
                    <span>Mensaje para el Negocio (Alerta de Nuevo Turno)</span>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-blue-100 text-slate-800 leading-relaxed font-sans text-[11px] whitespace-pre-line">
                    {"Nuevo turno reservado:\n\nPaciente: Carlos Gómez\nServicio: Consulta Médica\nProfesional: Dr. Juan Pérez\nFecha: 15/09 - 10:30 hs\nTel: +54911..."}
                  </div>
                  <span className="text-[10px] text-blue-700 block">
                    Notificación instantánea recibida en el WhatsApp del consultorio.
                  </span>
                </div>
              </div>
            </div>

            {/* Flaxxa WAPI & Flowomatic Live Automation Form */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-slate-900 text-base">Automatización con FlaxxaWAPI / Flowomatic</h4>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                      wapiEnabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {wapiEnabled ? '● Automatización Activa' : '○ Inactiva (Manual wa.me)'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Dispara mensajes automáticos de confirmación y recordatorio directamente desde la línea de WhatsApp del negocio.
                  </p>
                </div>

                <label className="flex items-center gap-2 cursor-pointer select-none bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
                  <input
                    type="checkbox"
                    checked={wapiEnabled}
                    onChange={(e) => setWapiEnabled(e.target.checked)}
                    className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500"
                  />
                  <span className="text-xs font-bold text-slate-800">Activar Envíos Automáticos</span>
                </label>
              </div>

              {wapiStatusMessage && (
                <div
                  className={`p-3.5 rounded-2xl text-xs font-medium ${
                    wapiStatusMessage.type === 'success'
                      ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                      : 'bg-rose-50 text-rose-900 border border-rose-200'
                  }`}
                >
                  {wapiStatusMessage.text}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Proveedor de Conexión</label>
                  <select
                    value={wapiProvider}
                    onChange={(e) => setWapiProvider(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold text-xs bg-white focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="evolution">🚀 Evolution API (Open Source / Ilimitado)</option>
                    <option value="flaxxa">FlaxxaWAPI Gateway</option>
                    <option value="flowomatic">Flowomatic Webhook</option>
                    <option value="custom">Webhook Personalizado (n8n / Make / Render)</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Endpoint URL / Webhook de Disparo *
                  </label>
                  <input
                    type="text"
                    value={wapiWebhookUrl}
                    onChange={(e) => setWapiWebhookUrl(e.target.value)}
                    placeholder="https://api.flaxxawapi.com/v1/messages o https://tu-webhook-flowomatic.com"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-xs bg-white focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">API Key / Token Bearer</label>
                  <input
                    type="password"
                    value={wapiApiKey}
                    onChange={(e) => setWapiApiKey(e.target.value)}
                    placeholder="flx_live_xxxxxxxxxxxxxxxx"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-xs bg-white focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Instancia ID / Channel ID</label>
                  <input
                    type="text"
                    value={wapiInstanceId}
                    onChange={(e) => setWapiInstanceId(e.target.value)}
                    placeholder="inst_principal_01"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-xs bg-white focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Teléfono para Prueba</label>
                  <input
                    type="text"
                    value={wapiTestPhone}
                    onChange={(e) => setWapiTestPhone(e.target.value)}
                    placeholder="+5491148219900"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-xs bg-white focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={wapiTesting}
                    onClick={handleTestWapi}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs border border-slate-300 transition flex items-center gap-2 cursor-pointer"
                  >
                    {wapiTesting ? 'Enviando prueba...' : '⚡ Probar Conexión (Disparar Webhook)'}
                  </button>

                  {wapiProvider === 'evolution' && (
                    <button
                      type="button"
                      onClick={handleOpenEvolutionQr}
                      className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition flex items-center gap-2 cursor-pointer"
                    >
                      <QrCode className="w-4 h-4" />
                      Escanear QR WhatsApp
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  disabled={wapiSaving}
                  onClick={handleSaveWapi}
                  className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-sm transition flex items-center gap-2 cursor-pointer"
                >
                  {wapiSaving ? 'Guardando...' : 'Guardar Configuración WAPI'}
                </button>
              </div>

              {/* Evolution API Quick Helper Banner */}
              {wapiProvider === 'evolution' && (
                <div className="p-4 rounded-2xl bg-slate-900 text-slate-200 text-xs border border-slate-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      Estructura de Evolution API para este negocio
                    </span>
                    <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-400">
                      Multi-instancia $0
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Endpoint de envío de mensajes en Evolution API v2:
                  </p>
                  <code className="block bg-black/50 p-2.5 rounded-xl text-[11px] font-mono text-emerald-300 overflow-x-auto">
                    {wapiWebhookUrl || 'https://tu-evolution-api.up.railway.app'}/message/sendText/{wapiInstanceId || business.slug}
                  </code>
                  <p className="text-[10px] text-slate-400">
                    Webhook entrante para el bot: configurá en tu Evolution API que apunte a <span className="text-white font-mono">/api/ai/chat</span> con el <span className="text-white font-mono">businessId: "{business.id}"</span>.
                  </p>
                </div>
              )}
            </div>

            {/* EVOLUTION API QR MODAL */}
            {evolutionQrModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
                <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-5 text-center relative">
                  <button
                    onClick={() => setEvolutionQrModalOpen(false)}
                    className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition"
                  >
                    <X className="w-5 h-5" />
                  </button>

                  <div className="inline-flex p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                    <QrCode className="w-8 h-8" />
                  </div>

                  <div>
                    <h3 className="text-lg font-black text-slate-900">Vincular WhatsApp Oficial</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Instancia: <span className="font-mono font-bold text-slate-800">{wapiInstanceId || business.slug}</span>
                    </p>
                  </div>

                  {evolutionQrLoading ? (
                    <div className="py-12 flex flex-col items-center justify-center space-y-3">
                      <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-xs font-medium text-slate-600">{evolutionStatusText}</p>
                    </div>
                  ) : evolutionState === 'open' ? (
                    <div className="py-8 space-y-4">
                      <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                        <CheckCircle className="w-10 h-10" />
                      </div>
                      <h4 className="text-base font-bold text-slate-900">¡Conexión Exitosa!</h4>
                      <p className="text-xs text-slate-600">
                        Tu WhatsApp ya está vinculado y enviará notificaciones y responderá con IA en tiempo real.
                      </p>
                    </div>
                  ) : evolutionQrCode ? (
                    <div className="space-y-4">
                      <div className="p-3 bg-white border-2 border-dashed border-emerald-300 rounded-2xl inline-block shadow-inner">
                        <img
                          src={evolutionQrCode}
                          alt="Código QR WhatsApp"
                          className="w-56 h-56 mx-auto rounded-xl object-contain"
                        />
                      </div>
                      <div className="text-xs text-slate-600 space-y-1">
                        <p className="font-semibold text-slate-800">1. Abrí WhatsApp en tu celular</p>
                        <p>2. Tocá los 3 puntos o Configuración ➔ Dispositivos vinculados</p>
                        <p>3. Tocá "Vincular un dispositivo" y apuntá la cámara aquí</p>
                      </div>

                      <div className="pt-2 flex justify-center gap-2">
                        <button
                          type="button"
                          onClick={checkEvolutionState}
                          className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs rounded-xl border border-emerald-200 transition"
                        >
                          Verificar si ya conectó
                        </button>
                        <button
                          type="button"
                          onClick={handleOpenEvolutionQr}
                          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition"
                        >
                          Generar Nuevo QR
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="py-6 space-y-3">
                      <p className="text-xs text-rose-600 font-medium">{evolutionStatusText}</p>
                      <button
                        type="button"
                        onClick={handleOpenEvolutionQr}
                        className="px-4 py-2 bg-slate-900 text-white font-bold text-xs rounded-xl transition"
                      >
                        Reintentar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* PLAN EXPERIENCIA AI: ASISTENTE VIRTUAL WHATSAPP BOT 24/7 & PROMPT CONFIG */}
            <AIConfigPanel
              business={business}
              services={services}
              professionals={professionals}
              onBusinessUpdated={(updated) => onUpdateBusiness(updated)}
            />

            {/* GAP CAMPAIGN LAUNCHER BANNER */}
            <div className="mt-4 p-4 rounded-2xl bg-purple-50 border border-purple-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-purple-600 text-white shrink-0">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h5 className="font-bold text-slate-900 text-xs sm:text-sm">
                    Reactivación de Huecos de la Semana con Inteligencia Artificial
                  </h5>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Analiza los horarios sin reservar de los próximos días y genera un mensaje listo para publicar en tus historias de WhatsApp e Instagram.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleGenerateGapCampaign}
                className="px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shrink-0 cursor-pointer shadow-xs transition"
              >
                Generar Campaña Ahora
              </button>
            </div>
          </div>
        )}

        {/* TAB 8: ANALYTICS */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
                <span className="text-xs font-semibold text-slate-500">Visitas a Página Pública</span>
                <div className="text-2xl font-bold text-slate-900 mt-1">
                  {analytics?.pageViews || 18}
                </div>
                <span className="text-[10px] text-emerald-600 font-medium">Tráfico orgánico</span>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
                <span className="text-xs font-semibold text-slate-500">Inicios de Reserva</span>
                <div className="text-2xl font-bold text-slate-900 mt-1">
                  {analytics?.bookingStart || 12}
                </div>
                <span className="text-[10px] text-slate-500">Click en horario</span>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
                <span className="text-xs font-semibold text-emerald-700">Reservas Completadas</span>
                <div className="text-2xl font-bold text-emerald-700 mt-1">
                  {analytics?.bookingCompleted || appointments.length}
                </div>
                <span className="text-[10px] text-emerald-600 font-medium">Conversión efectiva</span>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
                <span className="text-xs font-semibold text-slate-500">Tasa de Conversión</span>
                <div className="text-2xl font-bold text-slate-900 mt-1">
                  {analytics?.conversionRate || 42}%
                </div>
                <span className="text-[10px] text-slate-500">Visita a Turno Reservado</span>
              </div>
            </div>

            {/* Funnel breakdown */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs">
              <h4 className="font-bold text-slate-900 text-sm mb-4">Embudo de Conversión de Reservas</h4>
              <div className="space-y-3 max-w-xl">
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span>1. Visita Landing Pública</span>
                    <span>100%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-3">
                    <div className="bg-blue-600 h-3 rounded-full w-full" />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span>2. Selección de Horario Disponible</span>
                    <span>68%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-3">
                    <div className="bg-teal-500 h-3 rounded-full w-[68%]" />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span>3. Confirmación de Reserva</span>
                    <span>42%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-3">
                    <div className="bg-emerald-500 h-3 rounded-full w-[42%]" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 9: SAAS MONETIZATION PLANS */}
        {activeTab === 'plans' && (() => {
          const saasConfig = getSaasConfig();
          return (
            <div className="space-y-6">
              <div className="text-center max-w-2xl mx-auto mb-4">
                <h3 className="text-2xl font-extrabold text-slate-900">Estrategia Comercial & Suscripción</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Gestiona tu plan para operar con total flexibilidad y escalar la recepción de turnos de tu negocio.
                </p>
              </div>

              {/* Hybrid Strategy explanatory banner */}
              <div className="max-w-5xl mx-auto p-4 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5 text-teal-900">
                  <span className="flex h-2.5 w-2.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-teal-500"></span>
                  </span>
                  <span>
                    <strong>Estrategia Híbrida:</strong> Tu cuenta comenzó con 15 días de acceso total al Plan PRO sin tarjeta. Al culminar los 15 días, conservas el <strong>Plan Base Free</strong> de hasta 20 turnos/mes. Si tu negocio supera las 20 reservas mensuales, el sistema te solicitará ascender al Plan Pro Ilimitado ({saasConfig.proPlan.price}/mes) para continuar recibiendo citas sin tope.
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                {/* FREE */}
                <div className={`bg-white rounded-3xl p-6 border flex flex-col justify-between ${
                  business.plan === 'free' ? 'border-slate-800 ring-2 ring-slate-800/10' : 'border-slate-200'
                }`}>
                  <div>
                    <span className="text-xs font-bold text-slate-500 uppercase">{saasConfig.freePlan.name}</span>
                    <h4 className="text-xl font-extrabold text-slate-900 mt-1">
                      {saasConfig.freePlan.price} <span className="text-xs font-normal text-slate-500">/ {saasConfig.freePlan.pricePeriod}</span>
                    </h4>
                    <p className="text-xs text-slate-500 mt-2">Para profesionales independientes que dan sus primeros pasos digitales.</p>
                    <ul className="mt-4 space-y-2 text-xs text-slate-700">
                      <li className="flex items-center gap-2">✓ 15 días de prueba Pro completa sin tarjeta</li>
                      <li className="flex items-center gap-2 font-medium text-emerald-700">✓ Hasta 20 turnos mensuales al finalizar prueba</li>
                      <li className="flex items-center gap-2">✓ 1 Profesional / Especialista</li>
                      <li className="flex items-center gap-2">✓ Página de reservas personalizada</li>
                      <li className="flex items-center gap-2">✓ Confirmación directa por WhatsApp</li>
                      <li className="flex items-center gap-2">✓ Tu cuenta nunca se elimina</li>
                    </ul>
                  </div>
                  <button
                    type="button"
                    disabled={business.plan === 'free'}
                    onClick={async () => {
                      try {
                        const updated = await api.updateBusiness(business.id, { plan: 'free' });
                        onUpdateBusiness(updated);
                      } catch (e) {
                        console.error(e);
                      }
                    }}
                    className="mt-6 w-full py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                  >
                    {business.plan === 'free' ? 'Plan Free Activo (Hasta 20 turnos/mes)' : 'Seleccionar Plan Base Free'}
                  </button>
                </div>

                {/* PRO */}
                <div className={`bg-white rounded-3xl p-6 border-2 border-teal-600 shadow-md flex flex-col justify-between relative ${
                  business.plan === 'pro' ? 'ring-4 ring-teal-500/20' : ''
                }`}>
                  <span className="absolute -top-3 right-6 px-3 py-0.5 rounded-full text-[10px] font-extrabold bg-teal-600 text-white uppercase tracking-wider">
                    Recomendado • Más Elegido
                  </span>
                  <div>
                    <span className="text-xs font-bold text-teal-700 uppercase">{saasConfig.proPlan.name}</span>
                    <h4 className="text-xl font-extrabold text-slate-900 mt-1">
                      {saasConfig.proPlan.price} <span className="text-xs font-normal text-slate-500">/ mes</span>
                    </h4>
                    <p className="text-xs text-slate-500 mt-2">Para consultorios, estéticas y centros con alta demanda que necesitan agenda sin topes.</p>
                    <ul className="mt-4 space-y-2 text-xs text-slate-700">
                      <li className="flex items-center gap-2 font-bold text-teal-800">✓ Turnos ilimitados mensuales (sin tope de 20)</li>
                      <li className="flex items-center gap-2">✓ Hasta 5 profesionales con agendas separadas</li>
                      <li className="flex items-center gap-2">✓ Cobro de señas (Mercado Pago + CBU/Alias)</li>
                      <li className="flex items-center gap-2">✓ Recordatorios automáticos por WhatsApp con código</li>
                      <li className="flex items-center gap-2">✓ Integración con Google Calendar e iCal</li>
                      <li className="flex items-center gap-2">✓ Base de datos de pacientes y métricas</li>
                      <li className="flex items-center gap-2">✓ Soporte prioritario y atención directa</li>
                    </ul>
                  </div>
                  <button
                    type="button"
                    disabled={business.plan === 'pro'}
                    onClick={async () => {
                      try {
                        const updated = await api.updateBusiness(business.id, { plan: 'pro' });
                        onUpdateBusiness(updated);
                      } catch (e) {
                        console.error(e);
                      }
                    }}
                    className="mt-6 w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition cursor-pointer shadow-md"
                  >
                    {business.plan === 'pro' ? 'Plan Pro Ilimitado Activo' : `Elegir Plan Pro (${saasConfig.proPlan.price})`}
                  </button>
                </div>

                {/* AI */}
                <div className={`bg-slate-900 text-white rounded-3xl p-6 border border-slate-800 shadow-xs flex flex-col justify-between ${
                  business.plan === 'business' ? 'ring-4 ring-slate-700' : ''
                }`}>
                  <div>
                    <span className="text-xs font-bold text-teal-400 uppercase">{saasConfig.aiPlan.name}</span>
                    <h4 className="text-xl font-extrabold text-white mt-1">
                      {saasConfig.aiPlan.price} <span className="text-xs font-normal text-slate-400">/ mes</span>
                    </h4>
                    <p className="text-xs text-slate-400 mt-2">Para policonsultorios, clínicas y franquicias que buscan atención automatizada con IA.</p>
                    <ul className="mt-4 space-y-2 text-xs text-slate-300">
                      <li className="flex items-center gap-2">✓ Todo lo del Plan Pro Ilimitado</li>
                      <li className="flex items-center gap-2 font-semibold text-teal-300">✓ Profesionales y sedes ilimitadas</li>
                      <li className="flex items-center gap-2">✓ WhatsApp Bot con IA (Meta Cloud / WAPI)</li>
                      <li className="flex items-center gap-2">✓ Cancelación y reagendamiento autónomo 24/7</li>
                      <li className="flex items-center gap-2">✓ Asignación inteligente por zona o especialista</li>
                      <li className="flex items-center gap-2">✓ Onboarding dedicado y soporte VIP</li>
                    </ul>
                  </div>
                  <button
                    type="button"
                    disabled={business.plan === 'business'}
                    onClick={async () => {
                      try {
                        const updated = await api.updateBusiness(business.id, { plan: 'business' });
                        onUpdateBusiness(updated);
                      } catch (e) {
                        console.error(e);
                      }
                    }}
                    className="mt-6 w-full py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold cursor-pointer transition shadow-md"
                  >
                    {business.plan === 'business' ? 'Plan Experiencia AI Activo' : `Elegir Experiencia AI (${saasConfig.aiPlan.price})`}
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* TAB 10: PAYMENTS & DEPOSITS (MERCADO PAGO / TRANSFERENCIAS) */}
        {activeTab === 'payments' && (
          <div className="space-y-6 max-w-4xl mx-auto">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-teal-900 via-slate-900 to-sky-950 text-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-800">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                      Módulo de Cobros & Señas
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        depositRequired && paymentsEnabled
                          ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-400/40'
                          : 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      {depositRequired && paymentsEnabled ? '● Seña Activa' : '○ Seña Desactivada'}
                    </span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black tracking-tight">
                    Cobro de Seña con Mercado Pago y Transferencias
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
                    Reduce el ausentismo (no-show) solicitando una seña al paciente al momento de reservar su turno.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleSavePayments}
                  disabled={paymentSaving}
                  className="px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-md hover:shadow-lg transition cursor-pointer flex items-center gap-2 self-stretch sm:self-center justify-center shrink-0"
                >
                  {paymentSaving ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Guardar Cambios</span>
                    </>
                  )}
                </button>
              </div>

              {paymentStatusMessage && (
                <div
                  className={`mt-4 p-3 rounded-2xl text-xs flex items-center gap-2 ${
                    paymentStatusMessage.type === 'success'
                      ? 'bg-emerald-900/50 text-emerald-200 border border-emerald-700/50'
                      : 'bg-rose-900/50 text-rose-200 border border-rose-700/50'
                  }`}
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{paymentStatusMessage.text}</span>
                </div>
              )}
            </div>

            {/* Main Configuration Card */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-xs space-y-6">
              {/* Toggle Switch */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-teal-600" />
                    <span>Exigir Seña Previa para Confirmar Turnos</span>
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Si se activa, el paciente verá los datos de pago al reservar y el turno quedará pendiente hasta verificar el comprobante.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={depositRequired && paymentsEnabled}
                    onChange={(e) => {
                      setDepositRequired(e.target.checked);
                      setPaymentsEnabled(e.target.checked);
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                </label>
              </div>

              {/* Deposit Pricing Rules */}
              {(depositRequired || paymentsEnabled) && (
                <div className="p-4 rounded-2xl bg-teal-50/60 border border-teal-200/80 space-y-4">
                  <h4 className="font-bold text-teal-950 text-xs uppercase tracking-wide">
                    1. Modalidad y Monto de la Seña
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Tipo de Seña
                      </label>
                      <select
                        value={depositType}
                        onChange={(e) => setDepositType(e.target.value as 'fixed' | 'percentage')}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
                      >
                        <option value="fixed">Monto Fijo en Pesos ($ ARS)</option>
                        <option value="percentage">Porcentaje del Servicio (%)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        {depositType === 'fixed' ? 'Monto en $ ARS' : 'Porcentaje (%)'}
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          step={depositType === 'fixed' ? '500' : '5'}
                          value={depositAmount}
                          onChange={(e) => setDepositAmount(Number(e.target.value))}
                          className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                        <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">
                          {depositType === 'fixed' ? '$' : '%'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-[11px] text-teal-900 bg-white/70 p-2.5 rounded-xl border border-teal-100">
                    💡 <strong>Ejemplo:</strong>{' '}
                    {depositType === 'fixed' ? (
                      <span>
                        Cualquier turno agendado requerirá una seña fija de <strong>${depositAmount.toLocaleString('es-AR')} ARS</strong>. El saldo se cobra en el consultorio.
                      </span>
                    ) : (
                      <span>
                        Para un servicio de $20.000 con el <strong>{depositAmount}%</strong>, el paciente deberá pagar una seña de <strong>${((20000 * depositAmount) / 100).toLocaleString('es-AR')} ARS</strong>.
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Mercado Pago Section */}
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-xs">
                    MP
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">Mercado Pago (Cobro Inmediato)</h4>
                    <p className="text-xs text-slate-500">
                      Permite que el paciente te envíe dinero con su app de Mercado Pago copiando tu alias o abriendo tu link.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Alias de Mercado Pago / CVU *
                    </label>
                    <input
                      type="text"
                      placeholder="ej. consultorio.garcia.mp"
                      value={mpAlias}
                      onChange={(e) => setMpAlias(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-mono font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      El paciente podrá copiarlo con 1 clic en su celular.
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Link de Pago Directo (opcional)
                    </label>
                    <input
                      type="url"
                      placeholder="https://mpago.la/..."
                      value={mpPaymentLink}
                      onChange={(e) => setMpPaymentLink(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Link generado en la app de Mercado Pago para pagar con tarjeta o saldo.
                    </span>
                  </div>
                </div>
              </div>

              {/* Bank Transfer Section */}
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-xs">
                    <Building className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">Transferencia Bancaria Directa (CBU / Alias)</h4>
                    <p className="text-xs text-slate-500">
                      Para pacientes que prefieran transferir desde cualquier banco (Santander, Galicia, BBVA, Nación, Macro, etc.).
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Banco
                    </label>
                    <input
                      type="text"
                      placeholder="ej. Banco Santander / Galicia"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Titular de la Cuenta / Razón Social
                    </label>
                    <input
                      type="text"
                      placeholder="ej. Dr. Juan Perez / Consultorios Médicos SRL"
                      value={bankAccountHolder}
                      onChange={(e) => setBankAccountHolder(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Alias CBU / CVU
                    </label>
                    <input
                      type="text"
                      placeholder="ej. DR.PEREZ.TURNOS"
                      value={bankAlias}
                      onChange={(e) => setBankAlias(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-mono font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      CBU / CVU (22 dígitos)
                    </label>
                    <input
                      type="text"
                      maxLength={22}
                      placeholder="ej. 0720000000000000000000"
                      value={bankCbu}
                      onChange={(e) => setBankCbu(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-mono font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>
              </div>

              {/* Save Button & Preview Notice */}
              <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs text-slate-500 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Los datos bancarios solo se muestran a los pacientes en el momento de agendar.</span>
                </div>

                <button
                  type="button"
                  onClick={handleSavePayments}
                  disabled={paymentSaving}
                  className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-slate-900 hover:bg-black text-white font-bold text-xs shadow-md transition cursor-pointer flex items-center justify-center gap-2"
                >
                  {paymentSaving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Guardando configuración...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>Guardar Configuración de Pagos</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODAL: NUEVO TURNO MANUAL */}
      {showCreateTurnoModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 text-base">
                Crear {labels.appointmentLabel} Manual (Recepción / Teléfono)
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateTurnoModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const formData = new FormData(form);
                try {
                  const payload = {
                    businessId: business.id,
                    professionalId: formData.get('professionalId') as string,
                    serviceId: formData.get('serviceId') as string,
                    customer: {
                      firstName: formData.get('firstName') as string,
                      lastName: formData.get('lastName') as string,
                      phone: formData.get('phone') as string,
                      email: (formData.get('email') as string) || undefined,
                    },
                    date: formData.get('date') as string,
                    startTime: formData.get('startTime') as string,
                    notes: (formData.get('notes') as string) || undefined,
                  };

                  const res = await api.bookAppointment(payload);
                  setAppointments((prev) => [res.appointment, ...prev]);
                  setShowCreateTurnoModal(false);
                  alert(`¡Turno reservado exitosamente! Código: ${res.appointment.bookingCode}`);
                } catch (err: any) {
                  alert(err.message || 'Error al agendar turno.');
                }
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block font-semibold text-slate-700 mb-1">{labels.professionalLabel} *</label>
                <select name="professionalId" required className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white">
                  {professionals.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.specialty})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">{labels.serviceLabel} *</label>
                <select name="serviceId" required className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white">
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.durationMinutes} min) - ${s.price}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Fecha *</label>
                  <input type="date" name="date" required defaultValue={todayStr} className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white" />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Hora Inicio (HH:mm) *</label>
                  <input type="time" name="startTime" required defaultValue="10:00" className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nombre {labels.clientLabel} *</label>
                  <input type="text" name="firstName" required placeholder="Nombre" className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white" />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Apellido *</label>
                  <input type="text" name="lastName" required placeholder="Apellido" className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Teléfono Móvil *</label>
                  <input type="tel" name="phone" required placeholder="+54911..." className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white" />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email (opcional)</label>
                  <input type="email" name="email" placeholder="cliente@example.com" className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white" />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Notas / Motivo</label>
                <input type="text" name="notes" placeholder="Ej. Agendado por teléfono" className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white" />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-slate-900 hover:bg-black text-white font-bold transition"
                >
                  Confirmar y Guardar Turno
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREAR / EDITAR PROFESIONAL */}
      {showProfModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 text-base">
                {editingProf ? `Editar ${labels.professionalLabel}` : `Nuevo ${labels.professionalLabel}`}
              </h3>
              <button
                type="button"
                onClick={() => setShowProfModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const formData = new FormData(form);
                const data = {
                  name: formData.get('name') as string,
                  title: formData.get('title') as string,
                  specialty: formData.get('specialty') as string,
                  photoUrl: (formData.get('photoUrl') as string) || 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=120',
                  email: formData.get('email') as string,
                  phone: formData.get('phone') as string,
                  active: formData.get('active') === 'on',
                  serviceIds: services.map((s) => s.id),
                };

                if (editingProf) {
                  const updated = await api.updateProfessional(business.id, editingProf.id, data);
                  setProfessionals((prev) => prev.map((p) => (p.id === editingProf.id ? updated : p)));
                } else {
                  if (!profLimit.allowed) {
                    setShowProfModal(false);
                    setProfLimitModalOpen(true);
                    return;
                  }
                  try {
                    const created = await api.createProfessional(business.id, data);
                    setProfessionals((prev) => [...prev, created]);
                  } catch (err: any) {
                    if (err.message?.includes('PROFESSIONAL_LIMIT_REACHED') || err.message?.includes('Plan')) {
                      setShowProfModal(false);
                      setProfLimitModalOpen(true);
                      return;
                    }
                    throw err;
                  }
                }
                setShowProfModal(false);
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  name="name"
                  required
                  defaultValue={editingProf?.name || ''}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Especialidad *</label>
                <input
                  type="text"
                  name="specialty"
                  required
                  defaultValue={editingProf?.specialty || ''}
                  placeholder="Ej. Cardiología / Estilista"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Título / Cargo</label>
                <input
                  type="text"
                  name="title"
                  defaultValue={editingProf?.title || ''}
                  placeholder="Ej. Médico Cardiólogo"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">URL Foto (opcional)</label>
                <input
                  type="url"
                  name="photoUrl"
                  defaultValue={editingProf?.photoUrl || ''}
                  placeholder="https://..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    name="email"
                    defaultValue={editingProf?.email || ''}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Teléfono</label>
                  <input
                    type="tel"
                    name="phone"
                    defaultValue={editingProf?.phone || ''}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  name="active"
                  id="prof_active"
                  defaultChecked={editingProf ? editingProf.active : true}
                  className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                <label htmlFor="prof_active" className="font-semibold text-slate-700 cursor-pointer">
                  Profesional Activo (disponible para reservas)
                </label>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white font-bold transition"
                >
                  Guardar Profesional
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREAR / EDITAR SERVICIO */}
      {showServiceModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 text-base">
                {editingService ? `Editar ${labels.serviceLabel}` : `Nuevo ${labels.serviceLabel}`}
              </h3>
              <button
                type="button"
                onClick={() => setShowServiceModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const formData = new FormData(form);
                const data = {
                  name: formData.get('name') as string,
                  description: (formData.get('description') as string) || '',
                  durationMinutes: Number(formData.get('durationMinutes')),
                  price: Number(formData.get('price')),
                  currency: '$',
                  active: formData.get('active') === 'on',
                  assignedProfessionalIds: professionals.map((p) => p.id),
                };

                if (editingService) {
                  const updated = await api.updateService(business.id, editingService.id, data);
                  setServices((prev) => prev.map((s) => (s.id === editingService.id ? updated : s)));
                } else {
                  const created = await api.createService(business.id, data);
                  setServices((prev) => [...prev, created]);
                }
                setShowServiceModal(false);
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nombre del Servicio *</label>
                <input
                  type="text"
                  name="name"
                  required
                  defaultValue={editingService?.name || ''}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Descripción</label>
                <textarea
                  name="description"
                  rows={2}
                  defaultValue={editingService?.description || ''}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Duración (minutos) *</label>
                  <input
                    type="number"
                    name="durationMinutes"
                    required
                    defaultValue={editingService?.durationMinutes || 30}
                    step={5}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Precio *</label>
                  <input
                    type="number"
                    name="price"
                    required
                    defaultValue={editingService?.price || 0}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  name="active"
                  id="srv_active"
                  defaultChecked={editingService ? editingService.active : true}
                  className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                <label htmlFor="srv_active" className="font-semibold text-slate-700 cursor-pointer">
                  Servicio Activo
                </label>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white font-bold transition"
                >
                  Guardar Servicio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: TIME OFF / EXCEPCIÓN */}
      {showTimeOffModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 text-base">Programar Ausencia o Feriado</h3>
              <button
                type="button"
                onClick={() => setShowTimeOffModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const formData = new FormData(form);
                const profId = formData.get('professionalId') as string;

                const to = await api.createTimeOff(business.id, {
                  professionalId: profId === 'all' ? null : profId,
                  startDate: formData.get('startDate') as string,
                  endDate: formData.get('endDate') as string,
                  reason: formData.get('reason') as string,
                  type: formData.get('type') as any,
                });

                setTimeOffs((prev) => [...prev, to]);
                setShowTimeOffModal(false);
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Motivo *</label>
                <input
                  type="text"
                  name="reason"
                  required
                  placeholder="Ej. Vacaciones, Feriado patrio"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Afecta a:</label>
                <select name="professionalId" className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white">
                  <option value="all">Toda la clínica / negocio</option>
                  {professionals.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Fecha Desde *</label>
                  <input type="date" name="startDate" required defaultValue={todayStr} className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white" />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Fecha Hasta *</label>
                  <input type="date" name="endDate" required defaultValue={todayStr} className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white" />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tipo de Bloqueo</label>
                <select name="type" className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white">
                  <option value="vacation">Vacaciones</option>
                  <option value="holiday">Feriado</option>
                  <option value="absence">Ausencia médica / personal</option>
                  <option value="manual_block">Bloqueo manual</option>
                </select>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white font-bold transition"
                >
                  Registrar Bloqueo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DRAWER / MODAL: HISTORIAL DE CLIENTE */}
      {selectedCustomerForHistory && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  Ficha de {labels.clientLabel}: {selectedCustomerForHistory.firstName} {selectedCustomerForHistory.lastName}
                </h3>
                <p className="text-xs text-slate-500">
                  Tel: {selectedCustomerForHistory.phone} • Email: {selectedCustomerForHistory.email || 'No registrado'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCustomerForHistory(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700">
                Historial de Reservas ({appointments.filter((a) => a.customerPhone === selectedCustomerForHistory.phone).length})
              </h4>

              <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                {appointments
                  .filter((a) => a.customerPhone === selectedCustomerForHistory.phone)
                  .map((app) => (
                    <div
                      key={app.id}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between"
                    >
                      <div>
                        <div className="font-bold text-slate-900">
                          {formatDateShort(app.date)} - {app.startTime} hs
                        </div>
                        <div className="text-slate-500 text-[11px]">Código: {app.bookingCode}</div>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          app.status === 'completed'
                            ? 'bg-blue-100 text-blue-800'
                            : app.status === 'confirmed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {app.status}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SHARE PUBLIC BOOKING LINK WITH PATIENTS */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
                  🔗
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Link Directo para Pacientes / Clientes</h3>
                  <p className="text-xs text-slate-500">Este es el link que debes pegar en tu Instagram, WhatsApp o Facebook</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowShareModal(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  URL de Reservas (Copiada en tu portapapeles)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={getPublicBookingUrl()}
                    className="w-full text-xs font-mono bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 select-all"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(getPublicBookingUrl());
                      setCopiedPublicLink(true);
                      setTimeout(() => setCopiedPublicLink(false), 2000);
                    }}
                    className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold whitespace-nowrap cursor-pointer flex items-center gap-1.5"
                  >
                    {copiedPublicLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedPublicLink ? 'Copiado' : 'Copiar'}</span>
                  </button>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-teal-50/70 border border-teal-200 text-xs text-teal-900 space-y-2">
                <div className="font-bold flex items-center gap-1.5 text-teal-950">
                  <span>💡 ¿Qué ve una persona común cuando entra a este link?</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-teal-800 text-[11px] pl-1">
                  <li><strong>Sin contraseñas:</strong> No tiene que registrarse ni crearse cuenta.</li>
                  <li><strong>Limpio y directo:</strong> Solo ve los médicos, especialidades y el calendario de turnos.</li>
                  <li><strong>Sin botones de administración:</strong> No ve "Mi Panel" ni nada de SuperAdmin.</li>
                  <li><strong>Listo para redes sociales:</strong> Pégalo en tu bio de Instagram, respuesta de WhatsApp o anuncios.</li>
                </ul>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowShareModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowShareModal(false);
                    onViewPublicPage();
                  }}
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-sm cursor-pointer flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Probar cómo lo ve un paciente</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PROFESSIONAL LIMIT REACHED */}
      {profLimitModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Límite de Profesionales Alcanzado</h3>
                  <p className="text-xs text-slate-500">Plan Base Free (1 profesional)</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setProfLimitModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                Tu cuenta está en el <strong>Plan Base Free</strong>, que permite gestionar la agenda de 1 solo profesional. Para agregar hasta 5 profesionales con agendas independientes y sincronizadas, ascendé al <strong>Plan Pro Ilimitado</strong>.
              </p>

              <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200 space-y-2 text-xs">
                <div className="font-bold text-teal-900 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-teal-600" />
                  <span>Beneficios del Plan Pro ($24.900/mes):</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-teal-800 text-[11px] pl-1">
                  <li>Hasta 5 profesionales con agendas independientes</li>
                  <li>Turnos ilimitados (sin tope mensual de 20)</li>
                  <li>Cobro de señas integrado por Mercado Pago + CBU/Alias</li>
                  <li>Sincronización directa con Google Calendar (.ics)</li>
                </ul>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setProfLimitModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  Entendido
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setProfLimitModalOpen(false);
                    setActiveTab('plans');
                  }}
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-sm cursor-pointer flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-teal-200" />
                  <span>Ascender a Plan Pro</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: AI GAP CAMPAIGN GENERATOR */}
      {gapCampaignModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
                  <Zap className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Campaña de Relleno de Huecos (IA)</h3>
                  <p className="text-xs text-slate-500">Detecta turnos vacíos y genera el mensaje de difusión</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setGapCampaignModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {gapCampaignLoading ? (
              <div className="p-8 text-center space-y-3">
                <div className="w-8 h-8 rounded-full border-2 border-purple-600 border-t-transparent animate-spin mx-auto" />
                <p className="text-xs text-slate-600 font-medium">
                  Analizando tu agenda con IA y redactando una propuesta atractiva...
                </p>
              </div>
            ) : gapCampaignResult ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">
                    Campaña inteligente generada con <strong>Gemini IA</strong>
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 font-bold text-[10px]">
                    Listo para publicar
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#efeae2] border border-slate-300 font-sans text-xs text-slate-900 whitespace-pre-line leading-relaxed max-h-60 overflow-y-auto">
                  {gapCampaignResult.campaignMessage}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(gapCampaignResult.campaignMessage);
                      setGapCampaignCopied(true);
                      setTimeout(() => setGapCampaignCopied(false), 2000);
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                  >
                    {gapCampaignCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{gapCampaignCopied ? '¡Copiado al portapapeles!' : 'Copiar Texto para WhatsApp'}</span>
                  </button>

                  <a
                    href={generateWaMeLink(
                      business.phone,
                      gapCampaignResult.campaignMessage
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>Enviar a mi WhatsApp</span>
                  </a>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
