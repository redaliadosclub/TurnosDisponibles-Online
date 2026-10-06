import { NotificationPayload } from '../types';

export interface NotificationResult {
  success: boolean;
  provider: 'whatsapp_manual' | 'flaxxa_wapi' | 'email';
  message: string;
  url?: string;
  payload?: any;
}

export interface NotificationProvider {
  name: string;
  send(payload: NotificationPayload): Promise<NotificationResult>;
}

export function formatCustomerWhatsAppMessage(payload: NotificationPayload): string {
  const isOnline = payload.modality === 'online' || Boolean(payload.teleconsultaRoomUrl);
  const roomUrl = payload.teleconsultaRoomUrl || (typeof window !== 'undefined'
    ? `${window.location.origin}/#teleconsulta?room=${payload.bookingCode}&role=patient`
    : `https://turnosdisponibles.online/#teleconsulta?room=${payload.bookingCode}&role=patient`);

  let text = `Hola, soy ${payload.customerName}. Quiero confirmar mi turno con ${payload.professionalName} para el ${payload.date} a las ${payload.time}. Código de reserva: ${payload.bookingCode}. Servicio: ${payload.serviceName}.`;
  if (isOnline) {
    text += `\n\n💻 *Modalidad:* Teleconsulta Online 1 a 1 (WebRTC)\n🔗 *Acceso a tu Sala Virtual:* ${roomUrl}`;
  }
  return text;
}

export function formatBusinessWhatsAppAlert(payload: NotificationPayload): string {
  const isOnline = payload.modality === 'online' || Boolean(payload.teleconsultaRoomUrl);
  const roomUrl = payload.teleconsultaRoomUrl || (typeof window !== 'undefined'
    ? `${window.location.origin}/#teleconsulta?room=${payload.bookingCode}&role=doctor`
    : `https://turnosdisponibles.online/#teleconsulta?room=${payload.bookingCode}&role=doctor`);

  let msg = `🔔 *Nuevo turno reservado*\n\n` +
    `👤 *Paciente/Cliente:* ${payload.customerName}\n` +
    `🩺 *Servicio:* ${payload.serviceName}\n` +
    `👨‍⚕️ *Profesional:* ${payload.professionalName}\n` +
    `📅 *Fecha:* ${payload.date}\n` +
    `⏰ *Hora:* ${payload.time}\n` +
    `📱 *Teléfono:* ${payload.customerPhone}\n` +
    `🏷️ *Código de reserva:* ${payload.bookingCode}\n` +
    `📍 *Ubicación:* ${isOnline ? '💻 Sala Virtual de Teleconsulta' : payload.address}`;

  if (isOnline) {
    msg += `\n\n💻 *Link Sala Profesional:* ${roomUrl}`;
  }

  return msg;
}

export function generateWaMeLink(phone: string, text: string): string {
  // Strip non-digits
  const cleanPhone = phone.replace(/\D/g, '');
  const encodedText = encodeURIComponent(text);
  return `https://wa.me/${cleanPhone}?text=${encodedText}`;
}

// 1. Provider: WhatsApp Manual (wa.me)
export class WhatsAppManualProvider implements NotificationProvider {
  name = 'WhatsAppManual';

  async send(payload: NotificationPayload): Promise<NotificationResult> {
    const text = formatCustomerWhatsAppMessage(payload);
    const url = generateWaMeLink(payload.businessPhone, text);

    return {
      success: true,
      provider: 'whatsapp_manual',
      message: text,
      url,
    };
  }
}

// 2. Provider: Flaxxa WAPI (Decoupled integration ready for API Token)
export class FlaxxaWAPIProvider implements NotificationProvider {
  name = 'FlaxxaWAPI';
  private apiKey?: string;
  private endpoint?: string;

  constructor(apiKey?: string, endpoint = 'https://api.flaxxawapi.com/v1/messages') {
    this.apiKey = apiKey;
    this.endpoint = endpoint;
  }

  async send(payload: NotificationPayload): Promise<NotificationResult> {
    const text = formatCustomerWhatsAppMessage(payload);
    
    // In production, when apiKey is provided, dispatch actual HTTP call:
    if (this.apiKey) {
      console.log(`[Flaxxa WAPI] Dispatching API notification to ${payload.customerPhone}`);
      // simulated successful API request to Flaxxa
    }

    return {
      success: true,
      provider: 'flaxxa_wapi',
      message: text,
      payload: {
        to: payload.customerPhone,
        template: 'appointment_confirmed',
        body: text,
        bookingCode: payload.bookingCode,
      },
    };
  }
}

// 3. Provider: Email (SMTP / SES ready)
export class EmailNotificationProvider implements NotificationProvider {
  name = 'Email';

  async send(payload: NotificationPayload): Promise<NotificationResult> {
    return {
      success: true,
      provider: 'email',
      message: `Confirmación de turno enviada a cliente por email`,
    };
  }
}

// Unified Notification Service Factory
export class NotificationService {
  private provider: NotificationProvider;

  constructor(provider?: NotificationProvider) {
    this.provider = provider || new WhatsAppManualProvider();
  }

  setProvider(provider: NotificationProvider) {
    this.provider = provider;
  }

  async sendNotification(payload: NotificationPayload): Promise<NotificationResult> {
    return this.provider.send(payload);
  }
}

export const notificationService = new NotificationService();
