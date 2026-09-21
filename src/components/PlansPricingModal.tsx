import { useState, useEffect } from 'react';
import { X, Check, Sparkles, Bot, Zap, MessageCircle, Building2, Globe } from 'lucide-react';
import { BusinessPlan } from '../types';
import { getSaasConfig, buildWhatsAppPlanLink, SaasPlanConfig } from '../lib/saasConfig';

interface PlansPricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlan?: BusinessPlan;
  onSelectPlan?: (plan: BusinessPlan) => void;
}

export function PlansPricingModal({
  isOpen,
  onClose,
  currentPlan,
  onSelectPlan,
}: PlansPricingModalProps) {
  const [config, setConfig] = useState<SaasPlanConfig>(getSaasConfig);

  useEffect(() => {
    const handleUpdate = () => setConfig(getSaasConfig());
    window.addEventListener('saas-config-updated', handleUpdate);
    return () => window.removeEventListener('saas-config-updated', handleUpdate);
  }, []);

  if (!isOpen) return null;

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
              Comienzas 15 días gratis con el Plan PRO completo. Luego eliges el plan que mejor se adapte a tu negocio.
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

        {/* Banner informativo de prueba PRO 15 días */}
        <div className="mb-6 p-4 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 text-teal-900">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-teal-500"></span>
            </span>
            <span>
              <strong>Prueba PRO de 15 Días Incluida:</strong> Todos los negocios inician con 15 días de acceso total al Plan PRO sin costo. Al finalizar, seleccionas tu plan para continuar operando.
            </span>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* FREE */}
          <div
            className={`bg-slate-50 rounded-3xl p-6 border flex flex-col justify-between ${
              currentPlan === 'free' ? 'border-slate-800 ring-2 ring-slate-800/20' : 'border-slate-200'
            }`}
          >
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                {config.freePlan.name}
              </span>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-slate-900">{config.freePlan.price}</span>
                <span className="text-xs text-slate-500 font-normal">/ {config.freePlan.pricePeriod}</span>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Ideal para profesionales individuales que dan sus primeros pasos digitales.
              </p>
              <ul className="mt-5 space-y-2.5 text-xs text-slate-700">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>15 días de prueba gratuita sin tarjeta</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>1 Profesional / Especialista</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Hasta 80 turnos mensuales</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Página de reservas personalizada básica</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Confirmación directa por WhatsApp</span>
                </li>
              </ul>
            </div>
            <div className="mt-6 space-y-2">
              <button
                type="button"
                disabled={currentPlan === 'free'}
                onClick={() => {
                  if (onSelectPlan) onSelectPlan('free');
                }}
                className={`w-full py-2.5 rounded-xl border text-xs font-bold transition ${
                  currentPlan === 'free'
                    ? 'bg-slate-200 border-slate-300 text-slate-600 cursor-default'
                    : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-800 cursor-pointer'
                }`}
              >
                {currentPlan === 'free' ? 'Plan Actual' : `Elegir Plan Inicial (${config.freePlan.price})`}
              </button>
              <a
                href={freeLink}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition"
              >
                <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                <span>Pedir por WhatsApp</span>
              </a>
            </div>
          </div>

          {/* PRO */}
          <div
            className={`bg-white rounded-3xl p-6 border-2 border-teal-600 shadow-xl flex flex-col justify-between relative ${
              currentPlan === 'pro' ? 'ring-4 ring-teal-500/20' : ''
            }`}
          >
            <span className="absolute -top-3 right-6 px-3 py-0.5 rounded-full text-[10px] font-extrabold bg-teal-600 text-white uppercase tracking-wider shadow-sm">
              Más Elegido
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
                Para consultorios médicos, estéticas, spas y salones que buscan automatización profesional.
              </p>
              <ul className="mt-5 space-y-2.5 text-xs text-slate-700">
                <li className="flex items-center gap-2 font-medium">
                  <Check className="w-4 h-4 text-teal-600 shrink-0" />
                  <span>Hasta 5 profesionales</span>
                </li>
                <li className="flex items-center gap-2 font-medium">
                  <Check className="w-4 h-4 text-teal-600 shrink-0" />
                  <span>Turnos ilimitados mensuales</span>
                </li>
                <li className="flex items-center gap-2 font-medium">
                  <Check className="w-4 h-4 text-teal-600 shrink-0" />
                  <span>Cobro de señas (Mercado Pago + CBU)</span>
                </li>
                <li className="flex items-center gap-2 font-medium">
                  <Check className="w-4 h-4 text-teal-600 shrink-0" />
                  <span>Recordatorios automáticos por WhatsApp</span>
                </li>
                <li className="flex items-center gap-2 font-medium">
                  <Check className="w-4 h-4 text-teal-600 shrink-0" />
                  <span>Base de datos y panel de métricas</span>
                </li>
              </ul>
            </div>
            <div className="mt-6 space-y-2">
              <button
                type="button"
                disabled={currentPlan === 'pro'}
                onClick={() => {
                  if (onSelectPlan) onSelectPlan('pro');
                }}
                className={`w-full py-2.5 rounded-xl text-xs font-bold transition shadow-md ${
                  currentPlan === 'pro'
                    ? 'bg-teal-100 text-teal-800 border border-teal-300 cursor-default'
                    : 'bg-teal-600 hover:bg-teal-700 text-white cursor-pointer'
                }`}
              >
                {currentPlan === 'pro' ? 'Plan Actual (Activo)' : `Elegir Plan Pro (${config.proPlan.price})`}
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

          {/* EXPERIENCIA AI (Reemplaza a Comercial) */}
          <div
            className={`bg-slate-900 text-white rounded-3xl p-6 border border-slate-800 shadow-xl flex flex-col justify-between ${
              currentPlan === 'business' ? 'ring-4 ring-slate-700' : ''
            }`}
          >
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
                Potencia máxima con Inteligencia Artificial, WAPI desatendida y personalización total.
              </p>
              <ul className="mt-5 space-y-2.5 text-xs text-slate-300">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-teal-400 shrink-0" />
                  <span>Todo lo del plan Pro</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-teal-400 shrink-0" />
                  <span>Profesionales y staff ilimitados</span>
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
                disabled={currentPlan === 'business'}
                onClick={() => {
                  if (onSelectPlan) onSelectPlan('business');
                }}
                className={`w-full py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  currentPlan === 'business'
                    ? 'bg-slate-800 text-teal-300 border border-slate-700 cursor-default'
                    : 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white shadow-md'
                }`}
              >
                {currentPlan === 'business' ? 'Plan Actual' : `Elegir Experiencia AI (${config.aiPlan.price})`}
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
            className={`bg-slate-900 text-white rounded-3xl p-6 border border-amber-500/40 shadow-xl flex flex-col justify-between relative overflow-hidden ${
              currentPlan === 'whitelabel' ? 'ring-4 ring-amber-400' : ''
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
              <a
                href={whiteLabelLink}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-amber-500/20 flex items-center justify-center gap-1.5 transition text-center"
              >
                <MessageCircle className="w-4 h-4 text-slate-950" />
                <span>{config.whiteLabelPlan?.ctaText || 'Comunícate con nuestro equipo'}</span>
              </a>
              {onSelectPlan && (
                <button
                  type="button"
                  onClick={() => onSelectPlan('whitelabel')}
                  className="w-full py-1.5 text-[10px] text-slate-400 hover:text-slate-200 transition text-center"
                >
                  {currentPlan === 'whitelabel' ? '✓ Plan asignado' : 'Asignar como SuperAdmin'}
                </button>
              )}
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
