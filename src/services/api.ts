import {
  Business,
  Professional,
  Service,
  WorkingHours,
  TimeOff,
  Customer,
  Appointment,
  AvailabilityResponse,
  AnalyticsEvent,
  User,
} from '../types';
import { calculateAvailability } from '../lib/availabilityEngine';
import {
  formatCustomerWhatsAppMessage,
  formatBusinessWhatsAppAlert,
  generateWaMeLink,
} from '../lib/notifications';

export interface BookingPayload {
  businessId: string;
  professionalId: string;
  serviceId: string;
  customer: {
    firstName: string;
    lastName: string;
    phone: string;
    email?: string;
  };
  date: string;
  startTime: string;
  notes?: string;
  paymentMethod?: 'mercadopago' | 'transfer' | 'cash';
  paymentStatus?: 'pending' | 'deposit_pending' | 'deposit_paid' | 'paid' | 'not_required';
  depositAmount?: number;
}

export interface BookingResult {
  appointment: Appointment;
  customer: Customer;
  whatsapp: {
    customerMessage: string;
    customerUrl: string;
    businessMessage: string;
    businessUrl: string;
  };
}

function getTodayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
}

function getTomorrowString(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
}

const today = getTodayString();
const tomorrow = getTomorrowString();

export const INITIAL_BUSINESSES: Business[] = [
  {
    id: 'biz_turnosmed_demo',
    slug: 'turnosmed-demo',
    name: 'TurnosMed Demo (Clínica Médica)',
    businessType: 'medical',
    description: 'Centro de atención médica ambulatoria y diagnóstico con profesionales de primer nivel.',
    category: 'Clínica Médica & Especialidades',
    address: 'Av. Santa Fe 3420, Piso 2, Consultorios A y B, CABA',
    phone: '+54 11 4821-9900',
    whatsappNumber: '5491148219900',
    logoUrl: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=150&auto=format&fit=crop&q=80',
    primaryColor: '#0284c7',
    welcomeMessage: 'Bienvenido al portal de reservas de TurnosMed Demo. Agenda tu consulta en menos de 2 minutos.',
    cancellationPolicy: 'Podrás cancelar o reprogramar tu turno sin penalidad hasta 2 horas antes de la cita.',
    bufferMinutes: 5,
    plan: 'pro',
    status: 'active',
    createdAt: '2026-01-10T10:00:00.000Z',
    paymentsEnabled: true,
    depositRequired: false,
    depositType: 'fixed',
    depositAmount: 5000,
    mpAliasOrLink: 'turnosmed.demo.mp',
    bankAlias: 'TURNOSMED.CONSULTORIOS',
    bankCbu: '0720123488000034981290',
    bankAccountHolder: 'TurnosMed SRL',
    bankName: 'Banco Santander',
    paymentInstructions: 'Para confirmar tu turno, puedes abonar la seña por Mercado Pago o transferencia bancaria y enviar el comprobante.',
  },
  {
    id: 'biz_estetica_bella',
    slug: 'estetica-bella',
    name: 'Estética & Spa Bella',
    businessType: 'beauty',
    description: 'Tratamientos faciales, corporales y diseño de imagen personalizada.',
    category: 'Centro de Estética & Belleza',
    address: 'Calle Arenales 1450, Recoleta, CABA',
    phone: '+54 11 4987-1234',
    whatsappNumber: '5491149871234',
    logoUrl: 'https://images.unsplash.com/photo-1560750588-73207b1ef5b8?w=150&auto=format&fit=crop&q=80',
    primaryColor: '#db2777',
    welcomeMessage: 'Reserva tu tratamiento de belleza con nuestros especialistas.',
    cancellationPolicy: 'Avisar con al menos 4 horas de antelación.',
    bufferMinutes: 10,
    plan: 'pro',
    status: 'active',
    createdAt: '2026-02-15T12:00:00.000Z',
    paymentsEnabled: true,
    depositRequired: true,
    depositType: 'percentage',
    depositAmount: 50,
    mpAliasOrLink: 'estetica.bella.mp',
    bankAlias: 'ESTETICA.BELLA.RECOLETA',
    bankCbu: '0140998822000054321987',
    bankAccountHolder: 'Estética Bella SA',
    bankName: 'Banco Galicia',
    paymentInstructions: 'Se requiere el 50% de seña previa para congelar el turno con la especialista.',
  },
];

