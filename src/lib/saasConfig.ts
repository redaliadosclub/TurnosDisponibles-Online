export interface SaasPlanConfig {
  whatsappNumber: string; // e.g. "5492474478646"
  freePlan: {
    name: string;
    price: string;
    pricePeriod: string;
    whatsappMessage: string;
  };
  proPlan: {
    name: string;
    price: string;
    pricePeriod: string;
    whatsappMessage: string;
  };
  aiPlan: {
    name: string;
    price: string;
    pricePeriod: string;
    whatsappMessage: string;
  };
  whiteLabelPlan?: {
    name: string;
    badge: string;
    price: string;
    pricePeriod: string;
    ctaText: string;
    whatsappMessage: string;
  };
}

export const DEFAULT_SAAS_CONFIG: SaasPlanConfig = {
  whatsappNumber: '5492474478646',
  freePlan: {
    name: 'Prueba Pro 15 Días • Sin Tarjeta',
    price: '$0',
    pricePeriod: '15 días Pro gratis • luego Plan Free hasta 20 turnos/mes',
    whatsappMessage: 'Hola, quiero comenzar la Prueba Pro de 15 días gratis (y luego continuar con el Plan Base Free de hasta 20 turnos/mes) en TurnosDisponibles.online',
  },
  proPlan: {
    name: 'Plan Pro Ilimitado',
    price: '$24.900',
    pricePeriod: 'al mes / turnos ilimitados',
    whatsappMessage: 'Hola, quiero activar el Plan Pro Ilimitado ($24.900/mes) para mi negocio en TurnosDisponibles.online',
  },
  aiPlan: {
    name: 'Plan Experiencia AI',
    price: '$49.900',
    pricePeriod: 'al mes / máxima automatización',
    whatsappMessage: 'Hola, quiero activar el Plan Experiencia AI ($49.900/mes) para mi centro / franquicia en TurnosDisponibles.online',
  },
  whiteLabelPlan: {
    name: 'Plan Marca Blanca / SaaS Partner',
    badge: 'Agencias, Redes & Franquicias',
    price: 'A Medida',
    pricePeriod: 'cotización personalizada',
    ctaText: 'Comunicate con nuestro equipo',
    whatsappMessage: 'Hola, me interesa conocer la propuesta de Marca Blanca / SaaS Partner para comercializar la plataforma con mi propia marca en TurnosDisponibles.online',
  },
};

const STORAGE_KEY = 'td_saas_pricing_config_v5';

export function getSaasConfig(): SaasPlanConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_SAAS_CONFIG,
        ...parsed,
        freePlan: { ...DEFAULT_SAAS_CONFIG.freePlan, ...(parsed.freePlan || {}) },
        proPlan: { ...DEFAULT_SAAS_CONFIG.proPlan, ...(parsed.proPlan || {}) },
        aiPlan: { ...DEFAULT_SAAS_CONFIG.aiPlan, ...(parsed.aiPlan || {}) },
        whiteLabelPlan: { ...DEFAULT_SAAS_CONFIG.whiteLabelPlan, ...(parsed.whiteLabelPlan || {}) },
      };
    }
  } catch (err) {
    console.error('Error reading saas config', err);
  }
  return DEFAULT_SAAS_CONFIG;
}

export function saveSaasConfig(config: SaasPlanConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    window.dispatchEvent(new Event('saas-config-updated'));
  } catch (err) {
    console.error('Error saving saas config', err);
  }
}

export function buildWhatsAppPlanLink(phone: string, text: string): string {
  const cleanPhone = phone.replace(/\D/g, '');
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
}
