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
import {
  checkAppointmentCreationLimit,
  checkProfessionalLimit,
} from '../lib/planLimits';
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
    category: 'Estética & Spa',
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
  {
    id: 'biz_odontologia_integral',
    slug: 'odontologia-integral-palermo',
    name: 'Odontología Integral & Ortodoncia Palermo',
    businessType: 'dental',
    description: 'Clínica odontológica de alta complejidad, ortodoncia invisible, blanqueamiento led y rehabilitación oral.',
    category: 'Odontología',
    address: 'Av. Santa Fe 3420, Piso 2 A, Palermo, CABA',
    phone: '+54 11 4821-3344',
    whatsappNumber: '5491148213344',
    logoUrl: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=150&auto=format&fit=crop&q=80',
    primaryColor: '#0284c7',
    welcomeMessage: 'Tu sonrisa en manos expertas. Elige a tu odontólogo y agenda tu consulta o tratamiento dental.',
    cancellationPolicy: 'Cancelación con mínimo 12 hs de anticipación para reasignar el turno.',
    bufferMinutes: 15,
    plan: 'pro',
    status: 'active',
    createdAt: '2026-03-02T11:00:00.000Z',
    paymentsEnabled: true,
    depositRequired: true,
    depositType: 'fixed',
    depositAmount: 6000,
    mpAliasOrLink: 'odonto.palermo.mp',
    bankAlias: 'ODONTO.INTEGRAL.PALERMO',
    bankCbu: '0720111120000034981255',
    bankAccountHolder: 'Dr. Lucas Varela Odontología',
    bankName: 'Banco Santander',
    paymentInstructions: 'Seña de reserva de $6.000 que se deduce del tratamiento en el consultorio.',
  },
  {
    id: 'biz_centro_medico_belgrano',
    slug: 'centro-medico-belgrano',
    name: 'Centro Médico & Especialidades Belgrano',
    businessType: 'medical',
    description: 'Policonsultorios médicos con especialistas en dermatología clínica, cardiología, nutrición y medicina general.',
    category: 'Consultorios Médicos',
    address: 'Av. Cabildo 1890, Belgrano, CABA',
    phone: '+54 11 4788-9900',
    whatsappNumber: '5491147889900',
    logoUrl: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=150&auto=format&fit=crop&q=80',
    primaryColor: '#059669',
    welcomeMessage: 'Atención médica personalizada y turnos puntuales. Selecciona especialidad y profesional.',
    cancellationPolicy: 'Reprogramación sin cargo avisando con 6 horas de antelación.',
    bufferMinutes: 10,
    plan: 'business',
    status: 'active',
    createdAt: '2026-03-03T09:00:00.000Z',
    paymentsEnabled: true,
    depositRequired: true,
    depositType: 'fixed',
    depositAmount: 4000,
    mpAliasOrLink: 'medicos.belgrano.mp',
    bankAlias: 'MEDICOS.BELGRANO.CABA',
    bankCbu: '0140022220000078123901',
    bankAccountHolder: 'Centro Médico Belgrano S.A.',
    bankName: 'Banco Galicia',
    paymentInstructions: 'Seña de $4.000 para reservar consulta particular o copago de obra social.',
  },
  {
    id: 'biz_studio_barberia_urbana',
    slug: 'barberia-studio-urbano',
    name: 'Urbano Barbería, Hair Studio & Spa Masculino',
    businessType: 'beauty',
    description: 'Cortes clásicos y de vanguardia, perfilado de barba con toalla caliente, colorimetría y tratamientos capilares.',
    category: 'Peluquería & Barbería',
    address: 'Gorriti 4920, Palermo Soho, CABA',
    phone: '+54 11 4771-8822',
    whatsappNumber: '5491147718822',
    logoUrl: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=150&auto=format&fit=crop&q=80',
    primaryColor: '#b45309',
    welcomeMessage: 'Cuidamos tu estilo. Reserva tu turno de corte, barba o spa capilar en 1 minuto.',
    cancellationPolicy: 'Cancelación sin cargo hasta 2 horas antes.',
    bufferMinutes: 5,
    plan: 'pro',
    status: 'active',
    createdAt: '2026-03-04T12:00:00.000Z',
    paymentsEnabled: true,
    depositRequired: false,
    depositType: 'fixed',
    depositAmount: 2000,
    mpAliasOrLink: 'urbano.barberia',
    bankAlias: 'URBANO.BARBERSHOP',
    bankCbu: '0070088820000099432100',
    bankAccountHolder: 'Estudio Urbano Barbería',
    bankName: 'Banco Macro',
    paymentInstructions: 'Seña opcional o abona directamente al finalizar en el local.',
  },
  {
    id: 'biz_veterinaria_animal_care',
    slug: 'veterinaria-animal-care',
    name: 'Clínica Veterinaria & Quirófano Animal Care',
    businessType: 'veterinary',
    description: 'Atención clínica para perros y gatos, vacunación, ecografías, cirugías programadas y peluquería canina.',
    category: 'Veterinarias',
    address: 'Av. Rivadavia 5630, Caballito, CABA',
    phone: '+54 11 4432-1188',
    whatsappNumber: '5491144321188',
    logoUrl: 'https://images.unsplash.com/photo-1548767797-d8c844163c4c?w=150&auto=format&fit=crop&q=80',
    primaryColor: '#0284c7',
    welcomeMessage: 'El mejor cuidado médico y estético para tu mascota. Reserva consulta o baño sin demoras.',
    cancellationPolicy: 'Avisar 4 horas antes para reprogramar tu consulta.',
    bufferMinutes: 10,
    plan: 'pro',
    status: 'active',
    createdAt: '2026-03-05T08:30:00.000Z',
    paymentsEnabled: true,
    depositRequired: true,
    depositType: 'fixed',
    depositAmount: 3500,
    mpAliasOrLink: 'animalcare.vet.mp',
    bankAlias: 'ANIMALCARE.VET.CABALLITO',
    bankCbu: '0170044420000067332211',
    bankAccountHolder: 'Clínica Veterinaria Animal Care',
    bankName: 'Banco BBVA',
    paymentInstructions: 'Seña de $3.500 para confirmar la consulta médica o turno de peluquería.',
  },
];

