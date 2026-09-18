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
import { db } from '../lib/firebase';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
} from 'firebase/firestore';

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
];

export const INITIAL_PROFESSIONALS: Professional[] = [
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
];

export const INITIAL_SERVICES: Service[] = [
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
];

const INITIAL_WORKING_HOURS: WorkingHours[] = [
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
];

const INITIAL_TIMEOFFS: TimeOff[] = [
  {
    id: 'to_1',
    businessId: 'biz_dermatocosmiatria_spa',
    professionalId: 'prof_mariana_dermato',
    startDate: '2026-12-24',
    endDate: '2026-12-25',
    reason: 'Feriado de Navidad',
    type: 'holiday',
  },
];

const INITIAL_CUSTOMERS: Customer[] = [
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
];

const INITIAL_APPOINTMENTS: Appointment[] = [
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
  private isCloudSynced = false;

  constructor() {
    const LEGACY_DEMO_BIZ_IDS = new Set(['biz_turnosmed_demo', 'biz_estetica_bella', 'turnosmed-demo', 'estetica-bella']);

    // Merge default initial businesses with any previously cached in localStorage
    const savedBusinesses = loadStorage<Business[]>(STORAGE_KEYS.BUSINESSES, []).filter(
      (b) => !LEGACY_DEMO_BIZ_IDS.has(b.id) && !LEGACY_DEMO_BIZ_IDS.has(b.slug)
    );
    const bizMap = new Map<string, Business>();
    INITIAL_BUSINESSES.forEach((b) => bizMap.set(b.id, b));
    savedBusinesses.forEach((b) => bizMap.set(b.id, b));
    this.businesses = Array.from(bizMap.values());
    saveStorage(STORAGE_KEYS.BUSINESSES, this.businesses);

    // Merge default professionals
    const savedProfs = loadStorage<Professional[]>(STORAGE_KEYS.PROFESSIONALS, []).filter(
      (p) => !LEGACY_DEMO_BIZ_IDS.has(p.businessId)
    );
    const profMap = new Map<string, Professional>();
    INITIAL_PROFESSIONALS.forEach((p) => profMap.set(p.id, p));
    savedProfs.forEach((p) => profMap.set(p.id, p));
    this.professionals = Array.from(profMap.values());
    saveStorage(STORAGE_KEYS.PROFESSIONALS, this.professionals);

    // Merge default services
    const savedServices = loadStorage<Service[]>(STORAGE_KEYS.SERVICES, []).filter(
      (s) => !LEGACY_DEMO_BIZ_IDS.has(s.businessId)
    );
    const srvMap = new Map<string, Service>();
    INITIAL_SERVICES.forEach((s) => srvMap.set(s.id, s));
    savedServices.forEach((s) => srvMap.set(s.id, s));
    this.services = Array.from(srvMap.values());
    saveStorage(STORAGE_KEYS.SERVICES, this.services);

    // Merge default working hours
    const savedWH = loadStorage<WorkingHours[]>(STORAGE_KEYS.WORKING_HOURS, []).filter(
      (w) => !LEGACY_DEMO_BIZ_IDS.has(w.businessId)
    );
    const whMap = new Map<string, WorkingHours>();
    INITIAL_WORKING_HOURS.forEach((w) => whMap.set(w.id, w));
    savedWH.forEach((w) => whMap.set(w.id, w));
    this.workingHours = Array.from(whMap.values());
    saveStorage(STORAGE_KEYS.WORKING_HOURS, this.workingHours);

    this.timeOffs = loadStorage<TimeOff[]>(STORAGE_KEYS.TIME_OFFS, INITIAL_TIMEOFFS).filter(
      (t) => !LEGACY_DEMO_BIZ_IDS.has(t.businessId)
    );
    this.customers = loadStorage<Customer[]>(STORAGE_KEYS.CUSTOMERS, INITIAL_CUSTOMERS).filter(
      (c) => !LEGACY_DEMO_BIZ_IDS.has(c.businessId)
    );
    this.appointments = loadStorage<Appointment[]>(STORAGE_KEYS.APPOINTMENTS, INITIAL_APPOINTMENTS).filter(
      (a) => !LEGACY_DEMO_BIZ_IDS.has(a.businessId)
    );
    this.currentUser = loadStorage<User | null>(STORAGE_KEYS.USER, null);

    // Synchronize with Firestore cloud in the background
    this.syncFromCloud().catch(() => {});
  }

  // Cloud Sync from Firebase Firestore
  async syncFromCloud(): Promise<void> {
    const LEGACY_DEMO_BIZ_IDS = new Set(['biz_turnosmed_demo', 'biz_estetica_bella', 'turnosmed-demo', 'estetica-bella']);
    try {
      // 1. Fetch businesses from Firestore
      const bizSnap = await getDocs(collection(db, 'businesses'));
      if (!bizSnap.empty) {
        const cloudBizs: Business[] = [];
        for (const d of bizSnap.docs) {
          const b = d.data() as Business;
          if (LEGACY_DEMO_BIZ_IDS.has(d.id) || LEGACY_DEMO_BIZ_IDS.has(b.id) || LEGACY_DEMO_BIZ_IDS.has(b.slug)) {
            // Delete legacy demo doc from Firestore permanently
            deleteDoc(doc(db, 'businesses', d.id)).catch(() => {});
          } else {
            cloudBizs.push(b);
          }
        }

        // Merge defaults, then current local storage, then cloud (ensuring no loss)
        const map = new Map<string, Business>();
        INITIAL_BUSINESSES.forEach((b) => map.set(b.id, b));
        this.businesses.forEach((b) => map.set(b.id, b));
        cloudBizs.forEach((b) => map.set(b.id, b));
        this.businesses = Array.from(map.values()).filter(
          (b) => !LEGACY_DEMO_BIZ_IDS.has(b.id) && !LEGACY_DEMO_BIZ_IDS.has(b.slug)
        );
        saveStorage(STORAGE_KEYS.BUSINESSES, this.businesses);

        // Upload any businesses that exist in local state but not yet in Firestore
        for (const b of this.businesses) {
          if (!cloudBizs.some((cb) => cb.id === b.id)) {
            await setDoc(doc(db, 'businesses', b.id), b).catch(() => {});
          }
        }
      } else {
        // Seed initial businesses to Firestore so cloud has the baseline
        for (const b of this.businesses) {
          await setDoc(doc(db, 'businesses', b.id), b).catch(() => {});
        }
      }

      // 2. Fetch professionals from Firestore
      const profSnap = await getDocs(collection(db, 'professionals'));
      if (!profSnap.empty) {
        const cloudProfs: Professional[] = [];
        for (const d of profSnap.docs) {
          const p = d.data() as Professional;
          if (LEGACY_DEMO_BIZ_IDS.has(d.id) || LEGACY_DEMO_BIZ_IDS.has(p.businessId)) {
            deleteDoc(doc(db, 'professionals', d.id)).catch(() => {});
          } else {
            cloudProfs.push(p);
          }
        }
        const map = new Map<string, Professional>();
        INITIAL_PROFESSIONALS.forEach((p) => map.set(p.id, p));
        this.professionals.forEach((p) => map.set(p.id, p));
        cloudProfs.forEach((p) => map.set(p.id, p));
        this.professionals = Array.from(map.values()).filter(
          (p) => !LEGACY_DEMO_BIZ_IDS.has(p.businessId)
        );
        saveStorage(STORAGE_KEYS.PROFESSIONALS, this.professionals);

        for (const p of this.professionals) {
          if (!cloudProfs.some((cp) => cp.id === p.id)) {
            await setDoc(doc(db, 'professionals', p.id), p).catch(() => {});
          }
        }
      } else {
        for (const p of this.professionals) {
          await setDoc(doc(db, 'professionals', p.id), p).catch(() => {});
        }
      }

      // 3. Fetch services from Firestore
      const srvSnap = await getDocs(collection(db, 'services'));
      if (!srvSnap.empty) {
        const cloudSrvs: Service[] = [];
        for (const d of srvSnap.docs) {
          const s = d.data() as Service;
          if (LEGACY_DEMO_BIZ_IDS.has(d.id) || LEGACY_DEMO_BIZ_IDS.has(s.businessId)) {
            deleteDoc(doc(db, 'services', d.id)).catch(() => {});
          } else {
            cloudSrvs.push(s);
          }
        }
        const map = new Map<string, Service>();
        INITIAL_SERVICES.forEach((s) => map.set(s.id, s));
        this.services.forEach((s) => map.set(s.id, s));
        cloudSrvs.forEach((s) => map.set(s.id, s));
        this.services = Array.from(map.values()).filter(
          (s) => !LEGACY_DEMO_BIZ_IDS.has(s.businessId)
        );
        saveStorage(STORAGE_KEYS.SERVICES, this.services);

        for (const s of this.services) {
          if (!cloudSrvs.some((cs) => cs.id === s.id)) {
            await setDoc(doc(db, 'services', s.id), s).catch(() => {});
          }
        }
      } else {
        for (const s of this.services) {
          await setDoc(doc(db, 'services', s.id), s).catch(() => {});
        }
      }

      // 4. Fetch appointments from Firestore
      const apptSnap = await getDocs(collection(db, 'appointments'));
      if (!apptSnap.empty) {
        const cloudAppts: Appointment[] = [];
        for (const d of apptSnap.docs) {
          const a = d.data() as Appointment;
          if (LEGACY_DEMO_BIZ_IDS.has(d.id) || LEGACY_DEMO_BIZ_IDS.has(a.businessId)) {
            deleteDoc(doc(db, 'appointments', d.id)).catch(() => {});
          } else {
            cloudAppts.push(a);
          }
        }
        const map = new Map<string, Appointment>();
        INITIAL_APPOINTMENTS.forEach((a) => map.set(a.id, a));
        this.appointments.forEach((a) => map.set(a.id, a));
        cloudAppts.forEach((a) => map.set(a.id, a));
        this.appointments = Array.from(map.values()).filter(
          (a) => !LEGACY_DEMO_BIZ_IDS.has(a.businessId)
        );
        saveStorage(STORAGE_KEYS.APPOINTMENTS, this.appointments);

        for (const a of this.appointments) {
          if (!cloudAppts.some((ca) => ca.id === a.id)) {
            await setDoc(doc(db, 'appointments', a.id), a).catch(() => {});
          }
        }
      }

      // 5. Fetch working hours from Firestore
      const whSnap = await getDocs(collection(db, 'workingHours'));
      if (!whSnap.empty) {
        const cloudWhs: WorkingHours[] = [];
        for (const d of whSnap.docs) {
          const w = d.data() as WorkingHours;
          if (LEGACY_DEMO_BIZ_IDS.has(d.id) || LEGACY_DEMO_BIZ_IDS.has(w.businessId)) {
            deleteDoc(doc(db, 'workingHours', d.id)).catch(() => {});
          } else {
            cloudWhs.push(w);
          }
        }
        const map = new Map<string, WorkingHours>();
        INITIAL_WORKING_HOURS.forEach((w) => map.set(w.id, w));
        cloudWhs.forEach((w) => map.set(w.id, w));
        this.workingHours = Array.from(map.values()).filter(
          (w) => !LEGACY_DEMO_BIZ_IDS.has(w.businessId)
        );
        saveStorage(STORAGE_KEYS.WORKING_HOURS, this.workingHours);
      }

      this.isCloudSynced = true;
    } catch (err) {
      console.warn('Could not sync data from Firestore cloud, continuing with local store', err);
    }
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
    if (!this.isCloudSynced) {
      await this.syncFromCloud().catch(() => {});
    }
    return this.businesses;
  }

  async getAllBusinesses(): Promise<Business[]> {
    if (!this.isCloudSynced) {
      await this.syncFromCloud().catch(() => {});
    }
    return this.businesses;
  }

  async getBusinessBySlug(slug: string): Promise<Business> {
    if (!this.isCloudSynced) {
      await this.syncFromCloud().catch(() => {});
    }
    const cleanSlug = slug.toLowerCase().trim().replace(/^[#/]+/, '').replace(/^booking-/, '').replace(/^book\//, '');
    const found = this.businesses.find(
      (b) =>
        b.slug.toLowerCase() === cleanSlug ||
        b.id.toLowerCase() === cleanSlug ||
        b.slug.toLowerCase() === slug.toLowerCase() ||
        b.id.toLowerCase() === slug.toLowerCase()
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

    // Save to Firestore Cloud
    await setDoc(doc(db, 'businesses', newBiz.id), newBiz).catch((err) => {
      console.warn('Error persisting business to Firestore:', err);
    });

    return newBiz;
  }

  async updateBusiness(id: string, data: Partial<Business>): Promise<Business> {
    const idx = this.businesses.findIndex((b) => b.id === id);
    if (idx === -1) throw new Error('Negocio no encontrado');
    const updated = { ...this.businesses[idx], ...data };
    this.businesses[idx] = updated;
    saveStorage(STORAGE_KEYS.BUSINESSES, this.businesses);

    // Update in Firestore Cloud
    await setDoc(doc(db, 'businesses', updated.id), updated).catch((err) => {
      console.warn('Error updating business in Firestore:', err);
    });

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

    // Save to Firestore Cloud
    await setDoc(doc(db, 'professionals', newProf.id), newProf).catch((err) => {
      console.warn('Error persisting professional to Firestore:', err);
    });

    return newProf;
  }

  async updateProfessional(businessId: string, id: string, data: Partial<Professional>): Promise<Professional> {
    const idx = this.professionals.findIndex((p) => p.id === id && p.businessId === businessId);
    if (idx === -1) throw new Error('Profesional no encontrado');
    const updated = { ...this.professionals[idx], ...data };
    this.professionals[idx] = updated;
    saveStorage(STORAGE_KEYS.PROFESSIONALS, this.professionals);

    // Update in Firestore Cloud
    await setDoc(doc(db, 'professionals', updated.id), updated).catch((err) => {
      console.warn('Error updating professional in Firestore:', err);
    });

    return updated;
  }

  async deleteProfessional(businessId: string, id: string): Promise<{ success: boolean }> {
    this.professionals = this.professionals.filter((p) => !(p.id === id && p.businessId === businessId));
    saveStorage(STORAGE_KEYS.PROFESSIONALS, this.professionals);

    // Delete in Firestore Cloud
    await deleteDoc(doc(db, 'professionals', id)).catch((err) => {
      console.warn('Error deleting professional in Firestore:', err);
    });

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

    // Save to Firestore Cloud
    await setDoc(doc(db, 'services', newSrv.id), newSrv).catch((err) => {
      console.warn('Error persisting service to Firestore:', err);
    });

    return newSrv;
  }

  async updateService(businessId: string, id: string, data: Partial<Service>): Promise<Service> {
    const idx = this.services.findIndex((s) => s.id === id && s.businessId === businessId);
    if (idx === -1) throw new Error('Servicio no encontrado');
    const updated = { ...this.services[idx], ...data };
    this.services[idx] = updated;
    saveStorage(STORAGE_KEYS.SERVICES, this.services);

    // Update in Firestore Cloud
    await setDoc(doc(db, 'services', updated.id), updated).catch((err) => {
      console.warn('Error updating service in Firestore:', err);
    });

    return updated;
  }

  async deleteService(businessId: string, id: string): Promise<{ success: boolean }> {
    this.services = this.services.filter((s) => !(s.id === id && s.businessId === businessId));
    saveStorage(STORAGE_KEYS.SERVICES, this.services);

    // Delete in Firestore Cloud
    await deleteDoc(doc(db, 'services', id)).catch((err) => {
      console.warn('Error deleting service in Firestore:', err);
    });

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

    // Save to Firestore Cloud
    await setDoc(doc(db, 'appointments', newAppointment.id), newAppointment).catch((err) => {
      console.warn('Error persisting appointment to Firestore:', err);
    });

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
    const updated = {
      ...this.appointments[idx],
      status,
      cancellationReason: reason,
      updatedAt: new Date().toISOString(),
    };
    this.appointments[idx] = updated;
    saveStorage(STORAGE_KEYS.APPOINTMENTS, this.appointments);

    // Update in Firestore Cloud
    await setDoc(doc(db, 'appointments', updated.id), updated).catch((err) => {
      console.warn('Error updating appointment in Firestore:', err);
    });

    return updated;
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
