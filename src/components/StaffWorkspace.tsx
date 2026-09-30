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
} from 'lucide-react';

interface StaffWorkspaceProps {
  business: Business;
  currentUser: User | null;
  initialCode?: string;
  initialProfId?: string;
  onLogout: () => void;
  onSwitchToOwner?: () => void;
  onUserUpdate?: (updatedUser: User) => void;
}

export function StaffWorkspace({
  business,
  currentUser,
  initialCode = '',
  initialProfId = '',
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

  // Working Hours State for this Doctor / Consultorio
  const [myHoursDraft, setMyHoursDraft] = useState<WorkingHours[]>([]);
  const [isEditingMyHours, setIsEditingMyHours] = useState(false);
  const [savingMyHours, setSavingMyHours] = useState(false);
  const [myHoursMessage, setMyHoursMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [validationResult, setValidationResult] = useState<AvailabilityValidationResult | null>(null);

  const DAYS_ORDER = [
    { day: 1, label: 'Lunes' },
    { day: 2, label: 'Martes' },
    { day: 3, label: 'Miércoles' },
    { day: 4, label: 'Jueves' },
    { day: 5, label: 'Viernes' },
    { day: 6, label: 'Sábado' },
    { day: 0, label: 'Domingo' },
  ];

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