export const INITIAL_PROFESSIONALS: Professional[] = [
  {
    id: 'prof_juan',
    businessId: 'biz_turnosmed_demo',
    name: 'Dr. Juan Pérez',
    title: 'Especialista en Cardiología & Medicina General',
    photoUrl: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=160&auto=format&fit=crop&q=80',
    email: 'dr.juan.perez@turnosmed.com',
    phone: '+54 11 4821-9901',
    active: true,
    specialty: 'Cardiología',
    serviceIds: ['srv_consulta', 'srv_cardio'],
  },
  {
    id: 'prof_sofia',
    businessId: 'biz_turnosmed_demo',
    name: 'Dra. Sofía Benítez',
    title: 'Especialista en Dermatología Clínica',
    photoUrl: 'https://images.unsplash.com/photo-1594824813501-4835697203a9?w=160&auto=format&fit=crop&q=80',
    email: 'dra.sofia.benitez@turnosmed.com',
    phone: '+54 11 4821-9902',
    active: true,
    specialty: 'Dermatología',
    serviceIds: ['srv_derma', 'srv_consulta'],
  },
  {
    id: 'prof_valeria',
    businessId: 'biz_estetica_bella',
    name: 'Valeria Rossi',
    title: 'Cosmetóloga y Estilista Senior',
    photoUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=160&auto=format&fit=crop&q=80',
    email: 'valeria@esteticabella.com',
    phone: '+54 11 4987-1235',
    active: true,
    specialty: 'Cosmetología Facial',
    serviceIds: ['srv_facial', 'srv_masaje'],
  },
];

export const INITIAL_SERVICES: Service[] = [
  {
    id: 'srv_consulta',
    businessId: 'biz_turnosmed_demo',
    name: 'Consulta Médica General',
    description: 'Evaluación integral, diagnóstico clínico y prescripción de tratamientos.',
    durationMinutes: 30,
    price: 25000,
    currency: '$',
    active: true,
    assignedProfessionalIds: ['prof_juan', 'prof_sofia'],
  },
  {
    id: 'srv_cardio',
    businessId: 'biz_turnosmed_demo',
    name: 'Chequeo Cardiológico + ECG',
    description: 'Electrocardiograma de 12 derivaciones con informe de apto físico o control cardiovascular.',
    durationMinutes: 45,
    price: 38000,
    currency: '$',
    active: true,
    assignedProfessionalIds: ['prof_juan'],
  },
  {
    id: 'srv_derma',
    businessId: 'biz_turnosmed_demo',
    name: 'Consulta Dermatológica y Mapeo',
    description: 'Revisión preventiva de lunares, acné, manchas y afecciones cutáneas.',
    durationMinutes: 30,
    price: 30000,
    currency: '$',
    active: true,
    assignedProfessionalIds: ['prof_sofia'],
  },
  {
    id: 'srv_facial',
    businessId: 'biz_estetica_bella',
    name: 'Limpieza Facial Profunda con Punta de Diamante',
    description: 'Higiene cutánea, extracción de impurezas, máscara descongestiva e hidratación profunda.',
    durationMinutes: 60,
    price: 35000,
    currency: '$',
    active: true,
    assignedProfessionalIds: ['prof_valeria'],
  },
  {
    id: 'srv_masaje',
    businessId: 'biz_estetica_bella',
    name: 'Masaje Descontracturante y Relajante',
    description: 'Sesión integral de 50 minutos con aceites aromáticos.',
    durationMinutes: 50,
    price: 32000,
    currency: '$',
    active: true,
    assignedProfessionalIds: ['prof_valeria'],
  },
];

