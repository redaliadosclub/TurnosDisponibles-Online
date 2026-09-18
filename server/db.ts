import fs from 'fs';
import path from 'path';
import {
  Business,
  Professional,
  Service,
  WorkingHours,
  TimeOff,
  Customer,
  Appointment,
  AnalyticsEvent,
  UserSession,
} from '../src/types';
import { calculateAvailability } from '../src/lib/availabilityEngine';

export interface DatabaseSchema {
  businesses: Business[];
  professionals: Professional[];
  services: Service[];
  workingHours: WorkingHours[];
  timeOffs: TimeOff[];
  customers: Customer[];
  appointments: Appointment[];
  analytics: AnalyticsEvent[];
  users: UserSession[];
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Today helper formatted as YYYY-MM-DD
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

const INITIAL_DATA: DatabaseSchema = {
  businesses: [
    {
      id: 'biz_dermatocosmiatria_spa',
      slug: 'dermatocosmiatria-spa',
      name: 'Dermatocosmiatría & Estética Spa',
      businessType: 'beauty',
      description: 'Centro de cosmiatría integral, peelings dermatológicos, rejuvenecimiento facial y spa estético.',
      category: 'Centro de Dermatocosmiatría & Spa',
      address: 'Av. Libertador 2250, Piso 4 B, Recoleta, CABA',
      phone: '+54 11 5566-7788',
      whatsappNumber: '5491155667788',
      logoUrl: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=150&auto=format&fit=crop&q=80',
      primaryColor: '#0d9488',
      welcomeMessage: 'Bienvenido a Dermatocosmiatría & Estética Spa. Reserva tu turno de cuidado facial y corporal en menos de 2 minutos.',
      cancellationPolicy: 'Podrás cancelar o reprogramar sin cargo avisando con al menos 4 horas de anticipación.',
      bufferMinutes: 10,
      plan: 'pro',
      status: 'active',
      createdAt: '2026-03-01T10:00:00.000Z',
      paymentsEnabled: true,
      depositRequired: true,
      depositType: 'fixed',
      depositAmount: 5000,
      mpAliasOrLink: 'dermato.spa.mp',
      bankAlias: 'DERMATO.SPA.RECOLETA',
      bankCbu: '0170098820000045612389',
      bankAccountHolder: 'Dermatocosmiatría Spa',
      bankName: 'Banco BBVA',
      paymentInstructions: 'Para confirmar tu turno, se abona una seña de $5.000 mediante Mercado Pago o transferencia bancaria.',
    },
  ],
  professionals: [
    {
      id: 'prof_mariana_dermato',
      businessId: 'biz_dermatocosmiatria_spa',
      name: 'Lic. Mariana Gómez',
      title: 'Dermatocosmiatra & Especialista en Estética Facial',
      photoUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=160&auto=format&fit=crop&q=80',
      email: 'mariana@dermatocosmiatria.com',
      phone: '+54 11 5566-7789',
      active: true,
      specialty: 'Dermatocosmiatría Facial',
      serviceIds: ['srv_dermato_limpieza', 'srv_dermato_peeling', 'srv_dermato_antiage'],
    },
    {
      id: 'prof_camila_dermato',
      businessId: 'biz_dermatocosmiatria_spa',
      name: 'Camila Valenzuela',
      title: 'Cosmiatra & Masoterapeuta Facial',
      photoUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=160&auto=format&fit=crop&q=80',
      email: 'camila@dermatocosmiatria.com',
      phone: '+54 11 5566-7790',
      active: true,
      specialty: 'Cosmiatría & Drenaje Facial',
      serviceIds: ['srv_dermato_limpieza', 'srv_dermato_hidra'],
    },
  ],
  services: [
    {
      id: 'srv_dermato_limpieza',
      businessId: 'biz_dermatocosmiatria_spa',
      name: 'Limpieza Facial Profunda con Punta de Diamante',
      description: 'Higiene cutánea integral, extracción de comedones, microdermoabrasión, máscara descongestiva e hidratación.',
      durationMinutes: 60,
      price: 28000,
      currency: '$',
      active: true,
      assignedProfessionalIds: ['prof_mariana_dermato', 'prof_camila_dermato'],
    },
    {
      id: 'srv_dermato_peeling',
      businessId: 'biz_dermatocosmiatria_spa',
      name: 'Peeling Médico Renovador & Efecto Glow',
      description: 'Ácidos combinados (mandélico, glicólico o salicílico) para renovar la capa córnea, emparejar el tono y atenuar manchas.',
      durationMinutes: 45,
      price: 32000,
      currency: '$',
      active: true,
      assignedProfessionalIds: ['prof_mariana_dermato'],
    },
    {
      id: 'srv_dermato_antiage',
      businessId: 'biz_dermatocosmiatria_spa',
      name: 'Tratamiento Anti-Age & Radiofrecuencia Facial',
      description: 'Estimulación térmica de colágeno, efecto tensor no invasivo con sérum de ácido hialurónico concentrado.',
      durationMinutes: 60,
      price: 35000,
      currency: '$',
      active: true,
      assignedProfessionalIds: ['prof_mariana_dermato'],
    },
    {
      id: 'srv_dermato_hidra',
      businessId: 'biz_dermatocosmiatria_spa',
      name: 'Dermo-Nutrición & Drenaje Linfático Facial',
      description: 'Tratamiento intensivo para pieles sensibles, secas o reactivas con masaje descontracturante y descongestivo.',
      durationMinutes: 50,
      price: 26000,
      currency: '$',
      active: true,
      assignedProfessionalIds: ['prof_camila_dermato'],
    },
  ],
  workingHours: [
    {
      id: 'wh_dermato_1',
      businessId: 'biz_dermatocosmiatria_spa',
      professionalId: null,
      dayOfWeek: 1,
      shifts: [{ start: '09:00', end: '13:00' }, { start: '14:00', end: '19:00' }],
      enabled: true,
    },
    {
      id: 'wh_dermato_2',
      businessId: 'biz_dermatocosmiatria_spa',
      professionalId: null,
      dayOfWeek: 2,
      shifts: [{ start: '09:00', end: '13:00' }, { start: '14:00', end: '19:00' }],
      enabled: true,
    },
    {
      id: 'wh_dermato_3',
      businessId: 'biz_dermatocosmiatria_spa',
      professionalId: null,
      dayOfWeek: 3,
      shifts: [{ start: '09:00', end: '13:00' }, { start: '14:00', end: '19:00' }],
      enabled: true,
    },
    {
      id: 'wh_dermato_4',
      businessId: 'biz_dermatocosmiatria_spa',
      professionalId: null,
      dayOfWeek: 4,
      shifts: [{ start: '09:00', end: '13:00' }, { start: '14:00', end: '19:00' }],
      enabled: true,
    },
    {
      id: 'wh_dermato_5',
      businessId: 'biz_dermatocosmiatria_spa',
      professionalId: null,
      dayOfWeek: 5,
      shifts: [{ start: '09:00', end: '13:00' }, { start: '14:00', end: '19:00' }],
      enabled: true,
    },
    {
      id: 'wh_dermato_6',
      businessId: 'biz_dermatocosmiatria_spa',
      professionalId: null,
      dayOfWeek: 6,
      shifts: [{ start: '10:00', end: '15:00' }],
      enabled: true,
    },
    {
      id: 'wh_dermato_0',
      businessId: 'biz_dermatocosmiatria_spa',
      professionalId: null,
      dayOfWeek: 0,
      shifts: [],
      enabled: false,
    },
  ],
  timeOffs: [
    {
      id: 'to_1',
      businessId: 'biz_dermatocosmiatria_spa',
      professionalId: 'prof_mariana_dermato',
      startDate: '2026-12-24',
      endDate: '2026-12-25',
      reason: 'Feriado de Navidad',
      type: 'holiday',
    },
  ],
  customers: [
    {
      id: 'cust_1',
      businessId: 'biz_dermatocosmiatria_spa',
      firstName: 'Lucía',
      lastName: 'Benítez',
      phone: '+5491155443322',
      email: 'lucia.benitez@example.com',
      notes: 'Tratamiento de piel sensible / rosácea.',
      totalAppointments: 2,
      lastAppointmentDate: today,
      createdAt: '2026-03-01T10:00:00.000Z',
    },
    {
      id: 'cust_2',
      businessId: 'biz_dermatocosmiatria_spa',
      firstName: 'Florencia',
      lastName: 'Herrera',
      phone: '+5491166778899',
      email: 'florencia.h@example.com',
      notes: 'Seguimiento de peeling mandélico.',
      totalAppointments: 1,
      lastAppointmentDate: today,
      createdAt: '2026-03-02T14:30:00.000Z',
    },
  ],
  appointments: [
    {
      id: 'app_dermato_1',
      bookingCode: 'DS-4821',
      businessId: 'biz_dermatocosmiatria_spa',
      professionalId: 'prof_mariana_dermato',
      serviceId: 'srv_dermato_limpieza',
      customerId: 'cust_1',
      customerName: 'Lucía Benítez',
      customerPhone: '+5491155443322',
      customerEmail: 'lucia.benitez@example.com',
      notes: 'Limpieza facial profunda con microdermoabrasión',
      date: today,
      startTime: '09:00',
      endTime: '10:00',
      status: 'confirmed',
      createdAt: '2026-03-01T10:00:00.000Z',
      updatedAt: '2026-03-01T10:00:00.000Z',
    },
    {
      id: 'app_dermato_2',
      bookingCode: 'DS-5912',
      businessId: 'biz_dermatocosmiatria_spa',
      professionalId: 'prof_camila_dermato',
      serviceId: 'srv_dermato_hidra',
      customerId: 'cust_2',
      customerName: 'Florencia Herrera',
      customerPhone: '+5491166778899',
      customerEmail: 'florencia.h@example.com',
      notes: 'Dermo-Nutrición y drenaje facial',
      date: today,
      startTime: '11:00',
      endTime: '11:50',
      status: 'confirmed',
      createdAt: '2026-03-03T11:20:00.000Z',
      updatedAt: '2026-03-03T11:20:00.000Z',
    },
  ],
  analytics: [
    {
      id: 'evt_1',
      businessId: 'biz_dermatocosmiatria_spa',
      type: 'page_view',
      timestamp: new Date().toISOString(),
    },
    {
      id: 'evt_2',
      businessId: 'biz_dermatocosmiatria_spa',
      type: 'booking_completed',
      timestamp: new Date().toISOString(),
    },
  ],
  users: [
    {
      id: 'usr_superadmin_agencia',
      name: 'Agencia Cliente Ya (SuperAdmin)',
      email: 'agenciaclienteya@gmail.com',
      role: 'superadmin',
    },
    {
      id: 'usr_superadmin',
      name: 'Super Admin',
      email: 'admin@turnosdisponibles.com',
      role: 'superadmin',
    },
    {
      id: 'usr_owner_dermato',
      name: 'Lic. Mariana Gómez',
      email: 'mariana@dermatocosmiatria.com',
      role: 'business_owner',
      businessId: 'biz_dermatocosmiatria_spa',
    },
  ],
};

class Database {
  private data: DatabaseSchema;
  private isWriting = false;

