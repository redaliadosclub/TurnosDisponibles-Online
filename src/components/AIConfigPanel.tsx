import React, { useState, useEffect } from 'react';
import {
  Bot,
  Sparkles,
  MessageSquare,
  Save,
  Check,
  Zap,
  Sliders,
  HelpCircle,
  Settings,
  PhoneCall,
  Volume2,
  RefreshCw,
  Send,
  Copy,
  Info,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { Business, Service, Professional } from '../types';
import { api } from '../services/api';

interface AIConfigPanelProps {
  business: Business;
  services: Service[];
  professionals: Professional[];
  onBusinessUpdated: (updatedBusiness: Business) => void;
}

export const AIConfigPanel: React.FC<AIConfigPanelProps> = ({
  business,
  services,
  professionals,
  onBusinessUpdated,
}) => {
  // Conversational Mode & Core Settings
  const [aiBotEnabled, setAiBotEnabled] = useState<boolean>(Boolean(business.aiBotEnabled));
  const [aiBotName, setAiBotName] = useState<string>(business.aiBotName || 'Sofía');
  const [aiBotTone, setAiBotTone] = useState<'warm' | 'professional' | 'commercial'>(
    business.aiBotTone || 'warm'
  );
  const [aiBotWelcomeMessage, setAiBotWelcomeMessage] = useState<string>(
    business.aiBotWelcomeMessage ||
      '¡Hola! Soy tu asistente virtual. ¿En qué puedo ayudarte hoy con tus turnos o consultas?'
  );

  // Custom System Prompt & Instructions
  const [aiBotSystemPrompt, setAiBotSystemPrompt] = useState<string>(
    business.aiBotSystemPrompt || ''
  );

  // Advanced toggles
  const [aiBotAutoCancel, setAiBotAutoCancel] = useState<boolean>(business.aiBotAutoCancel ?? true);
  const [aiBotAutoReschedule, setAiBotAutoReschedule] = useState<boolean>(
    business.aiBotAutoReschedule ?? true
  );
  const [aiBotShowPrices, setAiBotShowPrices] = useState<boolean>(
    business.aiBotShowPrices ?? true
  );
  const [aiBotAllowBookingLink, setAiBotAllowBookingLink] = useState<boolean>(
    business.aiBotAllowBookingLink ?? true
  );

  // State
  const [saving, setSaving] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Interactive Live Chat State
  const [chatMessages, setChatMessages] = useState<Array<{
    id: string;
    sender: 'user' | 'bot';
    text: string;
    time: string;
  }>>([
    {
      id: 'welcome',
      sender: 'bot',
      text:
        business.aiBotWelcomeMessage ||
        `¡Hola! 👋 Soy ${business.aiBotName || 'Sofía'}, asistente de ${business.name}. ¿Te gustaría consultar servicios, precios o reservar un turno libre?`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [chatInput, setChatInput] = useState<string>('');
  const [chatSending, setChatSending] = useState<boolean>(false);
  const [copiedPrompt, setCopiedPrompt] = useState<boolean>(false);

  // Synchronize if business prop updates
  useEffect(() => {
    setAiBotEnabled(Boolean(business.aiBotEnabled));
    setAiBotName(business.aiBotName || 'Sofía');
    setAiBotTone(business.aiBotTone || 'warm');
    setAiBotWelcomeMessage(
      business.aiBotWelcomeMessage ||
        '¡Hola! Soy tu asistente virtual. ¿En qué puedo ayudarte hoy con tus turnos o consultas?'
    );
    setAiBotSystemPrompt(business.aiBotSystemPrompt || '');
    setAiBotAutoCancel(business.aiBotAutoCancel ?? true);
    setAiBotAutoReschedule(business.aiBotAutoReschedule ?? true);
    setAiBotShowPrices(business.aiBotShowPrices ?? true);
    setAiBotAllowBookingLink(business.aiBotAllowBookingLink ?? true);
  }, [business]);

  // Prompt Templates according to niche
  const applyPromptTemplate = (type: 'aesthetic' | 'medical' | 'barber' | 'fitness') => {
    let template = '';
    if (type === 'aesthetic') {
      template = `Sos una experta asesora de belleza y dermatocosmiatría.
- Resaltá la importancia del diagnóstico facial previo.
- Respondé con tono cariñoso, usando emojis suaves (✨, 💆‍♀️, 🌸).
- Alentá a agendar con tiempo porque los cupos se agotan rápido.
- Si preguntan por contraindicaciones o embarazo, indicá que se evalúa en la consulta personalizada.`;
    } else if (type === 'medical') {
      template = `Sos la secretaria médica virtual del consultorio.
- Mantené un tono pulcro, empático, claro y respetuoso.
- Aclarar que las urgencias médicas deben acudir a guardia hospitalaria.
- Brindá detalles de preparación previa para cada estudio o consulta cuando corresponda.
- Sé precisa con las órdenes médicas y medios de pago.`;
    } else if (type === 'barber') {
      template = `Sos el asistente del estudio / barbería.
- Hablá con onda, de manera relajada y directa (che, crack, amigo).
- Resaltá la puntualidad y los combos de corte + barba.
- Recomendá reservar con anticipación los viernes y sábados.`;
    } else if (type === 'fitness') {
      template = `Sos el coach virtual del centro de entrenamiento / pilates.
- Tono motivador, enérgico y profesional (💪, 🔥, ⚡).
- Destacá los beneficios de la constancia y clases personalizadas.
- Invitá a reservar la clase de prueba con cupos limitados.`;
    }
    setAiBotSystemPrompt(template);
  };

  const handleSaveAIConfig = async () => {
    try {
      setSaving(true);
      setStatusMessage(null);

      const updated = await api.updateBusiness(business.id, {
        aiBotEnabled,
        aiBotName,
        aiBotTone,
        aiBotWelcomeMessage,
        aiBotSystemPrompt,
        aiBotAutoCancel,
        aiBotAutoReschedule,
        aiBotShowPrices,
        aiBotAllowBookingLink,
      });

      onBusinessUpdated(updated);
      setStatusMessage({
        type: 'success',
        text: '¡Configuración del Asistente de IA guardada exitosamente!',
      });
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: `Error al guardar configuración de IA: ${err.message || 'Error inesperado'}`,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSendChatMessage = async (textToSend?: string) => {
    const text = (textToSend || chatInput).trim();
    if (!text || chatSending) return;

    const userMsg = {
      id: `usr_${Date.now()}`,
      sender: 'user' as const,
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput('');
    setChatSending(true);

    try {
      const res = await api.chatWithAi(business.id, text);
      const botMsg = {
        id: `bot_${Date.now()}`,
        sender: 'bot' as const,
        text: res.reply || 'Hola! ¿En qué puedo ayudarte?',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setChatMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      const errorMsg = {
        id: `err_${Date.now()}`,
        sender: 'bot' as const,
        text: 'Hubo una breve intermitencia en el motor de IA. ¡Probá de nuevo en un segundo!',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setChatMessages((prev) => [...prev, errorMsg]);
    } finally {
      setChatSending(false);
    }
  };

  return (
    <div className="space-y-6" id="ai-config-panel-container">
      {/* Header Banner */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 text-white shadow-md border border-purple-800/40 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-44 h-44 rounded-full bg-purple-600/20 blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-purple-600/30 border border-purple-400/40 text-purple-300 shrink-0">
              <Bot className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white">
                  Motor de Asistente IA & Bot Conversacional 24/7
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-200 border border-purple-400/30 text-[10px] font-bold uppercase tracking-wider">
                  Plan Exp AI
                </span>
              </div>
              <p className="text-xs sm:text-sm text-purple-200/80 mt-1 max-w-2xl leading-relaxed">
                Controlá el comportamiento, el tono, las instrucciones del sistema (Prompt) y probá en tiempo real cómo responde tu asistente en WhatsApp.
              </p>
            </div>
          </div>

          {/* Master Switch */}
          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/20 self-start md:self-auto">
            <div className="text-right">
              <div className="text-xs font-bold text-white">
                {aiBotEnabled ? 'Asistente IA Activado' : 'Asistente IA Pausado'}
              </div>
              <div className="text-[10px] text-purple-200">
                {aiBotEnabled ? 'Respondiendo chats 24/7' : 'Solo respuestas manuales'}
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={aiBotEnabled}
                onChange={(e) => setAiBotEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-500"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Status Notifications */}
      {statusMessage && (
        <div
          className={`p-4 rounded-2xl text-xs font-medium flex items-center gap-2.5 transition-all ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
              : 'bg-rose-50 text-rose-900 border border-rose-200'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <Info className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Main Grid: Settings on Left, Live Simulator on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form & Prompt Editor (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Card 1: Bot Identity & Personality */}
          <div className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-purple-600" />
              <span>Identidad y Tono del Asistente</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nombre del Asistente Virtual
                </label>
                <input
                  type="text"
                  value={aiBotName}
                  onChange={(e) => setAiBotName(e.target.value)}
                  placeholder="Ej: Sofía, Camila, Asistente Belgrano"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Se presentará con este nombre al saludar al cliente.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tono de Comunicación
                </label>
                <select
                  value={aiBotTone}
                  onChange={(e) => setAiBotTone(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                >
                  <option value="warm">✨ Cálido, Empático & Humano (Estética/Spa/Salud)</option>
                  <option value="professional">🩺 Clínico, Formal & Preciso (Medicina/Odontología)</option>
                  <option value="commercial">🚀 Dinámico, Ágil & Comercial (Barberías/Fitness)</option>
                </select>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Ajusta el vocabulario y la cadencia de las frases.
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Mensaje de Bienvenida Inicial
              </label>
              <textarea
                rows={2}
                value={aiBotWelcomeMessage}
                onChange={(e) => setAiBotWelcomeMessage(e.target.value)}
                placeholder="¡Hola! Soy Sofía de Estética Bella. ¿En qué te puedo ayudar hoy?"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Card 2: Custom System Prompt & Instructions (KEY FEATURE) */}
          <div className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <span>Instrucciones Personalizadas (System Prompt)</span>
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Escribí directivas específicas para adaptar las respuestas a las reglas de tu negocio.
                </p>
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto text-[11px]">
                <span className="text-slate-400 font-semibold text-[10px] shrink-0">Plantillas:</span>
                <button
                  type="button"
                  onClick={() => applyPromptTemplate('aesthetic')}
                  className="px-2 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-800 text-[10px] font-bold border border-purple-200 transition cursor-pointer"
                >
                  Estética
                </button>
                <button
                  type="button"
                  onClick={() => applyPromptTemplate('medical')}
                  className="px-2 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 text-[10px] font-bold border border-blue-200 transition cursor-pointer"
                >
                  Médico
                </button>
                <button
                  type="button"
                  onClick={() => applyPromptTemplate('barber')}
                  className="px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 text-[10px] font-bold border border-amber-200 transition cursor-pointer"
                >
                  Barbería
                </button>
                <button
                  type="button"
                  onClick={() => applyPromptTemplate('fitness')}
                  className="px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-200 transition cursor-pointer"
                >
                  Fitness
                </button>
              </div>
            </div>

            <div>
              <textarea
                rows={6}
                value={aiBotSystemPrompt}
                onChange={(e) => setAiBotSystemPrompt(e.target.value)}
                placeholder={`Ejemplo de directivas:\n- Si te preguntan por promociones de estética, mencioná el 10% de descuento abonando en efectivo.\n- Nunca des diagnósticos médicos definitivos, siempre invitá a la consulta presencial.\n- Recordá que los días sábados atendemos únicamente de mañana.`}
                className="w-full px-3.5 py-3 rounded-2xl border border-slate-300 text-xs font-mono leading-relaxed bg-slate-50 focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
              <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1.5">
                <span>El motor inyecta automáticamente tus servicios, precios, profesionales y horarios en tiempo real.</span>
                <span>{aiBotSystemPrompt.length} caracteres</span>
              </div>
            </div>

            {/* Conversational Capabilities Toggles */}
            <div className="pt-3 border-t border-slate-100 space-y-2.5">
              <label className="text-xs font-bold text-slate-800 block">
                Comportamiento y Reglas de Respuesta
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100/70 transition">
                  <input
                    type="checkbox"
                    checked={aiBotAutoCancel}
                    onChange={(e) => setAiBotAutoCancel(e.target.checked)}
                    className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 mt-0.5"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Cancelación por Código</span>
                    <span className="text-[10px] text-slate-500 leading-tight block">
                      Permite liberar el turno si el paciente provee su código TD-XXXX.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100/70 transition">
                  <input
                    type="checkbox"
                    checked={aiBotShowPrices}
                    onChange={(e) => setAiBotShowPrices(e.target.checked)}
                    className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 mt-0.5"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Informar Precios Exactos</span>
                    <span className="text-[10px] text-slate-500 leading-tight block">
                      Cotiza con los valores actualizados de la base de datos.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100/70 transition">
                  <input
                    type="checkbox"
                    checked={aiBotAllowBookingLink}
                    onChange={(e) => setAiBotAllowBookingLink(e.target.checked)}
                    className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 mt-0.5"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Enviar Link de Agenda</span>
                    <span className="text-[10px] text-slate-500 leading-tight block">
                      Comparte el enlace directo para elegir día y hora online.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100/70 transition">
                  <input
                    type="checkbox"
                    checked={aiBotAutoReschedule}
                    onChange={(e) => setAiBotAutoReschedule(e.target.checked)}
                    className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 mt-0.5"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Sugerencia de Huecos</span>
                    <span className="text-[10px] text-slate-500 leading-tight block">
                      Detecta turnos vacíos en los próximos días y los propone.
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-3">
              <button
                type="button"
                disabled={saving}
                onClick={handleSaveAIConfig}
                className="px-6 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs transition cursor-pointer shadow-sm flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Guardando Ajustes...' : 'Guardar Configuración de IA'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Live WhatsApp Simulator (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-4 rounded-3xl bg-slate-900 text-white shadow-lg border border-slate-800 flex flex-col h-full">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-400" />
                <h5 className="font-bold text-xs text-white">Simulador en Vivo de WhatsApp</h5>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                Gemini Flash
              </span>
            </div>

            {/* Smartphone Graphic Canvas */}
            <div className="rounded-2xl overflow-hidden border border-slate-700 bg-[#efeae2] flex-1 flex flex-col">
              {/* WhatsApp App Header */}
              <div className="bg-[#075e54] text-white px-3.5 py-2.5 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-emerald-700 border border-white/30 flex items-center justify-center font-bold text-xs">
                    {aiBotName.substring(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-bold text-xs leading-tight">{aiBotName} • {business.name}</div>
                    <div className="text-[10px] text-emerald-200 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span>en línea (Asistente Oficial)</span>
                    </div>
                  </div>
                </div>
                <div className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white/15 text-white">
                  24/7 AI
                </div>
              </div>

              {/* Chat Messages Feed */}
              <div className="p-3.5 space-y-2.5 h-72 sm:h-80 overflow-y-auto text-xs flex-1">
                {chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-3 py-2 shadow-xs relative ${
                        msg.sender === 'user'
                          ? 'bg-[#d9fdd3] text-slate-900 rounded-tr-none'
                          : 'bg-white text-slate-900 rounded-tl-none border border-slate-200/60'
                      }`}
                    >
                      <p className="leading-relaxed whitespace-pre-line text-[11px]">{msg.text}</p>
                      <span className="text-[8px] text-slate-400 block text-right mt-0.5">
                        {msg.time}
                      </span>
                    </div>
                  </div>
                ))}

                {chatSending && (
                  <div className="flex justify-start">
                    <div className="bg-white rounded-2xl rounded-tl-none px-3 py-1.5 shadow-xs border border-slate-200/50 flex items-center gap-1 text-slate-500 text-[10px]">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" />
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0.2s]" />
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0.4s]" />
                      <span className="ml-1 text-[10px]">{aiBotName} está escribiendo...</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Prompts */}
              <div className="bg-[#f0f2f5] px-2.5 py-1.5 border-t border-slate-200 flex items-center gap-1 overflow-x-auto scrollbar-none text-[10px]">
                <button
                  type="button"
                  onClick={() => handleSendChatMessage('¿Tienen turnos disponibles esta semana?')}
                  className="px-2 py-0.5 rounded-full bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-medium shrink-0 cursor-pointer"
                >
                  🗓️ Turnos libres
                </button>
                <button
                  type="button"
                  onClick={() => handleSendChatMessage('¿Cuánto cuesta la sesión y qué incluye?')}
                  className="px-2 py-0.5 rounded-full bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-medium shrink-0 cursor-pointer"
                >
                  💰 Precios
                </button>
                <button
                  type="button"
                  onClick={() => handleSendChatMessage('¿Cómo abono la seña por Mercado Pago?')}
                  className="px-2 py-0.5 rounded-full bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-medium shrink-0 cursor-pointer"
                >
                  💳 Señas
                </button>
                <button
                  type="button"
                  onClick={() => handleSendChatMessage('Quiero cancelar mi turno TD-1024')}
                  className="px-2 py-0.5 rounded-full bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-medium shrink-0 cursor-pointer"
                >
                  ❌ Cancelar
                </button>
              </div>

              {/* Input Bar */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendChatMessage();
                }}
                className="bg-[#f0f2f5] p-2 border-t border-slate-200 flex items-center gap-1.5"
              >
                <input
                  type="text"
                  placeholder="Escribí al bot de WhatsApp..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  disabled={chatSending}
                  className="flex-1 px-3 py-1.5 rounded-full border border-slate-300 bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#075e54]"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim() || chatSending}
                  className="w-8 h-8 rounded-full bg-[#075e54] hover:bg-[#128c7e] text-white flex items-center justify-center shrink-0 disabled:opacity-50 transition cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
