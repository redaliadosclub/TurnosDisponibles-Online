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
    // Plan PRO: hasta 5 Profesionales y Especialistas (consultorios) + 1 del dueño o director (máximo 6)
    const PRO_MAX_PROFS = 6;
    if (currentCount >= PRO_MAX_PROFS) {
      return {
        allowed: false,
        maxAllowed: PRO_MAX_PROFS,
        reason: `El Plan Pro incluye hasta 5 consultorios de especialistas + 1 del dueño/director (máximo ${PRO_MAX_PROFS} consultorios). Para consultorios ilimitados, asciende al Plan Experiencia AI.`,
      };
    }
    return { allowed: true, maxAllowed: PRO_MAX_PROFS };
  }

  // Freemium / Free plan post-trial: 1 profesional / consultorio
  const FREE_MAX_PROFS = 1;
  if (currentCount >= FREE_MAX_PROFS) {
    return {
      allowed: false,
      maxAllowed: FREE_MAX_PROFS,
      reason: `El Plan Freemium incluye 1 profesional y especialista (consultorio). Asciende al Plan Pro para habilitar hasta 5 consultorios + 1 del dueño.`,
    };
  }

  return { allowed: true, maxAllowed: FREE_MAX_PROFS };
}

export interface SmartPlanRecommendation {
  status: 'normal' | 'approaching_limit' | 'limit_reached';
  currentPlan: Business['plan'];
  recommendedPlan: Business['plan'];
  reason: string;
  monthlyCount: number;
  monthlyLimit: number | 'unlimited';
  percentUsed: number;
  isTrial: boolean;
  trialDaysRemaining: number;
}

/**
 * Evaluates business activity and returns an intelligent recommendation
 * to upgrade progressively to the next tier.
 */
export function getSmartPlanRecommendation(
  business: Business,
  appointments: Appointment[],
  professionalsCount: number
): SmartPlanRecommendation | null {
  const trial = getBusinessTrialStatus(business);
  const monthlyCount = getMonthlyAppointmentsCount(appointments, business.id);

  // 1. FREE PLAN
  if (business.plan === 'free') {
    if (trial.isTrial) {
      if (trial.daysRemaining <= 3) {
        return {
          status: 'approaching_limit',
          currentPlan: 'free',
          recommendedPlan: 'pro',
          reason: `Te quedan ${trial.daysRemaining} días de prueba Pro completa. Pasa a Pro Ilimitado para conservar todas las funciones de cobranza y turnos sin límites.`,
          monthlyCount,
          monthlyLimit: 'unlimited',
          percentUsed: 100 - (trial.daysRemaining / 15) * 100,
          isTrial: true,
          trialDaysRemaining: trial.daysRemaining,
        };
      }
      return null;
    }

    const FREE_LIMIT = 20;
    const percentUsed = Math.min(100, Math.round((monthlyCount / FREE_LIMIT) * 100));

    if (monthlyCount >= FREE_LIMIT) {
      return {
        status: 'limit_reached',
        currentPlan: 'free',
        recommendedPlan: 'pro',
        reason: `Has alcanzado el límite mensual de ${FREE_LIMIT} turnos del Plan Free. Pasa al Plan Pro Ilimitado para no rechazar turnos de tus pacientes.`,
        monthlyCount,
        monthlyLimit: FREE_LIMIT,
        percentUsed: 100,
        isTrial: false,
        trialDaysRemaining: 0,
      };
    }

    if (monthlyCount >= 16) {
      return {
        status: 'approaching_limit',
        currentPlan: 'free',
        recommendedPlan: 'pro',
        reason: `Llevas ${monthlyCount} de 20 turnos este mes (${percentUsed}%). Evita quedarte sin cupo pasando al Plan Pro Ilimitado.`,
        monthlyCount,
        monthlyLimit: FREE_LIMIT,
        percentUsed,
        isTrial: false,
        trialDaysRemaining: 0,
      };
    }

    if (professionalsCount >= 1) {
      return {
        status: 'normal',
        currentPlan: 'free',
        recommendedPlan: 'pro',
        reason: `Tienes 1 profesional activo. El Plan Pro te permite incorporar hasta 5 consultorios con agendas sincronizadas independientes.`,
        monthlyCount,
        monthlyLimit: FREE_LIMIT,
        percentUsed,
        isTrial: false,
        trialDaysRemaining: 0,
      };
    }

    return null;
  }

  // 2. PRO PLAN
  if (business.plan === 'pro') {
    if (professionalsCount >= 6) {
      return {
        status: 'limit_reached',
        currentPlan: 'pro',
        recommendedPlan: 'business',
        reason: `Has completado el límite de 6 profesionales del Plan Pro. Asciende a Experiencia AI para profesionales y sedes ilimitadas más Bot de IA.`,
        monthlyCount,
        monthlyLimit: 'unlimited',
        percentUsed: 100,
        isTrial: trial.isTrial,
        trialDaysRemaining: trial.daysRemaining,
      };
    }

    return null;
  }

  // 3. BUSINESS / AI PLAN
  if (business.plan === 'business') {
    return {
      status: 'normal',
      currentPlan: 'business',
      recommendedPlan: 'whitelabel',
      reason: `¿Buscas tu propia marca blanca con dominio independiente y reventa SaaS? Conoce nuestro plan Partner / WhiteLabel.`,
      monthlyCount,
      monthlyLimit: 'unlimited',
      percentUsed: 100,
      isTrial: trial.isTrial,
      trialDaysRemaining: trial.daysRemaining,
    };
  }

  return null;
}

