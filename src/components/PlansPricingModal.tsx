import { X, Check, Sparkles } from 'lucide-react';
import { BusinessPlan } from '../types';

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
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-teal-50 text-teal-700 border border-teal-200">
                <Sparkles className="w-5 h-5 text-teal-600" />
              </span>
              <h3 className="text-xl font-extrabold text-slate-900">
                Planes & Precios SaaS TurnosDisponibles
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Esquema de suscripciones para monetizar tu plataforma con consultorios, estéticas y profesionales.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* FREE */}
          <div
            className={`bg-slate-50 rounded-3xl p-6 border flex flex-col justify-between ${
              currentPlan === 'free' ? 'border-slate-800 ring-2 ring-slate-800/20' : 'border-slate-200'
            }`}
          >
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Plan Básico</span>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-slate-900">Gratis</span>
                <span className="text-xs text-slate-500 font-normal">/ para siempre</span>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Ideal para profesionales independientes que recién comienzan a digitalizarse.
              </p>
              <ul className="mt-5 space-y-2.5 text-xs text-slate-700">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>1 Profesional</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>1 Servicio configurable</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Página de reservas pública</span>
                </li>
                <li className="flex items-center gap-2 text-slate-400">
                  <span className="w-4 text-center font-bold">✕</span>
                  <span>Sin múltiples profesionales</span>
                </li>
                <li className="flex items-center gap-2 text-slate-400">
                  <span className="w-4 text-center font-bold">✕</span>
                  <span>Sin métricas avanzadas</span>
                </li>
              </ul>
            </div>
            <button
              type="button"
              disabled={currentPlan === 'free'}
              onClick={() => {
                if (onSelectPlan) onSelectPlan('free');
              }}
              className={`mt-6 w-full py-2.5 rounded-xl border text-xs font-bold transition ${
                currentPlan === 'free'
                  ? 'bg-slate-200 border-slate-300 text-slate-600 cursor-default'
                  : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-800 cursor-pointer'
              }`}
            >
              {currentPlan === 'free' ? 'Plan Actual' : 'Seleccionar Gratis'}
            </button>
          </div>

          {/* PRO - $29.000 */}
          <div
            className={`bg-white rounded-3xl p-6 border-2 border-teal-600 shadow-xl flex flex-col justify-between relative ${
              currentPlan === 'pro' ? 'ring-4 ring-teal-500/20' : ''
            }`}
          >
            <span className="absolute -top-3 right-6 px-3 py-0.5 rounded-full text-[10px] font-extrabold bg-teal-600 text-white uppercase tracking-wider shadow-sm">
              Recomendado
            </span>
            <div>
              <span className="text-xs font-bold text-teal-700 uppercase tracking-wider">Plan Profesional</span>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-slate-900">$29.000</span>
                <span className="text-xs text-slate-600 font-semibold">ARS / mes</span>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Para consultorios individuales, médicos independientes, estéticas y barberías.
              </p>
              <ul className="mt-5 space-y-2.5 text-xs text-slate-700">
                <li className="flex items-center gap-2 font-medium">
                  <Check className="w-4 h-4 text-teal-600 shrink-0" />
                  <span>Hasta 2 profesionales</span>
                </li>
                <li className="flex items-center gap-2 font-medium">
                  <Check className="w-4 h-4 text-teal-600 shrink-0" />
                  <span>Catálogo de servicios ilimitado</span>
                </li>
                <li className="flex items-center gap-2 font-medium">
                  <Check className="w-4 h-4 text-teal-600 shrink-0" />
                  <span>Reservas ilimitadas en tiempo real</span>
                </li>
                <li className="flex items-center gap-2 font-medium">
                  <Check className="w-4 h-4 text-teal-600 shrink-0" />
                  <span>Cobro de señas (Mercado Pago / CBU)</span>
                </li>
                <li className="flex items-center gap-2 font-medium">
                  <Check className="w-4 h-4 text-teal-600 shrink-0" />
                  <span>WhatsApp con mensaje pre-armado</span>
                </li>
                <li className="flex items-center gap-2 font-medium">
                  <Check className="w-4 h-4 text-teal-600 shrink-0" />
                  <span>Métricas y conversión básica</span>
                </li>
              </ul>
            </div>
            <button
              type="button"
              disabled={currentPlan === 'pro'}
              onClick={() => {
                if (onSelectPlan) onSelectPlan('pro');
              }}
              className={`mt-6 w-full py-2.5 rounded-xl text-xs font-bold transition shadow-md ${
                currentPlan === 'pro'
                  ? 'bg-teal-100 text-teal-800 border border-teal-300 cursor-default'
                  : 'bg-teal-600 hover:bg-teal-700 text-white cursor-pointer'
              }`}
            >
              {currentPlan === 'pro' ? 'Plan Actual (Activo)' : 'Elegir Plan Pro ($29.000 ARS)'}
            </button>
          </div>

          {/* BUSINESS - $49.000 */}
          <div
            className={`bg-slate-900 text-white rounded-3xl p-6 border border-slate-800 shadow-xl flex flex-col justify-between ${
              currentPlan === 'business' ? 'ring-4 ring-slate-700' : ''
            }`}
          >
            <div>
              <span className="text-xs font-bold text-teal-400 uppercase tracking-wider">Plan Consultorio / Clínica</span>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-white">$49.000</span>
                <span className="text-xs text-slate-400 font-semibold">ARS / mes</span>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                Para policonsultorios, clínicas, centros de estética y negocios con alta demanda de turnos.
              </p>
              <ul className="mt-5 space-y-2.5 text-xs text-slate-300">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-teal-400 shrink-0" />
                  <span>Todo lo del plan Profesional</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-teal-400 shrink-0" />
                  <span>Profesionales y staff ilimitados</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-teal-400 shrink-0" />
                  <span>Integración WhatsApp API (WAPI)</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-teal-400 shrink-0" />
                  <span>Recordatorios automáticos 24h</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-teal-400 shrink-0" />
                  <span>Múltiples sucursales y salas</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-teal-400 shrink-0" />
                  <span>Soporte prioritario 24/7</span>
                </li>
              </ul>
            </div>
            <button
              type="button"
              disabled={currentPlan === 'business'}
              onClick={() => {
                if (onSelectPlan) onSelectPlan('business');
              }}
              className={`mt-6 w-full py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                currentPlan === 'business'
                  ? 'bg-slate-800 text-teal-300 border border-slate-700 cursor-default'
                  : 'bg-teal-500 hover:bg-teal-400 text-slate-950 shadow-md'
              }`}
            >
              {currentPlan === 'business' ? 'Plan Actual' : 'Elegir Plan Clínica ($49.000 ARS)'}
            </button>
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