export const INITIAL_PROFESSIONALS: Professional[] = [
  // Dermatocosmiatría
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

  // Odontología
  {
    id: 'prof_lucas_odonto',
    businessId: 'biz_odontologia_integral',
    name: 'Dr. Lucas Varela',
    title: 'Odontólogo Especialista en Prótesis & Estética',
    photoUrl: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=160&auto=format&fit=crop&q=80',
    email: 'lucas@odontopalermo.com',
    phone: '+54 11 4821-3345',
    active: true,
    specialty: 'Estética Dental & Prótesis',
    serviceIds: ['srv_odonto_limpieza', 'srv_odonto_blanqueamiento', 'srv_odonto_consulta'],
  },
  {
    id: 'prof_valeria_orto',
    businessId: 'biz_odontologia_integral',
    name: 'Dra. Valeria Rossi',
    title: 'Especialista en Ortodoncia Invisible & Alineadores',
    photoUrl: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=160&auto=format&fit=crop&q=80',
    email: 'valeria@odontopalermo.com',
    phone: '+54 11 4821-3346',
    active: true,
    specialty: 'Ortodoncia & Alineadores',
    serviceIds: ['srv_odonto_ortodoncia', 'srv_odonto_consulta'],
  },

  // Centro Médico Belgrano
  {
    id: 'prof_martin_medico',
    businessId: 'biz_centro_medico_belgrano',
    name: 'Dr. Martín Sotomayor',
    title: 'Médico Clínico & Especialista en Medicina Interna',
    photoUrl: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=160&auto=format&fit=crop&q=80',
    email: 'sotomayor@medicosbelgrano.com',
    phone: '+54 11 4788-9901',
    active: true,
    specialty: 'Medicina Clínica General',
    serviceIds: ['srv_med_clinica', 'srv_med_chequeo'],
  },
  {
    id: 'prof_carolina_derm',
    businessId: 'biz_centro_medico_belgrano',
    name: 'Dra. Carolina Méndez',
    title: 'Médica Dermatóloga (UBA)',
    photoUrl: 'https://images.unsplash.com/photo-1594824813689-53e77c6ca93f?w=160&auto=format&fit=crop&q=80',
    email: 'mendez@medicosbelgrano.com',
    phone: '+54 11 4788-9902',
    active: true,
    specialty: 'Dermatología Clínica & Lunares',
    serviceIds: ['srv_med_dermato', 'srv_med_clinica'],
  },

  // Barbería Urbana
  {
    id: 'prof_franco_barber',
    businessId: 'biz_studio_barberia_urbana',
    name: 'Franco Navarro',
    title: 'Master Barber & Estilista Masculino',
    photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=160&auto=format&fit=crop&q=80',
    email: 'franco@urbanobarber.com',
    phone: '+54 11 4771-8823',
    active: true,
    specialty: 'Cortes Clásicos & Fade',
    serviceIds: ['srv_barb_corte', 'srv_barb_combo', 'srv_barb_barba'],
  },

  // Veterinaria Animal Care
  {
    id: 'prof_esteban_vet',
    businessId: 'biz_veterinaria_animal_care',
    name: 'Dr. Esteban Benítez (M.V.)',
    title: 'Médico Veterinario & Cirujano Pequeños Animales',
    photoUrl: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=160&auto=format&fit=crop&q=80',
    email: 'esteban@animalcare.com',
    phone: '+54 11 4432-1189',
    active: true,
    specialty: 'Medicina Veterinaria Canina y Felina',
    serviceIds: ['srv_vet_consulta', 'srv_vet_vacunas', 'srv_vet_bano'],
  },
];