const INITIAL_WORKING_HOURS: WorkingHours[] = [
  {
    id: 'wh_tm_1',
    businessId: 'biz_turnosmed_demo',
    professionalId: null,
    dayOfWeek: 1,
    shifts: [{ start: '08:00', end: '12:00' }, { start: '14:00', end: '18:00' }],
    enabled: true,
  },
  {
    id: 'wh_tm_2',
    businessId: 'biz_turnosmed_demo',
    professionalId: null,
    dayOfWeek: 2,
    shifts: [{ start: '08:00', end: '12:00' }, { start: '14:00', end: '18:00' }],
    enabled: true,
  },
  {
    id: 'wh_tm_3',
    businessId: 'biz_turnosmed_demo',
    professionalId: null,
    dayOfWeek: 3,
    shifts: [{ start: '08:00', end: '12:00' }, { start: '14:00', end: '18:00' }],
    enabled: true,
  },
  {
    id: 'wh_tm_4',
    businessId: 'biz_turnosmed_demo',
    professionalId: null,
    dayOfWeek: 4,
    shifts: [{ start: '08:00', end: '12:00' }, { start: '14:00', end: '18:00' }],
    enabled: true,
  },
  {
    id: 'wh_tm_5',
    businessId: 'biz_turnosmed_demo',
    professionalId: null,
    dayOfWeek: 5,
    shifts: [{ start: '08:00', end: '12:00' }, { start: '14:00', end: '18:00' }],
    enabled: true,
  },
  {
    id: 'wh_tm_6',
    businessId: 'biz_turnosmed_demo',
    professionalId: null,
    dayOfWeek: 6,
    shifts: [{ start: '09:00', end: '13:00' }],
    enabled: true,
  },
  {
    id: 'wh_tm_0',
    businessId: 'biz_turnosmed_demo',
    professionalId: null,
    dayOfWeek: 0,
    shifts: [],
    enabled: false,
  },
];

const INITIAL_TIMEOFFS: TimeOff[] = [
  {
    id: 'to_1',
    businessId: 'biz_turnosmed_demo',
    professionalId: 'prof_juan',
    startDate: '2026-12-24',
    endDate: '2026-12-25',
    reason: 'Feriado de Navidad',
    type: 'holiday',
  },
];

const INITIAL_CUSTOMERS: Customer[] = [
  {
    id: 'cust_1',
    businessId: 'biz_turnosmed_demo',
    firstName: 'Carlos',
    lastName: 'Gómez',
    phone: '+5491155443322',
    email: 'carlos.gomez@example.com',
    notes: 'Paciente con antecedentes de hipertensión leve.',
    totalAppointments: 2,
    lastAppointmentDate: today,
    createdAt: '2026-03-01T10:00:00.000Z',
  },
  {
    id: 'cust_2',
    businessId: 'biz_turnosmed_demo',
    firstName: 'María',
    lastName: 'Fernández',
    phone: '+5491166778899',
    email: 'maria.f@example.com',
    notes: 'Control anual de lunares.',
    totalAppointments: 1,
    lastAppointmentDate: today,
    createdAt: '2026-03-02T14:30:00.000Z',
  },
  {
    id: 'cust_3',
    businessId: 'biz_turnosmed_demo',
    firstName: 'Martín',
    lastName: 'López',
    phone: '+5491133221100',
    email: 'martin.lopez@example.com',
    notes: 'Apto físico para gimnasio.',
    totalAppointments: 1,
    lastAppointmentDate: tomorrow,
    createdAt: '2026-03-04T09:15:00.000Z',
  },
];

const INITIAL_APPOINTMENTS: Appointment[] = [
  {
    id: 'app_demo_1',
    bookingCode: 'TM-4821',
    businessId: 'biz_turnosmed_demo',
    professionalId: 'prof_juan',
    serviceId: 'srv_consulta',
    customerId: 'cust_1',
    customerName: 'Carlos Gómez',
    customerPhone: '+5491155443322',
    customerEmail: 'carlos.gomez@example.com',
    notes: 'Control de rutina y análisis de sangre',
    date: today,
    startTime: '08:00',
    endTime: '08:30',
    status: 'confirmed',
    createdAt: '2026-03-01T10:00:00.000Z',
    updatedAt: '2026-03-01T10:00:00.000Z',
  },
  {
    id: 'app_demo_2',
    bookingCode: 'TM-5912',
    businessId: 'biz_turnosmed_demo',
    professionalId: 'prof_juan',
    serviceId: 'srv_cardio',
    customerId: 'cust_3',
    customerName: 'Martín López',
    customerPhone: '+5491133221100',
    customerEmail: 'martin.lopez@example.com',
    notes: 'Apto deportivo',
    date: today,
    startTime: '10:00',
    endTime: '10:45',
    status: 'confirmed',
    createdAt: '2026-03-03T11:20:00.000Z',
    updatedAt: '2026-03-03T11:20:00.000Z',
  },
  {
    id: 'app_demo_3',
    bookingCode: 'TM-7104',
    businessId: 'biz_turnosmed_demo',
    professionalId: 'prof_sofia',
    serviceId: 'srv_derma',
    customerId: 'cust_2',
    customerName: 'María Fernández',
    customerPhone: '+5491166778899',
    customerEmail: 'maria.f@example.com',
    notes: 'Consulta dermatitis de contacto',
    date: today,
    startTime: '14:30',
    endTime: '15:00',
    status: 'confirmed',
    createdAt: '2026-03-02T15:10:00.000Z',
    updatedAt: '2026-03-02T15:10:00.000Z',
  },
];

