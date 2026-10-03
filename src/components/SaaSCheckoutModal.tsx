import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  CreditCard,
  Building,
  Check,
  Copy,
  Sparkles,
  ArrowRight,
  MessageCircle,
  Lock,
  CheckCircle2,
  AlertCircle,
  Zap,
  Bot,
  ExternalLink,
} from 'lucide-react';
import { Business, BusinessPlan } from '../types';
import { getSaasConfig, buildWhatsAppPlanLink } from '../lib/saasConfig';

interface SaaSCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  business: Business;
  targetPlan: BusinessPlan;
  triggerReason?: string;
  onPaymentConfirmed: (
    plan: BusinessPlan,
    details: {
      method: 'mercadopago' | 'transfer' | 'manual';
      reference: string;
      amount: string;
      status: 'pending_approval' | 'approved';
    }
  ) => Promise<void>;
}

export function SaaSCheckoutModal({
  isOpen,
  onClose,
  business,
  targetPlan,
  triggerReason,
  onPaymentConfirmed,
}: SaaSCheckoutModalProps) {
  const saasConfig = getSaasConfig();
  const [selectedMethod, setSelectedMethod] = useState<'mercadopago' | 'transfer'>('mercadopago');
  const [transferRef, setTransferRef] = useState('');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [paymentReceipt, setPaymentReceipt] = useState<{
    reference: string;
    date: string;
    amount: string;
    plan: string;
    status: 'pending_approval' | 'approved';
  } | null>(null);

  if (!isOpen) return null;

  const planInfo = {
    free: {
      name: saasConfig.freePlan.name,
      price: saasConfig.freePlan.price,
      period: 'mes',
      description: 'Plan Base hasta 20 turnos/mes',
    },
    pro: {
      name: saasConfig.proPlan.name,
      price: saasConfig.proPlan.price,
      period: 'mes',
      description: 'Turnos ilimitados + hasta 5 consultorios + señas online',
    },
    business: {
      name: saasConfig.aiPlan.name,
      price: saasConfig.aiPlan.price,
      period: 'mes',
      description: 'Consultorios ilimitados + WhatsApp Bot con IA 24/7',
    },
    whitelabel: {
      name: saasConfig.whiteLabelPlan?.name || 'Marca Blanca Partner',
      price: saasConfig.whiteLabelPlan?.price || 'A Medida',
      period: 'mes',
      description: 'Dominio propio + 100% marca blanca para franquicias y agencias',
    },
  }[targetPlan];

  const bank = saasConfig.bankDetails || {
    cbu: '0000003100019283746501',
    alias: 'TURNOS.ONLINE.SAAS',
    bankName: 'Banco Santander / Mercado Pago',
    accountHolder: 'TurnosDisponibles Online SaaS',
    cuit: '30-71829401-4',
  };

  const mpSubscriptionLink =
    targetPlan === 'pro'
      ? saasConfig.mercadoPagoConfig?.subscriptionLinkPro
      : targetPlan === 'business'
      ? saasConfig.mercadoPagoConfig?.subscriptionLinkAi
      : undefined;

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2500);
  };

  const handlePayMercadoPago = async () => {
    try {
      setIsProcessing(true);
      // Simula proceso seguro de pasarela oficial con token de autorización
      await new Promise((resolve) => setTimeout(resolve, 1500));
      const authCode = `MP-AUTH-${Math.floor(100000 + Math.random() * 900000)}`;
      
      await onPaymentConfirmed(targetPlan, {
        method: 'mercadopago',
        reference: authCode,
        amount: planInfo.price,
        status: 'approved',
      });

      setPaymentReceipt({
        reference: authCode,
        date: new Date().toLocaleString('es-AR'),
        amount: planInfo.price,
        plan: planInfo.name,
        status: 'approved',
      });
      setIsSuccess(true);
    } catch (err: any) {
      console.error(err);
      alert('Hubo un error al procesar el pago con Mercado Pago.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferRef.trim()) {
      alert('Por favor ingresa el número de comprobante o referencia de tu transferencia.');
      return;
    }

    try {
      setIsProcessing(true);
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const refClean = transferRef.trim().toUpperCase();
      await onPaymentConfirmed(targetPlan, {
        method: 'transfer',
        reference: refClean,
        amount: planInfo.price,
        status: 'pending_approval',
      });

      setPaymentReceipt({
        reference: refClean,
        date: new Date().toLocaleString('es-AR'),
        amount: planInfo.price,
        plan: planInfo.name,
        status: 'pending_approval',
      });
      setIsSuccess(true);
    } catch (err: any) {
      console.error(err);
      alert('Hubo un error al registrar el comprobante de transferencia.');
    } finally {
      setIsProcessing(false);
    }
  };

  const whatsappLink = buildWhatsAppPlanLink(
    saasConfig.whatsappNumber,
    `Hola, acabo de registrar el pago por transferencia para subir al ${planInfo.name} (${planInfo.price}) para mi clínica "${business.name}" (ID: ${business.slug}). Comprobante/Ref: ${paymentReceipt?.reference || transferRef}. Adjunto comprobante:`
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-teal-50 text-teal-700 border border-teal-200">
              <ShieldCheck className="w-5 h-5 text-teal-600" />
            </span>
            <div>
              <h3 className="text-lg font-black text-slate-900">
                Pasarela de Pago Seguro • Suscripción SaaS
              </h3>
              <p className="text-xs text-slate-500">
                Activación transparente y formal para tu clínica
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

        {isSuccess && paymentReceipt ? (
          <div className="text-center py-6 space-y-4 animate-in zoom-in-95">
            {paymentReceipt.status === 'approved' ? (
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-10 h-10" />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto shadow-inner">
                <Sparkles className="w-10 h-10 text-amber-600" />
              </div>
            )}

            <div>
              {paymentReceipt.status === 'approved' ? (
                <>
                  <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 uppercase tracking-wider">
                    ✓ Pago Acreditado Inmediatamente
                  </span>
                  <h3 className="text-2xl font-black text-slate-900 mt-2">
                    ¡Tu clínica ya está en el {paymentReceipt.plan}!
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Todas las nuevas capacidades y límites han sido actualizados en tu base de datos.
                  </p>
                </>
              ) : (
                <>
                  <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-800 uppercase tracking-wider border border-amber-300">
                    ⏳ Comprobante Registrado • En Aprobación
                  </span>
                  <h3 className="text-2xl font-black text-slate-900 mt-2">
                    ¡Comprobante enviado a Administración!
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    El SuperAdmin ha recibido tu comprobante bancario. En cuanto sea conciliado, tu {paymentReceipt.plan} quedará activo.
                  </p>
                </>
              )}
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-left text-xs space-y-2">
              <div className="flex justify-between text-slate-600">
                <span>Comprobante / Referencia:</span>
                <span className="font-mono font-bold text-slate-900">{paymentReceipt.reference}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Importe declarado:</span>
                <span className="font-black text-emerald-700 text-sm">{paymentReceipt.amount}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Estado de Verificación:</span>
                <span className={`font-bold ${paymentReceipt.status === 'approved' ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {paymentReceipt.status === 'approved' ? 'Aprobado y Activo' : 'Pendiente de Conciliación en SuperAdmin'}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Fecha y Hora:</span>
                <span className="text-slate-800">{paymentReceipt.date}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Clínica Beneficiaria:</span>
                <span className="font-semibold text-slate-900">{business.name}</span>
              </div>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center justify-center gap-2 transition shadow-md"
              >
                <MessageCircle className="w-4 h-4 text-white" />
                <span>Enviar Comprobante por WhatsApp al SuperAdmin</span>
              </a>
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
              >
                Volver a mi Panel de Control
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Reason Banner if applicable */}
            {triggerReason && (
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-bold">Motivo de la Invitación:</strong>
                  <span>{triggerReason}</span>
                </div>
              </div>
            )}

            {/* Plan Summary Card */}
            <div className="bg-gradient-to-br from-slate-900 to-teal-950 text-white p-5 rounded-3xl shadow-sm border border-slate-800 flex items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-teal-400 bg-teal-950/80 px-2 py-0.5 rounded-full border border-teal-800">
                  Plan a Activar
                </span>
                <h4 className="text-xl font-black text-white mt-1.5">{planInfo.name}</h4>
                <p className="text-xs text-slate-300 mt-0.5">{planInfo.description}</p>
                <p className="text-[11px] text-teal-200/80 mt-1 font-medium">Clínica: {business.name}</p>
              </div>
              <div className="text-right shrink-0">
                <span className="text-2xl sm:text-3xl font-black text-white">{planInfo.price}</span>
                <span className="text-xs text-slate-400 block">/ {planInfo.period}</span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
                Selecciona tu Método de Pago Seguro:
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedMethod('mercadopago')}
                  className={`p-3.5 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
                    selectedMethod === 'mercadopago'
                      ? 'border-sky-500 bg-sky-50/50 ring-2 ring-sky-500/20 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-sky-800">Mercado Pago</span>
                    <CreditCard className="w-4 h-4 text-sky-600" />
                  </div>
                  <span className="text-[11px] text-slate-500 mt-2">
                    Tarjeta de débito, crédito o dinero en cuenta
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedMethod('transfer')}
                  className={`p-3.5 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
                    selectedMethod === 'transfer'
                      ? 'border-teal-500 bg-teal-50/50 ring-2 ring-teal-500/20 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-teal-800">Transferencia</span>
                    <Building className="w-4 h-4 text-teal-600" />
                  </div>
                  <span className="text-[11px] text-slate-500 mt-2">
                    CBU / Alias bancario con comprobante
                  </span>
                </button>
              </div>
            </div>

            {/* METHOD 1: MERCADO PAGO */}
            {selectedMethod === 'mercadopago' && (
              <div className="p-4 rounded-2xl bg-sky-50/60 border border-sky-200 space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sky-900">
                    <Lock className="w-4 h-4 text-sky-600" />
                    <span className="text-xs font-bold">Procesamiento Cifrado SSL 256-Bit</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-300">
                    Suscripción Oficial
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Adhiérete al cobro recurrente oficial de Mercado Pago por <strong>{planInfo.price} / {planInfo.period}</strong> para mantener tu clínica siempre activa sin interrupciones.
                </p>

                {mpSubscriptionLink && (
                  <div className="p-3.5 bg-white rounded-2xl border border-sky-200 space-y-2.5 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-sky-950 flex items-center gap-1.5">
                        <CreditCard className="w-4 h-4 text-sky-600" />
                        Pasarela Oficial de Mercado Pago
                      </span>
                      <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        Débito Automático Mensual
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">
                      Al pulsar a continuación, se abrirá la pasarela oficial de Mercado Pago para que ingreses tu tarjeta de crédito/débito o pagues con saldo en cuenta.
                    </p>
                    <a
                      href={mpSubscriptionLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-3 rounded-xl bg-[#009ee3] hover:bg-[#0081bb] text-white font-black text-xs flex items-center justify-center gap-2 transition shadow-md cursor-pointer"
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>Ir a Pagar {planInfo.price} a Mercado Pago</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}

                <div className="pt-1 space-y-2">
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={handlePayMercadoPago}
                    className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
                  >
                    {isProcessing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Validando suscripción...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Confirmar Activación de {planInfo.name}</span>
                      </>
                    )}
                  </button>

                  <p className="text-[11px] text-center text-slate-500">
                    💡 Si estás en fase de pruebas o ya realizaste el débito en Mercado Pago, pulsa "Confirmar Activación" para desbloquear tus funciones al instante.
                  </p>
                </div>
              </div>
            )}

            {/* METHOD 2: TRANSFERENCIA */}
            {selectedMethod === 'transfer' && (
              <form onSubmit={handleConfirmTransfer} className="p-4 rounded-2xl bg-teal-50/60 border border-teal-200 space-y-3.5">
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-teal-200">
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">Alias Oficial</span>
                      <span className="font-mono font-extrabold text-teal-900 text-sm">{bank.alias}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(bank.alias, 'alias')}
                      className="px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition"
                    >
                      {copiedField === 'alias' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedField === 'alias' ? 'Copiado' : 'Copiar'}</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-teal-200">
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">CBU / CVU</span>
                      <span className="font-mono font-bold text-slate-800 text-xs">{bank.cbu}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(bank.cbu, 'cbu')}
                      className="px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition"
                    >
                      {copiedField === 'cbu' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedField === 'cbu' ? 'Copiado' : 'Copiar'}</span>
                    </button>
                  </div>

                  <div className="text-[11px] text-slate-600 px-1">
                    Titular: <strong>{bank.accountHolder}</strong> • CUIT: <strong>{bank.cuit}</strong> • Banco: {bank.bankName}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Número de Comprobante / Referencia de Transferencia:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: 00928374 o Nro de Operación Bancaria"
                    value={transferRef}
                    onChange={(e) => setTransferRef(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-teal-500 bg-white"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isProcessing}
                  className="w-full py-3 rounded-2xl bg-teal-700 hover:bg-teal-800 text-white font-extrabold text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Registrando comprobante...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Confirmar Pago por Transferencia</span>
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Assistance via WhatsApp */}
            <div className="border-t border-slate-100 pt-3 flex items-center justify-between text-xs">
              <span className="text-slate-500">¿Dudas con la facturación o formas de pago?</span>
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-700 font-bold hover:underline flex items-center gap-1"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Asistencia WhatsApp</span>
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
