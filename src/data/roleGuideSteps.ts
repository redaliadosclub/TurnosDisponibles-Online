export type GuidedRole = 'superadmin' | 'tenant_owner' | 'staff' | 'end_user';

export interface GuideStepItem {
  id: string;
  stepNumber: number;
  title: string;
  shortTitle: string;
  summary: string;
  description: string;
  whyImportant: string;
  proTip: string;
  estimatedMinutes: number;
  targetView: 'portal' | 'public' | 'business' | 'superadmin' | 'staff';
  targetTab?: string;
  actionLabel: string;
  actionHint?: string;
  checklist?: string[];
}

export interface QuickFlowItem {
  number: string;
  title: string;
  highlight: string;
  description: string;
  iconName: string;
}

export interface TroubleshootingItem {
  question: string;
  answer: string;
  cause: string;
  solution: string;
  targetView?: 'portal' | 'public' | 'business' | 'superadmin' | 'staff';
  targetTab?: string;
  actionLabel?: string;
}

export interface RolePermissionsGroup {
  category: string;
  allowed: string[];
  restricted: string[];
}

export interface RoleGuideConfig {
  roleId: GuidedRole;
  roleTitle: string;
  roleSubtitle: string;
  systemRoleName: string;
  theme: {
    badgeBg: string;
    badgeText: string;
    badgeBorder: string;
    glowColor: string;
    accentColor: string;
    progressBg: string;
    icon: string;
  };
  summary: string;
  steps: GuideStepItem[];
  quickFlow: QuickFlowItem[];
  troubleshooting: TroubleshootingItem[];
  permissions: RolePermissionsGroup[];
}