const STORAGE_KEYS = {
  BUSINESSES: 'td_data_businesses',
  PROFESSIONALS: 'td_data_professionals',
  SERVICES: 'td_data_services',
  WORKING_HOURS: 'td_data_working_hours',
  TIME_OFFS: 'td_data_time_offs',
  CUSTOMERS: 'td_data_customers',
  APPOINTMENTS: 'td_data_appointments',
  USER: 'td_auth_user',
};

function loadStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function saveStorage<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {}
}

export class ApiService {
  private businesses: Business[];
  private professionals: Professional[];
  private services: Service[];
  private workingHours: WorkingHours[];
  private timeOffs: TimeOff[];
  private customers: Customer[];
  private appointments: Appointment[];
  private currentUser: User | null;
  private authListeners: ((user: User | null) => void)[] = [];

  constructor() {
    this.businesses = loadStorage<Business[]>(STORAGE_KEYS.BUSINESSES, INITIAL_BUSINESSES);
    this.professionals = loadStorage<Professional[]>(STORAGE_KEYS.PROFESSIONALS, INITIAL_PROFESSIONALS);
    this.services = loadStorage<Service[]>(STORAGE_KEYS.SERVICES, INITIAL_SERVICES);
    this.workingHours = loadStorage<WorkingHours[]>(STORAGE_KEYS.WORKING_HOURS, INITIAL_WORKING_HOURS);
    this.timeOffs = loadStorage<TimeOff[]>(STORAGE_KEYS.TIME_OFFS, INITIAL_TIMEOFFS);
    this.customers = loadStorage<Customer[]>(STORAGE_KEYS.CUSTOMERS, INITIAL_CUSTOMERS);
    this.appointments = loadStorage<Appointment[]>(STORAGE_KEYS.APPOINTMENTS, INITIAL_APPOINTMENTS);
    this.currentUser = loadStorage<User | null>(STORAGE_KEYS.USER, null);
  }

  onAuthStateChange(callback: (user: User | null) => void) {
    this.authListeners.push(callback);
    return () => {
      this.authListeners = this.authListeners.filter(cb => cb !== callback);
    };
  }

  private notifyAuthChange() {
    this.authListeners.forEach(cb => cb(this.currentUser));
  }

  // Auth methods
  async getCurrentUser(): Promise<User | null> {
    return this.currentUser;
  }

  async login(email: string, password?: string): Promise<User> {
    const cleanEmail = email.trim();
    const lower = cleanEmail.toLowerCase();
    const isSuperAdminEmail = lower === 'agenciaclienteya@gmail.com' || lower.includes('admin');

    if (isSuperAdminEmail && password && password !== 'admin123') {
      throw new Error('Contraseña de SuperAdmin incorrecta');
    }

    let user: User;
    if (isSuperAdminEmail) {
      user = {
        id: 'usr_superadmin_master',
        name: lower === 'agenciaclienteya@gmail.com' ? 'Agencia Cliente Ya (SuperAdmin)' : 'Super Admin Master',
        email: cleanEmail,
        role: 'superadmin',
        businessId: null,
      };
    } else {
      user = {
        id: `usr_${Date.now()}`,
        name: cleanEmail.split('@')[0],
        email: cleanEmail,
        role: 'business_owner',
        businessId: this.businesses[0]?.id || 'biz_turnosmed_demo',
      };
    }

    this.currentUser = user;
    saveStorage(STORAGE_KEYS.USER, user);
    this.notifyAuthChange();
    return user;
  }

