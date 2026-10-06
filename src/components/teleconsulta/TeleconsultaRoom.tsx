import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Share2,
  Monitor,
  RefreshCw,
  MessageSquare,
  FileText,
  Clock,
  ShieldCheck,
  User,
  Sparkles,
  Maximize2,
  Minimize2,
  Send,
  X,
  CheckCircle2,
  AlertCircle,
  Download,
  Stethoscope,
} from 'lucide-react';
import { useWebRTC } from '../../hooks/useWebRTC';
import { MedicalPrescriptionModal } from './MedicalPrescriptionModal';
import { Appointment, Business, Professional, MedicalPrescription } from '../../types';

interface TeleconsultaRoomProps {
  appointment: Appointment;
  business: Business;
  professional: Professional;
  userRole: 'doctor' | 'patient';
  userName: string;
  onExit: () => void;
  onSavePrescription?: (prescription: MedicalPrescription) => Promise<void>;
}

export function TeleconsultaRoom({
  appointment,
  business,
  professional,
  userRole,
  userName,
  onExit,
  onSavePrescription,
}: TeleconsultaRoomProps) {
  const [callDuration, setCallDuration] = useState(0);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [activePrescription, setActivePrescription] = useState<MedicalPrescription | null>(
    appointment.prescription || null
  );
  const [prescriptionNotice, setPrescriptionNotice] = useState<string | null>(null);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const {
    localStream,
    remoteStream,
    connectionStatus,
    errorMessage,
    isAudioMuted,
    isVideoOff,
    isScreenSharing,
    remotePeerName,
    chatMessages,
    toggleAudio,
    toggleVideo,
    flipCamera,
    toggleScreenShare,
    sendChatMessage,
    broadcastPrescription,
    endCall,
  } = useWebRTC({
    room: appointment.bookingCode,
    role: userRole,
    userName,
    onPrescriptionReceived: (prescription) => {
      setActivePrescription(prescription);
      setPrescriptionNotice('¡Tu especialista acaba de emitir tu Receta Médica Digital!');
      setTimeout(() => setPrescriptionNotice(null), 9000);
    },
  });

  // Attach local stream
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Attach remote stream
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Call duration counter
  useEffect(() => {
    let timer: any;
    if (connectionStatus === 'connected') {
      timer = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [connectionStatus]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
      .toString()
      .padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    sendChatMessage(chatInput.trim());
    setChatInput('');
  };

  const handlePrescriptionSavedInternal = async (prescription: MedicalPrescription) => {
    setActivePrescription(prescription);
    broadcastPrescription(prescription);
    if (onSavePrescription) {
      await onSavePrescription(prescription);
    }
  };

  const isConnected = connectionStatus === 'connected';

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col overflow-hidden text-white select-none">
      {/* Top Header Bar */}
      <div className="h-16 px-4 sm:px-6 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between shrink-0 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center font-bold">
            <Stethoscope className="w-5 h-5 text-teal-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-sm sm:text-base text-white truncate max-w-[200px] sm:max-w-xs">
                {business.name}
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-teal-950 text-teal-300 border border-teal-800">
                Teleconsulta WebRTC
              </span>
            </div>
            <div className="text-xs text-slate-400">
              {userRole === 'doctor' ? (
                <span>Paciente: <strong className="text-slate-200">{appointment.customerName}</strong></span>
              ) : (
                <span>Especialista: <strong className="text-slate-200">{professional.name}</strong></span>
              )}
            </div>
          </div>
        </div>

        {/* Status & Timer */}
        <div className="flex items-center gap-3">
          {isConnected ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-800/80 text-emerald-300 text-xs font-mono font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>{formatTimer(callDuration)}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-950/80 border border-amber-800/80 text-amber-300 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              <span>{connectionStatus === 'connecting' ? 'Conectando...' : 'Sala de Espera'}</span>
            </div>
          )}

          {/* Quick Prescription Preview Button */}
          {activePrescription && (
            <button
              type="button"
              onClick={() => setShowPrescriptionModal(true)}
              className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-sm cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Ver Receta Emitida</span>
            </button>
          )}

          <button
            type="button"
            onClick={onExit}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title="Salir del consultorio"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Live Prescription Notification Toast for Patient */}
      {prescriptionNotice && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 p-4 rounded-2xl bg-teal-500 text-slate-950 shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
          <Sparkles className="w-5 h-5 shrink-0" />
          <span className="font-extrabold text-xs sm:text-sm">{prescriptionNotice}</span>
          <button
            type="button"
            onClick={() => setShowPrescriptionModal(true)}
            className="px-3 py-1 bg-slate-950 text-white rounded-xl text-xs font-bold hover:bg-slate-900 transition"
          >
            Abrir Receta
          </button>
        </div>
      )}

      {/* Main Video Call Area + Chat Sidebar */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Video Canvas Container */}
        <div className="flex-1 p-3 sm:p-4 flex items-center justify-center relative bg-slate-950">
          {/* Main Remote Video or Waiting Room Screen */}
          {remoteStream && isConnected ? (
            <div className="w-full h-full relative rounded-3xl overflow-hidden bg-slate-900 border border-slate-800 shadow-2xl flex items-center justify-center">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover sm:object-contain bg-black"
              />
              {/* Remote Name Overlay */}
              <div className="absolute top-4 left-4 px-3 py-1 rounded-xl bg-black/60 backdrop-blur-md text-white text-xs font-bold flex items-center gap-2 border border-white/10">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>{remotePeerName || (userRole === 'doctor' ? appointment.customerName : professional.name)}</span>
              </div>
            </div>
          ) : (
            /* Waiting Room Screen */
            <div className="w-full h-full rounded-3xl border border-slate-800 bg-slate-900/60 p-6 sm:p-10 flex flex-col items-center justify-center text-center space-y-6">
              <div className="relative">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-teal-500/10 border-2 border-teal-500/30 text-teal-400 flex items-center justify-center">
                  <Stethoscope className="w-12 h-12 text-teal-400 animate-pulse" />
                </div>
                <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-amber-500 border-2 border-slate-900 flex items-center justify-center text-[10px] font-bold text-slate-950">
                  ●
                </span>
              </div>

              <div className="max-w-md space-y-2">
                <h2 className="text-lg sm:text-xl font-black text-white">
                  {userRole === 'doctor'
                    ? `Consultorio Virtual #${appointment.bookingCode} Iniciado`
                    : `Sala de Espera del Dr. ${professional.name}`}
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  {userRole === 'doctor'
                    ? `Esperando que el paciente (${appointment.customerName}) ingrese a la sala. Tu cámara y micrófono ya están activos y listos.`
                    : `Bienvenido/a ${appointment.customerName}. Tu especialista se conectará a la teleconsulta en breve. Por favor aguarda aquí.`}
                </p>
              </div>

              {/* Security info card */}
              <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs text-slate-400 flex items-center gap-3 max-w-sm">
                <ShieldCheck className="w-5 h-5 text-teal-400 shrink-0" />
                <span className="text-[11px] text-left">
                  Conexión directa P2P WebRTC cifrada de extremo a extremo. Nadie externo puede ver ni grabar esta consulta.
                </span>
              </div>
            </div>
          )}

          {/* Picture-in-Picture Local Video (Self) */}
          <div className="absolute bottom-6 right-6 w-32 h-44 sm:w-44 sm:h-56 rounded-2xl overflow-hidden bg-slate-900 border-2 border-slate-700/80 shadow-2xl z-20 group">
            {localStream ? (
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${isVideoOff ? 'hidden' : 'block'}`}
              />
            ) : null}

            {isVideoOff && (
              <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-slate-500 gap-1">
                <VideoOff className="w-6 h-6" />
                <span className="text-[10px]">Cámara apagada</span>
              </div>
            )}

            {/* Local Name Badge */}
            <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-lg bg-black/70 backdrop-blur-md text-[10px] font-bold text-white flex items-center gap-1.5 border border-white/10">
              <span>Tú ({userName})</span>
              {isAudioMuted && <MicOff className="w-3 h-3 text-rose-400" />}
            </div>
          </div>
        </div>

        {/* In-Call Chat Drawer */}
        {isChatOpen && (
          <div className="w-80 border-l border-slate-800 bg-slate-900 flex flex-col shrink-0">
            <div className="p-3 border-b border-slate-800 flex items-center justify-between">
              <h4 className="font-extrabold text-xs text-white flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-teal-400" />
                <span>Chat de la Consulta</span>
              </h4>
              <button
                type="button"
                onClick={() => setIsChatOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2.5 text-xs">
              {chatMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center p-4">
                  <MessageSquare className="w-8 h-8 text-slate-700 mb-2" />
                  <p className="text-[11px]">Chat privado de la sesión.</p>
                  <p className="text-[10px] text-slate-600 mt-0.5">
                    Puedes enviar links o indicaciones por aquí.
                  </p>
                </div>
              ) : (
                chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-2.5 rounded-xl border text-xs space-y-0.5 ${
                      msg.sender === userName
                        ? 'bg-teal-950/60 border-teal-800/80 ml-4 text-teal-100'
                        : 'bg-slate-800 border-slate-700 mr-4 text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] opacity-75">
                      <strong>{msg.sender}</strong>
                      <span>{msg.timestamp}</span>
                    </div>
                    <p className="break-words leading-relaxed">{msg.text}</p>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleSendChat} className="p-2 border-t border-slate-800 flex gap-1.5">
              <input
                type="text"
                placeholder="Escribe un mensaje..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                className="flex-1 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-teal-500"
              />
              <button
                type="submit"
                className="p-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white transition cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Bottom Call Controls Bar */}
      <div className="h-20 px-4 sm:px-8 bg-slate-900 border-t border-slate-800 flex items-center justify-center sm:justify-between shrink-0">
        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
          <span>Turno #{appointment.bookingCode}</span>
          <span>•</span>
          <span>{appointment.date}</span>
        </div>

        {/* Central Action Buttons */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Mute Mic */}
          <button
            type="button"
            onClick={toggleAudio}
            className={`p-3 sm:p-3.5 rounded-2xl border transition cursor-pointer ${
              isAudioMuted
                ? 'bg-rose-500 hover:bg-rose-600 text-white border-rose-600'
                : 'bg-slate-800 hover:bg-slate-700 text-white border-slate-700'
            }`}
            title={isAudioMuted ? 'Activar micrófono' : 'Silenciar micrófono'}
          >
            {isAudioMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* Toggle Video */}
          <button
            type="button"
            onClick={toggleVideo}
            className={`p-3 sm:p-3.5 rounded-2xl border transition cursor-pointer ${
              isVideoOff
                ? 'bg-rose-500 hover:bg-rose-600 text-white border-rose-600'
                : 'bg-slate-800 hover:bg-slate-700 text-white border-slate-700'
            }`}
            title={isVideoOff ? 'Encender cámara' : 'Apagar cámara'}
          >
            {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
          </button>

          {/* Flip Camera (Mobile) */}
          <button
            type="button"
            onClick={flipCamera}
            className="p-3 sm:p-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition cursor-pointer sm:hidden"
            title="Cambiar de cámara (frontal/trasera)"
          >
            <RefreshCw className="w-5 h-5" />
          </button>

          {/* Screen Share (Desktop) */}
          <button
            type="button"
            onClick={toggleScreenShare}
            className={`hidden sm:flex p-3.5 rounded-2xl border transition cursor-pointer ${
              isScreenSharing
                ? 'bg-teal-600 text-white border-teal-500'
                : 'bg-slate-800 hover:bg-slate-700 text-white border-slate-700'
            }`}
            title={isScreenSharing ? 'Dejar de compartir pantalla' : 'Compartir pantalla'}
          >
            <Monitor className="w-5 h-5" />
          </button>

          {/* Doctor-Only: Generate Prescription Modal */}
          {userRole === 'doctor' && (
            <button
              type="button"
              onClick={() => setShowPrescriptionModal(true)}
              className="flex items-center gap-1.5 px-4 py-3 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white font-extrabold text-xs shadow-md transition cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              <span>{activePrescription ? 'Editar Receta' : 'Emitir Receta'}</span>
            </button>
          )}

          {/* In-Call Chat Toggle */}
          <button
            type="button"
            onClick={() => setIsChatOpen(!isChatOpen)}
            className={`p-3 sm:p-3.5 rounded-2xl border transition cursor-pointer relative ${
              isChatOpen
                ? 'bg-teal-600 text-white border-teal-500'
                : 'bg-slate-800 hover:bg-slate-700 text-white border-slate-700'
            }`}
            title="Abrir chat en vivo"
          >
            <MessageSquare className="w-5 h-5" />
            {chatMessages.length > 0 && !isChatOpen && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-teal-400" />
            )}
          </button>

          {/* End Call Button */}
          <button
            type="button"
            onClick={() => {
              if (confirm('¿Deseas finalizar la teleconsulta?')) {
                endCall();
                onExit();
              }
            }}
            className="p-3 sm:p-3.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white border border-rose-500 font-bold transition shadow-md cursor-pointer ml-1 sm:ml-2"
            title="Finalizar llamada"
          >
            <PhoneOff className="w-5 h-5" />
          </button>
        </div>

        <div className="hidden sm:block text-xs text-slate-500 font-mono">
          WebRTC P2P Seguro
        </div>
      </div>

      {/* Prescription Modal */}
      {showPrescriptionModal && (
        <MedicalPrescriptionModal
          isOpen={showPrescriptionModal}
          onClose={() => setShowPrescriptionModal(false)}
          appointment={appointment}
          business={business}
          professional={professional}
          initialPrescription={activePrescription || undefined}
          readOnly={userRole === 'patient'}
          onPrescriptionSaved={handlePrescriptionSavedInternal}
        />
      )}
    </div>
  );
}