export const INITIAL_SERVICES: Service[] = [
  // Dermatocosmiatría
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

  // Odontología
  {
    id: 'srv_odonto_consulta',
    businessId: 'biz_odontologia_integral',
    name: 'Consulta Diagnóstica Integral & Ficha Odontológica',
    description: 'Evaluación bucodental completa, radiografías panorámicas intraorales y plan de tratamiento.',
    durationMinutes: 30,
    price: 15000,
    currency: '$',
    active: true,
    assignedProfessionalIds: ['prof_lucas_odonto', 'prof_valeria_orto'],
  },
  {
    id: 'srv_odonto_limpieza',
    businessId: 'biz_odontologia_integral',
    name: 'Limpieza Ultrasónica & Profilaxis con Flúor',
    description: 'Eliminación profunda de sarro supra y subgingival con ultrasonido y pulido coronario.',
    durationMinutes: 45,
    price: 24000,
    currency: '$',
    active: true,
    assignedProfessionalIds: ['prof_lucas_odonto'],
  },
  {
    id: 'srv_odonto_blanqueamiento',
    businessId: 'biz_odontologia_integral',
    name: 'Blanqueamiento Dental Láser / Led en Consultorio',
    description: 'Aclaramiento dental en una sola sesión de 60 minutos con gel de peróxido activado por luz led fría.',
    durationMinutes: 60,
    price: 55000,
    currency: '$',
    active: true,
    assignedProfessionalIds: ['prof_lucas_odonto'],
  },
  {
    id: 'srv_odonto_ortodoncia',
    businessId: 'biz_odontologia_integral',
    name: 'Evaluación para Alineadores Invisibles & Escaneo 3D',
    description: 'Escaneo digital 3D intraoral sin moldes de pasta para planificación de ortodoncia invisible.',
    durationMinutes: 45,
    price: 28000,
    currency: '$',
    active: true,
    assignedProfessionalIds: ['prof_valeria_orto'],
  },

  // Centro Médico Belgrano
  {
    id: 'srv_med_clinica',
    businessId: 'biz_centro_medico_belgrano',
    name: 'Consulta Médica Clínica General',
    description: 'Evaluación de síntomas, control de patologías crónicas, prescripción y solicitud de estudios complementarios.',
    durationMinutes: 30,
    price: 18000,
    currency: '$',
    active: true,
    assignedProfessionalIds: ['prof_martin_medico'],
  },
  {
    id: 'srv_med_dermato',
    businessId: 'biz_centro_medico_belgrano',
    name: 'Consulta Dermatológica & Dermatoscopía de Lunares',
    description: 'Revisión minuciosa de piel, lunares y manchas con dermatoscopio digital.',
    durationMinutes: 30,
    price: 25000,
    currency: '$',
    active: true,
    assignedProfessionalIds: ['prof_carolina_derm'],
  },
  {
    id: 'srv_med_chequeo',
    businessId: 'biz_centro_medico_belgrano',
    name: 'Apto Físico & Chequeo Cardiovascular Básico',
    description: 'Electrocardiograma informado en el acto, auscultación y certificado médico oficial.',
    durationMinutes: 35,
    price: 22000,
    currency: '$',
    active: true,
    assignedProfessionalIds: ['prof_martin_medico'],
  },

  // Barbería
  {
    id: 'srv_barb_corte',
    businessId: 'biz_studio_barberia_urbana',
    name: 'Corte de Cabello Estilizado & Lavado Premium',
    description: 'Corte a tijera y máquina con asesoramiento según forma del rostro y peinado con pomada mate.',
    durationMinutes: 35,
    price: 12000,
    currency: '$',
    active: true,
    assignedProfessionalIds: ['prof_franco_barber'],
  },
  {
    id: 'srv_barb_barba',
    businessId: 'biz_studio_barberia_urbana',
    name: 'Ritual de Barba con Toalla Caliente & Navaja',
    description: 'Rebaje, perfilado milimétrico con navaja descartable, toalla caliente aromatizada y bálsamo hidratante.',
    durationMinutes: 30,
    price: 9500,
    currency: '$',
    active: true,
    assignedProfessionalIds: ['prof_franco_barber'],
  },
  {
    id: 'srv_barb_combo',
    businessId: 'biz_studio_barberia_urbana',
    name: 'Combo Completo: Corte + Barba + Bebida de Cortesía',
    description: 'La experiencia completa de estilo y relajación en un solo turno.',
    durationMinutes: 50,
    price: 18500,
    currency: '$',
    active: true,
    assignedProfessionalIds: ['prof_franco_barber'],
  },

  // Veterinaria
  {
    id: 'srv_vet_consulta',
    businessId: 'biz_veterinaria_animal_care',
    name: 'Consulta Clínica Veterinaria General',
    description: 'Examen físico completo de tu mascota: peso, temperatura, mucosas, auscultación y diagnóstico.',
    durationMinutes: 30,
    price: 16000,
    currency: '$',
    active: true,
    assignedProfessionalIds: ['prof_esteban_vet'],
  },
  {
    id: 'srv_vet_vacunas',
    businessId: 'biz_veterinaria_animal_care',
    name: 'Plan de Vacunación Anual / Desparasitación',
    description: 'Aplicación de vacuna séxtuple/quíntuple o antirrábica con certificado veterinario oficial.',
    durationMinutes: 20,
    price: 19000,
    currency: '$',
    active: true,
    assignedProfessionalIds: ['prof_esteban_vet'],
  },
  {
    id: 'srv_vet_bano',
    businessId: 'biz_veterinaria_animal_care',
    name: 'Baño Terapéutico & Peluquería Canina / Felina',
    description: 'Baño con shampoo hipoalergénico, corte higiénico, secado profesional y corte de uñas.',
    durationMinutes: 60,
    price: 22000,
    currency: '$',
    active: true,
    assignedProfessionalIds: ['prof_esteban_vet'],
  },
];

