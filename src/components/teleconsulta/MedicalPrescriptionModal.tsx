import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  FileText,
  Plus,
  Trash2,
  Printer,
  Download,
  Share2,
  CheckCircle2,
  ShieldCheck,
  QrCode,
  Sparkles,
  Stethoscope,
  Send,
  MessageCircle,
  Copy,
  Check,
} from 'lucide-react';
import QRCode from 'qrcode';
import { MedicalPrescription, PrescriptionItem, Professional, Business, Appointment } from '../../types';
import { generateWaMeLink } from '../../lib/notifications';

interface MedicalPrescriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: Appointment;
  business: Business;
  professional: Professional;
  onPrescriptionSaved: (prescription: MedicalPrescription) => Promise<void>;
  initialPrescription?: MedicalPrescription;
  readOnly?: boolean;
}

export function MedicalPrescriptionModal({
  isOpen,
  onClose,
  appointment,
  business,
  professional,
  onPrescriptionSaved,
  initialPrescription,
  readOnly = false,
}: MedicalPrescriptionModalProps) {
  const [patientDni, setPatientDni] = useState(initialPrescription?.patientDni || '');
  const [diagnosis, setDiagnosis] = useState(initialPrescription?.diagnosis || '');
  const [licenseNumber, setLicenseNumber] = useState(
    initialPrescription?.professionalLicense || professional.licenseNumber || 'MN 142.890 / MP 4.520'
  );
  const [generalInstructions, setGeneralInstructions] = useState(
    initialPrescription?.generalInstructions || 'Consumir con abundante agua. Control evolutivo en caso de persistencia del cuadro.'
  );

  const [items, setItems] = useState<PrescriptionItem[]>(
    initialPrescription?.items || [
      {
        medication: 'Ibuprofeno',
        presentation: 'Comprimidos 400 mg',
        dosage: '1 comprimido cada 8 horas',
        duration: '3 a 5 días',
        instructions: 'Tomar después de las comidas',
      },
    ]
  );

  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [activePrescription, setActivePrescription] = useState<MedicalPrescription | null>(
    initialPrescription || null
  );

  const verificationCode = useRef(
    initialPrescription?.verificationCode || `RX-${Math.floor(100000 + Math.random() * 900000)}`
  ).current;

  const verificationUrl = `${window.location.origin}/receta/${verificationCode}`;

  // Generate QR Code
  useEffect(() => {
    QRCode.toDataURL(verificationUrl, {
      width: 160,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('Error generating QR:', err));
  }, [verificationUrl]);

  if (!isOpen) return null;

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        medication: '',
        presentation: '',
        dosage: '',
        duration: '',
        instructions: '',
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof PrescriptionItem, value: string) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const handleSavePrescription = async () => {
    const validItems = items.filter((i) => i.medication.trim().length > 0);
    if (validItems.length === 0) {
      alert('Por favor añade al menos un medicamento o indicación a la receta.');
      return;
    }

    try {
      setIsSaving(true);
      const prescription: MedicalPrescription = {
        id: activePrescription?.id || `rx_${Date.now()}`,
        appointmentId: appointment.id,
        bookingCode: appointment.bookingCode,
        businessId: business.id,
        businessName: business.name,
        professionalId: professional.id,
        professionalName: professional.name,
        professionalTitle: professional.title || 'Médico Especialista',
        professionalSpecialty: professional.specialty,
        professionalLicense: licenseNumber,
        patientName: appointment.customerName,
        patientPhone: appointment.customerPhone,
        patientEmail: appointment.customerEmail,
        patientDni,
        diagnosis,
        items: validItems,
        generalInstructions,
        issuedAt: activePrescription?.issuedAt || new Date().toISOString(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        verificationCode,
        verificationUrl,
        signatureStamp: `DIGITAL-SHA256-${verificationCode}-CERT`,
      };

      await onPrescriptionSaved(prescription);
      setActivePrescription(prescription);
      alert('¡Receta médica digital emitida y guardada con éxito!');
    } catch (err: any) {
      console.error(err);
      alert('Error al guardar la receta: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(verificationUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const whatsappMessage = `Hola ${appointment.customerName}, te compartimos tu Receta Médica Digital emitida por ${professional.name} (${professional.title}) en ${business.name}.\n\n📋 *Código de Validación:* ${verificationCode}\n🔗 *Ver y Descargar Receta Oficial:* ${verificationUrl}\n\nPuedes presentar este enlace o el código QR en cualquier farmacia.`;
  const whatsappUrl = generateWaMeLink(appointment.customerPhone, whatsappMessage);

  return (
    <div className="fixed inset-0 z-[70] bg-black/75 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[94vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-700 flex items-center justify-center font-bold">
              <FileText className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
                  {readOnly ? 'Receta Médica Digital' : 'Generador de Receta & Prescripción Digital'}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-teal-100 text-teal-800 border border-teal-200">
                  QR Oficial
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Turno #{appointment.bookingCode} • Paciente: <strong>{appointment.customerName}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition cursor-pointer"
              title="Imprimir receta"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Printable Document Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 text-xs text-slate-800" id="printable-prescription">
          {/* Official Letterhead Header */}
          <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-teal-700 block">
                  Establecimiento / Clínica
                </span>
                <h2 className="text-base sm:text-lg font-black text-slate-900">{business.name}</h2>
                <span className="text-[11px] text-slate-500">
                  {business.address || 'Atención Médica & Teleconsultas'} • Tel: {business.phone}
                </span>
              </div>
              <div className="sm:text-right">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-teal-700 block">
                  Profesional Emisor
                </span>
                <h4 className="font-extrabold text-slate-900 text-sm">{professional.name}</h4>
                <div className="text-[11px] text-slate-600 font-medium">
                  {professional.title || 'Médico'} • {professional.specialty}
                </div>
                {!readOnly ? (
                  <div className="mt-1 flex items-center sm:justify-end gap-1">
                    <span className="text-[10px] text-slate-400 font-bold">Matrícula:</span>
                    <input
                      type="text"
                      value={licenseNumber}
                      onChange={(e) => setLicenseNumber(e.target.value)}
                      placeholder="MN 123.456 / MP 7.890"
                      className="px-2 py-0.5 rounded border border-slate-300 font-mono text-[10px] bg-slate-50 focus:bg-white text-slate-900 w-36"
                    />
                  </div>
                ) : (
                  <div className="text-[10px] font-mono text-slate-500 font-bold">
                    {licenseNumber}
                  </div>
                )}
              </div>
            </div>

            {/* Patient Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div>
                <span className="text-[10px] text-slate-400 font-bold block uppercase">Paciente</span>
                <span className="font-extrabold text-slate-900 text-sm">{appointment.customerName}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold block uppercase">DNI / Documento</span>
                {!readOnly ? (
                  <input
                    type="text"
                    value={patientDni}
                    onChange={(e) => setPatientDni(e.target.value)}
                    placeholder="Ej. 38.450.912"
                    className="w-full px-2 py-1 rounded border border-slate-300 text-xs bg-slate-50 focus:bg-white font-mono mt-0.5"
                  />
                ) : (
                  <span className="font-mono text-xs text-slate-700">{patientDni || 'Sin especificar'}</span>
                )}
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold block uppercase">Fecha de Emisión</span>
                <span className="font-medium text-slate-700 text-xs mt-0.5 block">
                  {new Date().toLocaleDateString('es-AR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              </div>
            </div>

            {/* Diagnosis */}
            <div className="pt-2 border-t border-slate-100">
              <span className="text-[10px] text-slate-400 font-bold block uppercase">Diagnóstico / Motivo</span>
              {!readOnly ? (
                <input
                  type="text"
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  placeholder="Ej. Rinofaringitis aguda, Control dermatológico pos-tratamiento, etc."
                  className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 text-xs bg-slate-50 focus:bg-white mt-1"
                />
              ) : (
                <span className="text-xs font-semibold text-slate-900 block mt-0.5">
                  {diagnosis || 'Consulta clínica general'}
                </span>
              )}
            </div>
          </div>

          {/* Rx Prescribed Items Box */}
          <div className="p-4 sm:p-5 rounded-2xl border border-teal-200/80 bg-teal-50/20 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-teal-200/50">
              <h4 className="font-black text-slate-900 text-sm flex items-center gap-2">
                <span className="text-lg font-serif italic font-bold text-teal-700">Rp /</span>
                <span>Medicamentos & Tratamientos Prescriptos</span>
              </h4>
              {!readOnly && (
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="flex items-center gap-1 px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Añadir Fármaco / Indicación</span>
                </button>
              )}
            </div>

            <div className="space-y-3">
              {items.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2 relative"
                >
                  {!readOnly && items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className="absolute right-2 top-2 p-1 text-slate-400 hover:text-rose-600 rounded transition cursor-pointer"
                      title="Eliminar este fármaco"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {!readOnly ? (
                    <div className="space-y-2 pr-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Fármaco / Principio Activo *</label>
                          <input
                            type="text"
                            value={item.medication}
                            onChange={(e) => handleItemChange(idx, 'medication', e.target.value)}
                            placeholder="Ej. Paracetamol, Serum Vitamina C"
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-slate-50 focus:bg-white font-bold text-slate-900 mt-0.5"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Presentación / Concentración</label>
                          <input
                            type="text"
                            value={item.presentation || ''}
                            onChange={(e) => handleItemChange(idx, 'presentation', e.target.value)}
                            placeholder="Ej. 500mg Comp. x 20, Crema 30g"
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-slate-50 focus:bg-white mt-0.5"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Posología / Dosis</label>
                          <input
                            type="text"
                            value={item.dosage}
                            onChange={(e) => handleItemChange(idx, 'dosage', e.target.value)}
                            placeholder="Ej. 1 comp cada 8 hs"
                            className="w-full px-2 py-1 rounded-lg border border-slate-300 text-xs bg-slate-50 focus:bg-white mt-0.5"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Duración</label>
                          <input
                            type="text"
                            value={item.duration || ''}
                            onChange={(e) => handleItemChange(idx, 'duration', e.target.value)}
                            placeholder="Ej. Durante 5 días"
                            className="w-full px-2 py-1 rounded-lg border border-slate-300 text-xs bg-slate-50 focus:bg-white mt-0.5"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Instrucciones</label>
                          <input
                            type="text"
                            value={item.instructions || ''}
                            onChange={(e) => handleItemChange(idx, 'instructions', e.target.value)}
                            placeholder="Ej. Con el almuerzo"
                            className="w-full px-2 py-1 rounded-lg border border-slate-300 text-xs bg-slate-50 focus:bg-white mt-0.5"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-900 text-sm">{item.medication}</span>
                        {item.presentation && (
                          <span className="text-xs font-semibold text-slate-500">({item.presentation})</span>
                        )}
                      </div>
                      <div className="text-xs text-slate-700 font-medium">
                        <strong>Dosis:</strong> {item.dosage}
                        {item.duration && <span> • <strong>Duración:</strong> {item.duration}</span>}
                        {item.instructions && <span> • {item.instructions}</span>}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* General Instructions */}
          <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-1.5">
            <label className="block text-[10px] font-bold text-slate-500 uppercase">
              Indicaciones Generales / Recomendaciones del Profesional
            </label>
            {!readOnly ? (
              <textarea
                rows={2}
                value={generalInstructions}
                onChange={(e) => setGeneralInstructions(e.target.value)}
                placeholder="Reposo, signos de alarma, pautas de alarma o cuidado diario..."
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-slate-50 focus:bg-white"
              />
            ) : (
              <p className="text-xs text-slate-700 leading-relaxed">{generalInstructions}</p>
            )}
          </div>

          {/* Digital Signature & QR Validation Stamp Box */}
          <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {qrDataUrl && (
                <div className="p-2 bg-white rounded-xl border border-slate-200 shadow-2xs shrink-0">
                  <img src={qrDataUrl} alt="Código QR de Validación" className="w-20 h-20" />
                </div>
              )}
              <div className="space-y-1 text-[11px]">
                <div className="flex items-center gap-1.5 text-emerald-700 font-bold">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Prescripción Digital Verificada</span>
                </div>
                <div className="font-mono text-slate-700">
                  Código de Validación: <strong className="text-slate-900">{verificationCode}</strong>
                </div>
                <div className="text-slate-500 text-[10px]">
                  Válido para farmacias y obras sociales según normativa de receta digital.
                </div>
              </div>
            </div>

            {/* Doctor Signature Stamp */}
            <div className="text-center sm:text-right border-t sm:border-t-0 sm:border-l border-slate-200 pt-3 sm:pt-0 sm:pl-4">
              <div className="font-serif italic text-base text-slate-800 font-bold mb-0.5">
                {professional.name}
              </div>
              <div className="text-[10px] text-slate-500 font-semibold">{professional.title}</div>
              <div className="text-[10px] font-mono font-bold text-teal-800">{licenseNumber}</div>
              <span className="inline-block mt-1 text-[9px] font-mono text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-200">
                Firma Electrónica Válida
              </span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-white flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyLink}
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Copiado' : 'Copiar Link QR'}</span>
            </button>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-xs flex items-center gap-1.5 transition"
            >
              <MessageCircle className="w-4 h-4 text-emerald-600" />
              <span>Enviar Receta por WhatsApp</span>
            </a>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
            >
              Cerrar
            </button>

            {!readOnly && (
              <button
                type="button"
                disabled={isSaving}
                onClick={handleSavePrescription}
                className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md transition cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isSaving ? 'Guardando...' : 'Emitir y Guardar Receta'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