  async register(data: { name: string; email: string; password?: string; role: string; businessId?: string | null }): Promise<User> {
    return this.login(data.email, data.password);
  }

  async logout(): Promise<void> {
    this.currentUser = null;
    saveStorage(STORAGE_KEYS.USER, null);
    this.notifyAuthChange();
  }

  // Businesses
  async getBusinesses(): Promise<Business[]> {
    return this.businesses;
  }

  async getAllBusinesses(): Promise<Business[]> {
    return this.businesses;
  }

  async getBusinessBySlug(slug: string): Promise<Business> {
    const found = this.businesses.find(
      (b) => b.slug.toLowerCase() === slug.toLowerCase() || b.id === slug
    );
    if (!found) throw new Error('Negocio no encontrado');
    return found;
  }

  async createBusiness(data: Omit<Business, 'id' | 'createdAt'>): Promise<Business> {
    const newBiz: Business = {
      ...data,
      id: `biz_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    this.businesses.push(newBiz);
    saveStorage(STORAGE_KEYS.BUSINESSES, this.businesses);
    return newBiz;
  }

  async updateBusiness(id: string, data: Partial<Business>): Promise<Business> {
    const idx = this.businesses.findIndex((b) => b.id === id);
    if (idx === -1) throw new Error('Negocio no encontrado');
    const updated = { ...this.businesses[idx], ...data };
    this.businesses[idx] = updated;
    saveStorage(STORAGE_KEYS.BUSINESSES, this.businesses);
    return updated;
  }

  // Professionals
  async getProfessionals(businessId: string): Promise<Professional[]> {
    return this.professionals.filter((p) => p.businessId === businessId);
  }

  async createProfessional(businessId: string, data: Omit<Professional, 'id' | 'businessId'>): Promise<Professional> {
    const newProf: Professional = {
      ...data,
      id: `prof_${Date.now()}`,
      businessId,
    };
    this.professionals.push(newProf);
    saveStorage(STORAGE_KEYS.PROFESSIONALS, this.professionals);
    return newProf;
  }

  async updateProfessional(businessId: string, id: string, data: Partial<Professional>): Promise<Professional> {
    const idx = this.professionals.findIndex((p) => p.id === id && p.businessId === businessId);
    if (idx === -1) throw new Error('Profesional no encontrado');
    const updated = { ...this.professionals[idx], ...data };
    this.professionals[idx] = updated;
    saveStorage(STORAGE_KEYS.PROFESSIONALS, this.professionals);
    return updated;
  }

  async deleteProfessional(businessId: string, id: string): Promise<{ success: boolean }> {
    this.professionals = this.professionals.filter((p) => !(p.id === id && p.businessId === businessId));
    saveStorage(STORAGE_KEYS.PROFESSIONALS, this.professionals);
    return { success: true };
  }

  // Services
  async getServices(businessId: string): Promise<Service[]> {
    return this.services.filter((s) => s.businessId === businessId);
  }

  async createService(businessId: string, data: Omit<Service, 'id' | 'businessId'>): Promise<Service> {
    const newSrv: Service = {
      ...data,
      id: `srv_${Date.now()}`,
      businessId,
    };
    this.services.push(newSrv);
    saveStorage(STORAGE_KEYS.SERVICES, this.services);
    return newSrv;
  }

  async updateService(businessId: string, id: string, data: Partial<Service>): Promise<Service> {
    const idx = this.services.findIndex((s) => s.id === id && s.businessId === businessId);
    if (idx === -1) throw new Error('Servicio no encontrado');
    const updated = { ...this.services[idx], ...data };
    this.services[idx] = updated;
    saveStorage(STORAGE_KEYS.SERVICES, this.services);
    return updated;
  }

  async deleteService(businessId: string, id: string): Promise<{ success: boolean }> {
    this.services = this.services.filter((s) => !(s.id === id && s.businessId === businessId));
    saveStorage(STORAGE_KEYS.SERVICES, this.services);
    return { success: true };
  }

  // Working hours
  async getWorkingHours(businessId: string): Promise<WorkingHours[]> {
    return this.workingHours.filter((w) => w.businessId === businessId);
  }

  async updateWorkingHours(businessId: string, hours: WorkingHours[]): Promise<WorkingHours[]> {
    this.workingHours = this.workingHours.filter((w) => w.businessId !== businessId).concat(hours);
    saveStorage(STORAGE_KEYS.WORKING_HOURS, this.workingHours);
    return hours;
  }

  // Time off
  async getTimeOffs(businessId: string): Promise<TimeOff[]> {
    return this.timeOffs.filter((t) => t.businessId === businessId);
  }

  async createTimeOff(businessId: string, data: Omit<TimeOff, 'id' | 'businessId'>): Promise<TimeOff> {
    const newTo: TimeOff = {
      ...data,
      id: `to_${Date.now()}`,
      businessId,
    };
    this.timeOffs.push(newTo);
    saveStorage(STORAGE_KEYS.TIME_OFFS, this.timeOffs);
    return newTo;
  }

  async deleteTimeOff(businessId: string, id: string): Promise<{ success: boolean }> {
    this.timeOffs = this.timeOffs.filter((t) => !(t.id === id && t.businessId === businessId));
    saveStorage(STORAGE_KEYS.TIME_OFFS, this.timeOffs);
    return { success: true };
  }

  // Customers
  async getCustomers(businessId: string): Promise<Customer[]> {
    return this.customers.filter((c) => c.businessId === businessId);
  }

  // Availability
  async getAvailability(
    businessId: string,
    professionalId: string,
    serviceId: string,
    date: string
  ): Promise<AvailabilityResponse> {
    const biz = this.businesses.find((b) => b.id === businessId);
    const prof = this.professionals.find((p) => p.id === professionalId);
    const srv = this.services.find((s) => s.id === serviceId);

    if (!biz || !prof || !srv) {
      return {
        date,
        professionalId,
        serviceId,
        slots: [],
        totalAvailable: 0,
        totalSlots: 0,
        status: 'full',
      };
    }

    return calculateAvailability({
      business: biz,
      professional: prof,
      service: srv,
      date,
      workingHoursList: this.workingHours.filter((w) => w.businessId === businessId),
      timeOffList: this.timeOffs.filter((t) => t.businessId === businessId),
      appointments: this.appointments.filter((a) => a.businessId === businessId && a.date === date),
    });
  }

  // Appointments
  async getAppointments(businessId: string, filter?: { date?: string; professionalId?: string }): Promise<Appointment[]> {
    return this.appointments.filter((a) => {
      if (a.businessId !== businessId) return false;
      if (filter?.date && a.date !== filter.date) return false;
      if (filter?.professionalId && a.professionalId !== filter.professionalId) return false;
      return true;
    });
  }

  async getAppointment(idOrCode: string): Promise<Appointment> {
    const found = this.appointments.find((a) => a.id === idOrCode || a.bookingCode === idOrCode);
    if (!found) throw new Error('Turno no encontrado');
    return found;
  }

  async bookAppointment(payload: BookingPayload): Promise<BookingResult> {
    const biz = this.businesses.find((b) => b.id === payload.businessId);
    const prof = this.professionals.find((p) => p.id === payload.professionalId);
    const srv = this.services.find((s) => s.id === payload.serviceId);

    if (!biz || !prof || !srv) {
      throw new Error('Datos de negocio o servicio inválidos');
    }

    let cust = this.customers.find(
      (c) => c.businessId === biz.id && c.phone.replace(/\D/g, '') === payload.customer.phone.replace(/\D/g, '')
    );
    if (!cust) {
      cust = {
        id: `cust_${Date.now()}`,
        businessId: biz.id,
        firstName: payload.customer.firstName,
        lastName: payload.customer.lastName,
        phone: payload.customer.phone,
        email: payload.customer.email,
        totalAppointments: 1,
        lastAppointmentDate: payload.date,
        createdAt: new Date().toISOString(),
      };
      this.customers.push(cust);
    } else {
      cust.totalAppointments += 1;
      cust.lastAppointmentDate = payload.date;
    }
    saveStorage(STORAGE_KEYS.CUSTOMERS, this.customers);

    const [h, m] = payload.startTime.split(':').map(Number);
    const endMinutes = h * 60 + m + srv.durationMinutes;
    const endTime = `${Math.floor(endMinutes / 60).toString().padStart(2, '0')}:${(endMinutes % 60).toString().padStart(2, '0')}`;

    const bookingCode = `TD-${Math.floor(1000 + Math.random() * 9000)}`;

    const newAppointment: Appointment = {
      id: `app_${Date.now()}`,
      bookingCode,
      businessId: biz.id,
      professionalId: prof.id,
      serviceId: srv.id,
      customerId: cust.id,
      customerName: `${payload.customer.firstName} ${payload.customer.lastName}`,
      customerPhone: payload.customer.phone,
      customerEmail: payload.customer.email,
      notes: payload.notes,
      date: payload.date,
      startTime: payload.startTime,
      endTime,
      status: 'confirmed',
      paymentMethod: payload.paymentMethod,
      paymentStatus: payload.paymentStatus || 'not_required',
      depositAmount: payload.depositAmount,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.appointments.push(newAppointment);
    saveStorage(STORAGE_KEYS.APPOINTMENTS, this.appointments);

    const notificationPayload = {
      customerName: newAppointment.customerName,
      customerPhone: newAppointment.customerPhone,
      professionalName: prof.name,
      serviceName: srv.name,
      date: newAppointment.date,
      time: newAppointment.startTime,
      bookingCode: newAppointment.bookingCode,
      businessName: biz.name,
      businessPhone: biz.whatsappNumber || biz.phone,
      address: biz.address,
    };

    const customerMsg = formatCustomerWhatsAppMessage(notificationPayload);
    const customerWaUrl = generateWaMeLink(biz.whatsappNumber || biz.phone, customerMsg);

    const businessMsg = formatBusinessWhatsAppAlert(notificationPayload);
    const businessWaUrl = generateWaMeLink(biz.whatsappNumber || biz.phone, businessMsg);

    return {
      appointment: newAppointment,
      customer: cust,
      whatsapp: {
        customerMessage: customerMsg,
        customerUrl: customerWaUrl,
        businessMessage: businessMsg,
        businessUrl: businessWaUrl,
      },
    };
  }

  async updateAppointmentStatus(id: string, status: Appointment['status'], reason?: string): Promise<Appointment> {
    const idx = this.appointments.findIndex((a) => a.id === id);
    if (idx === -1) throw new Error('Turno no encontrado');
    this.appointments[idx] = {
      ...this.appointments[idx],
      status,
      cancellationReason: reason,
      updatedAt: new Date().toISOString(),
    };
    saveStorage(STORAGE_KEYS.APPOINTMENTS, this.appointments);
    return this.appointments[idx];
  }

  // Analytics & Stats
  async getSuperAdminStats() {
    return {
      totalBusinesses: this.businesses.length,
      activeBusinesses: this.businesses.filter((b) => b.status === 'active').length,
      trialBusinesses: this.businesses.filter((b) => b.status === 'trial').length,
      totalAppointments: this.appointments.length,
      totalCustomers: this.customers.length,
      totalProfessionals: this.professionals.length,
      businesses: this.businesses,
    };
  }

  async getAnalytics(businessId: string) {
    const appts = this.appointments.filter((a) => a.businessId === businessId);
    return {
      pageViews: Math.max(appts.length * 5, 24),
      bookingStart: Math.max(appts.length * 2, 10),
      bookingCompleted: appts.length,
      bookingCancelled: appts.filter((a) => a.status === 'cancelled').length,
      whatsappClicks: Math.max(appts.length, 6),
      conversionRate: 68.5,
    };
  }

  async recordAnalytics(businessId: string, event: string, metadata?: any): Promise<void> {
    // Record analytics event silently
  }

  async testWapi(businessId?: string, payload?: any): Promise<{ success: boolean; message?: string; error?: string }> {
    return { success: true, message: 'Simulación de conexión exitosa' };
  }
}

export const api = new ApiService();
export const localStore = api;
