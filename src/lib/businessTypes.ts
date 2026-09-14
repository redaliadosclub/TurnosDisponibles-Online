import { BusinessTypeKey, BusinessTypeLabels, Business } from '../types';

export const BUSINESS_TYPES: Record<
  BusinessTypeKey,
  { name: string; icon: string; defaultLabels: BusinessTypeLabels }
> = {
  medical: {
    name: 'Médico / Salud',
    icon: 'Stethoscope',
    defaultLabels: {
      clientLabel: 'Paciente',
      clientsLabel: 'Pacientes',
      professionalLabel: 'Médico / Profesional',
      professionalsLabel: 'Médicos y Especialistas',
      serviceLabel: 'Consulta / Práctica',
      servicesLabel: 'Consultas y Servicios',
      appointmentLabel: 'Turno',
      appointmentsLabel: 'Turnos',
      specialtyLabel: 'Especialidad',
    },
  },
  dental: {
    name: 'Odontología',
    icon: 'Smile',
    defaultLabels: {
      clientLabel: 'Paciente',
      clientsLabel: 'Pacientes',
      professionalLabel: 'Odontólogo(a)',
      professionalsLabel: 'Odontólogos',
      serviceLabel: 'Tratamiento / Consulta',
      servicesLabel: 'Tratamientos y Procedimientos',
      appointmentLabel: 'Turno dental',
      appointmentsLabel: 'Turnos',
      specialtyLabel: 'Área odontológica',
    },
  },
  beauty: {
    name: 'Estética / Peluquería / Barbería',
    icon: 'Sparkles',
    defaultLabels: {
      clientLabel: 'Cliente',
      clientsLabel: 'Clientes',
      professionalLabel: 'Estilista / Especialista',
      professionalsLabel: 'Profesionales',
      serviceLabel: 'Servicio / Tratamiento',
      servicesLabel: 'Servicios de Belleza',
      appointmentLabel: 'Cita / Turno',
      appointmentsLabel: 'Citas',
      specialtyLabel: 'Especialidad',
    },
  },
  veterinary: {
    name: 'Veterinaria',
    icon: 'PawPrint',
    defaultLabels: {
      clientLabel: 'Tutor / Paciente',
      clientsLabel: 'Tutores / Pacientes',
      professionalLabel: 'Veterinario(a)',
      professionalsLabel: 'Veterinarios',
      serviceLabel: 'Atención / Consulta',
      servicesLabel: 'Consultas y Cirugías',
      appointmentLabel: 'Turno',
      appointmentsLabel: 'Turnos',
      specialtyLabel: 'Área veterinaria',
    },
  },
  psychology: {
    name: 'Psicología / Terapia',
    icon: 'Brain',
    defaultLabels: {
      clientLabel: 'Paciente / Consultante',
      clientsLabel: 'Pacientes',
      professionalLabel: 'Terapeuta / Psicólogo(a)',
      professionalsLabel: 'Terapeutas',
      serviceLabel: 'Sesión / Consulta',
      servicesLabel: 'Sesiones y Terapias',
      appointmentLabel: 'Sesión',
      appointmentsLabel: 'Sesiones',
      specialtyLabel: 'Orientación / Enfoque',
    },
  },
  fitness: {
    name: 'Fitness / Entrenador / Yoga',
    icon: 'Dumbbell',
    defaultLabels: {
      clientLabel: 'Alumno / Cliente',
      clientsLabel: 'Alumnos',
      professionalLabel: 'Entrenador(a) / Instructor(a)',
      professionalsLabel: 'Instructores',
      serviceLabel: 'Clase / Sesión',
      servicesLabel: 'Clases y Planes',
      appointmentLabel: 'Reserva',
      appointmentsLabel: 'Reservas',
      specialtyLabel: 'Disciplina',
    },
  },
  services: {
    name: 'Servicios Profesionales / Talleres',
    icon: 'Briefcase',
    defaultLabels: {
      clientLabel: 'Cliente',
      clientsLabel: 'Clientes',
      professionalLabel: 'Profesional / Técnico',
      professionalsLabel: 'Profesionales',
      serviceLabel: 'Servicio / Asesoría',
      servicesLabel: 'Servicios',
      appointmentLabel: 'Cita / Turno',
      appointmentsLabel: 'Citas',
      specialtyLabel: 'Especialidad',
    },
  },
};

export function getBusinessLabels(business?: Business | null): BusinessTypeLabels {
  if (!business) {
    return BUSINESS_TYPES.medical.defaultLabels;
  }
  const typeConfig = BUSINESS_TYPES[business.businessType] || BUSINESS_TYPES.medical;
  return {
    ...typeConfig.defaultLabels,
    ...(business.customLabels || {}),
  };
}
