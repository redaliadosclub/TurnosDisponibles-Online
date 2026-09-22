export type Role = 'superadmin' | 'business_owner' | 'staff' | 'customer';

export type BusinessTypeKey =
  | 'medical'
  | 'dental'
  | 'beauty'
  | 'veterinary'
  | 'psychology'
  | 'fitness'
  | 'services';

export interface BusinessTypeLabels {
  clientLabel: string;
  clientsLabel: string;
  professionalLabel: string;
  professionalsLabel: string;
  serviceLabel: string;
  servicesLabel: string;
  appointmentLabel: string;
  appointmentsLabel: string;
  specialtyLabel: string;
}

export type BusinessPlan = 'free' | 'pro' | 'business' | 'whitelabel';

export interface Business {
  id: string;
  slug: string;
  name: string;
  businessType: BusinessTypeKey;
  customLabels?: Partial<BusinessTypeLabels>;
  description: string;
  category: string;
  address: string;
  phone: string;
  whatsappNumber: string; // e.g. 5491148219900
  logoUrl?: string;
  primaryColor: string; // Hex e.g. #0284c7
  welcomeMessage: string;
  cancellationPolicy: string;
  bufferMinutes: number;
  plan: BusinessPlan;
  status: 'active' | 'trial' | 'suspended';
  createdAt: string;

  // White Label / Marca Blanca fields
  whiteLabelEnabled?: boolean;
  whiteLabelBrandName?: string;
  whiteLabelCustomDomain?: string;
  whiteLabelHidePoweredBy?: boolean;
  whiteLabelCustomFooterText?: string;
  whiteLabelSupportEmail?: string;
  whiteLabelSupportPhone?: string;

  // FlaxxaWAPI / Flowomatic / Evolution API Automation
  wapiEnabled?: boolean;
  wapiProvider?: 'evolution' | 'flaxxa' | 'flowomatic' | 'custom';
  wapiWebhookUrl?: string;
  wapiApiKey?: string;
  wapiInstanceId?: string;
  wapiSendConfirmation?: boolean;
  wapiReminderHoursBefore?: number;

  // Payments, Deposit & Mercado Pago settings
  paymentsEnabled?: boolean;
  depositRequired?: boolean;
  depositType?: 'fixed' | 'percentage';
  depositAmount?: number;
  mpPublicKey?: string;
  mpAccessToken?: string;
  mpAlias?: string;
  mpPaymentLink?: string;
  mpAliasOrLink?: string;
  bankAlias?: string;
  bankCbu?: string;
  bankAccountHolder?: string;
  bankName?: string;
  paymentInstructions?: string;

  // Plan Experiencia AI: WhatsApp Bot & Assistant 24/7
  aiBotEnabled?: boolean;
  aiBotName?: string;
  aiBotTone?: 'professional' | 'warm' | 'commercial';
  aiBotWelcomeMessage?: string;
  aiBotSystemPrompt?: string; // Custom instructions / tone prompt
  aiBotAutoReschedule?: boolean;
  aiBotAutoCancel?: boolean;
  aiBotShowPrices?: boolean;
  aiBotAllowBookingLink?: boolean;
}

export interface Professional {
  id: string;
  businessId: string;
  name: string;
  title: string;
  photoUrl: string;
  email: string;
  phone: string;
  active: boolean;
  specialty: string;
  serviceIds: string[];
}

export interface Service {
  id: string;
  businessId: string;
  name: string;
  description: string;
  durationMinutes: number;
  price: number;
  currency: string;
  active: boolean;
  assignedProfessionalIds: string[];
}

export interface Shift {
  start: string; // "08:00"
  end: string; // "12:00"
}

export interface WorkingHours {
  id: string;
  businessId: string;
  professionalId: string | null; // null = business default
  dayOfWeek: number; // 0=Sunday, 1=Monday, ..., 6=Saturday
  shifts: Shift[];
  enabled: boolean;
}

export type TimeOffType = 'vacation' | 'holiday' | 'absence' | 'manual_block';

export interface TimeOff {
  id: string;
  businessId: string;
  professionalId: string | null; // null = all
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  startTime?: string;
  endTime?: string;
  reason: string;
  type: TimeOffType;
}

export interface Customer {
  id: string;
  businessId: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  notes?: string;
  totalAppointments: number;
  lastAppointmentDate?: string;
  createdAt: string;
}

export type AppointmentStatus =
  | 'pending'
  | 'confirmed'
  | 'cancelled'
  | 'completed'
  | 'no_show';

export interface Appointment {
  id: string;
  bookingCode: string;
  businessId: string;
  professionalId: string;
  serviceId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  notes?: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  status: AppointmentStatus;
  paymentStatus?: 'pending' | 'deposit_pending' | 'deposit_paid' | 'paid' | 'not_required';
  paymentMethod?: 'mercadopago' | 'transfer' | 'cash';
  depositAmount?: number;
  cancellationReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TimeSlot {
  time: string; // HH:mm
  endTime: string; // HH:mm
  available: boolean;
  reason?: 'booked' | 'outside_hours' | 'time_off' | 'past';
}

export interface AvailabilityResponse {
  date: string;
  professionalId: string;
  serviceId: string;
  slots: TimeSlot[];
  totalAvailable: number;
  totalSlots: number;
  status: 'available' | 'low_availability' | 'full';
}

export interface NotificationPayload {
  customerPhone: string;
  customerName: string;
  businessPhone: string;
  businessName: string;
  professionalName: string;
  serviceName: string;
  date: string;
  time: string;
  bookingCode: string;
  address: string;
}

export interface AnalyticsEvent {
  id: string;
  businessId: string;
  type: 'page_view' | 'booking_start' | 'booking_completed' | 'booking_cancelled' | 'whatsapp_click';
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  businessId?: string | null;
}

export type UserSession = User;