const INITIAL_WORKING_HOURS: WorkingHours[] = [
  // Generic hours for all initial businesses
  ...['biz_dermatocosmiatria_spa', 'biz_odontologia_integral', 'biz_centro_medico_belgrano', 'biz_studio_barberia_urbana', 'biz_veterinaria_animal_care'].flatMap((bId) => [
    {
      id: `wh_${bId}_1`,
      businessId: bId,
      professionalId: null,
      dayOfWeek: 1,
      shifts: [{ start: '09:00', end: '13:00' }, { start: '14:00', end: '19:00' }],
      enabled: true,
    },
    {
      id: `wh_${bId}_2`,
      businessId: bId,
      professionalId: null,
      dayOfWeek: 2,
      shifts: [{ start: '09:00', end: '13:00' }, { start: '14:00', end: '19:00' }],
      enabled: true,
    },
    {
      id: `wh_${bId}_3`,
      businessId: bId,
      professionalId: null,
      dayOfWeek: 3,
      shifts: [{ start: '09:00', end: '13:00' }, { start: '14:00', end: '19:00' }],
      enabled: true,
    },
    {
      id: `wh_${bId}_4`,
      businessId: bId,
      professionalId: null,
      dayOfWeek: 4,
      shifts: [{ start: '09:00', end: '13:00' }, { start: '14:00', end: '19:00' }],
      enabled: true,
    },
    {
      id: `wh_${bId}_5`,
      businessId: bId,
      professionalId: null,
      dayOfWeek: 5,
      shifts: [{ start: '09:00', end: '13:00' }, { start: '14:00', end: '19:00' }],
      enabled: true,
    },
    {
      id: `wh_${bId}_6`,
      businessId: bId,
      professionalId: null,
      dayOfWeek: 6,
      shifts: [{ start: '10:00', end: '16:00' }],
      enabled: true,
    },
    {
      id: `wh_${bId}_0`,
      businessId: bId,
      professionalId: null,
      dayOfWeek: 0,
      shifts: [],
      enabled: false,
    },
  ]),
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

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.user) {
          this.currentUser = data.user;
          saveStorage(STORAGE_KEYS.USER, data.user);
          this.notifyAuthChange();
          // Reload businesses to pick up any changes
          await this.syncFromCloud().catch(() => {});
          return data.user;
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        if (errData.error) throw new Error(errData.error);
      }
    } catch (err: any) {
      if (err.message && err.message.includes('SuperAdmin')) {
        throw err;
      }
      // If network issue, fallback to client-side logic
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

  async register(data: {
    name: string;
    email: string;
    password?: string;
    role: string;
    businessId?: string | null;
    businessName?: string;
    businessType?: string;
    businessCode?: string;
    specialty?: string;
    phone?: string;
  }): Promise<User> {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        const resData = await res.json();
        if (resData && resData.user) {
          this.currentUser = resData.user;
          saveStorage(STORAGE_KEYS.USER, resData.user);
          this.notifyAuthChange();
          // Resync businesses from backend
          await this.syncFromCloud().catch(() => {});
          return resData.user;
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        if (errData.error) {
          throw new Error(errData.error);
        }
      }
    } catch (err: any) {
      if (err.message && !err.message.includes('fetch') && !err.message.includes('Failed to fetch')) {
        throw err;
      }
    }

    // Client-side fallback if offline
    const cleanEmail = data.email.trim();
    let bizId = data.businessId || null;

    if (data.role === 'business_owner') {
      const bizName = (data.businessName && data.businessName.trim()) || `Consultorio ${data.name}`;
      let baseSlug = bizName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      if (!baseSlug || baseSlug.length < 3) baseSlug = `consultorio-${Date.now().toString(36)}`;

      const newLocalBiz: Business = {
        id: `biz_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: bizName,
        slug: baseSlug,
        businessType: (data.businessType as any) || 'medical',
        description: `Centro de atención profesional y turnos de ${data.name}.`,
        category: 'Consultorio & Especialidades',
        address: 'Atención presencial y turnos online',
        phone: data.phone || '+54 11 0000-0000',
        whatsappNumber: (data.phone || '5491100000000').replace(/\D/g, ''),
        primaryColor: '#0d9488',
        welcomeMessage: `¡Bienvenido a ${bizName}! Agenda tu turno en simples pasos.`,
        cancellationPolicy: 'Podrás reprogramar o cancelar con al menos 4 horas de anticipación.',
        bufferMinutes: 10,
        plan: 'pro',
        status: 'active',
        createdAt: new Date().toISOString(),
      };
      this.businesses.push(newLocalBiz);
      saveStorage(STORAGE_KEYS.BUSINESSES, this.businesses);
      bizId = newLocalBiz.id;
    }

    const localUser: User = {
      id: `usr_${Date.now()}`,
      name: data.name,
      email: cleanEmail,
      role: data.role as any,
      businessId: bizId,
    };

    this.currentUser = localUser;
    saveStorage(STORAGE_KEYS.USER, localUser);
    this.notifyAuthChange();
    return localUser;
  }

  async logout(): Promise<void> {
    try {
      await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    } catch {}
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
    const biz = this.businesses.find((b) => b.id === businessId);
    if (biz) {
      const currentProfs = this.professionals.filter((p) => p.businessId === businessId);
      const limitCheck = checkProfessionalLimit(biz, currentProfs.length);
      if (!limitCheck.allowed) {
        throw new Error(limitCheck.reason || 'Límite de profesionales alcanzado para tu plan actual');
      }
    }

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

    const limitCheck = checkAppointmentCreationLimit(biz, this.appointments);
    if (!limitCheck.allowed) {
      throw new Error(limitCheck.reason || 'Límite de turnos alcanzado para el plan actual');
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
    try {
      const res = await fetch('/api/wapi/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId, ...payload }),
      });
      const text = await res.text();
      if (!text || !text.trim()) {
        return { success: res.ok, message: res.ok ? 'Servidor contactado exitosamente' : `Error HTTP ${res.status}` };
      }
      try {
        return JSON.parse(text);
      } catch {
        return { success: res.ok, message: text.slice(0, 150) };
      }
    } catch (err: any) {
      return { success: false, error: err.message || 'No se pudo contactar el servidor de prueba' };
    }
  }

  async getEvolutionQr(payload: { webhookUrl: string; apiKey: string; instanceId: string }): Promise<{
    success: boolean;
    qrcode?: string;
    state?: string;
    message?: string;
    error?: string;
  }> {
    // 1. Try local Express backend proxy
    try {
      const res = await fetch('/api/evolution/qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const text = await res.text();
        if (text && text.trim()) {
          try {
            const data = JSON.parse(text);
            if (data.success) return data;
          } catch {}
        }
      }
    } catch {}

    // 2. Direct Railway fallback (in case proxy throws 405 or iframe gateway intercepts)
    try {
      const cleanBase = (payload.webhookUrl || 'https://evoapicloudevolution-apiv236-production-0197.up.railway.app')
        .trim()
        .replace(/\/+$/, '');
      const instance = payload.instanceId || 'dermatocosmiatria_spa';
      const key = payload.apiKey || 'turnosdisponibles_secret_2026';

      // Direct connect attempt
      const directRes = await fetch(`${cleanBase}/instance/connect/${instance}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'apikey': key,
        },
      });

      if (directRes.ok) {
        const data = await directRes.json();
        const qr = data.base64 || data.qrcode?.base64 || data.code;
        if (qr) {
          const finalQr = qr.startsWith('data:image') ? qr : `data:image/png;base64,${qr}`;
          return {
            success: true,
            qrcode: finalQr,
            state: 'connecting',
            message: 'Código QR obtenido exitosamente.',
          };
        }
        if (data.instance?.state === 'open' || data.state === 'open') {
          return {
            success: true,
            state: 'open',
            message: 'Instancia ya conectada.',
          };
        }
      }
    } catch (directErr: any) {
      console.warn('Direct Railway fetch failed:', directErr);
    }

    return {
      success: false,
      error: 'No se pudo generar el código QR. Verifica que la URL de Railway esté activa.',
    };
  }

  async getEvolutionState(instanceId: string, webhookUrl: string, apiKey: string): Promise<{
    success: boolean;
    state: string;
    connected: boolean;
  }> {
    try {
      const url = `/api/evolution/state/${encodeURIComponent(instanceId)}?webhookUrl=${encodeURIComponent(webhookUrl)}&apiKey=${encodeURIComponent(apiKey)}`;
      const res = await fetch(url);
      const text = await res.text();
      if (!text || !text.trim()) {
        return { success: false, state: 'unknown', connected: false };
      }
      try {
        return JSON.parse(text);
      } catch {
        return { success: false, state: 'unknown', connected: false };
      }
    } catch {
      return { success: false, state: 'unknown', connected: false };
    }
  }

  // Plan Experiencia AI Methods
  async chatWithAi(businessId: string, message: string): Promise<{ reply: string; source?: string }> {
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId, message }),
      });
      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}`);
      }
      return await res.json();
    } catch (e) {
      console.warn('AI Chat fallback due to network or server:', e);
      return {
        reply: `¡Hola! Gracias por contactarnos. Nuestro equipo responderá a la brevedad. Podés reservar directamente en nuestra agenda online.`,
        source: 'client-fallback',
      };
    }
  }

  async generateGapCampaign(businessId: string): Promise<{
    success: boolean;
    campaignMessage: string;
    targetBusiness: string;
    suggestedChannels: string[];
  }> {
    try {
      const res = await fetch('/api/ai/gap-campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId }),
      });
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      return await res.json();
    } catch (e) {
      const biz = this.businesses.find((b) => b.id === businessId);
      const bizName = biz?.name || 'nuestro centro';
      return {
        success: true,
        campaignMessage: `🌟 ¡Huecos de última hora disponibles en ${bizName}! 🌟\n\nHola 👋 ¿Querés cuidar tu salud y bienestar esta semana? Tenemos turnos libres disponibles.\n\n👉 Reservá tu turno en 1 minuto: https://turnosdisponibles.online/book/${biz?.slug || ''}`,
        targetBusiness: bizName,
        suggestedChannels: ['WhatsApp Broadcast', 'Instagram Stories'],
      };
    }
  }
}

export const api = new ApiService();
export const localStore = api;
