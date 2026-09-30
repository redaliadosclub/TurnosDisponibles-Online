import { Professional, Service, Appointment } from '../types';

export interface CommissionCalculationResult {
  servicePrice: number;
  commissionEnabled: boolean;
  commissionRate: number;
  commissionType: 'percentage' | 'fixed' | 'none';
  clinicCommission: number; // Monto a percibir por la clínica / dueño
  professionalNet: number; // Ganancia neta para el especialista
  depositAmount: number; // Monto de seña solicitado
  depositCoversCommission: boolean; // Si la seña cubre total o parcialmente la comisión
  balanceToPayInOffice: number; // Saldo que el paciente abona presencialmente en el consultorio
  settlementNote: string;
}

export interface ProfessionalCommissionSummary {
  professionalId: string;
  professionalName: string;
  commissionEnabled: boolean;
  commissionType: 'percentage' | 'fixed' | 'none';
  commissionRate: number;
  commissionRateDisplay: string;
  totalAppointments: number;
  completedAppointments: number;
  grossRevenue: number; // Facturación bruta total de consultas
  totalClinicCommission: number; // Comisión total para la clínica
  totalProfessionalNet: number; // Ganancia neta total del profesional
  totalDepositsCollected: number; // Total de señas recaudadas
  retainedCommissionFromDeposits: number; // Comisión cobrada directamente vía señas
  pendingSettlementToClinic: number; // Saldo que el profesional adeuda a la clínica
  pendingSettlementToProfessional: number; // Saldo que la clínica adeuda al profesional
}

/**
 * Calcula la comisión de una consulta médica / turno para la clínica y la ganancia neta del especialista.
 * Es 100% opcional para el dueño cobrar comisión: puede ser Porcentaje (%), Monto Fijo ($ ARS) o Sin Comisión (0%).
 */
export function calculateAppointmentCommission(
  appointment: Partial<Appointment>,
  professional: Professional,
  service?: Service
): CommissionCalculationResult {
  const servicePrice = service?.price ?? 0;

  // Determinar si la comisión está habilitada para este profesional
  const commissionEnabled =
    professional.commissionEnabled !== false &&
    professional.commissionType !== 'none' &&
    (professional.commissionRate === undefined || professional.commissionRate > 0);

  const commissionType: 'percentage' | 'fixed' | 'none' = !commissionEnabled
    ? 'none'
    : (professional.commissionType || 'percentage');

  const commissionRate = commissionEnabled ? (professional.commissionRate ?? 20) : 0;

  let clinicCommission = 0;
  if (commissionEnabled) {
    if (commissionType === 'percentage') {
      clinicCommission = Math.round((servicePrice * commissionRate) / 100);
    } else if (commissionType === 'fixed') {
      clinicCommission = Math.min(commissionRate, servicePrice);
    }
  }

  const professionalNet = Math.max(0, servicePrice - clinicCommission);

  // Cálculo de seña (prioridad: seña propia del profesional si está activa, o seña general de la cita)
  const depositAmount = appointment.depositAmount ?? 0;
  const depositCoversCommission = clinicCommission > 0 && depositAmount >= clinicCommission;
  const balanceToPayInOffice = Math.max(0, servicePrice - depositAmount);

  let settlementNote = '';
  if (!commissionEnabled || clinicCommission === 0) {
    settlementNote = 'Sin comisión de clínica: el especialista percibe el 100% del valor de la consulta.';
  } else if (depositAmount > 0) {
    if (depositCoversCommission) {
      const extra = depositAmount - clinicCommission;
      settlementNote = `La seña ($${depositAmount.toLocaleString('es-AR')}) cubre la comisión de la clínica ($${clinicCommission.toLocaleString('es-AR')})${extra > 0 ? ` con un excedente de $${extra.toLocaleString('es-AR')}` : ''}.`;
    } else {
      const diff = clinicCommission - depositAmount;
      settlementNote = `La seña ($${depositAmount.toLocaleString('es-AR')}) cubre parcialmente la comisión. Saldo pendiente de comisión: $${diff.toLocaleString('es-AR')}.`;
    }
  } else {
    settlementNote = `Consulta sin seña previa. La comisión de $${clinicCommission.toLocaleString('es-AR')} se liquida tras el cobro en consultorio.`;
  }

  return {
    servicePrice,
    commissionEnabled,
    commissionRate,
    commissionType,
    clinicCommission,
    professionalNet,
    depositAmount,
    depositCoversCommission,
    balanceToPayInOffice,
    settlementNote,
  };
}

/**
 * Genera el resumen consolidado de liquidación de comisiones para un profesional y sus turnos asignados.
 */
export function getProfessionalCommissionSummary(
  professional: Professional,
  appointments: Appointment[],
  services: Service[]
): ProfessionalCommissionSummary {
  const serviceMap = new Map(services.map((s) => [s.id, s]));
  const profAppointments = appointments.filter(
    (a) => a.professionalId === professional.id && a.status !== 'cancelled'
  );
  const completedAppointments = profAppointments.filter((a) => a.status === 'completed');

  let grossRevenue = 0;
  let totalClinicCommission = 0;
  let totalProfessionalNet = 0;
  let totalDepositsCollected = 0;
  let retainedCommissionFromDeposits = 0;

  for (const app of profAppointments) {
    const srv = serviceMap.get(app.serviceId);
    const calc = calculateAppointmentCommission(app, professional, srv);

    grossRevenue += calc.servicePrice;
    totalClinicCommission += calc.clinicCommission;
    totalProfessionalNet += calc.professionalNet;

    if (app.paymentStatus === 'deposit_paid' || app.paymentStatus === 'paid') {
      const dep = app.depositAmount ?? 0;
      totalDepositsCollected += dep;
      // Si la clínica recaudó la seña como cobro directo de comisión
      retainedCommissionFromDeposits += Math.min(dep, calc.clinicCommission);
    }
  }

  const commissionEnabled =
    professional.commissionEnabled !== false &&
    professional.commissionType !== 'none' &&
    (professional.commissionRate === undefined || professional.commissionRate > 0);

  const commissionType: 'percentage' | 'fixed' | 'none' = !commissionEnabled
    ? 'none'
    : (professional.commissionType || 'percentage');

  const commissionRate = commissionEnabled ? (professional.commissionRate ?? 20) : 0;

  let commissionRateDisplay = 'Sin comisión (100% para el especialista)';
  if (commissionEnabled) {
    if (commissionType === 'percentage') {
      commissionRateDisplay = `${commissionRate}% por consulta`;
    } else if (commissionType === 'fixed') {
      commissionRateDisplay = `$${commissionRate.toLocaleString('es-AR')} fijo por consulta`;
    }
  }

  // Saldo a liquidar
  const pendingSettlementToClinic = Math.max(0, totalClinicCommission - retainedCommissionFromDeposits);
  const pendingSettlementToProfessional = Math.max(0, totalDepositsCollected - totalClinicCommission);

  return {
    professionalId: professional.id,
    professionalName: professional.name,
    commissionEnabled,
    commissionType,
    commissionRate,
    commissionRateDisplay,
    totalAppointments: profAppointments.length,
    completedAppointments: completedAppointments.length,
    grossRevenue,
    totalClinicCommission,
    totalProfessionalNet,
    totalDepositsCollected,
    retainedCommissionFromDeposits,
    pendingSettlementToClinic,
    pendingSettlementToProfessional,
  };
}
