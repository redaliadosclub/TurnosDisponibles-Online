import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  FileText,
  Building2,
  Calendar,
  Clock,
  Printer,
  AlertCircle,
  ExternalLink,
  ChevronLeft,
} from 'lucide-react';
import { MedicalPrescription } from '../../types';

interface PrescriptionVerificationViewProps {
  code: string;
  onBackToApp: () => void;
}

export function PrescriptionVerificationView({
  code,
  onBackToApp,
}: PrescriptionVerificationViewProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    valid: boolean;
    prescription?: MedicalPrescription;
    business?: { name: string; slug: string; phone?: string };
    professional?: { name: string; title: string; specialty: string; licenseNumber?: string };
    appointment?: { bookingCode: string; date: string; startTime: string; customerName: string };
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/prescriptions/verify/${code}`)
      .then((res) => {
        if (!res.ok) throw new Error('Receta no encontrada o código de verificación caducado');
        return res.json();
      })
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [code]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-white">
        <div className="w-10 h-10 border-3 border-teal-500 border-t-transparent rounded-full animate-spin mb-4" />
        <h3 className="text-base font-bold">Verificando autenticidad de la receta...</h3>
        <p className="text-xs text-slate-400 mt-1">Consultando registro de firma electrónica</p>
      </div>
    );
  }

  if (error || !data || !data.valid) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-slate-200">
        <div className="bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-md w-full border border-slate-800 text-center space-y-4 shadow-2xl">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-black text-white">Receta No Encontrada</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            {error || 'El código de verificación ingresado no corresponde a una receta médica emitida en el sistema.'}
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={onBackToApp}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition cursor-pointer"
            >
              Volver a TurnosDisponibles
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { prescription, business, professional, appointment } = data;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center py-6 sm:py-10 px-4">
      <div className="max-w-2xl w-full space-y-6">
        {/* Navigation / Header */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onBackToApp}
            className="flex items-center gap-1.5 text-xs text-teal-400 hover:text-teal-300 font-bold transition cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Volver a la plataforma</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-teal-400" />
            <span>Imprimir Certificado</span>
          </button>
        </div>

        {/* Verification Success Badge Card */}
        <div className="p-4 sm:p-5 rounded-3xl bg-emerald-950/60 border border-emerald-500/40 shadow-xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black text-white">Receta Médica Auténtica y Verificada</h3>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950">
                Válida
              </span>
            </div>
            <p className="text-xs text-emerald-300/80 mt-0.5">
              Emitida por profesional matriculado a través de la plataforma TurnosDisponibles.
            </p>
          </div>
        </div>

        {/* Prescription Certificate Body */}
        <div className="bg-white text-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6">
          {/* Header */}
          <div className="pb-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-black uppercase text-teal-700 tracking-wider">Establecimiento</span>
              <h2 className="text-lg font-black text-slate-900">{business?.name || prescription?.businessName}</h2>
              <span className="text-xs text-slate-500">Atención Médica & Teleconsultas</span>
            </div>
            <div className="sm:text-right">
              <span className="text-[10px] font-black uppercase text-teal-700 tracking-wider">Profesional Emisor</span>
              <h4 className="text-sm font-extrabold text-slate-900">{professional?.name || prescription?.professionalName}</h4>
              <div className="text-xs text-slate-600 font-semibold">{professional?.specialty || prescription?.professionalSpecialty}</div>
              <div className="text-xs font-mono font-bold text-teal-800">
                {professional?.licenseNumber || prescription?.professionalLicense || 'Matrícula Oficial'}
              </div>
            </div>
          </div>

          {/* Patient Details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
            <div>
              <span className="text-[10px] text-slate-400 font-bold block uppercase">Paciente</span>
              <strong className="text-sm text-slate-900 block">{prescription?.patientName}</strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold block uppercase">DNI / Documento</span>
              <span className="font-mono text-xs text-slate-800">{prescription?.patientDni || 'Constatado en consulta'}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold block uppercase">Fecha de Emisión</span>
              <span className="text-xs text-slate-800 font-medium">
                {prescription?.issuedAt ? new Date(prescription.issuedAt).toLocaleDateString('es-AR', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                }) : 'Reciente'}
              </span>
            </div>
          </div>

          {/* Diagnosis */}
          {prescription?.diagnosis && (
            <div className="text-xs p-3 rounded-xl bg-teal-50/50 border border-teal-200/60">
              <span className="text-[10px] font-bold text-teal-800 uppercase block">Diagnóstico Médico</span>
              <span className="font-semibold text-slate-900">{prescription.diagnosis}</span>
            </div>
          )}

          {/* Prescribed Items (Rp) */}
          <div className="space-y-3">
            <h4 className="font-black text-slate-900 text-sm flex items-center gap-2">
              <span className="text-base font-serif italic font-bold text-teal-700">Rp /</span>
              <span>Medicamentos e Indicaciones Prescriptas</span>
            </h4>

            <div className="space-y-2.5">
              {prescription?.items?.map((item, idx) => (
                <div key={idx} className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-1 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-slate-900 text-sm">{item.medication}</span>
                    {item.presentation && (
                      <span className="text-xs font-semibold text-slate-600">({item.presentation})</span>
                    )}
                  </div>
                  <div className="text-xs text-slate-700 font-medium">
                    <strong>Dosis:</strong> {item.dosage}
                    {item.duration && <span> • <strong>Duración:</strong> {item.duration}</span>}
                    {item.instructions && <span> • {item.instructions}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* General Instructions */}
          {prescription?.generalInstructions && (
            <div className="text-xs p-3 rounded-xl border border-slate-200 bg-white">
              <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Indicaciones Generales</span>
              <p className="text-slate-700 leading-relaxed">{prescription.generalInstructions}</p>
            </div>
          )}

          {/* Footer Signature & Hash Verification */}
          <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div>
              <span className="font-mono text-[10px] text-slate-400 block">
                Código de Validación: <strong>{prescription?.verificationCode}</strong>
              </span>
              <span className="font-mono text-[9px] text-slate-400 block">
                Firma Digital Certificada • Hash SHA-256
              </span>
            </div>

            <div className="text-center sm:text-right">
              <div className="font-serif italic font-bold text-slate-900 text-sm">
                {professional?.name || prescription?.professionalName}
              </div>
              <div className="text-[10px] font-mono text-teal-800 font-bold">
                {professional?.licenseNumber || prescription?.professionalLicense}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
