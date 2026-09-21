import { useState, useEffect } from 'react';
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
import { getSaasConfig, buildWhatsAppPlanLink, SaasPlanConfig } from '../../lib/saasConfig';

interface PortalPricingProps {
  onOpenAuthModal?: () => void;
}

export function PortalPricing({ onOpenAuthModal }: PortalPricingProps) {
  const [config, setConfig] = useState<SaasPlanConfig>(getSaasConfig);

  useEffect(() => {
    const handleUpdate = () => setConfig(getSaasConfig());
    window.addEventListener('saas-config-updated', handleUpdate);
    return () => window.removeEventListener('saas-config-updated', handleUpdate);
  }, []);

  const freeLink = buildWhatsAppPlanLink(config.whatsappNumber, config.freePlan.whatsappMessage);
  const proLink = buildWhatsAppPlanLink(config.whatsappNumber, config.proPlan.whatsappMessage);
  const aiLink = buildWhatsAppPlanLink(config.whatsappNumber, config.aiPlan.whatsappMessage);
  const whiteLabelLink = buildWhatsAppPlanLink(
    config.whatsappNumber,
    config.whiteLabelPlan?.whatsappMessage ||
      'Hola, me interesa conocer la propuesta de Marca Blanca / SaaS Partner para comercializar la plataforma con mi propia marca en TurnosDisponibles.online'
  );

  const plans = [
    {
      id: 'free',
      name: config.freePlan.name || 'Prueba Pro 15 Días • Sin Tarjeta',
      badge: '15 Días Pro Gratis • Luego Plan Free',
      price: config.freePlan.price || '$0',
      currency: 'ARS',
      period: config.freePlan.pricePeriod || '15 días Pro gratis • luego Plan Free hasta 20 turnos/mes',
      popular: false,
      description:
        'Prueba 15 días con todas las funciones Pro sin tarjeta. Luego mantienes tu Plan Free hasta 20 turnos/mes o activas Pro Ilimitado.',
      features: [
        '15 días de acceso total al Plan Pro sin tarjeta',
        'Turnos ilimitados durante los primeros 15 días',
        'Cobro de señas automatizado (Mercado Pago + CBU)',
        'Recordatorios automáticos por WhatsApp con código',
        'Sincronización con Google Calendar',
        'Luego de 15 días: Plan Base Free para siempre',
        'Hasta 20 turnos mensuales en Plan Free',
        '1 Profesional / Especialista',
        'Confirmación directa de reservas por WhatsApp',
        'Tu cuenta nunca se elimina ni se pierden datos',
      ],
      ctaText: 'Probar 15 Días Gratis',
      ctaLink: freeLink,
      ctaStyle:
        'bg-teal-500 hover:bg-teal-400 text-slate-950 font-extrabold shadow-lg shadow-teal-500/20',
    },
    {
      id: 'pro',
      name: config.proPlan.name || 'Plan Pro Ilimitado',
      badge: 'El más elegido • Centros & Consultorios',
      price: config.proPlan.price || '$24.900',
      currency: 'ARS',
      period: config.proPlan.pricePeriod || 'al mes / turnos ilimitados',
      popular: true,
      description:
        'Turnos ilimitados, hasta 5 profesionales, cobro de señas integrado por Mercado Pago + CBU/Alias y soporte prioritario.',
      features: [
        'Turnos Ilimitados mensuales (sin tope)',
        'Hasta 5 Profesionales con agendas separadas',
        'Cobro de señas integrado (Mercado Pago + CBU/Alias)',
        'Sincronización con Google Calendar e iCal',
        'Cálculo de saldo restante a cobrar en el local',
        'Recordatorios automáticos por WhatsApp con código',
        'Panel de estadísticas y base de datos de pacientes',
        'Bloqueo rápido de días libres e imprevistos',
        'Soporte prioritario y atención directa',
      ],
      ctaText: 'Elegir Plan Pro Ilimitado',
      ctaLink: proLink,
      ctaStyle:
        'bg-gradient-to-r from-teal-400 to-emerald-400 hover:from-teal-300 hover:to-emerald-300 text-slate-950 font-bold shadow-lg shadow-teal-500/25',
    },
    {
      id: 'ai-experience',
      name: config.aiPlan.name,
      badge: 'Clínicas, Spas Grandes & Franquicias',
      price: config.aiPlan.price,
      currency: 'ARS',
      period: config.aiPlan.pricePeriod,
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
      ctaLink: aiLink,
      ctaStyle:
        'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-bold shadow-lg shadow-indigo-500/25',
    },
    {
      id: 'white-label',
      name: config.whiteLabelPlan?.name || 'Plan Marca Blanca / SaaS Partner',
      badge: config.whiteLabelPlan?.badge || 'Agencias, Redes & Franquicias',
      price: config.whiteLabelPlan?.price || 'A Medida',
      currency: '',
      period: config.whiteLabelPlan?.pricePeriod || 'cotización personalizada',
      popular: false,
      description:
        'Ofrece la plataforma completa con tu propio logo, colores y dominio. Ideal para agencias, consultoras y grandes franquicias.',
      features: [
        '100% Marca Blanca: tu logo, nombre y paleta',
        'Dominio y SSL propio (ej: turnos.tudominio.com)',
        'Sin atribución "Powered by TurnosDisponibles"',
        'Panel Multi-Negocio / Sub-Cuentas independientes',
        'Integración personalizada de pasarelas de pago y WAPI',
        'Condiciones comerciales flexibles por volumen',
        'Actualizaciones continuas y soporte directo con fundadores',
      ],
      ctaText: config.whiteLabelPlan?.ctaText || 'Comunícate con nuestro equipo',
      ctaLink: whiteLabelLink,
      ctaStyle:
        'bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-extrabold shadow-lg shadow-amber-500/20',
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

          {/* Banner explicativo de inicio con Prueba PRO 15 días */}
          <div className="pt-2">
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-teal-950/80 via-slate-900 to-indigo-950/80 border border-teal-500/40 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4 text-left">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-teal-400 text-slate-950 flex items-center justify-center font-extrabold shrink-0 shadow-md">
                  <Zap className="w-5 h-5 fill-slate-950" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-extrabold text-white">
                      Estrategia Híbrida: Prueba Pro 15 Días • Sin Tarjeta + Plan Base Free
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-teal-400 text-slate-950 uppercase tracking-wider">
                      Sin Tarjeta
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Comienza con 15 días de funciones Pro (turnos ilimitados, señas MP/CBU y Google Calendar). Si luego no contratas Pro, tu cuenta <strong>no se elimina</strong>: pasas al Plan Free de hasta 20 turnos/mes.
                  </p>
                </div>
              </div>
              {onOpenAuthModal && (
                <button
                  type="button"
                  onClick={onOpenAuthModal}
                  className="px-4 py-2.5 rounded-xl bg-teal-400 hover:bg-teal-300 text-slate-950 font-extrabold text-xs transition shadow-md whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Probar 15 Días Gratis
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 lg:gap-8 items-stretch max-w-7xl mx-auto">
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
              <div className="pt-8 mt-auto space-y-2">
                {plan.id === 'free' && onOpenAuthModal ? (
                  <button
                    id={`btn-plan-${plan.id}`}
                    type="button"
                    onClick={onOpenAuthModal}
                    className={`w-full py-3.5 px-4 rounded-2xl text-xs sm:text-sm text-center font-extrabold flex items-center justify-center gap-2 transition-all hover:scale-[1.02] cursor-pointer ${plan.ctaStyle}`}
                  >
                    <Sparkles className="w-4 h-4 text-slate-950" />
                    <span>{plan.ctaText}</span>
                  </button>
                ) : (
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
                )}
                {plan.id === 'free' && onOpenAuthModal && (
                  <a
                    href={plan.ctaLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-1 text-center text-[11px] text-slate-400 hover:text-teal-300 flex items-center justify-center gap-1 transition"
                  >
                    <MessageCircle className="w-3 h-3 text-emerald-400" />
                    <span>Consultar por WhatsApp</span>
                  </a>
                )}
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
            href={buildWhatsAppPlanLink(config.whatsappNumber, 'Hola, tengo consultas sobre los planes de TurnosDisponibles')}
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
