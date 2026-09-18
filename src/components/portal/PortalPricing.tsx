import {
  Check,
  Zap,
  Sparkles,
  Bot,
  ShieldCheck,
  HelpCircle,
  MessageCircle,
  Building2,
  Calendar,
  CreditCard,
  Crown,
} from 'lucide-react';

interface PortalPricingProps {
  onOpenAuthModal?: () => void;
}

export function PortalPricing({ onOpenAuthModal }: PortalPricingProps) {
  const plans = [
    {
      id: 'free',
      name: 'Plan Free / Inicial',
      badge: 'Para 1 Profesional Independiente',
      price: '$0',
      period: 'Gratis para siempre',
      popular: false,
      description: 'Ideal para manicuras, barberos, cosmiatras o profesionales independientes que dan sus primeros pasos.',
      features: [
        'Hasta 60 turnos al mes',
        '1 Profesional / Especialista',
        'Página de reservas personalizada básica',
        'Confirmación directa vía WhatsApp',
        'Cobro de señas manual por Alias / CBU',
        'Horarios y servicios configurables',
        'Soporte por email y comunidad',
      ],
      ctaText: 'Comenzar Gratis',
      ctaLink: 'https://wa.me/5492474478646?text=Hola,%20quiero%20activar%20el%20Plan%20Gratis',
      ctaStyle: 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700',
    },
    {
      id: 'pro',
      name: 'Plan Pro',
      badge: 'El más elegido • Centros & Consultorios',
      price: '$24.900',
      currency: 'ARS',
      period: 'al mes / facturación transparente',
      popular: true,
      description: 'La solución completa para estéticas, consultorios médicos y salones que buscan automatización profesional.',
      features: [
        'Turnos Ilimitados mensuales',
        'Hasta 5 Profesionales con agendas separadas',
        'Horarios y vacaciones individuales por especialista',
        'Cobro de señas integrado (Mercado Pago + CBU)',
        'Cálculo de saldo restante en el local',
        'Recordatorios automáticos por WhatsApp con código',
        'Panel de estadísticas y base de datos de pacientes',
        'Bloqueo rápido de días libres e imprevistos',
      ],
      ctaText: 'Elegir Plan Pro',
      ctaLink: 'https://wa.me/5492474478646?text=Hola,%20quiero%20activar%20el%20Plan%20Pro',
      ctaStyle:
        'bg-gradient-to-r from-teal-400 to-emerald-400 hover:from-teal-300 hover:to-emerald-300 text-slate-950 font-bold shadow-lg shadow-teal-500/25',
    },
    {
      id: 'ai-experience',
      name: 'Plan Experiencia AI',
      badge: 'Clínicas, Spas Grandes & Franquicias',
      price: '$49.900',
      currency: 'ARS',
      period: 'al mes / máxima automatización',
      popular: false,
      description: 'Potencia total con Inteligencia Artificial, conexión WAPI desatendida y personalización corporativa.',
      features: [
        'Todo lo incluido en el Plan Pro',
        'Profesionales & Especialistas Ilimitados',
        'Asistente Inteligente con IA (Bot conversacional)',
        'Sugerencia de turnos por cancelaciones y huecos',
        'Integración con Webhooks / WAPI (Flaxxa / Flowomatic)',
        'Dominio propio o subdominio personalizado',
        'Comprobantes en PDF personalizados con tu logo',
        'Soporte prioritario 24/7 y puesta en marcha guiada',
      ],
      ctaText: 'Solicitar Plan Experiencia AI',
      ctaLink: 'https://wa.me/5492474478646?text=Hola,%20quiero%20activar%20el%20Plan%20ExperienciaAI',
      ctaStyle:
        'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-bold shadow-lg shadow-indigo-500/25',
    },
  ];

  return (
    <section id="precios" className="py-16 sm:py-24 bg-slate-950 text-slate-100 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-teal-950 border border-teal-800/60 text-teal-400 text-xs font-semibold">
            <CreditCard className="w-3.5 h-3.5" /> Planes y Precios Claros
          </div>
          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight">
            Invierte en orden, recupera tu tiempo
          </h2>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Sin contratos de permanencia ni comisiones ocultas sobre tus turnos. Activa tu plan y empieza a recibir reservas hoy mismo.
          </p>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch max-w-7xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.id}
              id={`pricing-card-${plan.id}`}
              className={`rounded-3xl p-6 sm:p-8 flex flex-col justify-between transition-all duration-300 relative ${
                plan.popular
                  ? 'bg-slate-900 border-2 border-teal-400 shadow-2xl shadow-teal-950/60 lg:-translate-y-2'
                  : 'bg-slate-900/80 border border-slate-800 shadow-xl'
              }`}
            >
              {/* Popular Ribbon */}
              {plan.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-teal-400 to-emerald-400 text-slate-950 text-[11px] font-extrabold uppercase tracking-wider py-1 px-4 rounded-full shadow-md flex items-center gap-1">
                  <Crown className="w-3 h-3" /> Recomendado
                </div>
              )}

              {/* Plan Header */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-teal-400 uppercase tracking-wider block">
                    {plan.badge}
                  </span>
                  <h3 className="text-xl sm:text-2xl font-black text-white">{plan.name}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed min-h-[36px]">
                    {plan.description}
                  </p>
                </div>

                {/* Price Display */}
                <div className="py-4 border-y border-slate-800/80">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl sm:text-4xl font-black text-white">{plan.price}</span>
                    {plan.currency && (
                      <span className="text-xs font-bold text-slate-400">{plan.currency}</span>
                    )}
                  </div>
                  <span className="text-xs text-slate-400 block mt-0.5">{plan.period}</span>
                </div>

                {/* Features List */}
                <div className="space-y-3 pt-2">
                  <span className="text-xs font-bold text-slate-300 block uppercase tracking-wider">
                    ¿Qué incluye?
                  </span>
                  <ul className="space-y-2.5 text-xs text-slate-300">
                    {plan.features.map((feat, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <Check className="w-4 h-4 text-teal-400 flex-shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-8 mt-auto">
                <a
                  id={`btn-plan-${plan.id}`}
                  href={plan.ctaLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`w-full py-3.5 px-4 rounded-2xl text-xs sm:text-sm text-center font-bold flex items-center justify-center gap-2 transition-all hover:scale-[1.02] ${plan.ctaStyle}`}
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>{plan.ctaText}</span>
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* Guarantees and Direct Consultation */}
        <div className="mt-16 max-w-4xl mx-auto bg-slate-900/60 border border-slate-800 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-400 flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-white">¿Tienes dudas sobre qué plan elegir?</h4>
              <p className="text-xs text-slate-400">
                Habla con un especialista para analizar la cantidad de profesionales y volumen de turnos de tu centro.
              </p>
            </div>
          </div>

          <a
            id="btn-pricing-consult-wa"
            href="https://wa.me/5492474478646?text=Hola,%20tengo%20consultas%20sobre%20los%20planes%20de%20TurnosDisponibles"
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-teal-300 border border-teal-800/40 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-2"
          >
            <MessageCircle className="w-4 h-4 text-emerald-400" /> Consultar por WhatsApp
          </a>
        </div>
      </div>
    </section>
  );
}
