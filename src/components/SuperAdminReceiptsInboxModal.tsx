import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  XCircle,
  Clock,
  Building2,
  CreditCard,
  MessageCircle,
  Copy,
  Check,
  Search,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { Business, BusinessPlan } from '../types';
import { api } from '../services/api';
import { buildWhatsAppPlanLink, getSaasConfig } from '../lib/saasConfig';

interface SuperAdminReceiptsInboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  businesses: Business[];
  onBusinessUpdated: (updated: Business) => void;
}

export function SuperAdminReceiptsInboxModal({
  isOpen,
  onClose,
  businesses,
  onBusinessUpdated,
}: SuperAdminReceiptsInboxModalProps) {
  const saasConfig = getSaasConfig();
  const [filterStatus, setFilterStatus] = useState<'pending' | 'all' | 'approved' | 'rejected'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [copiedRef, setCopiedRef] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedRef(text);
    setTimeout(() => setCopiedRef(null), 2500);
  };

  // Filter businesses that have payment records
  const businessesWithPayments = businesses.filter((b) => !!b.lastPlanPayment);

  const filtered = businessesWithPayments.filter((b) => {
    const payment = b.lastPlanPayment!;
    const status = payment.status || (payment.method === 'transfer' ? 'pending_approval' : 'approved');

    if (filterStatus === 'pending' && status !== 'pending_approval') return false;
    if (filterStatus === 'approved' && status !== 'approved') return false;
    if (filterStatus === 'rejected' && status !== 'rejected') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = b.name.toLowerCase().includes(q);
      const matchSlug = b.slug.toLowerCase().includes(q);
      const matchRef = payment.reference.toLowerCase().includes(q);
      const matchPlan = payment.plan.toLowerCase().includes(q);
      return matchName || matchSlug || matchRef || matchPlan;
    }

    return true;
  });

  const pendingCount = businessesWithPayments.filter(
    (b) => (b.lastPlanPayment?.status || (b.lastPlanPayment?.method === 'transfer' ? 'pending_approval' : 'approved')) === 'pending_approval'
  ).length;

  const handleApprove = async (business: Business) => {
    const payment = business.lastPlanPayment;
    if (!payment) return;

    if (!confirm(`¿Confirmas la acreditación del pago por ${payment.amount} (Ref: ${payment.reference}) y la activación del Plan ${payment.plan.toUpperCase()} para "${business.name}"?`)) {
      return;
    }

    try {
      setProcessingId(business.id);
      const updated = await api.updateBusiness(business.id, {
        plan: payment.plan,
        lastPlanPayment: {
          ...payment,
          status: 'approved',
          approvedAt: new Date().toISOString(),
        },
      });
      onBusinessUpdated(updated);
    } catch (err: any) {
      console.error(err);
      alert('Error al aprobar el comprobante: ' + (err.message || 'Error desconocido'));
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (business: Business) => {
    const payment = business.lastPlanPayment;
    if (!payment) return;

    const reason = prompt('Indica el motivo del rechazo del comprobante (se registrará en el historial de la clínica):', 'Transferencia no acreditada en extracto bancario.');
    if (reason === null) return;

    try {
      setProcessingId(business.id);
      const updated = await api.updateBusiness(business.id, {
        lastPlanPayment: {
          ...payment,
          status: 'rejected',
          adminNote: reason,
        },
      });
      onBusinessUpdated(updated);
    } catch (err: any) {
      console.error(err);
      alert('Error al rechazar el comprobante: ' + (err.message || 'Error desconocido'));
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center font-bold">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-slate-900">
                  Bandeja de Aprobación de Comprobantes & Pagos
                </h3>
                {pendingCount > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-500 text-white animate-pulse">
                    {pendingCount} Pendiente{pendingCount > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Valida las transferencias de suscripción realizadas por los dueños de clínicas para activar sus planes.
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

        {/* Filters & Search */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setFilterStatus('pending')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                filterStatus === 'pending'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Pendientes</span>
              {pendingCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-amber-500 text-white">
                  {pendingCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('approved')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                filterStatus === 'approved'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Aprobados
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('rejected')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                filterStatus === 'rejected'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Rechazados
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                filterStatus === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Todos ({businessesWithPayments.length})
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por clínica o ref..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        {/* Receipts List */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="font-semibold text-slate-600">No hay comprobantes en esta categoría</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Cuando una clínica envíe un pago por transferencia aparecerá aquí inmediatamente.
              </p>
            </div>
          ) : (
            filtered.map((biz) => {
              const payment = biz.lastPlanPayment!;
              const status = payment.status || (payment.method === 'transfer' ? 'pending_approval' : 'approved');
              const isPending = status === 'pending_approval';
              const isApproved = status === 'approved';
              const isRejected = status === 'rejected';

              const whatsappChat = buildWhatsAppPlanLink(
                biz.whatsappNumber || biz.phone,
                `Hola ${biz.name}, te escribo desde la administración de TurnosDisponibles sobre tu comprobante de suscripción (Ref: ${payment.reference}) para el Plan ${payment.plan.toUpperCase()}.`
              );

              return (
                <div
                  key={biz.id}
                  className={`p-4 sm:p-5 rounded-2xl border transition flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    isPending
                      ? 'bg-amber-50/40 border-amber-200 ring-1 ring-amber-300/60'
                      : isApproved
                      ? 'bg-white border-slate-200'
                      : 'bg-rose-50/30 border-rose-200'
                  }`}
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-black text-slate-900 text-sm">{biz.name}</span>
                      <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                        {biz.slug}
                      </span>
                      {isPending && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          <span>Pendiente de Conciliación</span>
                        </span>
                      )}
                      {isApproved && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 flex items-center gap-1">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          <span>Plan Activo & Aprobado</span>
                        </span>
                      )}
                      {isRejected && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 flex items-center gap-1">
                          <XCircle className="w-2.5 h-2.5" />
                          <span>Comprobante Rechazado</span>
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-bold uppercase">Plan Solicitado</span>
                        <span className="font-black text-slate-900 uppercase">Plan {payment.plan}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-bold uppercase">Importe</span>
                        <span className="font-black text-emerald-700">{payment.amount}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-bold uppercase">Método</span>
                        <span className="font-semibold text-slate-700 capitalize">
                          {payment.method === 'mercadopago' ? 'Mercado Pago' : 'Transferencia Bancaria'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-bold uppercase">Fecha de Envío</span>
                        <span className="text-slate-600 text-[11px]">
                          {payment.submittedAt ? new Date(payment.submittedAt).toLocaleDateString('es-AR') : 'Reciente'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1 text-xs">
                      <span className="text-slate-500 font-medium">Nro. Comprobante / Ref:</span>
                      <span className="font-mono font-black text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                        {payment.reference}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(payment.reference)}
                        className="text-slate-400 hover:text-slate-700 p-1 rounded"
                        title="Copiar referencia"
                      >
                        {copiedRef === payment.reference ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    {payment.adminNote && (
                      <div className="text-[11px] text-rose-700 bg-rose-100/50 p-2 rounded-xl mt-1">
                        <strong>Nota del SuperAdmin:</strong> {payment.adminNote}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0 md:flex-col md:items-end justify-end">
                    <a
                      href={whatsappChat}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center gap-1.5 transition"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                      <span>WhatsApp Clínica</span>
                    </a>

                    {isPending && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={processingId === biz.id}
                          onClick={() => handleReject(biz)}
                          className="px-3 py-1.5 rounded-xl border border-rose-200 bg-white hover:bg-rose-50 text-rose-700 text-xs font-bold transition cursor-pointer"
                        >
                          Rechazar
                        </button>
                        <button
                          type="button"
                          disabled={processingId === biz.id}
                          onClick={() => handleApprove(biz)}
                          className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-sm transition flex items-center gap-1 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Aprobar y Activar Plan</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>
            Las aprobaciones actualizan los límites del inquilino (tenant) en tiempo real en la base de datos.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs transition cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
