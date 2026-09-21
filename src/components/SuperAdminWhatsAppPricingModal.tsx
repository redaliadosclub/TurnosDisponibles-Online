import React, { useState } from 'react';
import {
  X,
  MessageCircle,
  Sparkles,
  Save,
  RotateCcw,
  ExternalLink,
  Bot,
  Zap,
  CheckCircle2,
  Phone,
  HelpCircle,
  Building2,
} from 'lucide-react';
import {
  getSaasConfig,
  saveSaasConfig,
  DEFAULT_SAAS_CONFIG,
  SaasPlanConfig,
  buildWhatsAppPlanLink,
} from '../lib/saasConfig';

interface SuperAdminWhatsAppPricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export function SuperAdminWhatsAppPricingModal({
  isOpen,
  onClose,
  onSaved,
}: SuperAdminWhatsAppPricingModalProps) {
  const [config, setConfig] = useState<SaasPlanConfig>(getSaasConfig);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveSaasConfig(config);
    setSavedSuccess(true);
    if (onSaved) onSaved();
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleResetDefaults = () => {
    if (window.confirm('¿Deseas restaurar los textos y precios de WhatsApp a los valores predeterminados?')) {
      setConfig(DEFAULT_SAAS_CONFIG);
      saveSaasConfig(DEFAULT_SAAS_CONFIG);
      setSavedSuccess(true);
      if (onSaved) onSaved();
      setTimeout(() => setSavedSuccess(false), 3000);
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
      <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-600 flex items-center justify-center">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-extrabold text-slate-900">
                  Configuración de WhatsApp & Mensajes de Planes (SaaS)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                  SUPERADMIN
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Personaliza el WhatsApp comercial y mensajes para <strong>Prueba Pro 15 Días / Plan Free</strong>, <strong>Plan Pro Ilimitado</strong>, <strong>Experiencia AI</strong> y <strong>Marca Blanca</strong>.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {savedSuccess && (
          <div className="mb-6 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>¡Configuración guardada con éxito! Los botones de la Landing Page y el modal de precios ya están actualizados.</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          {/* Main WhatsApp Number */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
            <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Phone className="w-4 h-4 text-teal-600" />
              Número de WhatsApp para Recepción de Clientes (con código de país)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                required
                value={config.whatsappNumber}
                onChange={(e) => setConfig({ ...config, whatsappNumber: e.target.value })}
                placeholder="5492474478646"
                className="w-full max-w-sm px-3.5 py-2.5 bg-white rounded-xl border border-slate-300 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <span className="text-[11px] text-slate-500">
                (Ejemplo para Argentina: 549 + código de área + número sin 15)
              </span>
            </div>
          </div>

          {/* Plan Free Section */}
          <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-slate-400"></span>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  1. Estrategia Híbrida: Prueba Pro 15 Días • Plan Free (Hasta 20 turnos/mes)
                </h4>
              </div>
              <a
                href={freeLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-teal-600 hover:text-teal-700 font-semibold"
                title="Probar enlace generado en WhatsApp"
              >
                <span>Probar link</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Nombre público del plan
                </label>
                <input
                  type="text"
                  value={config.freePlan.name}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      freePlan: { ...config.freePlan, name: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Etiqueta de Precio
                </label>
                <input
                  type="text"
                  value={config.freePlan.price}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      freePlan: { ...config.freePlan, price: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Texto del mensaje predeterminado de WhatsApp
              </label>
              <textarea
                rows={2}
                value={config.freePlan.whatsappMessage}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    freePlan: { ...config.freePlan, whatsappMessage: e.target.value },
                  })
                }
                className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          {/* Plan Pro Section */}
          <div className="bg-teal-50/50 p-5 rounded-2xl border border-teal-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-teal-600" />
                <h4 className="text-xs font-bold text-teal-950 uppercase tracking-wider">
                  2. Plan Pro Ilimitado ($24.900/mes • Más Popular)
                </h4>
              </div>
              <a
                href={proLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-teal-700 hover:text-teal-800 font-semibold"
                title="Probar enlace generado en WhatsApp"
              >
                <span>Probar link</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Nombre público del plan
                </label>
                <input
                  type="text"
                  value={config.proPlan.name}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      proPlan: { ...config.proPlan, name: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Precio mensual
                </label>
                <input
                  type="text"
                  value={config.proPlan.price}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      proPlan: { ...config.proPlan, price: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Texto del mensaje predeterminado de WhatsApp
              </label>
              <textarea
                rows={2}
                value={config.proPlan.whatsappMessage}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    proPlan: { ...config.proPlan, whatsappMessage: e.target.value },
                  })
                }
                className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          {/* Plan Experiencia AI Section */}
          <div className="bg-indigo-50/50 p-5 rounded-2xl border border-indigo-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-indigo-600" />
                <h4 className="text-xs font-bold text-indigo-950 uppercase tracking-wider">
                  3. Plan Experiencia AI (Reemplaza a "Comercial")
                </h4>
              </div>
              <a
                href={aiLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-indigo-700 hover:text-indigo-800 font-semibold"
                title="Probar enlace generado en WhatsApp"
              >
                <span>Probar link</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Nombre público del plan
                </label>
                <input
                  type="text"
                  value={config.aiPlan.name}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      aiPlan: { ...config.aiPlan, name: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Precio mensual
                </label>
                <input
                  type="text"
                  value={config.aiPlan.price}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      aiPlan: { ...config.aiPlan, price: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Texto del mensaje predeterminado de WhatsApp
              </label>
              <textarea
                rows={2}
                value={config.aiPlan.whatsappMessage}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    aiPlan: { ...config.aiPlan, whatsappMessage: e.target.value },
                  })
                }
                className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          {/* Plan Marca Blanca Section */}
          <div className="bg-amber-50/50 p-5 rounded-2xl border border-amber-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-amber-700" />
                <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                  4. Plan Marca Blanca / SaaS Partner (A Medida)
                </h4>
              </div>
              <a
                href={whiteLabelLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-amber-800 hover:text-amber-900 font-semibold"
                title="Probar enlace generado en WhatsApp"
              >
                <span>Probar link</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Nombre público del plan
                </label>
                <input
                  type="text"
                  value={config.whiteLabelPlan?.name || 'Plan Marca Blanca'}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      whiteLabelPlan: {
                        ...(config.whiteLabelPlan || DEFAULT_SAAS_CONFIG.whiteLabelPlan),
                        name: e.target.value,
                      },
                    })
                  }
                  className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Etiqueta de Precio
                </label>
                <input
                  type="text"
                  value={config.whiteLabelPlan?.price || 'A Medida'}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      whiteLabelPlan: {
                        ...(config.whiteLabelPlan || DEFAULT_SAAS_CONFIG.whiteLabelPlan),
                        price: e.target.value,
                      },
                    })
                  }
                  className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Texto del mensaje predeterminado de WhatsApp (CTA: Comunicate con nuestro equipo)
              </label>
              <textarea
                rows={2}
                value={
                  config.whiteLabelPlan?.whatsappMessage ||
                  'Hola, me interesa conocer la propuesta de Marca Blanca / SaaS Partner para comercializar la plataforma con mi propia marca en TurnosDisponibles.online'
                }
                onChange={(e) =>
                  setConfig({
                    ...config,
                    whiteLabelPlan: {
                      ...(config.whiteLabelPlan || DEFAULT_SAAS_CONFIG.whiteLabelPlan),
                      whatsappMessage: e.target.value,
                    },
                  })
                }
                className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={handleResetDefaults}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restaurar Valores por Defecto</span>
            </button>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-none px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Cerrar
              </button>
              <button
                type="submit"
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-md transition cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Guardar Cambios</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