export const ROLE_GUIDE_CONFIGS: Record<GuidedRole, RoleGuideConfig> = {
  superadmin: {
    roleId: 'superadmin',
    roleTitle: 'SuperAdmin SaaS Master',
    roleSubtitle: 'Administrador Global de la Plataforma Multi-Tenant',
    systemRoleName: 'superadmin',
    theme: {
      badgeBg: 'bg-purple-950/70',
      badgeText: 'text-purple-300',
      badgeBorder: 'border-purple-500/40',
      glowColor: 'shadow-purple-500/20',
      accentColor: '#a855f7',
      progressBg: 'bg-purple-500',
      icon: 'Shield',
    },
    summary:
      'Como Administrador Global, tienes la visión panorámica de todo el ecosistema SaaS: controlas las clínicas inquilinas (tenants), apruebas suscripciones, administras facturación y auditas la seguridad del sistema.',
    steps: [
      {
        id: 'superadmin_metrics',
        stepNumber: 1,
        title: 'Métricas Globales, MRR & Salud del Ecosistema',
        shortTitle: 'Métricas & MRR',
        summary: 'Monitorea los ingresos mensuales recurrentes (MRR), número de clínicas dadas de alta y volumen de reservas activas.',
        description:
          'El panel principal te muestra en tiempo real cuántas clínicas están registradas, cuántos turnos se agendaron en el mes, el volumen financiero transaccionado y la tasa de conversión global del SaaS.',
        whyImportant:
          'Te permite saber el crecimiento real de tu negocio digital y tomar decisiones informadas sobre planes y precios.',
        proTip:
          'Revisa regularmente el porcentaje de negocios en período de prueba (Trial) para asistirlos antes de que venza.',
        estimatedMinutes: 2,
        targetView: 'superadmin',
        actionLabel: 'Ver Métricas del SaaS',
        actionHint: 'Abre la consola global de estadísticas',
        checklist: [
          'Verificar total de clínicas activas vs en prueba',
          'Comprobar volumen mensual de reservas en el sistema',
          'Monitorear alertas de suscripciones próximas a vencer',
        ],
      },
      {
        id: 'superadmin_tenants',
        stepNumber: 2,
        title: 'Gestión de Tenants & Altas de Nuevas Clínicas',
        shortTitle: 'Gestión de Tenants',
        summary: 'Crea nuevos negocios, edita sus datos centrales, asigna planes y gestiona el slug de acceso público.',
        description:
          'Desde aquí puedes crear una nueva clínica en segundos, definir su nombre, categoría (médica, dental, estética, etc.), asignar el plan contratado y obtener el enlace directo de su página pública.',
        whyImportant:
          'Cada negocio opera como un tenant aislado con sus propios pacientes, médicos y configuraciones de pago.',
        proTip:
          'El slug que le asignes (ej: "centro-holistico-sm") formará el enlace único donde los pacientes reservan: /#booking-centro-holistico-sm.',
        estimatedMinutes: 4,
        targetView: 'superadmin',
        actionLabel: 'Administrar Clínicas / Tenants',
        actionHint: 'Crear o editar clínicas registradas',
        checklist: [
          'Crear una nueva clínica con su slug único',
          'Asignar rubro médico o estético',
          'Copiar el enlace de reserva pública para entregar al cliente',
        ],
      },
      {
        id: 'superadmin_receipts',
        stepNumber: 3,
        title: 'Bandeja de Pagos & Aprobación de Suscripciones',
        shortTitle: 'Aprobación Pagos',
        summary: 'Revisa y aprueba comprobantes de transferencia o suscripción enviados por los dueños de negocios.',
        description:
          'Los clientes pueden subir su comprobante bancario o comprobante de Mercado Pago para renovar su plan. Como superadmin, puedes validar el comprobante con un clic y activar el plan al instante.',
        whyImportant:
          'Evita que las clínicas queden suspendidas y automatiza el registro contable de cobros de tu plataforma SaaS.',
        proTip:
          'Usa el visor de comprobantes para verificar el número de operación y monto antes de confirmar la aprobación.',
        estimatedMinutes: 3,
        targetView: 'superadmin',
        actionLabel: 'Abrir Bandeja de Comprobantes',
        actionHint: 'Validar pagos de suscripción pendientes',
        checklist: [
          'Filtrar pagos en estado pendiente de aprobación',
          'Verificar captura del comprobante o referencia de pago',
          'Aprobar suscripción para extender el acceso del tenant',
        ],
      },
      {
        id: 'superadmin_pricing',
        stepNumber: 4,
        title: 'Configuración de Tarifas & Paquetes de Automatización',
        shortTitle: 'Tarifas & Planes',
        summary: 'Fija los precios de los planes (Free, Pro, Business) y los costos adicionales de la integración de WhatsApp.',
        description:
          'Ajusta los aranceles de suscripción mensual y define las condiciones de comisiones globales o costos de automatización para maximizar la rentabilidad de la plataforma.',
        whyImportant:
          'Te otorga control total sobre la monetización del producto sin necesidad de modificar código fuente.',
        proTip:
          'Ofrece un descuento anual o trimestral para asegurar flujo de caja en tu negocio SaaS.',
        estimatedMinutes: 3,
        targetView: 'superadmin',
        actionLabel: 'Ver Tarifas y Planes',
        actionHint: 'Ajustar precios de planes y módulos WhatsApp',
        checklist: [
          'Revisar los límites de profesionales por plan',
          'Definir arancel del plan Pro y White Label',
          'Configurar parámetros del link oficial de soporte',
        ],
      },
      {
        id: 'superadmin_audit',
        stepNumber: 5,
        title: 'Seguridad Multi-Tenant, Auditoría & Respaldos',
        shortTitle: 'Seguridad & Auditoría',
        summary: 'Supervisa los roles de acceso, claves únicas del staff y consistencia de los datos en la base central.',
        description:
          'Garantiza que la información clínica de cada tenant esté rigurosamente separada. Supervisa los inicios de sesión, resetea accesos si un cliente lo requiere y verifica las reglas de seguridad.',
        whyImportant:
          'La confidencialidad médica y la integridad de los datos de cada clínica son la base de la confianza en tu servicio.',
        proTip:
          'Puedes impersonar o ingresar a cualquier clínica para brindar soporte técnico inmediato al dueño.',
        estimatedMinutes: 3,
        targetView: 'superadmin',
        actionLabel: 'Inspeccionar Seguridad',
        actionHint: 'Revisar datos y accesos del sistema',
        checklist: [
          'Verificar aislamiento de datos entre clínicas',
          'Validar que las contraseñas y claves de staff funcionen',
          'Comprobar persistencia de citas y recetas médicas',
        ],
      },
    ],
    quickFlow: [
      {
        number: '01',
        title: 'Dar de Alta la Clínica',
        highlight: 'En 60 segundos',
        description: 'Crea el tenant con nombre, rubro y slug personalizado. Se autogeneran los horarios base.',
        iconName: 'Building2',
      },
      {
        number: '02',
        title: 'Entregar Credenciales al Dueño',
        highlight: 'Acceso inmediato',
        description: 'Provee el email y contraseña del dueño para que comience a configurar su equipo y servicios.',
        iconName: 'KeyRound',
      },
      {
        number: '03',
        title: 'Validar Pagos de Suscripción',
        highlight: 'Monetización activa',
        description: 'Aprueba comprobantes de pago de planes desde la bandeja dedicada para mantener activos los servicios.',
        iconName: 'CreditCard',
      },
    ],
    troubleshooting: [
      {
        question: 'Una clínica nueva dice que los pacientes no ven horarios disponibles',
        answer: 'Verifica que la clínica tenga al menos un profesional activo y que dicho profesional esté asignado a los servicios correspondientes.',
        cause: 'El servicio fue creado sin marcar la casilla de asignación o sin guardar los profesionales asignados.',
        solution: 'Entra a la clínica desde el selector de tenant -> Catálogo de Servicios -> Editar -> Asegurar que esté marcado "Todos los profesionales" o el especialista asignado.',
        targetView: 'business',
        targetTab: 'services',
        actionLabel: 'Revisar Servicios del Tenant',
      },
      {
        question: '¿Cómo ingresar al panel de una clínica específica para ayudar al dueño?',
        answer: 'Usa el selector de "Tenant" en la barra superior o ve a Gestión de Tenants y haz clic en "Ver Panel".',
        cause: 'Como superadmin tienes acceso multi-inquilino para soporte técnico.',
        solution: 'Selecciona la clínica en el dropdown de la barra superior y pulsa "Panel Negocio".',
        targetView: 'business',
        actionLabel: 'Cambiar a Vista Negocio',
      },
      {
        question: 'El dueño subió un comprobante pero el plan sigue figurando vencido o en prueba',
        answer: 'El comprobante queda en estado "Pendiente de Aprobación" hasta que un superadmin lo revise.',
        cause: 'Mecanismo de seguridad para evitar activaciones fraudulentas.',
        solution: 'Abre la "Bandeja de Comprobantes" en el panel de SuperAdmin y pulsa "Aprobar Pago".',
        targetView: 'superadmin',
        actionLabel: 'Ir a Bandeja de Comprobantes',
      },
    ],
    permissions: [
      {
        category: 'Gestión de la Plataforma',
        allowed: [
          'Crear, suspender o reactivar cualquier clínica/tenant',
          'Acceder a todas las clínicas del sistema sin restricción',
          'Definir y modificar planes, límites y precios del SaaS',
          'Aprobar o rechazar comprobantes de suscripción',
          'Gestionar provincias, ciudades y filtros de geolocalización',
        ],
        restricted: [
          'No debe alterar datos clínicos privados sin autorización de la institución',
          'No puede emitir recetas médicas (función exclusiva de profesionales médicos con matrícula)',
        ],
      },
      {
        category: 'Facturación & Finanzas',
        allowed: [
          'Recaudar pagos de suscripción de los dueños de negocios',
          'Ver métricas agregadas de facturación de toda la plataforma',
          'Definir políticas de cobro de comisiones para la red',
        ],
        restricted: [
          'No retiene los fondos directos de señas de pacientes (van a la cuenta de la clínica o del médico)',
        ],
      },
    ],
  },

  tenant_owner: {
    roleId: 'tenant_owner',
    roleTitle: 'Dueño del Negocio / Clínica',
    roleSubtitle: 'Administrador de Institución & Configuración de Consultorios',
    systemRoleName: 'business_owner',
    theme: {
      badgeBg: 'bg-blue-950/70',
      badgeText: 'text-blue-300',
      badgeBorder: 'border-blue-500/40',
      glowColor: 'shadow-blue-500/20',
      accentColor: '#3b82f6',
      progressBg: 'bg-blue-500',
      icon: 'Building2',
    },
    summary:
      'Como Dueño de la Clínica o Negocio, tienes el control operativo total de tu sede: personalizas la imagen de tu marca, creas los servicios, das de alta a tus profesionales, configuras horarios de atención y cobras señas.',
    steps: [
      {
        id: 'owner_branding',
        stepNumber: 1,
        title: 'Identidad del Negocio, Logo & WhatsApp Oficial',
        shortTitle: 'Identidad & Marca',
        summary: 'Configura el nombre de tu clínica, especialidad, logo, colores y número de WhatsApp para recordatorios.',
        description:
          'Personaliza cómo se verá tu clínica ante los pacientes. Ingresa tu número de WhatsApp oficial con código de país para que el sistema genere enlaces de confirmación y soporte en 1 clic.',
        whyImportant:
          'Una imagen profesional y un canal de WhatsApp claro aumentan un 40% la asistencia de pacientes.',
        proTip:
          'Ingresa el número en formato internacional limpio, por ejemplo 5491148219900 para Argentina.',
        estimatedMinutes: 3,
        targetView: 'business',
        targetTab: 'branding',
        actionLabel: 'Configurar Marca & Logo',
        actionHint: 'Abre la pestaña de Identidad del Negocio',
        checklist: [
          'Definir nombre oficial y descripción breve',
          'Cargar URL de logo o icono de la clínica',
          'Ingresar WhatsApp con código de país',
          'Configurar mensaje de bienvenida y política de cancelación',
        ],
      },
      {
        id: 'owner_services',
        stepNumber: 2,
        title: 'Catálogo de Servicios, Duración & Teleconsulta',
        shortTitle: 'Catálogo Servicios',
        summary: 'Define las consultas y tratamientos que ofreces, su duración en minutos, aranceles y si son presenciales o virtuales.',
        description:
          'Crea cada prestación médica o estética (ej: "Consulta Médica General", "Teleconsulta Online", "Limpieza Dental"). Establece la duración del turno para que el motor de disponibilidad calcule las citas automáticamente.',
        whyImportant:
          'Sin servicios configurados, los pacientes no tienen opciones para agendar.',
        proTip:
          'Activa la modalidad "Teleconsulta Online" para consultas que se atienden por videollamada sin presencia física.',
        estimatedMinutes: 5,
        targetView: 'business',
        targetTab: 'services',
        actionLabel: 'Crear / Editar Servicios',
        actionHint: 'Abrir gestión de servicios y asignaciones',
        checklist: [
          'Crear al menos un servicio con nombre y descripción',
          'Definir duración (ej. 30 o 45 minutos)',
          'Establecer precio y moneda',
          'Asignar los profesionales que lo prestan',
        ],
      },
      {
        id: 'owner_professionals',
        stepNumber: 3,
        title: 'Equipo Profesional, Consultorios & Claves de Staff',
        shortTitle: 'Equipo & Staff',
        summary: 'Da de alta a tus médicos o colaboradores, asigna consultorio/box y genera su Clave Única de Acceso.',
        description:
          'Agrega a cada especialista de tu clínica con su título, especialidad y consultorio asignado (ej: Consultorio 1). El sistema generará una Clave Única (ej: STAFF-4821) para que el médico ingrese a su propio portal sin contraseña compleja.',
        whyImportant:
          'Permite a los profesionales gestionar su propia agenda del día y atender videoconsultas sin ver la facturación global de la clínica.',
        proTip:
          'Copia la Clave de Staff y compártela por WhatsApp a tu médico con el enlace directo del Portal Médico.',
        estimatedMinutes: 4,
        targetView: 'business',
        targetTab: 'professionals',
        actionLabel: 'Gestionar Profesionales',
        actionHint: 'Ver equipo y claves de consultorio',
        checklist: [
          'Agregar a cada profesional con nombre y especialidad',
          'Asignar consultorio o box físico/virtual',
          'Vincular los servicios que atiende',
          'Compartir la Clave Única de Acceso con el profesional',
        ],
      },
      {
        id: 'owner_hours',
        stepNumber: 4,
        title: 'Horarios de Atención & Configuración de Turnos',
        shortTitle: 'Horarios de Atención',
        summary: 'Establece los días de la semana en que abre la clínica y las franjas horarias de atención de cada especialista.',
        description:
          'Configura los días abiertos (ej: Lunes a Viernes de 08:00 a 12:00 y 14:00 a 18:00). El motor inteligente se encarga de habilitar solo los días y horas con turnos reales, evitando citas fuera de horario.',
        whyImportant:
          'Es el corazón del sistema: si un día no tiene franjas habilitadas, el paciente verá "No hay horarios disponibles".',
        proTip:
          'Puedes configurar horarios generales para toda la clínica o específicos para un profesional que atiende solo días particulares.',
        estimatedMinutes: 4,
        targetView: 'business',
        targetTab: 'hours',
        actionLabel: 'Configurar Horarios',
        actionHint: 'Ajustar turnos y días de atención',
        checklist: [
          'Activar los días hábiles de la clínica',
          'Definir turnos mañana y tarde',
          'Comprobar que coincidan con la disponibilidad del staff',
        ],
      },
      {
        id: 'owner_payments',
        stepNumber: 5,
        title: 'Pasarela de Cobro, Señas & Mercado Pago',
        shortTitle: 'Cobro de Señas',
        summary: 'Conecta Mercado Pago o ingresa tu Alias CBU para exigir una seña obligatoria antes de confirmar el turno.',
        description:
          'Reduce el ausentismo (no-show) solicitando una seña fija (ej: $3.000) o un porcentaje (ej: 30%) al momento de reservar. Los pacientes pueden pagar con Mercado Pago o transferir a tu cuenta bancaria.',
        whyImportant:
          'Cobrar seña previa reduce las ausencias de pacientes en más de un 80% y asegura los ingresos de tu clínica.',
        proTip:
          'Puedes habilitar o deshabilitar el cobro de seña según cada servicio o profesional.',
        estimatedMinutes: 4,
        targetView: 'business',
        targetTab: 'payments',
        actionLabel: 'Configurar Pagos & Señas',
        actionHint: 'Vincular Mercado Pago o Alias CBU',
        checklist: [
          'Decidir si el cobro de seña es requerido',
          'Ingresar Alias bancario o CBU',
          'Vincular Credenciales de Mercado Pago (opcional)',
          'Escribir instrucciones claras para el comprobante de transferencia',
        ],
      },
      {
        id: 'owner_test_booking',
        stepNumber: 6,
        title: 'Probar la Página Pública & Compartir tu Enlace',
        shortTitle: 'Página Pública & Test',
        summary: 'Verifica la experiencia de reserva tal como la verá tu paciente y comparte el link en tus redes sociales.',
        description:
          'Entra a tu enlace público de reservas, realiza una reserva de prueba para ver el calendario en acción, confirmar un turno y recibir la notificación de WhatsApp.',
        whyImportant:
          'Garantiza que todo funcione a la perfección antes del lanzamiento oficial a tus pacientes.',
        proTip:
          'Coloca el enlace público en la biografía de Instagram de la clínica y como respuesta rápida en WhatsApp Business.',
        estimatedMinutes: 2,
        targetView: 'public',
        actionLabel: 'Ver Página Pública de Reserva',
        actionHint: 'Probar agendamiento en vivo',
        checklist: [
          'Hacer una reserva de prueba con tu propio teléfono',
          'Verificar que aparezca en la pestaña "Agenda"',
          'Copiar el enlace público para difundir a pacientes',
        ],
      },
    ],
    quickFlow: [
      {
        number: '01',
        title: 'Crea tus Servicios',
        highlight: 'Nombre y duración',
        description: 'Define qué atiende tu clínica, cuánto dura cada turno y asigna al staff responsable.',
        iconName: 'Briefcase',
      },
      {
        number: '02',
        title: 'Agrega a tu Equipo',
        highlight: 'Consultorio y clave',
        description: 'Registra a los profesionales y entrégales su Clave Única de Staff para que accedan a su agenda.',
        iconName: 'Users',
      },
      {
        number: '03',
        title: 'Comparte tu Enlace',
        highlight: 'WhatsApp & Instagram',
        description: 'Tus pacientes reservan solos las 24 horas y tú gestionas todo desde el panel central.',
        iconName: 'Share2',
      },
    ],
    troubleshooting: [
      {
        question: 'El botón "Guardar Servicio & Asignaciones" parece no guardar o los pacientes no ven turnos',
        answer: 'Asegúrate de que en el modal del servicio esté marcada la casilla "Todos los profesionales de la clínica" o bien selecciona manualmente a los especialistas que brindan esa atención.',
        cause: 'Si un servicio no tiene especialistas asignados, el calendario no puede saber a qué médico agendar.',
        solution: 'Edita el servicio, activa la casilla de asignación completa y pulsa Guardar Servicio.',
        targetView: 'business',
        targetTab: 'services',
        actionLabel: 'Revisar Asignación de Servicios',
      },
      {
        question: 'Aparece el mensaje: "No hay horarios de atención configurados para este día"',
        answer: 'Ocurre cuando el día seleccionado (ej: domingo) no tiene turnos activos, o cuando los horarios del profesional no coinciden con la clínica.',
        cause: 'Falta franja horaria habilitada en la pestaña Horarios para ese día de la semana.',
        solution: 'Ve a la pestaña Horarios de Atención, asegúrate de que el día esté con el interruptor "Habilitado" y tenga al menos una franja como 08:00 a 12:00.',
        targetView: 'business',
        targetTab: 'hours',
        actionLabel: 'Configurar Franjas Horarias',
      },
      {
        question: '¿Cómo le doy acceso a un médico para que no vea la facturación de la clínica?',
        answer: 'No le des tu contraseña de dueño. En la pestaña Profesionales copia su "Clave Única de Acceso" (ej: STAFF-4821) y pídele que ingrese en el Portal Médico.',
        cause: 'El sistema tiene un portal dedicado exclusivo para el staff.',
        solution: 'Copia la clave y compártela. El médico solo verá su propia agenda y fichas de sus pacientes.',
        targetView: 'business',
        targetTab: 'professionals',
        actionLabel: 'Ver Claves de Staff',
      },
    ],
    permissions: [
      {
        category: 'Control del Negocio',
        allowed: [
          'Modificar información, branding, logo y redes de la clínica',
          'Crear, editar y eliminar servicios y especialidades',
          'Dar de alta profesionales, consultorios y definir sus claves',
          'Gestionar franjas horarias y días de cierre o vacaciones',
          'Configurar pasarelas de cobro, CBU y políticas de seña',
          'Ver reportes de facturación, comisiones y citas de toda la clínica',
        ],
        restricted: [
          'No puede ver datos ni paneles de otras clínicas ajenas a su tenant',
          'No puede modificar los planes o precios de la plataforma SaaS (solo SuperAdmin)',
        ],
      },
      {
        category: 'Gestión Médica',
        allowed: [
          'Visualizar y reasignar cualquier turno de cualquier profesional de su clínica',
          'Descargar reportes en Excel o sincronizar calendario Google/iCal',
        ],
        restricted: [
          'La emisión de recetas digitales requiere el ingreso con matrícula y firma de un profesional médico registrado',
        ],
      },
    ],
  },

  staff: {
    roleId: 'staff',
    roleTitle: 'Staff / Profesional Médico',
    roleSubtitle: 'Especialista en Atención Médica, Terapias y Consultorio',
    systemRoleName: 'staff',
    theme: {
      badgeBg: 'bg-emerald-950/70',
      badgeText: 'text-emerald-300',
      badgeBorder: 'border-emerald-500/40',
      glowColor: 'shadow-emerald-500/20',
      accentColor: '#10b981',
      progressBg: 'bg-emerald-500',
      icon: 'Stethoscope',
    },
    summary:
      'Como Profesional o Staff, dispones de un entorno médico limpio y enfocado: administras tu agenda diaria, atiendes videoconsultas encriptadas, emites recetas digitales oficiales con código QR y controlas tus honorarios.',
    steps: [
      {
        id: 'staff_login_profile',
        stepNumber: 1,
        title: 'Acceso a Consultorio, Matrícula & Firma Digital',
        shortTitle: 'Acceso & Perfil',
        summary: 'Ingresa al Portal Médico con tu Clave Única o email, valida tu consultorio y carga tu matrícula oficial.',
        description:
          'Inicia sesión de forma rápida con tu Clave de Staff (ej: STAFF-4821) proporcionada por la clínica. Completa tu número de matrícula profesional (MN / MP) y firma digital para que aparezcan en tus recetas emitidas.',
        whyImportant:
          'Una receta sin número de matrícula carece de validez legal en farmacias.',
        proTip:
          'Puedes guardar tu acceso directo al Portal Médico en la pantalla de inicio de tu teléfono o tablet.',
        estimatedMinutes: 2,
        targetView: 'staff',
        actionLabel: 'Abrir Mi Consultorio',
        actionHint: 'Acceder al entorno de trabajo médico',
        checklist: [
          'Iniciar sesión con Clave Única o credenciales de staff',
          'Verificar consultorio o box asignado',
          'Comprobar número de matrícula profesional',
        ],
      },
      {
        id: 'staff_agenda',
        stepNumber: 2,
        title: 'Mi Agenda del Día & Gestión de Pacientes',
        shortTitle: 'Agenda & Citas',
        summary: 'Revisa las citas agendadas, filtra por día, confirma asistencias y escribe notas clínicas privadas.',
        description:
          'Visualiza el listado de pacientes del día con su horario, servicio solicitado, modalidad (presencial o videoconsulta) y estado del pago de la seña. Puedes marcar "Asistió", "No se presentó" o enviar WhatsApp de recordatorio.',
        whyImportant:
          'Mantener el estado de las citas actualizado te permite calcular con precisión tus liquidaciones de honorarios.',
        proTip:
          'Haz clic en el botón de WhatsApp junto al paciente para enviar un mensaje rápido si necesitas avisarle una demora.',
        estimatedMinutes: 3,
        targetView: 'staff',
        targetTab: 'agenda',
        actionLabel: 'Ver Mi Agenda',
        actionHint: 'Explorar citas y turnos asignados',
        checklist: [
          'Visualizar pacientes programados para hoy',
          'Revisar si el paciente ya abonó la seña previa',
          'Utilizar notas clínicas para registrar evolución médica',
        ],
      },
      {
        id: 'staff_teleconsulta',
        stepNumber: 3,
        title: 'Sala de Teleconsulta Médica WebRTC',
        shortTitle: 'Videoconsulta',
        summary: 'Inicia videollamadas seguras en alta definición sin que el paciente deba instalar ninguna aplicación.',
        description:
          'Para citas online, pulsa "Iniciar Teleconsulta". Se abrirá la sala virtual cifrada de punto a punto, con control de micrófono, cámara y emisión de recetas en vivo durante la llamada.',
        whyImportant:
          'Brinda una experiencia de atención moderna a distancia, ideal para controles, segunda opinión y terapias.',
        proTip:
          'Puedes compartir pantalla para mostrar estudios complementarios, radiografías o planes alimenticios.',
        estimatedMinutes: 3,
        targetView: 'staff',
        targetTab: 'agenda',
        actionLabel: 'Probar Sala de Teleconsulta',
        actionHint: 'Ver entorno de videollamada médica',
        checklist: [
          'Comprobar permisos de micrófono y cámara en el navegador',
          'Verificar botón "Iniciar Teleconsulta" en la cita del paciente',
          'Comprobar sala virtual y chat integrado',
        ],
      },
      {
        id: 'staff_prescriptions',
        stepNumber: 4,
        title: 'Emisión de Recetas Digitales con Código QR',
        shortTitle: 'Recetas Digitales',
        summary: 'Prescribe medicamentos y tratamientos con código alfanumérico oficial y verificación pública para farmacias.',
        description:
          'Genera recetas digitales en formato oficial con diagnóstico, medicamentos, dosis y sello electrónico. Cada receta tiene un código QR único que cualquier farmacia puede escanear para verificar autenticidad.',
        whyImportant:
          'Cumple con los estándares de prescripción electrónica y ahorra tiempo a pacientes que no deben retirar papel físico.',
        proTip:
          'El paciente recibe la receta con un enlace directo y botón para descargarla en PDF.',
        estimatedMinutes: 3,
        targetView: 'staff',
        targetTab: 'agenda',
        actionLabel: 'Crear Receta Médica',
        actionHint: 'Modal de prescripción electrónica',
        checklist: [
          'Seleccionar paciente de la agenda',
          'Escribir diagnóstico y fármacos prescritos con dosis',
          'Generar receta con firma digital y código de validación',
        ],
      },
      {
        id: 'staff_fees',
        stepNumber: 5,
        title: 'Mis Honorarios, Aranceles Propios & Liquidaciones',
        shortTitle: 'Mis Honorarios',
        summary: 'Revisa tus ganancias acumuladas, comisiones pactadas con la clínica y personaliza tus propios aranceles.',
        description:
          'Si la clínica te otorga autonomía de precios, puedes definir un honorario diferenciado para tus servicios. También podrás ver el desglose de cuánto recaudó la clínica y cuál es tu liquidación neta disponible.',
        whyImportant:
          'Transparencia total en tus ingresos sin discrepancias a fin de mes.',
        proTip:
          'Consulta el resumen de liquidación mensual para saber qué citas ya fueron abonadas y cuáles están pendientes.',
        estimatedMinutes: 3,
        targetView: 'staff',
        targetTab: 'payments',
        actionLabel: 'Ver Liquidación & Honorarios',
        actionHint: 'Desglose económico del profesional',
        checklist: [
          'Ver porcentaje o monto de comisión pactado',
          'Consultar total generado en el período',
          'Configurar alias de cobro si recibes transferencias directas',
        ],
      },
    ],
    quickFlow: [
      {
        number: '01',
        title: 'Ingresa con tu Clave',
        highlight: 'STAFF-XXXX',
        description: 'Accede a tu consultorio en 1 paso desde cualquier dispositivo sin contraseñas largas.',
        iconName: 'KeyRound',
      },
      {
        number: '02',
        title: 'Atiende tus Citas',
        highlight: 'Presencial o Teleconsulta',
        description: 'Visualiza la ficha de tu paciente, inicia la videollamada y guarda notas clínicas privadas.',
        iconName: 'CalendarCheck',
      },
      {
        number: '03',
        title: 'Receta & Cierre',
        highlight: 'Firma con QR',
        description: 'Prescribe medicamentos en segundos con verificación online y registra el turno como completado.',
        iconName: 'FileText',
      },
    ],
    troubleshooting: [
      {
        question: '¿Cómo accedo como médico a la videoconsulta de mi paciente?',
        answer: 'En tu Portal Médico, ve a la pestaña "Agenda", busca la cita del paciente (marcada con el tag Online/Teleconsulta) y haz clic en el botón azul "Iniciar Teleconsulta".',
        cause: 'El médico ingresa como doctor y el paciente como patient en la misma sala virtual.',
        solution: 'Entra al Portal Médico -> Agenda -> Iniciar Teleconsulta.',
        targetView: 'staff',
        targetTab: 'agenda',
        actionLabel: 'Ir a Agenda del Staff',
      },
      {
        question: 'El paciente me pide una receta pero no sé dónde generarla',
        answer: 'Dentro de la cita en tu Agenda (o dentro de la sala de videoconsulta), pulsa el botón "Emitir Receta".',
        cause: 'La opción está integrada en cada cita individual.',
        solution: 'Haz clic en "Emitir Receta", completa el diagnóstico y medicamentos, y pulsa "Emitir y Firmar".',
        targetView: 'staff',
        targetTab: 'agenda',
        actionLabel: 'Ver Citas para Recetar',
      },
      {
        question: 'No veo citas en mi agenda pero la clínica dice que hay turnos',
        answer: 'Verifica que hayas iniciado sesión con tu Clave de Staff específica y no con una cuenta genérica.',
        cause: 'Cada profesional solo ve las citas asignadas a su propio consultorio/ID.',
        solution: 'Confirma con el dueño de la clínica que tu usuario esté vinculado al profesional correspondiente.',
        targetView: 'staff',
        actionLabel: 'Revisar Sesión de Staff',
      },
    ],
    permissions: [
      {
        category: 'Atención al Paciente',
        allowed: [
          'Ver su propia agenda diaria y citas pasadas/futuras',
          'Confirmar, reprogramar o cancelar sus turnos asignados',
          'Iniciar salas de teleconsulta médica con sus pacientes',
          'Emitir y firmar recetas médicas digitales con QR oficial',
          'Cargar y consultar notas clínicas privadas',
        ],
        restricted: [
          'No puede ver las citas privadas ni historias clínicas de otros médicos de la clínica',
          'No puede ver los ingresos totales de la clínica ni configuraciones del dueño',
        ],
      },
      {
        category: 'Configuración Personal',
        allowed: [
          'Definir sus propios horarios de atención dentro de la franja de la clínica',
          'Configurar aranceles propios si la clínica tiene activa la política de autonomía',
          'Gestionar sus ausencias, congresos o vacaciones particulares',
        ],
        restricted: [
          'No puede eliminar servicios globales de la institución',
          'No puede dar de alta o baja a otros profesionales',
        ],
      },
    ],
  },

  end_user: {
    roleId: 'end_user',
    roleTitle: 'Paciente / Usuario Final',
    roleSubtitle: 'Cliente de Servicios de Salud, Bienestar & Turnos',
    systemRoleName: 'customer',
    theme: {
      badgeBg: 'bg-amber-950/70',
      badgeText: 'text-amber-300',
      badgeBorder: 'border-amber-500/40',
      glowColor: 'shadow-amber-500/20',
      accentColor: '#f59e0b',
      progressBg: 'bg-amber-500',
      icon: 'Calendar',
    },
    summary:
      'Como Paciente o Cliente, disfrutas de una experiencia simple y rápida: buscas atención, seleccionas a tu especialista, reservas en 3 clics las 24hs, abonas la seña con Mercado Pago y recibes recordatorios por WhatsApp.',
    steps: [
      {
        id: 'patient_explore',
        stepNumber: 1,
        title: 'Explorar Clínicas, Especialidades & Modalidad',
        shortTitle: 'Explorar Servicios',
        summary: 'Encuentra el servicio médico o estético que necesitas, conociendo aranceles transparentes y duración.',
        description:
          'Navega por el catálogo de la institución. Compara servicios, lee descripciones y verifica si la atención es presencial en consultorio o teleconsulta online desde tu hogar.',
        whyImportant:
          'Te permite saber con certeza qué profesional te atenderá y el arancel pactado sin sorpresas.',
        proTip:
          'Si prefieres no desplazarte, filtra por servicios con el tag "Teleconsulta Online".',
        estimatedMinutes: 2,
        targetView: 'public',
        actionLabel: 'Ver Catálogo de Servicios',
        actionHint: 'Explorar servicios de la clínica',
        checklist: [
          'Elegir el servicio adecuado',
          'Verificar si es presencial o por videollamada',
          'Consultar duración estimada y precio',
        ],
      },
      {
        id: 'patient_select_slot',
        stepNumber: 2,
        title: 'Elegir Especialista, Día & Franja Horaria',
        shortTitle: 'Elegir Día & Hora',
        summary: 'Selecciona la fecha en el calendario interactivo y elige el horario exacto que mejor se adapta a tu rutina.',
        description:
          'El calendario te muestra únicamente los días de atención disponibles y las franjas horarias libres en tiempo real. No hay demoras ni turnos duplicados.',
        whyImportant:
          'Reserva en segundos sin necesidad de llamar por teléfono ni esperar confirmación manual.',
        proTip:
          'Puedes cambiar de especialista en el menú para encontrar turnos más próximos.',
        estimatedMinutes: 2,
        targetView: 'public',
        actionLabel: 'Elegir Horario Disponible',
        actionHint: 'Ver turnos libres en el calendario',
        checklist: [
          'Seleccionar profesional de preferencia o "Cualquiera disponible"',
          'Elegir fecha hábil en el selector',
          'Hacer clic en el horario disponible',
        ],
      },
      {
        id: 'patient_confirm_deposit',
        stepNumber: 3,
        title: 'Confirmar Datos, WhatsApp & Pago de Seña',
        shortTitle: 'Confirmar & Seña',
        summary: 'Ingresa tu nombre y teléfono móvil para recibir los datos de tu cita y abona la seña si es solicitada.',
        description:
          'Completa tus datos de contacto básicos. Si la clínica solicita una seña para reservar el turno, podrás abonarla con Mercado Pago o transferencia bancaria de forma protegida.',
        whyImportant:
          'Tu número de teléfono es clave para que recibas el código de reserva, ubicación y el link de la videoconsulta.',
        proTip:
          'Guarda tu Código de Turno único (ej: CL-9218) para consultar o gestionar tu cita.',
        estimatedMinutes: 3,
        targetView: 'public',
        actionLabel: 'Completar Reserva',
        actionHint: 'Asegurar turno con confirmación',
        checklist: [
          'Ingresar nombre completo y WhatsApp válido',
          'Abonar la seña o subir comprobante si es requerido',
          'Recibir código alfanumérico de confirmación',
        ],
      },
      {
        id: 'patient_attend',
        stepNumber: 4,
        title: 'Asistir a la Cita o Conectarse a la Teleconsulta',
        shortTitle: 'Atención Médica',
        summary: 'Preséntate en el consultorio asignado o ingresa a la sala virtual con 1 solo clic desde tu navegador.',
        description:
          'Si tu turno es presencial, dirígete al consultorio indicado en tu confirmación. Si es online, haz clic en el enlace de videollamada: entrarás a la sala médica segura sin instalar nada.',
        whyImportant:
          'Acceso inmediato a la atención de tu especialista sin fricciones técnicas.',
        proTip:
          'Prueba tu micrófono y cámara 5 minutos antes de la hora acordada.',
        estimatedMinutes: 2,
        targetView: 'portal',
        actionLabel: 'Ver Sala de Teleconsulta',
        actionHint: 'Entorno de atención al paciente',
        checklist: [
          'Revisar dirección o enlace virtual',
          'Presentarse en el horario pactado',
          'Conversar con el especialista sobre tu consulta',
        ],
      },
      {
        id: 'patient_prescriptions',
        stepNumber: 5,
        title: 'Mis Recetas Digitales & Indicaciones Médicas',
        shortTitle: 'Recetas & Farmacia',
        summary: 'Accede a tus recetas electrónicas firmadas, descárgalas en PDF o muéstralas en la farmacia con el código QR.',
        description:
          'Luego de tu consulta, tu médico puede emitirte una receta digital. Puedes consultar su validez en cualquier momento ingresando el código de verificación en el portal público.',
        whyImportant:
          'No pierdes más papeles físicos y puedes comprar tus medicamentos en cualquier farmacia de inmediato.',
        proTip:
          'Cualquier farmacéutico puede escanear el código QR para validar la firma y matrícula del médico.',
        estimatedMinutes: 2,
        targetView: 'portal',
        actionLabel: 'Verificar Receta Médica',
        actionHint: 'Validador público de recetas con QR',
        checklist: [
          'Guardar el código de verificación de receta',
          'Descargar o mostrar el código QR en la farmacia',
          'Seguir las indicaciones y dosis indicadas por tu médico',
        ],
      },
    ],
    quickFlow: [
      {
        number: '01',
        title: 'Elige tu Turno',
        highlight: 'En 3 clics',
        description: 'Selecciona servicio, especialista y el horario que más te convenga.',
        iconName: 'Calendar',
      },
      {
        number: '02',
        title: 'Asegura tu Lugar',
        highlight: 'Confirmación instantánea',
        description: 'Ingresa tus datos y abona la seña con Mercado Pago o transferencia bancaria.',
        iconName: 'CreditCard',
      },
      {
        number: '03',
        title: 'Atención & Receta',
        highlight: 'Online o Presencial',
        description: 'Asiste al consultorio o conéctate por videollamada y recibe tu receta con QR.',
        iconName: 'Stethoscope',
      },
    ],
    troubleshooting: [
      {
        question: '¿Cómo entro a mi videoconsulta médica desde mi celular o computadora?',
        answer: 'Solo necesitas hacer clic en el enlace que recibiste por WhatsApp o en tu pantalla de confirmación. Se abrirá la sala directamente en tu navegador sin instalar aplicaciones.',
        cause: 'La tecnología WebRTC nativa funciona en Chrome, Safari, Edge y Firefox.',
        solution: 'Permite el acceso al micrófono y cámara cuando el navegador te lo solicite.',
        targetView: 'portal',
        actionLabel: 'Ver Portal de Pacientes',
      },
      {
        question: 'No encuentro turnos para la fecha que busco',
        answer: 'Algunos especialistas solo atienden determinados días de la semana. Prueba seleccionando otro día con círculo azul en el calendario o cambia el profesional.',
        cause: 'El profesional tiene horarios específicos o turnos ya reservados.',
        solution: 'Explora los días siguientes en el carrusel de fechas de la clínica.',
        targetView: 'public',
        actionLabel: 'Ver Calendario de Reservas',
      },
      {
        question: '¿Cómo presento mi receta digital en la farmacia?',
        answer: 'Muestra el código QR desde tu celular o indica el código alfanumérico al farmacéutico. La farmacia podrá escanearlo y validar la matrícula oficial del médico.',
        cause: 'El sistema emite recetas electrónicas con firma digital verificable.',
        solution: 'Puedes descargar la receta en PDF o compartir el enlace directo con la farmacia.',
        targetView: 'portal',
        actionLabel: 'Ir al Validador de Recetas',
      },
    ],
    permissions: [
      {
        category: 'Acceso de Paciente',
        allowed: [
          'Explorar todos los servicios públicos y profesionales de la clínica',
          'Reservar turnos disponibles en tiempo real',
          'Abonar señas mediante Mercado Pago o Transferencia',
          'Conectarse a salas de videoconsulta cifradas con su médico',
          'Consultar y validar recetas médicas digitales emitidas a su nombre',
        ],
        restricted: [
          'No puede ver la agenda de otros pacientes ni datos personales ajenos',
          'No tiene acceso a las consolas de administración ni configuración',
        ],
      },
    ],
  },
};
