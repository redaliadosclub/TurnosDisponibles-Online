import React, { useState } from 'react';
import { Appointment, Business, Service, Professional } from '../../types';
import { api } from '../../services/api';
import {
  Search,
  Calendar,
  Clock,
  User,
  CheckCircle2,
  AlertCircle,
  X,
  MessageCircle,
  CalendarPlus,
  Ban,
  Building2,
  DollarSign,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { formatDateSpanish } from '../../utils/dateUtils';

interface BookingLookupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGoToBooking: (slug: string) => void;
}

export function BookingLookupModal({ isOpen, onClose, onGoToBooking }: BookingLookupModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [foundAppointment, setFoundAppointment] = useState<{
    appointment: Appointment;
    business?: Business | null;
    service?: Service | null;
    professional?: Professional | null;
  } | null>(null);
  const [notFoundMessage, setNotFoundMessage] = useState<string | null>(null);
  const [cancelSuccess, setCancelSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    setLoading(true);
    setSearched(true);
    setNotFoundMessage(null);
    setFoundAppointment(null);
    setCancelSuccess(false);

    try {
      // 1. First, search businesses
      const allBizs = await api.getBusinesses();
      let matchAppt: Appointment | null = null;
      let matchedBiz: Business | null = null;

      // Try exact code lookup
      try {
        const directAppt = await api.getAppointment(query.toUpperCase());
        if (directAppt) {
          matchAppt = directAppt;
          matchedBiz = allBizs.find((b) => b.id === directAppt.businessId) || null;
        }
      } catch {}

      // If not found by direct ID/code, scan appointments across businesses by phone, email or booking code
      if (!matchAppt) {
        for (const b of allBizs) {
          const appts = await api.getAppointments(b.id);
          const found = appts.find(
            (a) =>
              (a.bookingCode && a.bookingCode.toLowerCase() === query.toLowerCase()) ||
              (a.id && a.id.toLowerCase() === query.toLowerCase()) ||
              (a.customerPhone && a.customerPhone.replace(/\D/g, '').includes(query.replace(/\D/g, ''))) ||
              (a.customerEmail && a.customerEmail.toLowerCase() === query.toLowerCase())
          );
          if (found) {
            matchAppt = found;
            matchedBiz = b;
            break;
          }
        }
      }

      if (matchAppt && matchedBiz) {
        // Fetch service and professional details
        const [services, profs] = await Promise.all([
          api.getServices(matchedBiz.id),
          api.getProfessionals(matchedBiz.id),
        ]);
        const srv = services.find((s) => s.id === matchAppt!.serviceId) || null;
        const prof = profs.find((p) => p.id === matchAppt!.professionalId) || null;

        setFoundAppointment({
          appointment: matchAppt,
          business: matchedBiz,
          service: srv,
          professional: prof,
        });
      } else {
        setNotFoundMessage(
          `No encontramos ningún turno registrado con "${query}". Verifica el código recibido por WhatsApp (ej. TD-4821) o tu número de teléfono.`
        );
      }
    } catch (err) {
      console.error(err);
      setNotFoundMessage('Ocurrió un error al buscar el turno. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelAppointment = async () => {
    if (!foundAppointment) return;
    const confirmCancel = window.confirm(
      '¿Estás seguro de que deseas cancelar este turno? Esta acción no se puede deshacer.'
    );
    if (!confirmCancel) return;

    try {
      setLoading(true);
      await api.updateAppointmentStatus(
        foundAppointment.appointment.id,
        'cancelled',
        'Cancelado por el paciente desde el portal'
      );
      setCancelSuccess(true);
      setFoundAppointment((prev) =>
        prev
          ? {
              ...prev,
              appointment: { ...prev.appointment, status: 'cancelled' },
            }
          : null
      );
    } catch (err) {
      console.error(err);
      alert('No se pudo cancelar el turno. Por favor contacta directamente al negocio.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Confirmado
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <Clock className="w-3.5 h-3.5 text-amber-600" /> Pendiente de Seña
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" /> Atendido / Completado
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
            <Ban className="w-3.5 h-3.5 text-rose-600" /> Cancelado
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-800">
            {status}
          </span>
        );
    }
  };

  const handleOpenGoogleCalendar = () => {
    if (!foundAppointment) return;
    const { appointment, business, service, professional } = foundAppointment;
    const serviceTitle = service?.name || 'Turno Agendado';
    const profTitle = professional?.name || 'Especialista';
    const title = encodeURIComponent(`${serviceTitle} en ${business?.name || 'TurnosDisponibles'}`);
    const details = encodeURIComponent(
      `Turno con ${profTitle}.\nCódigo de reserva: ${appointment.bookingCode || appointment.id}\nDirección: ${
        business?.address || ''
      }\nTeléfono: ${business?.phone || ''}`
    );
    const location = encodeURIComponent(business?.address || '');

    const startStr = `${appointment.date.replace(/-/g, '')}T${appointment.startTime.replace(':', '')}00`;
    const endStr = `${appointment.date.replace(/-/g, '')}T${appointment.endTime.replace(':', '')}00`;

    const gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startStr}/${endStr}&details=${details}&location=${location}`;
    window.open(gcalUrl, '_blank');
  };

  const handleContactWhatsApp = () => {
    if (!foundAppointment?.business?.whatsappNumber) return;
    const { appointment, business, service } = foundAppointment;
    const cleanPhone = business.whatsappNumber.replace(/\D/g, '');
    const serviceTitle = service?.name || 'mi tratamiento';
    const message = encodeURIComponent(
      `Hola ${business.name}, tengo una consulta sobre mi turno (${appointment.bookingCode || appointment.id}) para ${serviceTitle} del ${appointment.date} a las ${appointment.startTime} hs.`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
  };

  return (
    <div
      id="modal-booking-lookup"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-300">
              <Search className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">Consultar mi Turno</h3>
              <p className="text-xs text-slate-300">
                Ingresa tu código de reserva (ej. TD-4821) o tu número de teléfono
              </p>
            </div>
          </div>
          <button
            id="btn-close-booking-lookup"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          <form onSubmit={handleSearch} className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-400" />
              <input
                id="input-lookup-code"
                type="text"
                placeholder="Código de turno (ej. TD-4821) o celular..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-28 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all font-medium"
              />
              <button
                id="btn-submit-lookup"
                type="submit"
                disabled={loading || !searchQuery.trim()}
                className="absolute right-1.5 top-1.5 bottom-1.5 px-4 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
              >
                {loading ? 'Buscando...' : 'Buscar'}
              </button>
            </div>
          </form>

          {/* Result State */}
          {foundAppointment && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4 animate-in fade-in duration-300">
              {/* Header card */}
              <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-200">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-bold text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded border border-teal-200">
                      {foundAppointment.appointment.bookingCode || 'TURNO'}
                    </span>
                    {getStatusBadge(foundAppointment.appointment.status)}
                  </div>
                  <h4 className="text-base font-bold text-slate-900">
                    {foundAppointment.service?.name || 'Servicio Agendado'}
                  </h4>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                    <Building2 className="w-3.5 h-3.5" />
                    {foundAppointment.business?.name || 'Centro Profesional'}
                  </p>
                </div>
                {foundAppointment.business?.logoUrl && (
                  <img
                    src={foundAppointment.business.logoUrl}
                    alt={foundAppointment.business.name}
                    className="w-12 h-12 rounded-xl object-cover border border-slate-200 shadow-sm"
                  />
                )}
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-white rounded-xl border border-slate-100 flex items-center gap-2.5">
                  <Calendar className="w-4 h-4 text-teal-600 flex-shrink-0" />
                  <div>
                    <span className="text-slate-400 block text-[10px]">Fecha</span>
                    <span className="font-semibold text-slate-800">
                      {formatDateSpanish(foundAppointment.appointment.date)}
                    </span>
                  </div>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-100 flex items-center gap-2.5">
                  <Clock className="w-4 h-4 text-teal-600 flex-shrink-0" />
                  <div>
                    <span className="text-slate-400 block text-[10px]">Horario</span>
                    <span className="font-semibold text-slate-800">
                      {foundAppointment.appointment.startTime} hs a {foundAppointment.appointment.endTime} hs
                    </span>
                  </div>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-100 flex items-center gap-2.5">
                  <User className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                  <div>
                    <span className="text-slate-400 block text-[10px]">Especialista</span>
                    <span className="font-semibold text-slate-800">
                      {foundAppointment.professional?.name || 'Profesional'}
                    </span>
                  </div>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-100 flex items-center gap-2.5">
                  <DollarSign className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <div>
                    <span className="text-slate-400 block text-[10px]">Valor / Seña</span>
                    <span className="font-semibold text-slate-800">
                      {foundAppointment.service ? `$${foundAppointment.service.price.toLocaleString('es-AR')}` : '-'}
                      {foundAppointment.appointment.depositAmount
                        ? ` (Seña: $${foundAppointment.appointment.depositAmount.toLocaleString('es-AR')})`
                        : ''}
                    </span>
                  </div>
                </div>
              </div>

              {/* Location info */}
              {foundAppointment.business?.address && (
                <div className="text-xs bg-white p-3 rounded-xl border border-slate-100 text-slate-600 flex items-start gap-2">
                  <span className="text-teal-600 font-bold">📍 Dirección:</span>
                  <span>{foundAppointment.business.address}</span>
                </div>
              )}

              {/* Actions */}
              <div className="pt-2 flex flex-col sm:flex-row gap-2">
                {foundAppointment.business?.whatsappNumber && (
                  <button
                    id="btn-lookup-whatsapp"
                    type="button"
                    onClick={handleContactWhatsApp}
                    className="flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition-colors"
                  >
                    <MessageCircle className="w-4 h-4" /> Contactar por WhatsApp
                  </button>
                )}

                <button
                  id="btn-lookup-gcal"
                  type="button"
                  onClick={handleOpenGoogleCalendar}
                  className="flex-1 py-2.5 px-3 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  <CalendarPlus className="w-4 h-4 text-blue-600" /> Agregar a Google Calendar
                </button>
              </div>

              {foundAppointment.business?.slug && (
                <div className="pt-2 flex items-center justify-between border-t border-slate-200 text-xs">
                  <button
                    id="btn-lookup-view-center"
                    type="button"
                    onClick={() => {
                      onClose();
                      onGoToBooking(foundAppointment.business!.slug);
                    }}
                    className="text-teal-600 hover:text-teal-700 font-semibold flex items-center gap-1"
                  >
                    Ver página de reservas de este centro <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  {foundAppointment.appointment.status !== 'cancelled' && (
                    <button
                      id="btn-lookup-cancel"
                      type="button"
                      onClick={handleCancelAppointment}
                      disabled={loading}
                      className="text-rose-600 hover:text-rose-700 text-xs hover:underline"
                    >
                      Cancelar mi turno
                    </button>
                  )}
                </div>
              )}

              {cancelSuccess && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  El turno ha sido cancelado con éxito. El horario ha sido liberado en la agenda.
                </div>
              )}
            </div>
          )}

          {/* Not Found State */}
          {searched && notFoundMessage && (
            <div className="p-5 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 text-xs space-y-3">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm text-amber-900">No encontramos tu turno</p>
                  <p className="mt-1 text-amber-800 leading-relaxed">{notFoundMessage}</p>
                </div>
              </div>
              <div className="pt-2 border-t border-amber-200/60 flex items-center justify-between text-xs">
                <span className="text-amber-700">¿Necesitas ayuda?</span>
                <a
                  href="https://wa.me/5492474478646?text=Hola,%20necesito%20consultar%20el%20estado%20de%20mi%20turno"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-teal-800 hover:underline flex items-center gap-1"
                >
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-600" /> Soporte por WhatsApp
                </a>
              </div>
            </div>
          )}

          {/* Quick tips info & Patient account explanation */}
          {!searched && (
            <div className="space-y-3">
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-xs text-slate-500 space-y-2">
                <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-500" /> ¿Dónde encuentro mi código?
                </span>
                <p>
                  Al confirmar tu reserva, recibiste un mensaje automático con un código único (ejemplo: <strong>TD-4821</strong>). También puedes buscar ingresando el mismo número de WhatsApp con el que hiciste la reserva.
                </p>
              </div>

              <div className="bg-teal-50/70 border border-teal-200/80 rounded-2xl p-4 text-xs text-teal-900 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="p-1 rounded-lg bg-teal-600 text-white font-bold text-[10px]">
                    NUEVO
                  </span>
                  <span className="font-bold text-teal-950">¿Por qué registrarte como Paciente?</span>
                </div>
                <p className="text-[11px] text-teal-800 leading-relaxed">
                  No es obligatorio (puedes reservar siempre como invitado), pero con tu <strong>Cuenta de Paciente gratuita</strong> podrás ver el historial completo de todas tus citas, reprogramar en 1 clic y reservar al instante sin volver a escribir tus datos.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            id="btn-close-modal-footer"
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
