import React, { useState, useEffect, useMemo, FormEvent } from 'react';
import {
  Business,
  Professional,
  Service,
  AvailabilityResponse,
  TimeSlot,
  User,
} from '../types';
import { getBusinessLabels } from '../lib/businessTypes';
import { api, BookingResult, INITIAL_PROFESSIONALS, INITIAL_SERVICES } from '../services/api';
import {
  formatDateSpanish,
  generateNextDays,
  generateGoogleCalendarUrl,
  downloadIcsFile,
  generateWaMeLink,
} from '../utils/dateUtils';
import {
  CheckCircle,
  Calendar,
  Clock,
  MapPin,
  Phone,
  MessageCircle,
  AlertCircle,
  User as UserIcon,
  Shield,
  Search,
  X,
  ExternalLink,
  ChevronRight,
  Info,
  CalendarCheck,
  Download,
  CreditCard,
  Copy,
  Check,
  Lock,
} from 'lucide-react';

interface PublicBookingPageProps {
  key?: React.Key;
  business: Business;
  currentUser?: User | null;
  onNavigateToDashboard?: () => void;
  onGoToAdmin?: () => void;
  onBackToPortal?: () => void;
}

export function PublicBookingPage({
  business,
  currentUser,
  onNavigateToDashboard,
  onGoToAdmin,
  onBackToPortal,
}: PublicBookingPageProps) {
  const labels = useMemo(() => getBusinessLabels(business), [business]);
  const daysList = useMemo(() => generateNextDays(14), []);

  const defaultProfs = useMemo(() => {
    return INITIAL_PROFESSIONALS.filter((p) => p.businessId === business.id && p.active);
  }, [business.id]);

  const defaultSrvs = useMemo(() => {
    return INITIAL_SERVICES.filter((s) => s.businessId === business.id && s.active);
  }, [business.id]);

  // Active Step: 1 = Tratamiento, 2 = Horario y Especialista, 3 = Datos y Seña
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [professionals, setProfessionals] = useState<Professional[]>(defaultProfs);
  const [services, setServices] = useState<Service[]>(defaultSrvs);
  const [selectedProfId, setSelectedProfId] = useState<string>(defaultProfs[0]?.id || '');
  const [selectedServiceId, setSelectedServiceId] = useState<string>(defaultSrvs[0]?.id || '');
  const [selectedDate, setSelectedDate] = useState<string>(daysList[0]?.dateStr || '');
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);

  // Customer form
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');

  // Payment / Deposit states
  const [paymentMethod, setPaymentMethod] = useState<'mercadopago' | 'transfer'>('mercadopago');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [depositAcknowledged, setDepositAcknowledged] = useState(false);

  // Availability & loading
  const [availability, setAvailability] = useState<AvailabilityResponse | null>(null);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [submittingBooking, setSubmittingBooking] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState<BookingResult | null>(null);

  // Booking Lookup Modal
  const [showLookupModal, setShowLookupModal] = useState(false);
  const [lookupCode, setLookupCode] = useState('');
  const [lookupResult, setLookupResult] = useState<any>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);

  const copyToClipboard = (text: string, fieldName: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {}
  };

  // Load initial business data & track page_view
  useEffect(() => {
    let isMounted = true;
    api.recordAnalytics(business.id, 'page_view');

    Promise.all([
      api.getProfessionals(business.id),
      api.getServices(business.id),
    ]).then(([profs, srvs]) => {
      if (!isMounted) return;
      const activeProfs = profs.filter((p) => p.active);
      const activeSrvs = srvs.filter((s) => s.active);
      setProfessionals(activeProfs);
      setServices(activeSrvs);

      if (activeProfs.length > 0) setSelectedProfId(activeProfs[0].id);
      if (activeSrvs.length > 0) setSelectedServiceId(activeSrvs[0].id);
    });

    return () => {
      isMounted = false;
    };
  }, [business.id]);

  // Fetch availability when prof, service, or date changes
  useEffect(() => {
    if (!business.id || !selectedProfId || !selectedServiceId || !selectedDate) return;

    let isMounted = true;
    setLoadingAvailability(true);
    setBookingError(null);
    setSelectedSlot(null);

    api
      .getAvailability(business.id, selectedProfId, selectedServiceId, selectedDate)
      .then((res) => {
        if (!isMounted) return;
        setAvailability(res);
      })
      .catch((err) => {
        if (!isMounted) return;
        setAvailability(null);
        setBookingError(err.message || 'No se pudo cargar la disponibilidad.');
      })
      .finally(() => {
        if (isMounted) setLoadingAvailability(false);
      });

    return () => {
      isMounted = false;
    };
  }, [business.id, selectedProfId, selectedServiceId, selectedDate]);

  // Real-time polling every 10 seconds to detect concurrent bookings
  useEffect(() => {
    if (bookingSuccess || !business.id || !selectedProfId || !selectedServiceId || !selectedDate) return;

    const interval = setInterval(() => {
      api
        .getAvailability(business.id, selectedProfId, selectedServiceId, selectedDate)
        .then((res) => {
          setAvailability(res);
          // If currently selected slot is no longer available, alert user
          if (selectedSlot) {
            const current = res.slots.find((s) => s.time === selectedSlot.time);
            if (current && !current.available) {
              setSelectedSlot(null);
              setBookingError('El horario que tenías seleccionado acaba de ser reservado por otro usuario.');
            }
          }
        })
        .catch(() => {});
    }, 10000);

    return () => clearInterval(interval);
  }, [business.id, selectedProfId, selectedServiceId, selectedDate, selectedSlot, bookingSuccess]);

  const selectedProfessional = professionals.find((p) => p.id === selectedProfId);
  const selectedService = services.find((s) => s.id === selectedServiceId);

  // Calculate required deposit amount
  const depositAmountVal = useMemo(() => {
    if (!business.paymentsEnabled || !business.depositRequired) return 0;
    if (business.depositType === 'percentage' && selectedService?.price) {
      return Math.round((selectedService.price * (business.depositAmount || 50)) / 100);
    }
    return business.depositAmount || 5000;
  }, [business, selectedService]);

  // Submit booking
  const handleConfirmBooking = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedSlot || !selectedSlot.available) {
      setBookingError('Por favor selecciona un horario disponible.');
      return;
    }
    if (!firstName.trim() || !lastName.trim() || !phone.trim()) {
      setBookingError('Por favor completa tu nombre, apellido y teléfono.');
      return;
    }

    setSubmittingBooking(true);
    setBookingError(null);

    try {
      const result = await api.bookAppointment({
        businessId: business.id,
        professionalId: selectedProfId,
        serviceId: selectedServiceId,
        customer: {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined,
        },
        date: selectedDate,
        startTime: selectedSlot.time,
        notes: notes.trim() || undefined,
        paymentMethod: business.paymentsEnabled && business.depositRequired ? paymentMethod : 'cash',
        paymentStatus: business.paymentsEnabled && business.depositRequired ? 'deposit_pending' : 'not_required',
        depositAmount: depositAmountVal || undefined,
      });

      setBookingSuccess(result);
    } catch (err: any) {
      if (
        err.code === 'PLAN_MONTHLY_LIMIT_REACHED' ||
        err.status === 402 ||
        err.message?.includes('PLAN_MONTHLY_LIMIT_REACHED') ||
        err.message?.includes('tope mensual') ||
        err.message?.includes('Plan Pro')
      ) {
        setBookingError(
          'El establecimiento ha completado el cupo mensual de turnos online de su plan actual. Para reservar directamente, contáctate por WhatsApp.'
        );
      } else if (err.code === 'SLOT_OCCUPIED' || err.status === 409) {
        setBookingError(
          '¡Lo sentimos! Este horario acaba de ser ocupado por otra persona. La disponibilidad se ha actualizado. Por favor elige otro horario disponible.'
        );
        // Refresh availability
        api
          .getAvailability(business.id, selectedProfId, selectedServiceId, selectedDate)
          .then((res) => setAvailability(res))
          .catch(() => {});
        setSelectedSlot(null);
      } else {
        setBookingError(err.message || 'Error al procesar la reserva. Intenta nuevamente.');
      }
    } finally {
      setSubmittingBooking(false);
    }
  };

  const handleLookupAppointment = async (e: FormEvent) => {
    e.preventDefault();
    if (!lookupCode.trim()) return;
    setLookupLoading(true);
    setLookupError(null);
    setLookupResult(null);

    try {
      const app = await api.getAppointment(lookupCode.trim().toUpperCase());
      setLookupResult(app);
    } catch (err: any) {
      setLookupError('No encontramos ningún turno con ese código. Verifica el formato (ej. TM-4821).');
    } finally {
      setLookupLoading(false);
    }
  };

  const handleCancelLookupAppointment = async (id: string) => {
    if (!confirm('¿Estás seguro de cancelar este turno?')) return;
    try {
      const updated = await api.updateAppointmentStatus(id, 'cancelled', 'Cancelado por el cliente desde web');
      setLookupResult(updated);
      alert('Tu turno ha sido cancelado con éxito.');
    } catch (err: any) {
      alert('Error al cancelar el turno: ' + err.message);
    }
  };

  const handleResetToNewBooking = () => {
    setBookingSuccess(null);
    setSelectedSlot(null);
    setFirstName('');
    setLastName('');
    setPhone('');
    setEmail('');
    setNotes('');
    setBookingError(null);
  };

  const handleWhatsAppClick = (url: string) => {
    api.recordAnalytics(business.id, 'whatsapp_click');
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* Top Brand Banner */}
      <header
        className="text-white shadow-md relative overflow-hidden"
        style={{
          backgroundColor: business.primaryColor || '#0284c7',
        }}
      >
        <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {business.logoUrl ? (
                <img
                  src={business.logoUrl}
                  alt={business.name}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-white/30 shadow-md bg-white"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center font-bold text-2xl border border-white/30">
                  {business.name.substring(0, 2).toUpperCase()}
                </div>
              )}
              <div>
                <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/20 text-white border border-white/30 mb-1">
                  {business.category || labels.serviceLabel}
                </span>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">{business.name}</h1>
                <p className="text-white/90 text-sm max-w-xl line-clamp-2 mt-1">{business.description}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 self-stretch sm:self-center">
              {onBackToPortal && (
                <button
                  type="button"
                  onClick={onBackToPortal}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-semibold border border-white/30 transition shadow-sm cursor-pointer"
                  title="Volver al Portal y Directorio de Negocios"
                >
                  <span>← Portal Principal</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowLookupModal(true)}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-medium border border-white/25 transition shadow-sm cursor-pointer"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Consultar mi turno</span>
              </button>
              {business.whatsappNumber && (
                <button
                  type="button"
                  onClick={() =>
                    handleWhatsAppClick(
                      `https://wa.me/${business.whatsappNumber}?text=${encodeURIComponent(
                        `Hola, tengo una consulta sobre turnos en ${business.name}`
                      )}`
                    )
                  }
                  className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold shadow transition"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </button>
              )}
              {/* If user is logged in as staff/owner, show discreet badge or return button, but for real patients don't show any active panel button */}
              {currentUser && onGoToAdmin && (
                <button
                  type="button"
                  onClick={onGoToAdmin}
                  className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/30 hover:bg-black/50 text-white text-[11px] font-medium border border-white/20 transition shadow-xs cursor-pointer"
                  title="Volver a tu panel de administración"
                >
                  <Lock className="w-3 h-3 opacity-80" />
                  <span>Volver a Mi Panel</span>
                </button>
              )}
            </div>
          </div>

          {/* Quick Info Bar */}
          <div className="mt-5 pt-4 border-t border-white/20 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-white/90">
            {business.address && (
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{business.address}</span>
              </div>
            )}
            {business.phone && (
              <div className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 shrink-0" />
                <span>{business.phone}</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-4xl mx-auto px-4 mt-6">
        {/* Welcome Message Pill */}
        {business.welcomeMessage && (
          <div className="mb-6 p-4 rounded-2xl bg-blue-50 border border-blue-100 flex items-start gap-3 text-blue-900 text-sm shadow-xs">
            <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">{business.welcomeMessage}</p>
              {business.cancellationPolicy && (
                <p className="text-xs text-blue-700 mt-1 flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5" /> Política de cancelación: {business.cancellationPolicy}
                </p>
              )}
            </div>
          </div>
        )}

        {/* BOOKING SUCCESS SCREEN */}
        {bookingSuccess ? (
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200">
            <div className="text-center max-w-lg mx-auto">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-10 h-10" />
              </div>
              <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 mb-2">
                ¡Reserva Confirmada!
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
                Tu {labels.appointmentLabel.toLowerCase()} está reservado
              </h2>
              <p className="text-slate-600 text-sm mt-1">
                Hemos registrado tu solicitud en el sistema de {business.name}.
              </p>

              {/* Booking Code Card */}
              <div className="my-6 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Código de Reserva
                </div>
                <div className="text-2xl sm:text-3xl font-mono font-extrabold text-slate-900 tracking-wider mt-0.5">
                  {bookingSuccess.appointment.bookingCode}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Conserva este código para consultar o gestionar tu turno.
                </div>
              </div>

              {/* Summary Details */}
              <div className="text-left bg-slate-50/70 p-4 rounded-2xl border border-slate-100 space-y-2.5 text-sm mb-4">
                <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">{labels.professionalLabel}:</span>
                  <span className="font-semibold text-slate-900">
                    {selectedProfessional?.name || 'Profesional'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">{labels.serviceLabel}:</span>
                  <span className="font-semibold text-slate-900">
                    {selectedService?.name || 'Servicio'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">Fecha y Hora:</span>
                  <span className="font-semibold text-slate-900">
                    {formatDateSpanish(bookingSuccess.appointment.date)} a las {bookingSuccess.appointment.startTime} hs
                  </span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-500">Lugar:</span>
                  <span className="font-medium text-slate-800 text-right text-xs max-w-[200px] truncate">
                    {business.address}
                  </span>
                </div>
              </div>

              {/* Deposit Payment Instructions if Required */}
              {Boolean(bookingSuccess.appointment.depositAmount) && (
                <div className="text-left bg-teal-50 border border-teal-200 p-4 rounded-2xl mb-6 space-y-2 text-xs text-teal-950">
                  <div className="flex items-center justify-between">
                    <span className="font-bold flex items-center gap-1.5 text-teal-900">
                      <CreditCard className="w-4 h-4 text-teal-600" />
                      Seña Pendiente de Pago
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-teal-600 text-white font-extrabold text-xs shadow-xs">
                      ${bookingSuccess.appointment.depositAmount?.toLocaleString('es-AR')} ARS
                    </span>
                  </div>
                  <p className="text-[11px] text-teal-800">
                    Para confirmar el turno definitivamente, por favor transfiere la seña y envía el comprobante por WhatsApp:
                  </p>

                  <div className="pt-2 border-t border-teal-200/70 space-y-1.5">
                    {bookingSuccess.appointment.paymentMethod === 'mercadopago' ? (
                      <div className="bg-white p-2.5 rounded-xl border border-teal-100 flex items-center justify-between">
                        <span className="text-slate-600 font-medium">Alias Mercado Pago:</span>
                        <div className="flex items-center gap-1.5 font-mono font-bold text-slate-900">
                          <span>{business.mpAlias || business.bankAlias || 'consultorio.mp'}</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(business.mpAlias || business.bankAlias || 'consultorio.mp', 'successMp')}
                            className="p-1 hover:bg-slate-100 rounded text-teal-600 cursor-pointer"
                            title="Copiar alias"
                          >
                            {copiedField === 'successMp' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-white p-2.5 rounded-xl border border-teal-100 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-600 font-medium">Alias Bancario:</span>
                          <div className="flex items-center gap-1.5 font-mono font-bold text-slate-900">
                            <span>{business.bankAlias || 'consultorio.turnos'}</span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(business.bankAlias || 'consultorio.turnos', 'successAlias')}
                              className="p-1 hover:bg-slate-100 rounded text-teal-600 cursor-pointer"
                              title="Copiar alias"
                            >
                              {copiedField === 'successAlias' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>
                        {business.bankCbu && (
                          <div className="flex items-center justify-between">
                            <span className="text-slate-600 font-medium">CBU / CVU:</span>
                            <div className="flex items-center gap-1.5 font-mono font-bold text-slate-900">
                              <span className="text-[11px]">{business.bankCbu}</span>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(business.bankCbu!, 'successCbu')}
                                className="p-1 hover:bg-slate-100 rounded text-teal-600 cursor-pointer"
                                title="Copiar CBU"
                              >
                                {copiedField === 'successCbu' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>
                        )}
                        {business.bankAccountHolder && (
                          <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                            Titular: <strong>{business.bankAccountHolder}</strong> ({business.bankName || 'Banco'})
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-3">
                {/* WhatsApp Button */}
                <button
                  type="button"
                  onClick={() => handleWhatsAppClick(bookingSuccess.whatsapp.customerUrl)}
                  className="w-full flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-md hover:shadow-lg transition"
                >
                  <MessageCircle className="w-5 h-5" />
                  <span>Enviar confirmación por WhatsApp</span>
                </button>

                {/* Calendar Add Buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <a
                    href={generateGoogleCalendarUrl({
                      serviceName: selectedService?.name || 'Turno',
                      professionalName: selectedProfessional?.name || '',
                      businessName: business.name,
                      address: business.address,
                      date: bookingSuccess.appointment.date,
                      startTime: bookingSuccess.appointment.startTime,
                      endTime: bookingSuccess.appointment.endTime,
                      bookingCode: bookingSuccess.appointment.bookingCode,
                    })}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition"
                  >
                    <CalendarCheck className="w-4 h-4 text-blue-600" />
                    <span>Google Calendar</span>
                  </a>

                  <button
                    type="button"
                    onClick={() =>
                      downloadIcsFile({
                        serviceName: selectedService?.name || 'Turno',
                        professionalName: selectedProfessional?.name || '',
                        businessName: business.name,
                        address: business.address,
                        date: bookingSuccess.appointment.date,
                        startTime: bookingSuccess.appointment.startTime,
                        endTime: bookingSuccess.appointment.endTime,
                        bookingCode: bookingSuccess.appointment.bookingCode,
                      })
                    }
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition"
                  >
                    <Download className="w-4 h-4 text-slate-600" />
                    <span>Descargar .ICS</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleResetToNewBooking}
                  className="w-full py-2.5 text-xs font-medium text-slate-600 hover:text-slate-900 transition"
                >
                  Reservar otro turno
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* BOOKING FLOW: 3-STEP PROGRESSIVE WIZARD */
          <div className="space-y-6">
            {/* Step Navigation Bar */}
            <div className="bg-white rounded-2xl p-2 sm:p-3 shadow-xs border border-slate-200 flex items-center justify-between gap-1 text-xs">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl font-semibold transition cursor-pointer ${
                  currentStep === 1
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                  currentStep === 1 ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  1
                </span>
                <span className="hidden sm:inline">1. Tratamiento</span>
                <span className="sm:hidden">Servicio</span>
              </button>

              <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />

              <button
                type="button"
                onClick={() => {
                  if (selectedServiceId) setCurrentStep(2);
                }}
                disabled={!selectedServiceId}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl font-semibold transition ${
                  currentStep === 2
                    ? 'bg-slate-900 text-white shadow-xs'
                    : selectedServiceId
                    ? 'text-slate-600 hover:bg-slate-100 cursor-pointer'
                    : 'text-slate-300 cursor-not-allowed'
                }`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                  currentStep === 2 ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  2
                </span>
                <span className="hidden sm:inline">2. Fecha y Horario</span>
                <span className="sm:hidden">Horario</span>
              </button>

              <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />

              <button
                type="button"
                onClick={() => {
                  if (selectedServiceId && selectedSlot) setCurrentStep(3);
                }}
                disabled={!selectedServiceId || !selectedSlot}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl font-semibold transition ${
                  currentStep === 3
                    ? 'bg-slate-900 text-white shadow-xs'
                    : selectedServiceId && selectedSlot
                    ? 'text-slate-600 hover:bg-slate-100 cursor-pointer'
                    : 'text-slate-300 cursor-not-allowed'
                }`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                  currentStep === 3 ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  3
                </span>
                <span className="hidden sm:inline">3. Tus Datos y Seña</span>
                <span className="sm:hidden">Confirmar</span>
              </button>
            </div>

            {/* STEP 1: CHOOSE SERVICE / TREATMENT */}
            {currentStep === 1 && (
              <div className="bg-white rounded-3xl p-5 sm:p-7 shadow-xs border border-slate-200">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                      1. Elige tu Tratamiento
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                      Selecciona el servicio que deseas realizarte para ver la agenda disponible
                    </p>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                    {services.length} opciones
                  </span>
                </div>

                <div className="space-y-3">
                  {services.map((srv) => {
                    const isSelected = selectedServiceId === srv.id;
                    return (
                      <div
                        key={srv.id}
                        onClick={() => setSelectedServiceId(srv.id)}
                        className={`w-full text-left p-4 sm:p-5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer ${
                          isSelected
                            ? 'border-teal-600 bg-teal-50/40 ring-2 ring-teal-600/20 shadow-xs'
                            : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/50'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-slate-900 text-base sm:text-lg">
                              {srv.name}
                            </span>
                            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-slate-500" /> {srv.durationMinutes} min
                            </span>
                          </div>
                          {srv.description && (
                            <p className="text-xs sm:text-sm text-slate-600 mt-1.5 line-clamp-2">
                              {srv.description}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                          {srv.price > 0 && (
                            <div className="text-left sm:text-right">
                              <div className="text-[11px] text-slate-400 font-medium uppercase">Valor</div>
                              <span className="font-extrabold text-slate-900 text-base sm:text-lg">
                                ${srv.price.toLocaleString('es-AR')} {srv.currency || 'ARS'}
                              </span>
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedServiceId(srv.id);
                              setCurrentStep(2);
                            }}
                            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                              isSelected
                                ? 'bg-teal-600 text-white shadow-xs hover:bg-teal-700'
                                : 'bg-slate-900 text-white hover:bg-black'
                            }`}
                          >
                            <span>{isSelected ? 'Elegir Fecha →' : 'Seleccionar'}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {selectedService && (
                  <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between">
                    <div className="text-xs text-slate-600">
                      Seleccionado: <strong className="text-slate-900">{selectedService.name}</strong> (${selectedService.price.toLocaleString('es-AR')})
                    </div>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(2)}
                      className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold flex items-center gap-2 shadow-xs transition"
                    >
                      <span>Continuar al Paso 2</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* STEP 2: CHOOSE PROFESSIONAL, DATE & REAL-TIME SLOT */}
            {currentStep === 2 && (
              <div className="space-y-5">
                {/* Selected Service Quick Bar */}
                <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200/80 flex items-center justify-between text-xs sm:text-sm">
                  <div className="flex items-center gap-2 text-teal-950">
                    <span className="font-medium text-teal-700">Tratamiento:</span>
                    <strong className="font-bold">{selectedService?.name}</strong>
                    <span className="text-teal-600 font-medium">(${selectedService?.price.toLocaleString('es-AR')} • {selectedService?.durationMinutes} min)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="text-teal-800 font-bold hover:underline text-xs"
                  >
                    Cambiar
                  </button>
                </div>

                {/* Professional Selection */}
                <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-xs border border-slate-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-slate-900 text-base sm:text-lg flex items-center gap-2">
                      <UserIcon className="w-5 h-5 text-slate-700" />
                      <span>¿Con quién deseas atenderte?</span>
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {professionals.map((prof) => {
                      const isSelected = selectedProfId === prof.id;
                      return (
                        <button
                          key={prof.id}
                          type="button"
                          onClick={() => setSelectedProfId(prof.id)}
                          className={`text-left p-3.5 rounded-2xl border transition-all flex items-center gap-3.5 cursor-pointer ${
                            isSelected
                              ? 'border-teal-600 bg-teal-50/40 ring-2 ring-teal-600/20'
                              : 'border-slate-200 hover:border-slate-300 bg-white'
                          }`}
                        >
                          <img
                            src={prof.photoUrl || 'https://images.unsplash.com/photo-1594824813586-7a718b5b533f?w=120'}
                            alt={prof.name}
                            className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-slate-900 text-sm truncate">{prof.name}</div>
                            <div className="text-xs text-slate-500 truncate">{prof.specialty || prof.title}</div>
                            <span className="inline-block mt-0.5 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                              Atención Disponible
                            </span>
                          </div>
                          <div
                            className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                              isSelected ? 'border-teal-600 bg-teal-600 text-white' : 'border-slate-300'
                            }`}
                          >
                            {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Day Selection */}
                <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-xs border border-slate-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-slate-900 text-base sm:text-lg flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-slate-700" />
                      <span>Selecciona el Día</span>
                    </h3>
                    <span className="text-xs font-semibold text-slate-600">
                      {formatDateSpanish(selectedDate)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                    {daysList.map((day) => {
                      const isSelected = selectedDate === day.dateStr;
                      return (
                        <button
                          key={day.dateStr}
                          type="button"
                          onClick={() => setSelectedDate(day.dateStr)}
                          className={`shrink-0 flex flex-col items-center justify-center w-18 py-3 rounded-2xl border transition-all text-xs cursor-pointer ${
                            isSelected
                              ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-900/20'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <span className={`text-[11px] font-semibold capitalize ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                            {day.dayName.substring(0, 3)}
                          </span>
                          <span className="text-lg font-extrabold mt-0.5">{day.dayNum}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Real-time Time Slots */}
                <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-xs border border-slate-200">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                    <h3 className="font-bold text-slate-900 text-base sm:text-lg flex items-center gap-2">
                      <Clock className="w-5 h-5 text-slate-700" />
                      <span>Horarios Disponibles</span>
                    </h3>

                    {availability && (
                      <div className="flex items-center gap-2">
                        {availability.status === 'available' && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            {availability.totalAvailable} horarios libres
                          </span>
                        )}
                        {availability.status === 'low_availability' && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                            <span className="w-2 h-2 rounded-full bg-amber-500" />
                            Pocos horarios ({availability.totalAvailable})
                          </span>
                        )}
                        {availability.status === 'full' && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            <span className="w-2 h-2 rounded-full bg-rose-500" />
                            Sin turnos disponibles este día
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {loadingAvailability ? (
                    <div className="py-10 flex flex-col items-center justify-center text-slate-400 gap-2">
                      <div className="w-6 h-6 border-2 border-slate-300 border-t-slate-800 rounded-full animate-spin" />
                      <span className="text-xs font-medium">Consultando horarios en vivo...</span>
                    </div>
                  ) : !availability || availability.slots.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-500 text-sm">
                      <AlertCircle className="w-6 h-6 mx-auto mb-2 text-slate-400" />
                      No hay horarios de atención configurados para este día. Por favor elige otra fecha.
                    </div>
                  ) : (
                    <div>
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
                        {availability.slots.map((slot) => {
                          const isSelected = selectedSlot?.time === slot.time;
                          const isAvailable = slot.available;

                          return (
                            <button
                              key={slot.time}
                              type="button"
                              disabled={!isAvailable}
                              onClick={() => {
                                setSelectedSlot(slot);
                                api.recordAnalytics(business.id, 'booking_start');
                              }}
                              className={`py-3 px-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                                isSelected
                                  ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-600/30 scale-102'
                                  : isAvailable
                                  ? 'bg-emerald-50 text-emerald-900 border border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300'
                                  : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed line-through opacity-60'
                              }`}
                            >
                              <span className="text-sm font-extrabold">{slot.time} hs</span>
                              <span className="text-[10px] font-medium opacity-85">
                                {isAvailable ? 'Disponible' : 'Ocupado'}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      <div className="mt-4 flex items-center justify-between text-[11px] text-slate-500 pt-3 border-t border-slate-100">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1">
                            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> Verde = Libre
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="w-2.5 h-2.5 rounded-sm bg-slate-300" /> Gris = Ocupado
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Advance to Step 3 Button */}
                  {selectedSlot && (
                    <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between">
                      <div className="text-xs text-slate-700">
                        Horario elegido: <strong className="text-slate-900">{selectedSlot.time} hs</strong> el {formatDateSpanish(selectedDate)}
                      </div>
                      <button
                        type="button"
                        onClick={() => setCurrentStep(3)}
                        className="px-5 py-3 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold flex items-center gap-2 shadow-md transition cursor-pointer"
                      >
                        <span>Completar Reserva</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* STEP 3: CUSTOMER FORM, DEPOSIT BREAKDOWN & CONFIRMATION */}
            {currentStep === 3 && (
              <div className="space-y-5">
                {/* Order Summary Card */}
                <div className="bg-slate-900 text-white rounded-3xl p-5 sm:p-6 shadow-md border border-slate-800">
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
                    <span className="text-xs font-semibold text-teal-400 uppercase tracking-wider">
                      Resumen del Turno
                    </span>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(2)}
                      className="text-xs text-slate-300 hover:text-white underline cursor-pointer"
                    >
                      Modificar horario
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
                    <div>
                      <div className="text-slate-400 text-xs">Tratamiento:</div>
                      <div className="font-bold text-white text-base mt-0.5">{selectedService?.name}</div>
                      <div className="text-slate-300 text-xs mt-0.5">{selectedService?.durationMinutes} minutos de sesión</div>
                    </div>
                    <div>
                      <div className="text-slate-400 text-xs">Especialista y Horario:</div>
                      <div className="font-bold text-white text-base mt-0.5">
                        {formatDateSpanish(selectedDate)} • {selectedSlot?.time} hs
                      </div>
                      <div className="text-slate-300 text-xs mt-0.5">Con {selectedProfessional?.name}</div>
                    </div>
                  </div>

                  {/* Price & Deposit Breakdown */}
                  {selectedService && (
                    <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-3 gap-2 text-center">
                      <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                        <div className="text-[10px] text-slate-400 font-medium">Valor Total</div>
                        <div className="text-sm sm:text-base font-extrabold text-white mt-0.5">
                          ${selectedService.price.toLocaleString('es-AR')}
                        </div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-teal-500/20 border border-teal-400/30">
                        <div className="text-[10px] text-teal-300 font-bold">Seña a Transferir</div>
                        <div className="text-sm sm:text-base font-extrabold text-teal-300 mt-0.5">
                          ${depositAmountVal.toLocaleString('es-AR')}
                        </div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                        <div className="text-[10px] text-slate-400 font-medium">Saldo en Local</div>
                        <div className="text-sm sm:text-base font-extrabold text-white mt-0.5">
                          ${Math.max(0, selectedService.price - depositAmountVal).toLocaleString('es-AR')}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Main Form */}
                <form
                  onSubmit={handleConfirmBooking}
                  className="bg-white rounded-3xl p-5 sm:p-7 shadow-xs border border-slate-200"
                >
                  <div className="flex items-center gap-2 mb-4">
                    <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center">
                      3
                    </span>
                    <h2 className="text-base sm:text-lg font-bold text-slate-900">
                      Tus Datos para la Confirmación
                    </h2>
                  </div>

                  {bookingError && (
                    <div className="mb-4 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                      <div className="flex items-start gap-2.5">
                        <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-rose-950">{bookingError}</p>
                          {bookingError.includes('WhatsApp') && (
                            <p className="text-[11px] text-rose-700 mt-0.5">
                              Podés enviar un mensaje directo para que te atiendan personalmente.
                            </p>
                          )}
                        </div>
                      </div>
                      {bookingError.includes('WhatsApp') && (
                        <a
                          href={generateWaMeLink(
                            business.phone,
                            `Hola! Estaba intentando reservar un turno para ${selectedService?.name || 'atención'} con ${selectedProfessional?.name || ''} para el ${selectedDate} a las ${selectedSlot?.time || ''} hs pero el sistema indica cupo mensual completo. ¿Podrán confirmarme si tienen lugar? ¡Muchas gracias!`
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shrink-0 flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer"
                        >
                          <MessageCircle className="w-4 h-4" />
                          <span>Consultar por WhatsApp</span>
                        </a>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre *</label>
                      <input
                        type="text"
                        required
                        placeholder="Tu nombre"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Apellido *</label>
                      <input
                        type="text"
                        required
                        placeholder="Tu apellido"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Teléfono Móvil (WhatsApp) *
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="Ej. +5491155443322"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                      />
                      <span className="text-[10px] text-slate-400 mt-0.5 block">
                        Para recibir confirmación y recordatorio
                      </span>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Correo Electrónico (opcional)
                      </label>
                      <input
                        type="email"
                        placeholder="nombre@gmail.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                      />
                    </div>
                  </div>

                  <div className="mb-5">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Aclaraciones o consulta previa (opcional)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Ej. Tengo piel sensible, es mi primera vez, etc."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                    />
                  </div>

                  {/* Payment / Deposit Data Box */}
                  {Boolean(business.paymentsEnabled && business.depositRequired && depositAmountVal > 0) && (
                    <div className="mb-5 p-4 sm:p-5 rounded-2xl bg-teal-50/70 border border-teal-200">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5">
                          <CreditCard className="w-4 h-4 text-teal-700" />
                          <span className="text-xs font-bold text-teal-950 uppercase tracking-wide">
                            Datos para la Seña de Reserva
                          </span>
                        </div>
                        <span className="px-2.5 py-1 rounded-full bg-teal-600 text-white font-extrabold text-xs shadow-xs">
                          ${depositAmountVal.toLocaleString('es-AR')} ARS
                        </span>
                      </div>

                      <p className="text-xs text-teal-900 mb-3">
                        Para congelar el turno y evitar ausencias, transfiere la seña. Luego envías el comprobante con 1 clic por WhatsApp.
                      </p>

                      {/* Payment Method Tabs */}
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        <button
                          type="button"
                          onClick={() => setPaymentMethod('mercadopago')}
                          className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                            paymentMethod === 'mercadopago'
                              ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <span className="w-2 h-2 rounded-full bg-sky-300" />
                          Mercado Pago
                        </button>

                        <button
                          type="button"
                          onClick={() => setPaymentMethod('transfer')}
                          className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                            paymentMethod === 'transfer'
                              ? 'bg-teal-700 text-white border-teal-700 shadow-xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <span className="w-2 h-2 rounded-full bg-teal-300" />
                          Transferencia (CBU)
                        </button>
                      </div>

                      {/* Payment Info Card */}
                      {paymentMethod === 'mercadopago' && (
                        <div className="p-3 bg-white rounded-xl border border-teal-100 text-xs text-slate-700 space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-slate-500 font-medium">Alias Mercado Pago:</span>
                            <div className="flex items-center gap-1 font-mono font-bold text-slate-900">
                              <span>{business.mpAlias || business.bankAlias || 'estetica.spa.mp'}</span>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(business.mpAlias || business.bankAlias || 'estetica.spa.mp', 'formMp')}
                                className="p-1 hover:bg-slate-100 rounded text-teal-600 cursor-pointer"
                                title="Copiar alias"
                              >
                                {copiedField === 'formMp' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>
                          {business.mpPaymentLink && (
                            <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
                              <span className="text-slate-500">Link directo:</span>
                              <a
                                href={business.mpPaymentLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 font-bold hover:underline"
                              >
                                Pagar con Mercado Pago
                              </a>
                            </div>
                          )}
                        </div>
                      )}

                      {paymentMethod === 'transfer' && (
                        <div className="p-3 bg-white rounded-xl border border-teal-100 text-xs text-slate-700 space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-slate-500 font-medium">Alias:</span>
                            <div className="flex items-center gap-1 font-mono font-bold text-slate-900">
                              <span>{business.bankAlias || 'estetica.spa.turnos'}</span>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(business.bankAlias || 'estetica.spa.turnos', 'formBank')}
                                className="p-1 hover:bg-slate-100 rounded text-teal-600 cursor-pointer"
                                title="Copiar alias"
                              >
                                {copiedField === 'formBank' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>
                          {business.bankCbu && (
                            <div className="flex justify-between items-center">
                              <span className="text-slate-500 font-medium">CBU / CVU:</span>
                              <div className="flex items-center gap-1 font-mono font-bold text-slate-900">
                                <span className="text-[11px]">{business.bankCbu}</span>
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(business.bankCbu!, 'formCbu')}
                                  className="p-1 hover:bg-slate-100 rounded text-teal-600 cursor-pointer"
                                  title="Copiar CBU"
                                >
                                  {copiedField === 'formCbu' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            </div>
                          )}
                          {business.bankAccountHolder && (
                            <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                              Titular: <strong>{business.bankAccountHolder}</strong> ({business.bankName || 'Banco Santander'})
                            </div>
                          )}
                        </div>
                      )}

                      <label className="mt-3 flex items-start gap-2 text-[11px] text-teal-950 font-medium cursor-pointer">
                        <input
                          type="checkbox"
                          required
                          checked={depositAcknowledged}
                          onChange={(e) => setDepositAcknowledged(e.target.checked)}
                          className="mt-0.5 rounded text-teal-600 focus:ring-teal-500"
                        />
                        <span>
                          He copiado los datos de pago para enviar la seña por WhatsApp al confirmar.
                        </span>
                      </label>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={!selectedSlot || submittingBooking}
                    className={`w-full py-4 px-6 rounded-2xl font-bold text-base shadow-md transition flex items-center justify-center gap-2 cursor-pointer ${
                      !selectedSlot || submittingBooking
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white hover:shadow-lg'
                    }`}
                  >
                    {submittingBooking ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Confirmando tu reserva...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-5 h-5 text-white" />
                        <span>Confirmar Turno y Abrir WhatsApp</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* Clean Footer */}
        <footer className="mt-12 pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            <span>© {new Date().getFullYear()} {business.name}. Todos los derechos reservados.</span>
          </div>
          <div className="flex items-center gap-4">
            {onGoToAdmin && (
              <button
                type="button"
                onClick={onGoToAdmin}
                className="hover:text-slate-800 transition flex items-center gap-1 cursor-pointer"
              >
                <Lock className="w-3 h-3 text-slate-400" />
                <span>Acceso Profesional</span>
              </button>
            )}
            <span className="text-slate-300">|</span>
            <span className="text-[11px] text-slate-400">
              Powered by <strong className="text-slate-600">TurnosDisponibles.online</strong>
            </span>
          </div>
        </footer>
      </main>

      {/* LOOKUP MODAL */}
      {showLookupModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                <Search className="w-5 h-5 text-slate-700" />
                <span>Consultar o Cancelar Reserva</span>
              </h3>
              <button
                onClick={() => {
                  setShowLookupModal(false);
                  setLookupResult(null);
                  setLookupError(null);
                }}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleLookupAppointment} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Código de Reserva (ej. TM-4821)
                </label>
                <input
                  type="text"
                  required
                  placeholder="TM-XXXX"
                  value={lookupCode}
                  onChange={(e) => setLookupCode(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono text-sm uppercase focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                />
              </div>

              {lookupError && (
                <div className="p-3 bg-rose-50 text-rose-800 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{lookupError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={lookupLoading}
                className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-semibold text-xs hover:bg-black transition flex items-center justify-center gap-2"
              >
                {lookupLoading ? 'Buscando...' : 'Buscar Reserva'}
              </button>
            </form>

            {lookupResult && (
              <div className="mt-5 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    {lookupResult.bookingCode}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full font-semibold uppercase text-[10px] ${
                      lookupResult.status === 'confirmed'
                        ? 'bg-emerald-100 text-emerald-800'
                        : lookupResult.status === 'cancelled'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {lookupResult.status}
                  </span>
                </div>
                <div>
                  <strong>{labels.clientLabel}:</strong> {lookupResult.customerName}
                </div>
                <div>
                  <strong>Fecha y Hora:</strong> {lookupResult.date} a las {lookupResult.startTime} hs
                </div>

                {lookupResult.status !== 'cancelled' && (
                  <div className="pt-3 border-t border-slate-200 flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleCancelLookupAppointment(lookupResult.id)}
                      className="w-full py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold transition"
                    >
                      Cancelar este turno
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
