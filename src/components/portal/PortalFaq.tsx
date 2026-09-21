import { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp, MessageCircle, Sparkles, ShieldCheck } from 'lucide-react';

export function PortalFaq() {
  const [activeTab, setActiveTab] = useState<'clients' | 'businesses'>('clients');
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const clientFaqs = [
    {
      q: '¿Cómo hago una reserva en cualquiera de los negocios?',
      a: 'Simplemente explora el directorio, elige el centro o especialista de tu preferencia y haz clic en "Reservar Turno". Selecciona el tratamiento, el profesional y el horario disponible que mejor te convenga. Completas tus datos en 1 minuto y recibes la confirmación en tu WhatsApp al instante.',
    },
    {
      q: '¿Tengo que descargar alguna aplicación para reservar?',
      a: 'No, TurnosDisponibles.online funciona 100% en la web desde cualquier celular, tablet o computadora sin necesidad de descargar nada ni crear contraseñas engorrosas.',
    },
    {
      q: '¿Cómo funciona el cobro de la seña si el negocio lo solicita?',
      a: 'Si el centro requiere seña previa para confirmar el box, verás el monto exacto antes de finalizar. Podrás abonar directamente mediante Mercado Pago o Transferencia bancaria (Alias / CBU). Una vez enviada, el saldo restante se abona el día de tu turno en el local.',
    },
    {
      q: '¿Cómo consulto o reprogramo un turno que ya reservé?',
      a: 'Haz clic en el botón "Consultar mi Turno" en la barra superior e ingresa tu código de reserva (ej. TD-4821) o tu número de celular. Podrás ver los detalles de tu cita, agregarla a Google Calendar o contactar al negocio directamente.',
    },
  ];

  const businessFaqs = [
    {
      q: '¿A dónde va el dinero de las señas que cobran mis clientes?',
      a: 'El dinero ingresa 100% directo a tu propia cuenta bancaria o a tu cuenta de Mercado Pago. TurnosDisponibles no retiene tu dinero ni cobra comisión por transacción en los turnos.',
    },
    {
      q: '¿Puedo tener diferentes horarios y profesionales en un mismo centro?',
      a: 'Sí. Cada especialista puede tener sus propios días de atención, franjas horarias matutinas/vespertinas, duración personalizada de servicios y bloqueo individual de días de vacaciones o imprevistos.',
    },
    {
      q: '¿Cómo se envían los recordatorios por WhatsApp a los pacientes?',
      a: 'La plataforma genera mensajes inteligentes con formato profesional y enlaces wa.me que incluyen nombre, servicio, código de turno, dirección y mapa. En el Plan Experiencia AI se conecta además mediante Webhooks / WAPI para automatización 100% desatendida.',
    },
    {
      q: '¿Cómo funciona la prueba gratuita de 15 días y qué pasa al finalizar?',
      a: 'Al dar de alta tu negocio o consultorio comienzas de inmediato con 15 días de prueba gratuita del Plan PRO completo (turnos ilimitados, cobro de señas automatizado con Mercado Pago + CBU/Alias, recordatorios automáticos por WhatsApp y sincronización con Google Calendar) sin ingresar ninguna tarjeta de crédito.\n\n¿Qué pasa al finalizar los 15 días? Tu cuenta NUNCA se elimina ni pierdes tu historial. Si decides no contratar el plan pago, pasas automáticamente al Plan Base Free con tope de hasta 20 turnos mensuales, 1 profesional y confirmación directa por WhatsApp. En cuanto tu negocio crezca y superes los 20 turnos mensuales, el sistema te invitará a ascender al Plan Pro Ilimitado ($24.900/mes) para continuar recibiendo reservas sin interrupciones.',
    },
    {
      q: '¿Qué sucede si supero los 20 turnos mensuales en el Plan Free?',
      a: 'El Plan Base Free está pensado para profesionales que están arrancando y cubre hasta 20 citas al mes a costo $0. Cuando tu demanda crezca y alcances ese tope, el sistema te notificará para pasar al Plan Pro Ilimitado ($24.900/mes), desbloqueando agenda ilimitada, hasta 5 profesionales, cobro de señas por Mercado Pago y soporte prioritario.',
    },
    {
      q: '¿Cómo comparto mi agenda con mis pacientes en Instagram o WhatsApp?',
      a: 'Tu centro recibe un enlace personalizado (ejemplo: https://turnosdisponibles.online/#booking-tu-centro) y un código QR descargable que puedes colocar en tu biografía de Instagram, mensajes de bienvenida y carteles de tu local.',
    },
  ];

  const currentFaqs = activeTab === 'clients' ? clientFaqs : businessFaqs;

  return (
    <section id="faq" className="py-16 sm:py-24 bg-slate-950 text-slate-100 border-t border-slate-800">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center space-y-4 mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-teal-950 border border-teal-800/60 text-teal-400 text-xs font-semibold">
            <HelpCircle className="w-3.5 h-3.5" /> Preguntas Frecuentes
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            Todo lo que necesitas saber
          </h2>
          <p className="text-slate-400 text-sm sm:text-base max-w-xl mx-auto">
            Resolvemos tus dudas tanto si eres un cliente reservando un turno como si eres dueño de un consultorio o estética.
          </p>

          {/* Toggle Tabs */}
          <div className="inline-flex p-1.5 bg-slate-900 border border-slate-800 rounded-2xl mt-4">
            <button
              id="faq-tab-clients"
              onClick={() => {
                setActiveTab('clients');
                setOpenIndex(0);
              }}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'clients'
                  ? 'bg-teal-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Para Pacientes & Clientes
            </button>
            <button
              id="faq-tab-businesses"
              onClick={() => {
                setActiveTab('businesses');
                setOpenIndex(0);
              }}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'businesses'
                  ? 'bg-teal-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Para Profesionales & Dueños
            </button>
          </div>
        </div>

        {/* Accordion List */}
        <div className="space-y-3.5">
          {currentFaqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                id={`faq-item-${activeTab}-${idx}`}
                className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                  isOpen
                    ? 'bg-slate-900/90 border-teal-500/40 shadow-lg'
                    : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                }`}
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 focus:outline-none"
                >
                  <span className="font-bold text-sm sm:text-base text-white">{faq.q}</span>
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform ${
                      isOpen ? 'bg-teal-500/20 text-teal-400 rotate-180' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 text-xs sm:text-sm text-slate-300 leading-relaxed border-t border-slate-800/80 pt-3.5">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Support Banner */}
        <div className="mt-12 bg-slate-900/60 border border-slate-800 rounded-2xl p-6 text-center space-y-3">
          <p className="text-xs text-slate-400">¿Tienes otra pregunta que no figura aquí?</p>
          <a
            id="btn-faq-support-wa"
            href="https://wa.me/5492474478646?text=Hola,%20tengo%20una%20consulta%20sobre%20la%20plataforma%20TurnosDisponibles"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-colors shadow-md"
          >
            <MessageCircle className="w-4 h-4" /> Chatear con Soporte por WhatsApp
          </a>
        </div>
      </div>
    </section>
  );
}
