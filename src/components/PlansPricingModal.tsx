import { useState, useEffect } from 'react';
import { X, Check, Sparkles, Bot, Zap, MessageCircle, Building2, Globe } from 'lucide-react';
import { BusinessPlan } from '../types';
import { getSaasConfig, buildWhatsAppPlanLink, SaasPlanConfig } from '../lib/saasConfig';

interface PlansPricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlan?: BusinessPlan;
  onSelectPlan?: (plan: BusinessPlan) => Promise<void> | void;
  recommendedPlan?: BusinessPlan;
  triggerReason?: string;
}

export function PlansPricingModal({
  isOpen,
  onClose,
  currentPlan,
  onSelectPlan,
  recommendedPlan,
  triggerReason,
}: PlansPricingModalProps) {
  const [config, setConfig] = useState<SaasPlanConfig>(getSaasConfig);
  const [isChangingPlan, setIsChangingPlan] = useState<BusinessPlan | null>(null);

  useEffect(() => {
    const handleUpdate = () => setConfig(getSaasConfig());
    window.addEventListener('saas-config-updated', handleUpdate);
    return () => window.removeEventListener('saas-config-updated', handleUpdate);
  }, []);

  if (!isOpen) return null;

  const handlePlanClick = async (plan: BusinessPlan) => {
    if (!onSelectPlan) return;
    try {
      setIsChangingPlan(plan);
      await onSelectPlan(plan);
    } finally {
      setIsChangingPlan(null);
    }
  };

  const freeLink = buildWhatsAppPlanLink(config.whatsappNumber, config.freePlan.whatsappMessage);
  const proLink = buildWhatsAppPlanLink(config.whatsappNumber, config.proPlan.whatsappMessage);
  const aiLink = buildWhatsAppPlanLink(config.whatsappNumber, config.aiPlan.whatsappMessage);
  const whiteLabelLink = buildWhatsAppPlanLink(
    config.whatsappNumber,
    config.whiteLabelPlan?.whatsappMessage ||
      'Hola, me interesa conocer la propuesta de Marca Blanca / SaaS Partner para comercializar la plataforma con mi propia marca en TurnosDisponibles.online'
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-6xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-teal-50 text-teal-700 border border-teal-200">
                <Sparkles className="w-5 h-5 text-teal-600" />
              </span>
              <h3 className="text-xl font-extrabold text-slate-900">
                Planes & Suscripciones SaaS TurnosDisponibles
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Puedes cambiar de plan en cualquier momento según el crecimiento y necesidad de tu clínica.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Trigger Reason / Contextual intelligent upgrade banner */}
        {triggerReason && (
          <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 flex items-start gap-3 shadow-xs">
            <div className="p-2 rounded-xl bg-amber-500 text-white shrink-0 mt-0.5">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-black text-amber-950 uppercase tracking-wide flex items-center gap-1.5">
                <span>Recomendación Inteligente de Crecimiento</span>
                <span className="text-[10px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full font-bold">
                  Siguiente Escalón
                </span>
              </h4>
              <p className="text-xs text-amber-900 mt-1 leading-relaxed font-medium">
                {triggerReason}
              </p>
            </div>
          </div>
        )}

        {/* Banner informativo de prueba PRO 15 días */}
        <div className="mb-6 p-4 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 text-teal-900">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-teal-500"></span>
            </span>
            <span>
              <strong>Estrategia Progresiva:</strong> Tu cuenta no se bloquea. Puedes operar en <strong>Plan Base Free</strong> (hasta 20 turnos/mes) y ascender al <strong>Plan Pro</strong> o <strong>Experiencia AI</strong> con un solo clic cuando tu volumen de pacientes aumente.
            </span>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* FREE */}
          <div
            className={`bg-slate-50 rounded-3xl p-6 border flex flex-col justify-between relative ${
              currentPlan === 'free'
                ? 'border-slate-800 ring-2 ring-slate-800/20 shadow-sm'
                : recommendedPlan === 'free'
                ? 'border-teal-500 ring-2 ring-teal-400/50'
                : 'border-slate-200'
            }`}
          >
            {recommendedPlan === 'free' && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-black bg-teal-600 text-white uppercase tracking-wider shadow-sm">
                ★ Recomendado
              </span>
            )}
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                {config.freePlan.name}
              </span>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-slate-900">{config.freePlan.price}</span>
                <span className="text-xs text-slate-500 font-normal">/ {config.freePlan.pricePeriod}</span>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Ideal para comenzar sin riesgos. 15 días Pro gratis y luego Plan Free permanente hasta 20 turnos/mes.
              </p>
              <ul className="mt-5 space-y-2.5 text-xs text-slate-700">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>15 días de prueba Pro completa sin tarjeta</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Turnos ilimitados durante la prueba inicial</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Luego: Plan Free permanente (hasta 20 turnos/mes)</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>1 Profesional / Especialista</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Página de reservas personalizada</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Confirmación directa por WhatsApp</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Tu cuenta nunca se elimina</span>
                </li>
              </ul>
            </div>
            <div className="mt-6 space-y-2">
              <button
                type="button"
                disabled={currentPlan === 'free' || isChangingPlan !== null}
                onClick={() => handlePlanClick('free')}
                className={`w-full py-2.5 rounded-xl border text-xs font-bold transition ${
                  currentPlan === 'free'
                    ? 'bg-slate-200 border-slate-300 text-slate-700 cursor-default font-extrabold'
                    : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-800 cursor-pointer shadow-xs'
                }`}
              >
                {isChangingPlan === 'free'
                  ? 'Cambiando a Free...'
                  : currentPlan === 'free'
                  ? '✓ Tu Plan Actual (Free)'
                  : 'Cambiar a Plan Free'}
              </button>
              <a
                href={freeLink}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition"
              >
                <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                <span>Pedir ayuda por WhatsApp</span>
              </a>
            </div>
          </div>

          {/* PRO */}
          <div
            className={`bg-white rounded-3xl p-6 border-2 shadow-xl flex flex-col justify-between relative ${
              recommendedPlan === 'pro'
                ? 'border-emerald-500 ring-4 ring-emerald-500/25'
                : currentPlan === 'pro'
                ? 'border-teal-600 ring-4 ring-teal-500/20'
                : 'border-teal-600'
            }`}
          >
            <span className="absolute -top-3 right-6 px-3 py-0.5 rounded-full text-[10px] font-extrabold bg-teal-600 text-white uppercase tracking-wider shadow-sm">
              {recommendedPlan === 'pro' ? '★ Recomendado Para Ti' : 'Más Elegido'}
            </span>
            <div>
              <div className="flex items-center gap-1.5 text-teal-700 font-bold text-xs uppercase tracking-wider">
                <Zap className="w-3.5 h-3.5 text-teal-600" />
                <span>{config.proPlan.name}</span>
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-slate-900">{config.proPlan.price}</span>
                <span className="text-xs text-slate-600 font-semibold">/ mes</span>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Turnos ilimitados, hasta 5 profesionales, cobro de señas integrado por Mercado Pago + CBU/Alias y comisiones a sub-inquilinos.
              </p>
              <ul className="mt-5 space-y-2.5 text-xs text-slate-700">
                <li className="flex items-center gap-2 font-bold text-emerald-800">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Turnos ilimitados mensuales (sin tope de 20)</span>
                </li>
                <li className="flex items-center gap-2 font-medium">
                  <Check className="w-4 h-4 text-teal-600 shrink-0" />
                  <span>Hasta 5 profesionales con agendas separadas</span>
                </li>
                <li className="flex items-center gap-2 font-medium">
                  <Check className="w-4 h-4 text-teal-600 shrink-0" />
                  <span>Cobro de señas integrado (Mercado Pago + CBU/Alias)</span>
                </li>
                <li className="flex items-center gap-2 font-medium">
                  <Check className="w-4 h-4 text-teal-600 shrink-0" />
                  <span>Política de comisiones para sub-inquilinos</span>
                </li>
                <li className="flex items-center gap-2 font-medium">
                  <Check className="w-4 h-4 text-teal-600 shrink-0" />
                  <span>Sincronización con Google Calendar e iCal</span>
                </li>
                <li className="flex items-center gap-2 font-medium">
                  <Check className="w-4 h-4 text-teal-600 shrink-0" />
                  <span>Recordatorios automáticos por WhatsApp con código</span>
                </li>
                <li className="flex items-center gap-2 font-medium">
                  <Check className="w-4 h-4 text-teal-600 shrink-0" />
                  <span>Panel de métricas y base de datos de pacientes</span>
                </li>
                <li className="flex items-center gap-2 font-medium">
                  <Check className="w-4 h-4 text-teal-600 shrink-0" />
                  <span>Soporte prioritario y atención directa</span>
                </li>
              </ul>
            </div>
            <div className="mt-6 space-y-2">
              <button
                type="button"
                disabled={currentPlan === 'pro' || isChangingPlan !== null}
                onClick={() => handlePlanClick('pro')}
                className={`w-full py-2.5 rounded-xl text-xs font-bold transition shadow-md flex items-center justify-center gap-1.5 cursor-pointer ${
                  currentPlan === 'pro'
                    ? 'bg-teal-100 text-teal-800 border border-teal-300 cursor-default font-extrabold'
                    : 'bg-teal-600 hover:bg-teal-700 text-white hover:scale-102 active:scale-98'
                }`}
              >
                {isChangingPlan === 'pro' ? (
                  'Activando Plan Pro...'
                ) : currentPlan === 'pro' ? (
                  '✓ Tu Plan Actual (Pro Ilimitado)'
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-teal-200" />
                    <span>Cambiar a Plan Pro ({config.proPlan.price})</span>
                  </>
                )}
              </button>
              <a
                href={proLink}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-200 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition"
              >
                <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                <span>Pedir por WhatsApp</span>
              </a>
            </div>
          </div>

          {/* EXPERIENCIA AI */}
          <div
            className={`bg-slate-900 text-white rounded-3xl p-6 border shadow-xl flex flex-col justify-between relative ${
              recommendedPlan === 'business'
                ? 'border-indigo-400 ring-4 ring-indigo-500/30'
                : currentPlan === 'business'
                ? 'border-indigo-500 ring-4 ring-slate-700'
                : 'border-slate-800'
            }`}
          >
            {recommendedPlan === 'business' && (
              <span className="absolute -top-3 right-6 px-3 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-500 text-white uppercase tracking-wider shadow-sm">
                ★ Recomendado Para Escalar
              </span>
            )}
            <div>
              <div className="flex items-center gap-1.5 text-indigo-400 font-bold text-xs uppercase tracking-wider">
                <Bot className="w-4 h-4 text-indigo-400" />
                <span>{config.aiPlan.name}</span>
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-white">{config.aiPlan.price}</span>
                <span className="text-xs text-slate-400 font-semibold">/ mes</span>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                Potencia máxima con Inteligencia Artificial, WAPI desatendida y personalización total sin límites.
              </p>
              <ul className="mt-5 space-y-2.5 text-xs text-slate-300">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-teal-400 shrink-0" />
                  <span>Todo lo del plan Pro Ilimitado</span>
                </li>
                <li className="flex items-center gap-2 font-bold text-teal-300">
                  <Check className="w-4 h-4 text-teal-400 shrink-0" />
                  <span>Profesionales y consultorios ILIMITADOS</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-teal-400 shrink-0" />
                  <span>Asistente con Inteligencia Artificial</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-teal-400 shrink-0" />
                  <span>Integración Webhooks / WAPI (Flaxxa / Flowomatic)</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-teal-400 shrink-0" />
                  <span>Soporte prioritario 24/7 y puesta en marcha</span>
                </li>
              </ul>
            </div>
            <div className="mt-6 space-y-2">
              <button
                type="button"
                disabled={currentPlan === 'business' || isChangingPlan !== null}
                onClick={() => handlePlanClick('business')}
                className={`w-full py-2.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  currentPlan === 'business'
                    ? 'bg-slate-800 text-teal-300 border border-slate-700 cursor-default font-extrabold'
                    : 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white shadow-md hover:scale-102 active:scale-98'
                }`}
              >
                {isChangingPlan === 'business' ? (
                  'Activando Experiencia AI...'
                ) : currentPlan === 'business' ? (
                  '✓ Tu Plan Actual (Experiencia AI)'
                ) : (
                  <>
                    <Bot className="w-3.5 h-3.5 text-indigo-200" />
                    <span>Cambiar a Experiencia AI ({config.aiPlan.price})</span>
                  </>
                )}
              </button>
              <a
                href={aiLink}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition"
              >
                <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span>Pedir por WhatsApp</span>
              </a>
            </div>
          </div>

          {/* MARCA BLANCA / SAAS PARTNER */}
          <div
            className={`bg-slate-900 text-white rounded-3xl p-6 border shadow-xl flex flex-col justify-between relative overflow-hidden ${
              recommendedPlan === 'whitelabel'
                ? 'border-amber-400 ring-4 ring-amber-400/30'
                : currentPlan === 'whitelabel'
                ? 'border-amber-500/60 ring-4 ring-amber-400'
                : 'border-amber-500/40'
            }`}
          >
            <div className="absolute top-0 right-0 transform translate-x-4 -translate-y-4 w-24 h-24 bg-amber-500/10 rounded-full blur-xl pointer-events-none" />
            <div>
              <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs uppercase tracking-wider">
                <Building2 className="w-4 h-4 text-amber-400" />
                <span>{config.whiteLabelPlan?.name || 'Marca Blanca'}</span>
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-white">
                  {config.whiteLabelPlan?.price || 'A Medida'}
                </span>
              </div>
              <p className="text-xs text-amber-200/80 mt-1 font-medium">
                {config.whiteLabelPlan?.pricePeriod || 'cotización personalizada'}
              </p>
              <p className="text-xs text-slate-400 mt-2">
                Tu propia plataforma de reservas: logo, colores y dominio propio para revender o franquicias.
              </p>
              <ul className="mt-5 space-y-2.5 text-xs text-slate-300">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>100% Marca Blanca sin logos de terceros</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Dominio y SSL propio (ej: turnos.tuempresa.com)</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Panel Multi-Negocio para gestionar subcuentas</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Integración a medida de cobros y WAPI</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Soporte prioritario directo con fundadores</span>
                </li>
              </ul>
            </div>
            <div className="mt-6 space-y-2">
              {onSelectPlan && (
                <button
                  type="button"
                  disabled={currentPlan === 'whitelabel' || isChangingPlan !== null}
                  onClick={() => handlePlanClick('whitelabel')}
                  className={`w-full py-2.5 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    currentPlan === 'whitelabel'
                      ? 'bg-amber-900/60 text-amber-300 border border-amber-600/40 cursor-default'
                      : 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-md hover:scale-102 active:scale-98'
                  }`}
                >
                  {isChangingPlan === 'whitelabel'
                    ? 'Activando Marca Blanca...'
                    : currentPlan === 'whitelabel'
                    ? '✓ Tu Plan Actual (Marca Blanca)'
                    : 'Activar Plan Marca Blanca'}
                </button>
              )}
              <a
                href={whiteLabelLink}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition text-center"
              >
                <MessageCircle className="w-3.5 h-3.5 text-amber-400" />
                <span>{config.whiteLabelPlan?.ctaText || 'Consultar con nuestro equipo'}</span>
              </a>
            </div>
          </div>
        </div>


        <div className="mt-6 p-4 rounded-2xl bg-teal-50 border border-teal-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="text-teal-900">
            <strong>¿Quieres cambiar el plan de un inquilino (tenant) como SuperAdmin?</strong>
            <p className="text-teal-700 text-[11px] mt-0.5">
              Puedes modificar el plan directamente desde la tabla de tenants o desde el panel de configuración de cada negocio.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs transition shrink-0 cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
