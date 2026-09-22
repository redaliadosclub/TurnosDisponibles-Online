import { Business, Appointment } from '../types';

export interface TrialStatus {
  isTrial: boolean;
  daysRemaining: number;
  trialEndsAt: string;
}

/**
 * Calculates whether a business is currently in the 15-day Pro Trial period
 */
export function getBusinessTrialStatus(business: Business): TrialStatus {
  if (!business.createdAt) {
    return { isTrial: false, daysRemaining: 0, trialEndsAt: '' };
  }

  const createdTime = new Date(business.createdAt).getTime();
  const now = Date.now();
  const trialDurationMs = 15 * 24 * 60 * 60 * 1000;
  const trialEndMs = createdTime + trialDurationMs;
  const diffMs = trialEndMs - now;

  if (diffMs > 0) {
    const daysRemaining = Math.max(1, Math.ceil(diffMs / (24 * 60 * 60 * 1000)));
    return {
      isTrial: true,
      daysRemaining,
      trialEndsAt: new Date(trialEndMs).toISOString(),
    };
  }

  return {
    isTrial: false,
    daysRemaining: 0,
    trialEndsAt: new Date(trialEndMs).toISOString(),
  };
}

/**
 * Counts non-cancelled appointments in the current calendar month
 */
export function getMonthlyAppointmentsCount(
  appointments: Appointment[],
  businessId: string,
  targetYearMonth?: string // Format 'YYYY-MM'
): number {
  const currentYm = targetYearMonth || new Date().toISOString().slice(0, 7);
  return appointments.filter((app) => {
    if (app.businessId !== businessId) return false;
    if (app.status === 'cancelled') return false;
    return app.date && app.date.startsWith(currentYm);
  }).length;
}

export interface PlanLimitsCheck {
  allowed: boolean;
  monthlyCount: number;
  monthlyLimit: number | 'unlimited';
  isTrial: boolean;
  trialDaysRemaining: number;
  reason?: string;
}

/**
 * Validates if the business can accept more bookings this month according to its plan
 */
export function checkAppointmentCreationLimit(
  business: Business,
  appointments: Appointment[]
): PlanLimitsCheck {
  const trial = getBusinessTrialStatus(business);
  const monthlyCount = getMonthlyAppointmentsCount(appointments, business.id);

  // If business is on Pro, Business/AI, or WhiteLabel, it has unlimited bookings
  if (business.plan === 'pro' || business.plan === 'business' || business.plan === 'whitelabel') {
    return {
      allowed: true,
      monthlyCount,
      monthlyLimit: 'unlimited',
      isTrial: trial.isTrial,
      trialDaysRemaining: trial.daysRemaining,
    };
  }

  // Business is on Free plan
  // If still within 15-day trial, allow unlimited
  if (trial.isTrial) {
    return {
      allowed: true,
      monthlyCount,
      monthlyLimit: 'unlimited',
      isTrial: true,
      trialDaysRemaining: trial.daysRemaining,
    };
  }

  // Post-trial Free plan: limit of 20 appointments per month
  const FREE_MONTHLY_LIMIT = 20;
  if (monthlyCount >= FREE_MONTHLY_LIMIT) {
    return {
      allowed: false,
      monthlyCount,
      monthlyLimit: FREE_MONTHLY_LIMIT,
      isTrial: false,
      trialDaysRemaining: 0,
      reason: `Has alcanzado el límite mensual de ${FREE_MONTHLY_LIMIT} turnos del Plan Base Free. Para continuar agendando sin restricciones, asciende al Plan Pro Ilimitado.`,
    };
  }

  return {
    allowed: true,
    monthlyCount,
    monthlyLimit: FREE_MONTHLY_LIMIT,
    isTrial: false,
    trialDaysRemaining: 0,
  };
}

/**
 * Validates maximum professionals allowed per plan
 */
export function checkProfessionalLimit(
  business: Business,
  currentCount: number
): { allowed: boolean; maxAllowed: number; reason?: string } {
  const trial = getBusinessTrialStatus(business);

  if (business.plan === 'business' || business.plan === 'whitelabel') {
    return { allowed: true, maxAllowed: 999 };
  }

  if (business.plan === 'pro' || trial.isTrial) {
    const PRO_MAX_PROFS = 5;
    if (currentCount >= PRO_MAX_PROFS) {
      return {
        allowed: false,
        maxAllowed: PRO_MAX_PROFS,
        reason: `El Plan Pro incluye hasta ${PRO_MAX_PROFS} profesionales con agendas independientes. Para profesionales ilimitados, asciende al Plan Experiencia AI.`,
      };
    }
    return { allowed: true, maxAllowed: PRO_MAX_PROFS };
  }

  // Free plan post-trial: 1 professional
  const FREE_MAX_PROFS = 1;
  if (currentCount >= FREE_MAX_PROFS) {
    return {
      allowed: false,
      maxAllowed: FREE_MAX_PROFS,
      reason: `El Plan Base Free incluye 1 profesional. Asciende al Plan Pro para gestionar hasta 5 profesionales con agendas separadas.`,
    };
  }

  return { allowed: true, maxAllowed: FREE_MAX_PROFS };
}
