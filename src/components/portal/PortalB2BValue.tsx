import { useState } from 'react';
import {
  ShieldAlert,
  Clock,
  MessageSquare,
  Sparkles,
  CheckCircle2,
  XCircle,
  TrendingUp,
  ArrowRight,
  DollarSign,
  Calculator,
  Calendar,
  Check,
  Zap,
} from 'lucide-react';

interface PortalB2BValueProps {
  onOpenPricing: () => void;
  onOpenAuthModal: () => void;
}

export function PortalB2BValue({ onOpenPricing, onOpenAuthModal }: PortalB2BValueProps) {
  const [weeklyAppointments, setWeeklyAppointments] = useState<number>(35);
  const [averageTicket, setAverageTicket] = useState<number>(25000);
  const [comparisonTab, setComparisonTab] = useState<'turnos' | 'paper'>('turnos');

  // Calculations for ROI calculator
  // Average no-show rate without deposits: 20%
  // Average no-show rate with TurnosDisponibles deposit system: 1%
  const noShowsWithoutDeposit = Math.round(weeklyAppointments * 4 * 0.2);
  const monthlyLostRevenue = noShowsWithoutDeposit * averageTicket;
  const recoveredRevenue = Math.round(monthlyLostRevenue * 0.95);
  const hoursSavedPerMonth = Math.round(weeklyAppointments * 4 * 0.12); // ~7 mins saved per booking coordination

  const painPoints = [
    {
      icon: DollarSign,
      title: '1. Cero Ausentismos & "Turnos Plantados"',
      subtitle: 'Cobro de señas automáticas por Mercado Pago y Transferencia (CBU/Alias)',
      description:
        'Cada horario vacío es dinero perdido que no vuelve. Con nuestro motor de señas, el cliente abona una reserva fija o porcentual al agendar. Las inasistencias caen del 20% a menos del 1%.',
      metric: '99% Asistencia asegurada',
      badgeColor: 'bg-emerald-950 text-emerald-300 border-emerald-800/60',
      iconColor: 'text-emerald-400 bg-emerald-500/10',
    },
    {
      icon: Clock,
      title: '2. Ahorra 10 Horas Semanales de Mensajes',
      subtitle: 'Tus clientes eligen su horario disponible solos en 60 segundos',
      description:
        'Olvídate de responder 40 mensajes de "¿Qué turnos te quedan para el viernes?". Compartes tu enlace en Instagram o WhatsApp y tus clientes eligen al profesional y horario libre sin fricción.',
      metric: '+40 horas libres al mes',
      badgeColor: 'bg-teal-950 text-teal-300 border-teal-800/60',
      iconColor: 'text-teal-400 bg-teal-500/10',
    },
    {
      icon: MessageSquare,
      title: '3. WhatsApp Automatizado con Códigos',
      subtitle: 'Confirmaciones, recordatorios 24h antes y comprobantes con un solo clic',
      description:
        'Cada turno genera un código único de reserva (ej. TD-4821) y envía un mensaje formateado con dirección, mapa, Google Calendar y datos del especialista sin que tengas que redactar nada a mano.',
      metric: '100% Mensajes automáticos',
      badgeColor: 'bg-indigo-950 text-indigo-300 border-indigo-800/60',
      iconColor: 'text-indigo-400 bg-indigo-500/10',
    },
  ];

  const comparisonRows = [
    {
      feature: 'Recepción de turnos',
      paper: 'Llamadas interrumpidas y decenas de audios en WhatsApp a cualquier hora de la noche.',
      platform: 'Página de reservas abierta 24/7 donde el paciente ve los huecos libres y reserva solo.',
    },
    {
      feature: 'Control de inasistencias',
      paper: 'Sin garantía. Si el cliente se olvida o no asiste, pierdes la hora de trabajo.',
      platform: 'Seña previa por Mercado Pago o Transferencia CBU antes de bloquear el turno.',
    },
    {
      feature: 'Recordatorios',
      paper: 'Copiar y pegar mensajes uno por uno cada tarde para recordar los turnos de mañana.',
      platform: 'Mensajes y recordatorios automáticos con código, mapa y botón para reprogramar.',
    },
    {
      feature: 'Múltiples especialistas',
      paper: 'Libretas separadas o planillas de Excel que se desorganizan y provocan solapamientos.',
      platform: 'Agendas individuales independientes con horarios y servicios por profesional.',
    },
    {
      feature: 'Bloqueo de imprevistos',
      paper: 'Tachar con corrector en papel y llamar a los pacientes para cancelar.',
      platform: 'Bloqueo de días u horas libres con 1 clic desde tu celular en tiempo real.',
    },
  ];

  return (
    <section
      id="b2b-ventajas"
      className="py-16 sm:py-24 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100 border-y border-slate-800 relative overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-teal-950 border border-teal-800/60 text-teal-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" /> Para Centros de Estética, Consultorios & Spas
          </div>
          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight">
            ¿Tienes un centro de estética o consultorio?{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-300">
              Digitaliza tu agenda y elimina los turnos plantados
            </span>
          </h2>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Diseñado especialmente para profesionales de la salud, estética, odontología y belleza en Argentina que quieren ordenar su negocio y cobrar con puntualidad.
          </p>
        </div>

        {/* 3 Key Pain Points Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {painPoints.map((point, idx) => {
            const Icon = point.icon;
            return (
              <div
                key={idx}
                className="bg-slate-900/90 border border-slate-800 hover:border-teal-500/40 rounded-3xl p-6 sm:p-7 shadow-xl hover:shadow-2xl transition-all duration-300 flex flex-col justify-between space-y-5 group"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div
                      className={`w-12 h-12 rounded-2xl ${point.iconColor} flex items-center justify-center`}
                    >
                      <Icon className="w-6 h-6" />
                    </div>
                    <span
                      className={`text-[11px] font-bold px-3 py-1 rounded-full border ${point.badgeColor}`}
                    >
                      {point.metric}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-white group-hover:text-teal-300 transition-colors">
                      {point.title}
                    </h3>
                    <p className="text-xs font-medium text-teal-400 mt-1">{point.subtitle}</p>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
                    {point.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex items-center text-xs font-semibold text-teal-400 group-hover:text-teal-300 transition-colors">
                  <span>Implementación en 5 minutos</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Interactive Comparison: Agenda Tradicional vs. TurnosDisponibles */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl mb-16">
          <div className="text-center max-w-2xl mx-auto mb-8 space-y-2">
            <h3 className="text-xl sm:text-3xl font-extrabold text-white">
              Comparativa Visual: Método Tradicional vs. TurnosDisponibles.online
            </h3>
            <p className="text-xs sm:text-sm text-slate-400">
              Descubre por qué cientos de profesionales dejaron el cuaderno y las planillas
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="py-4 px-4 text-xs font-bold uppercase tracking-wider text-slate-400 w-1/4">
                    Aspecto
                  </th>
                  <th className="py-4 px-4 text-xs font-bold uppercase tracking-wider text-rose-400 bg-rose-950/20 rounded-t-xl w-3/8">
                    <span className="flex items-center gap-1.5">
                      <XCircle className="w-4 h-4" /> Agenda en Papel / WhatsApp Manual
                    </span>
                  </th>
                  <th className="py-4 px-4 text-xs font-bold uppercase tracking-wider text-teal-400 bg-teal-950/40 rounded-t-xl w-3/8">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" /> Con TurnosDisponibles.online
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs sm:text-sm">
                {comparisonRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-4 px-4 font-bold text-white align-top">{row.feature}</td>
                    <td className="py-4 px-4 text-slate-300 bg-rose-950/10 align-top leading-relaxed">
                      {row.paper}
                    </td>
                    <td className="py-4 px-4 text-teal-100 bg-teal-950/20 align-top leading-relaxed font-medium">
                      <span className="flex items-start gap-1.5">
                        <Check className="w-4 h-4 text-teal-400 flex-shrink-0 mt-0.5" />
                        <span>{row.platform}</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Interactive ROI / Savings Calculator */}
        <div className="bg-gradient-to-br from-teal-950/80 via-slate-900 to-slate-950 border border-teal-800/50 rounded-3xl p-6 sm:p-10 shadow-2xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Calculator Inputs */}
            <div className="lg:col-span-6 space-y-6">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-900/60 border border-teal-700/60 text-teal-300 text-xs font-semibold">
                  <Calculator className="w-3.5 h-3.5" /> Calculadora de Recuperación de Ingresos
                </div>
                <h3 className="text-xl sm:text-3xl font-extrabold text-white">
                  Calcula cuánto dinero y horas recuperarás con señas
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Ajusta tus turnos semanales y el valor promedio para simular tu impacto real.
                </p>
              </div>

              {/* Slider 1: Turnos Semanales */}
              <div className="space-y-2 bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-300 font-semibold">Turnos atendidos por semana:</span>
                  <span className="text-teal-400 font-bold text-base">{weeklyAppointments} turnos</span>
                </div>
                <input
                  id="range-weekly-appts"
                  type="range"
                  min="5"
                  max="150"
                  step="5"
                  value={weeklyAppointments}
                  onChange={(e) => setWeeklyAppointments(Number(e.target.value))}
                  className="w-full accent-teal-400 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>5 turnos</span>
                  <span>75 turnos</span>
                  <span>150 turnos</span>
                </div>
              </div>

              {/* Slider 2: Valor promedio */}
              <div className="space-y-2 bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-300 font-semibold">Valor promedio por turno:</span>
                  <span className="text-emerald-400 font-bold text-base">
                    ${averageTicket.toLocaleString('es-AR')} ARS
                  </span>
                </div>
                <input
                  id="range-average-ticket"
                  type="range"
                  min="5000"
                  max="100000"
                  step="5000"
                  value={averageTicket}
                  onChange={(e) => setAverageTicket(Number(e.target.value))}
                  className="w-full accent-emerald-400 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>$5.000</span>
                  <span>$50.000</span>
                  <span>$100.000</span>
                </div>
              </div>
            </div>

            {/* Calculator Output Cards */}
            <div className="lg:col-span-6 bg-slate-950/80 border border-teal-700/40 rounded-2xl p-6 sm:p-8 space-y-6">
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-900/50">
                  <span className="text-xs text-rose-300 block font-medium">
                    Pérdidas estimadas por inasistencias sin señas (20% ausentismo):
                  </span>
                  <span className="text-2xl font-black text-rose-400">
                    -${monthlyLostRevenue.toLocaleString('es-AR')} ARS / mes
                  </span>
                  <span className="text-[11px] text-rose-300/80 block mt-0.5">
                    ({noShowsWithoutDeposit} turnos plantados al mes)
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/60">
                  <span className="text-xs text-emerald-300 block font-medium">
                    Ingresos rescatados con TurnosDisponibles.online:
                  </span>
                  <span className="text-3xl font-black text-emerald-300">
                    +${recoveredRevenue.toLocaleString('es-AR')} ARS / mes
                  </span>
                  <span className="text-[11px] text-emerald-200/80 block mt-0.5">
                    + {hoursSavedPerMonth} horas de coordinación recuperadas cada mes
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  id="btn-calc-view-plans"
                  type="button"
                  onClick={onOpenPricing}
                  className="flex-1 py-3 px-4 bg-gradient-to-r from-teal-400 to-emerald-400 hover:from-teal-300 hover:to-emerald-300 text-slate-950 font-bold text-xs sm:text-sm rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  <Zap className="w-4 h-4" /> Ver Planes y Precios
                </button>

                <button
                  id="btn-calc-start-free"
                  type="button"
                  onClick={onOpenAuthModal}
                  className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs sm:text-sm rounded-xl border border-slate-700 transition-colors"
                >
                  Crear Cuenta Gratis
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