  constructor() {
    this.data = this.loadData();
  }

  private loadData(): DatabaseSchema {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DB_FILE)) {
        const content = fs.readFileSync(DB_FILE, 'utf-8');
        return JSON.parse(content);
      }
    } catch (err) {
      console.warn('Could not load existing db.json, initializing default data', err);
    }
    this.saveDataDirect(INITIAL_DATA);
    return INITIAL_DATA;
  }

  private saveDataDirect(data: DatabaseSchema) {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to write db.json', err);
    }
  }

  public save() {
    if (this.isWriting) return;
    this.isWriting = true;
    try {
      this.saveDataDirect(this.data);
    } finally {
      this.isWriting = false;
    }
  }

  // --- Businesses ---
  public getBusinesses(): Business[] {
    return this.data.businesses;
  }

  public getBusinessById(id: string): Business | undefined {
    return this.data.businesses.find((b) => b.id === id);
  }

  public getBusinessBySlug(slug: string): Business | undefined {
    return this.data.businesses.find((b) => b.slug.toLowerCase() === slug.toLowerCase());
  }

  public createBusiness(biz: Omit<Business, 'id' | 'createdAt'>): Business {
    const newBiz: Business = {
      ...biz,
      id: `biz_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    this.data.businesses.push(newBiz);

    // Also create default working hours (Mon - Fri: 08:00 - 18:00)
    for (let day = 1; day <= 5; day++) {
      this.data.workingHours.push({
        id: `wh_${newBiz.id}_${day}`,
        businessId: newBiz.id,
        professionalId: null,
        dayOfWeek: day,
        shifts: [
          { start: '08:00', end: '12:00' },
          { start: '14:00', end: '18:00' },
        ],
        enabled: true,
      });
    }

    this.save();
    return newBiz;
  }

  public updateBusiness(id: string, updates: Partial<Business>): Business | null {
    const index = this.data.businesses.findIndex((b) => b.id === id);
    if (index === -1) return null;
    this.data.businesses[index] = { ...this.data.businesses[index], ...updates };
    this.save();
    return this.data.businesses[index];
  }

  // --- Professionals ---
  public getProfessionals(businessId: string): Professional[] {
    return this.data.professionals.filter((p) => p.businessId === businessId);
  }

  public getProfessionalById(id: string): Professional | undefined {
    return this.data.professionals.find((p) => p.id === id);
  }

  public createProfessional(businessId: string, prof: Omit<Professional, 'id' | 'businessId'>): Professional {
    const newProf: Professional = {
      ...prof,
      id: `prof_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      businessId,
    };
    this.data.professionals.push(newProf);
    this.save();
    return newProf;
  }

  public updateProfessional(id: string, updates: Partial<Professional>): Professional | null {
    const index = this.data.professionals.findIndex((p) => p.id === id);
    if (index === -1) return null;
    this.data.professionals[index] = { ...this.data.professionals[index], ...updates };
    this.save();
    return this.data.professionals[index];
  }

  public deleteProfessional(id: string): boolean {
    const prevLen = this.data.professionals.length;
    this.data.professionals = this.data.professionals.filter((p) => p.id !== id);
    this.save();
    return this.data.professionals.length < prevLen;
  }

  // --- Services ---
  public getServices(businessId: string): Service[] {
    return this.data.services.filter((s) => s.businessId === businessId);
  }

  public getServiceById(id: string): Service | undefined {
    return this.data.services.find((s) => s.id === id);
  }

  public createService(businessId: string, srv: Omit<Service, 'id' | 'businessId'>): Service {
    const newService: Service = {
      ...srv,
      id: `srv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      businessId,
    };
    this.data.services.push(newService);
    this.save();
    return newService;
  }

  public updateService(id: string, updates: Partial<Service>): Service | null {
    const index = this.data.services.findIndex((s) => s.id === id);
    if (index === -1) return null;
    this.data.services[index] = { ...this.data.services[index], ...updates };
    this.save();
    return this.data.services[index];
  }

  public deleteService(id: string): boolean {
    const prevLen = this.data.services.length;
    this.data.services = this.data.services.filter((s) => s.id !== id);
    this.save();
    return this.data.services.length < prevLen;
  }

  // --- Working Hours & TimeOff ---
  public getWorkingHours(businessId: string, professionalId?: string | null): WorkingHours[] {
    return this.data.workingHours.filter(
      (wh) => wh.businessId === businessId && (professionalId === undefined || wh.professionalId === professionalId)
    );
  }

  public updateWorkingHours(businessId: string, hours: WorkingHours[]): WorkingHours[] {
    // Remove existing for this business & target professionalId
    const profId = hours[0]?.professionalId ?? null;
    this.data.workingHours = this.data.workingHours.filter(
      (wh) => !(wh.businessId === businessId && wh.professionalId === profId)
    );
    this.data.workingHours.push(...hours);
    this.save();
    return hours;
  }

  public getTimeOffs(businessId: string): TimeOff[] {
    return this.data.timeOffs.filter((to) => to.businessId === businessId);
  }

  public createTimeOff(businessId: string, to: Omit<TimeOff, 'id' | 'businessId'>): TimeOff {
    const newTimeOff: TimeOff = {
      ...to,
      id: `to_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      businessId,
    };
    this.data.timeOffs.push(newTimeOff);
    this.save();
    return newTimeOff;
  }

  public deleteTimeOff(id: string): boolean {
    const prevLen = this.data.timeOffs.length;
    this.data.timeOffs = this.data.timeOffs.filter((t) => t.id !== id);
    this.save();
    return this.data.timeOffs.length < prevLen;
  }

  // --- Customers ---
  public getCustomers(businessId: string): Customer[] {
    return this.data.customers.filter((c) => c.businessId === businessId);
  }

  public findOrCreateCustomer(
    businessId: string,
    customerData: { firstName: string; lastName: string; phone: string; email?: string }
  ): Customer {
    const cleanPhone = customerData.phone.replace(/\D/g, '');
    let customer = this.data.customers.find(
      (c) => c.businessId === businessId && c.phone.replace(/\D/g, '') === cleanPhone
    );

    if (!customer) {
      customer = {
        id: `cust_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        businessId,
        firstName: customerData.firstName.trim(),
        lastName: customerData.lastName.trim(),
        phone: customerData.phone.trim(),
        email: customerData.email?.trim() || undefined,
        totalAppointments: 1,
        lastAppointmentDate: getTodayString(),
        createdAt: new Date().toISOString(),
      };
      this.data.customers.push(customer);
    } else {
      customer.totalAppointments = (customer.totalAppointments || 0) + 1;
      customer.lastAppointmentDate = getTodayString();
      if (customerData.email && !customer.email) customer.email = customerData.email;
    }

    this.save();
    return customer;
  }

  // --- Appointments & Real-Time Availability ---
  public getAppointments(businessId: string, filter?: { date?: string; professionalId?: string }): Appointment[] {
    return this.data.appointments.filter((app) => {
      if (app.businessId !== businessId) return false;
      if (filter?.date && app.date !== filter.date) return false;
      if (filter?.professionalId && app.professionalId !== filter.professionalId) return false;
      return true;
    });
  }

  public getAppointmentById(id: string): Appointment | undefined {
    return this.data.appointments.find((app) => app.id === id || app.bookingCode === id);
  }

  public getAvailability(businessId: string, professionalId: string, serviceId: string, date: string) {
    const business = this.getBusinessById(businessId);
    const professional = this.getProfessionalById(professionalId);
    const service = this.getServiceById(serviceId);

    if (!business || !professional || !service) {
      throw new Error('Negocio, profesional o servicio no encontrado');
    }

    const workingHoursList = this.getWorkingHours(businessId);
    const timeOffList = this.getTimeOffs(businessId);
    const appointments = this.getAppointments(businessId, { date, professionalId });

    return calculateAvailability({
      business,
      professional,
      service,
      date,
      workingHoursList,
      timeOffList,
      appointments,
    });
  }

  // CRITICAL: Double booking prevention with atomic availability re-check
  public createAppointmentAtomic(params: {
    businessId: string;
    professionalId: string;
    serviceId: string;
    customer: { firstName: string; lastName: string; phone: string; email?: string };
    date: string;
    startTime: string;
    notes?: string;
    paymentMethod?: 'mercadopago' | 'transfer' | 'cash';
    paymentStatus?: 'pending' | 'deposit_pending' | 'deposit_paid' | 'paid' | 'not_required';
    depositAmount?: number;
  }): { appointment: Appointment; customer: Customer } {
    const {
      businessId,
      professionalId,
      serviceId,
      customer: custData,
      date,
      startTime,
      notes,
      paymentMethod,
      paymentStatus,
      depositAmount,
    } = params;

    const business = this.getBusinessById(businessId);
    const professional = this.getProfessionalById(professionalId);
    const service = this.getServiceById(serviceId);

    if (!business || !professional || !service) {
      throw new Error('Entidades no encontradas para crear la reserva');
    }

    // 1. Re-evaluate availability on the server side right now
    const availability = this.getAvailability(businessId, professionalId, serviceId, date);
    const targetSlot = availability.slots.find((s) => s.time === startTime);

    if (!targetSlot || !targetSlot.available) {
      const conflictError: any = new Error(
        'El horario seleccionado ya no se encuentra disponible. Ha sido reservado por otro usuario.'
      );
      conflictError.code = 'SLOT_OCCUPIED';
      throw conflictError;
    }

    // Calculate endTime
    const [h, m] = startTime.split(':').map(Number);
    const duration = service.durationMinutes || 30;
    const endMinutes = h * 60 + m + duration;
    const endH = Math.floor(endMinutes / 60);
    const endM = endMinutes % 60;
    const endTime = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;

    // Generate unique human-readable booking code
    const randomCode = Math.floor(1000 + Math.random() * 9000);
    const prefix = business.businessType === 'medical' ? 'TM' : 'BK';
    const bookingCode = `${prefix}-${randomCode}`;

    // Find or create customer
    const customer = this.findOrCreateCustomer(businessId, custData);

    const newAppointment: Appointment = {
      id: `app_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      bookingCode,
      businessId,
      professionalId,
      serviceId,
      customerId: customer.id,
      customerName: `${custData.firstName.trim()} ${custData.lastName.trim()}`,
      customerPhone: custData.phone.trim(),
      customerEmail: custData.email?.trim() || undefined,
      notes: notes?.trim() || undefined,
      date,
      startTime,
      endTime,
      status: 'confirmed',
      paymentMethod: paymentMethod || 'cash',
      paymentStatus: paymentStatus || (depositAmount ? 'deposit_pending' : 'not_required'),
      depositAmount: depositAmount || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.data.appointments.push(newAppointment);

    // Track analytics
    this.recordAnalytics(businessId, 'booking_completed', { bookingCode, serviceId });

    this.save();
    return { appointment: newAppointment, customer };
  }

  public updateAppointmentStatus(
    id: string,
    status: Appointment['status'],
    reason?: string
  ): Appointment | null {
    const appointment = this.data.appointments.find((a) => a.id === id || a.bookingCode === id);
    if (!appointment) return null;

    appointment.status = status;
    if (reason) appointment.cancellationReason = reason;
    appointment.updatedAt = new Date().toISOString();

    if (status === 'cancelled') {
      this.recordAnalytics(appointment.businessId, 'booking_cancelled', { id, bookingCode: appointment.bookingCode });
    }

    this.save();
    return appointment;
  }

  // --- Analytics ---
  public recordAnalytics(businessId: string, type: AnalyticsEvent['type'], metadata?: Record<string, any>) {
    this.data.analytics.push({
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      businessId,
      type,
      timestamp: new Date().toISOString(),
      metadata,
    });
    this.save();
  }

  public getAnalytics(businessId: string) {
    const events = this.data.analytics.filter((e) => e.businessId === businessId);
    const pageViews = events.filter((e) => e.type === 'page_view').length;
    const bookingStart = events.filter((e) => e.type === 'booking_start').length;
    const bookingCompleted = events.filter((e) => e.type === 'booking_completed').length;
    const bookingCancelled = events.filter((e) => e.type === 'booking_cancelled').length;
    const whatsappClicks = events.filter((e) => e.type === 'whatsapp_click').length;

    const conversionRate = pageViews > 0 ? Math.round((bookingCompleted / pageViews) * 100) : 0;

    return {
      pageViews,
      bookingStart,
      bookingCompleted,
      bookingCancelled,
      whatsappClicks,
      conversionRate,
    };
  }

  // --- SuperAdmin Platform Metrics ---
  public getSuperAdminStats() {
    const totalBusinesses = this.data.businesses.length;
    const activeBusinesses = this.data.businesses.filter((b) => b.status === 'active').length;
    const trialBusinesses = this.data.businesses.filter((b) => b.status === 'trial').length;
    const totalAppointments = this.data.appointments.length;
    const totalCustomers = this.data.customers.length;
    const totalProfessionals = this.data.professionals.length;

    return {
      totalBusinesses,
      activeBusinesses,
      trialBusinesses,
      totalAppointments,
      totalCustomers,
      totalProfessionals,
      businesses: this.data.businesses,
    };
  }

  // --- Users & Auth ---
  public getUsers(): UserSession[] {
    return this.data.users || [];
  }

  public getUserById(id: string): UserSession | undefined {
    return (this.data.users || []).find((u) => u.id === id);
  }

  public getUserByEmail(email: string): UserSession | undefined {
    const trimmed = email.trim().toLowerCase();
    const found = (this.data.users || []).find((u) => u.email.toLowerCase() === trimmed);
    if (found) return found;

    if (trimmed === 'agenciaclienteya@gmail.com') {
      const superAdminUser: UserSession = {
        id: 'usr_superadmin_agencia',
        name: 'Agencia Cliente Ya (SuperAdmin)',
        email: 'agenciaclienteya@gmail.com',
        role: 'superadmin',
      };
      if (!this.data.users) this.data.users = [];
      this.data.users.push(superAdminUser);
      this.save();
      return superAdminUser;
    }

    return undefined;
  }

  public createUser(user: Omit<UserSession, 'id'>): UserSession {
    const newUser: UserSession = {
      ...user,
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    };
    if (!this.data.users) this.data.users = [];
    this.data.users.push(newUser);
    this.save();
    return newUser;
  }
}

export const db = new Database();
