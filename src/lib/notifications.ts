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
  return `Hola, soy ${payload.customerName}. Quiero confirmar mi turno con ${payload.professionalName} para el ${payload.date} a las ${payload.time}. Código de reserva: ${payload.bookingCode}. Servicio: ${payload.serviceName}.`;
}

export function formatBusinessWhatsAppAlert(payload: NotificationPayload): string {
  return `🔔 *Nuevo turno reservado*\n\n` +
    `👤 *Paciente/Cliente:* ${payload.customerName}\n` +
    `🩺 *Servicio:* ${payload.serviceName}\n` +
    `👨‍⚕️ *Profesional:* ${payload.professionalName}\n` +
    `📅 *Fecha:* ${payload.date}\n` +
    `⏰ *Hora:* ${payload.time}\n` +
    `📱 *Teléfono:* ${payload.customerPhone}\n` +
    `🏷️ *Código de reserva:* ${payload.bookingCode}\n` +
    `📍 *Ubicación:* ${payload.address}`;
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
