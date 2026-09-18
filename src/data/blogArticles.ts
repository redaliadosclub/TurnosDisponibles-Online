export interface BlogArticle {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: 'Estética & Belleza' | 'Consultorios Médicos' | 'Automatización & WhatsApp' | 'Gestión & Finanzas';
  readTime: string;
  date: string;
  author: {
    name: string;
    role: string;
    avatar: string;
  };
  coverImage: string;
  content: {
    introduction: string;
    keyPoints: {
      title: string;
      description: string;
      practicalTip?: string;
    }[];
    templateWhatsapp?: string;
    conclusion: string;
  };
}

export const BLOG_ARTICLES: BlogArticle[] = [
  {
    id: 'art-1',
    slug: 'como-implementar-cobro-sena-sin-espantar-clientas',
    title: 'Cómo implementar el cobro de seña en tu estética sin espantar clientas',
    excerpt: 'El miedo a perder clientas al pedir una seña previa es común, pero aplicarla con la comunicación correcta eleva el valor percibido de tu trabajo y reduce el ausentismo a menos del 1%.',
    category: 'Estética & Belleza',
    readTime: '4 min de lectura',
    date: '15 de Marzo, 2026',
    author: {
      name: 'Lic. Mariana Gómez',
      role: 'Consultora en Gestión de Centros Estéticos',
      avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=120&auto=format&fit=crop&q=80',
    },
    coverImage: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800&auto=format&fit=crop&q=80',
    content: {
      introduction:
        'Uno de los mayores temores de quienes dirigen centros de estética, peluquerías o spas es que las clientas se ofendan o decidan no reservar cuando se les solicita una seña previa. Sin embargo, la realidad demostrada por más de 500 centros digitalizados es la contraria: las clientas comprometidas valoran la seriedad y el orden.',
      keyPoints: [
        {
          title: '1. Enmarca la seña como garantía mutua, no como desconfianza',
          description:
            'Explica que la seña no es una penalización, sino la reserva exclusiva de 60 a 90 minutos de la profesional y de los insumos preparados exclusivamente para ella.',
          practicalTip:
            'Usa frases como: "Para asegurar la exclusividad de tu box y tener listos tus insumos personalizados, solicitamos una seña que se descuenta del total el día del turno."',
        },
        {
          title: '2. Fija un monto accesible pero disuasivo',
          description:
            'La seña debe representar entre el 20% y el 30% del valor total del servicio (o un monto fijo de $3.000 a $6.000 ARS). Es suficiente para evitar que la persona se olvide o cancele a último momento sin avisar.',
        },
        {
          title: '3. Ofrece flexibilidad y política clara de reprogramación',
          description:
            'Aclara que si avisan con al menos 4 o 24 horas de antelación, la seña se transfiere automáticamente a su nueva fecha sin perder un solo peso.',
          practicalTip:
            'Incluye siempre la política en la pantalla de reserva para que el acuerdo sea transparente desde el primer clic.',
        },
        {
          title: '4. Facilita los métodos de pago instantáneos',
          description:
            'Permite abonar por Mercado Pago (con link o alias directo) o Transferencia bancaria (CBU/Alias con acreditación inmediata). Cuantos menos pasos manuales haya, mayor es la tasa de confirmación.',
        },
      ],
      templateWhatsapp:
        '✨ ¡Hola [Nombre]! Tu turno para [Servicio] quedó reservado con éxito para el [Fecha] a las [Hora]. Para confirmar tu box, te dejamos el Alias para la seña de $[Monto]: DERMATO.SPA.RECOLETA. Envíanos el comprobante por aquí y te esperamos con todo listo. ¡Gracias por confiar en nosotras!',
      conclusion:
        'Implementar señas automáticas no solo protege tus ingresos y el tiempo de tu equipo, sino que educa a tu clientela y atrae a personas que respetan y valoran tu profesión.',
    },
  },
  {
    id: 'art-2',
    slug: '5-claves-reducir-cancelaciones-ultimo-momento-consultorios',
    title: '5 claves para reducir las cancelaciones de último momento en consultorios',
    excerpt: 'Cada hueco vacío en la agenda médica u odontológica representa costos fijos que no se recuperan. Conoce las estrategias probadas para mantener una tasa de asistencia superior al 95%.',
    category: 'Consultorios Médicos',
    readTime: '5 min de lectura',
    date: '10 de Marzo, 2026',
    author: {
      name: 'Dr. Martín Sotomayor',
      role: 'Director Médico & Especialista en Gestión Sanitaria',
      avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=120&auto=format&fit=crop&q=80',
    },
    coverImage: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=800&auto=format&fit=crop&q=80',
    content: {
      introduction:
        'En consultorios médicos, clínicas dentales y centros de salud, el ausentismo (o "no-show") ronda habitualmente entre el 15% y el 25% cuando no existen sistemas automatizados. Esto genera pérdidas millonarias anuales y retrasa la atención de pacientes que realmente necesitan el turno.',
      keyPoints: [
        {
          title: '1. Confirmación inmediata con Código de Turno único',
          description:
            'Cuando el paciente recibe al instante un código como "TD-4821" junto con un comprobante formal descargable y enlace a Google Calendar, asume un compromiso mental mucho mayor.',
        },
        {
          title: '2. Recordatorio 24 horas antes por WhatsApp con botón de reconfirmación',
          description:
            'El 70% de las ausencias no son por mala fe, sino por olvido cotidiano. Un mensaje directo con la dirección, el especialista y el botón para confirmar o reprogramar con tiempo salva la jornada.',
          practicalTip:
            'Envía el recordatorio entre las 09:00 y las 11:00 hs del día anterior para dar margen de reasignar el horario libre si alguien cancela.',
        },
        {
          title: '3. Simplifica la reprogramación en lugar de la cancelación',
          description:
            'Si un paciente tiene un imprevisto y solo le ofreces cancelar, lo perderás. Si le das un botón "Reprogramar turno online", elegirá otro día en 30 segundos sin frustración.',
        },
        {
          title: '4. Lista de espera dinámica para huecos imprevistos',
          description:
            'Mantén un registro de pacientes que pidieron turno urgente y avísales cuando se libere un horario de cancelación.',
        },
        {
          title: '5. Políticas de asistencia visibles',
          description:
            'Publica en tu portal de reservas el tiempo de tolerancia de espera (ej. 10 minutos) y los requisitos previos para que la consulta sea fluida.',
        },
      ],
      templateWhatsapp:
        '🩺 Recordatorio Médico: Dr. Sotomayor te espera mañana [Fecha] a las [Hora] en [Dirección]. Código de turno: [Código]. Si necesitas reprogramar, haz clic aquí: https://turnosdisponibles.online/#booking-[slug]. ¡Te esperamos puntualmente!',
      conclusion:
        'Digitalizar la agenda con TurnosDisponibles.online transforma la dinámica de los consultorios: menos llamadas telefónicas, cero papel y agendas ocupadas con pacientes que asisten puntuales.',
    },
  },
  {
    id: 'art-3',
    slug: 'guia-rapida-automatizar-recordatorios-whatsapp',
    title: 'Guía rápida para automatizar los recordatorios de WhatsApp en tu negocio',
    excerpt: 'Descubre cómo integrar mensajes prearmados y Webhooks WAPI para que tus clientes reciban recordatorios sin que tengas que escribir uno por uno a mano.',
    category: 'Automatización & WhatsApp',
    readTime: '3 min de lectura',
    date: '02 de Marzo, 2026',
    author: {
      name: 'Sofía Valenzuela',
      role: 'Especialista en Automatización de Canales Digitales',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&auto=format&fit=crop&q=80',
    },
    coverImage: 'https://images.unsplash.com/photo-1577563908411-5077b6dc7624?w=800&auto=format&fit=crop&q=80',
    content: {
      introduction:
        'Pasar 2 horas por día enviando mensajes de WhatsApp "Hola, ¿vienes mañana?" es agotador y propenso a errores humanos. La automatización de WhatsApp es el salto cuántico más rentable para cualquier prestador de servicios en 2026.',
      keyPoints: [
        {
          title: '1. Mensajes con enlaces directos "wa.me"',
          description:
            'En el plan inicial, TurnosDisponibles genera enlaces inteligentes con el texto perfectamente redactado que incluye nombre del paciente, servicio, fecha, hora, código de turno y dirección exacta.',
        },
        {
          title: '2. Integración WAPI / Flowomatic (Plan Experiencia AI)',
          description:
            'Para centros con alto volumen de turnos, la plataforma se conecta con WAPI mediante Webhooks seguros. Cuando un cliente reserva, el servidor envía el mensaje de WhatsApp al instante de forma 100% desatendida.',
          practicalTip:
            'Configura recordatorios automáticos escalonados: un primer aviso al agendar y un segundo aviso 24 horas antes con mapa y recomendaciones.',
        },
        {
          title: '3. Personalización con variables dinámicas',
          description:
            'Evita mensajes genéricos tipo spam. Utiliza siempre el nombre propio del paciente y el del profesional que lo atenderá para preservar la calidez humana.',
        },
      ],
      templateWhatsapp:
        '👋 Hola [Nombre], tu turno para [Servicio] con [Profesional] está confirmado. Fecha: [Fecha] a las [Hora] hs. Dirección: [Dirección]. Cualquier duda estamos a tu disposición.',
      conclusion:
        'Al automatizar las comunicaciones por WhatsApp, recuperas entre 8 y 12 horas semanales que puedes dedicar a atender mejor a tus pacientes o expandir tu negocio.',
    },
  },
  {
    id: 'art-4',
    slug: 'de-la-libreta-de-papel-a-la-agenda-online-guia-paso-a-paso',
    title: 'De la libreta de papel a la agenda online: transición sin estrés en 24 horas',
    excerpt: '¿Cómo migrar tu consultorio o estética sin confundir a tus clientes habituales? Paso a paso para poner tu link en Instagram y WhatsApp y empezar a recibir reservas solas.',
    category: 'Gestión & Finanzas',
    readTime: '4 min de lectura',
    date: '24 de Febrero, 2026',
    author: {
      name: 'Lic. Mariana Gómez',
      role: 'Consultora en Gestión de Centros Estéticos',
      avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=120&auto=format&fit=crop&q=80',
    },
    coverImage: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&auto=format&fit=crop&q=80',
    content: {
      introduction:
        'El miedo más frecuente al dejar el cuaderno de papel es pensar: "¿Y si mis clientas mayores no se adaptan?" o "¿Y si se solapan horarios?". La experiencia demuestra que cuando la interfaz es limpia y sin registros engorrosos, el 98% de las personas prefiere reservar online.',
      keyPoints: [
        {
          title: '1. Coloca tu enlace de reserva en la biografía de Instagram y WhatsApp Business',
          description:
            'Reemplaza el clásico "pide turno por DM" por tu link oficial `https://turnosdisponibles.online/#booking-[tu-slug]`. La gente podrá ver tus días libres a las 11 de la noche sin tener que esperar a que abras el local.',
        },
        {
          title: '2. Configura una respuesta automática en WhatsApp',
          description:
            'Cuando te escriban preguntando "¿Qué turnos tienes disponibles?", el bot o autorrespondedor entrega tu link amablemente.',
          practicalTip:
            '"¡Hola! Para ver todos los horarios libres y reservar en 1 minuto con confirmación directa, entra a nuestro portal: [Tu Link]."',
        },
        {
          title: '3. Bloqueo rápido de imprevistos',
          description:
            'Si surge un compromiso personal o feriado, bloquéalo con un solo clic en tu Panel de Negocio para que nadie pueda agendar en esa franja.',
        },
      ],
      templateWhatsapp:
        '¡Hola! Te comparto nuestro nuevo portal oficial de turnos online. Puedes ver los días libres de cada especialista y elegir tu horario en segundos: https://turnosdisponibles.online/#booking-[slug]',
      conclusion:
        'La transición a TurnosDisponibles.online te libera del teléfono y le da a tu centro una imagen moderna y profesional desde el primer día.',
    },
  },
];
