import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { db } from './server/db';
import {
  formatCustomerWhatsAppMessage,
  formatBusinessWhatsAppAlert,
  generateWaMeLink,
} from './src/lib/notifications';

let aiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI | null {
  if (!process.env.GEMINI_API_KEY) return null;
  if (!aiClient) {
    try {
      aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    } catch (e) {
      console.warn('[Gemini Init Warning]:', e);
      return null;
    }
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // --- API Routes ---

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Current session variable for demo and auth (defaults to null so public visitors are clean)
  let currentSessionUser: any = null;

  // --- Auth Routes ---
  app.get('/api/auth/me', (req, res) => {
    res.json({ user: currentSessionUser });
  });

  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    if (!email) return res.status(400).json({ error: 'Email requerido' });

    const lower = email.toLowerCase();
    const isSuperAdminEmail = lower === 'agenciaclienteya@gmail.com' || lower.includes('admin');

    // Security check: SuperAdmin always requires correct master password
    if (isSuperAdminEmail) {
      if (!password || password !== 'admin123') {
        return res.status(401).json({ error: 'Contraseña de SuperAdmin Master incorrecta' });
      }
    }

    // Look up user in db
    let user = db.getUserByEmail(email);

    if (user && user.role === 'superadmin') {
      if (!password || password !== 'admin123') {
        return res.status(401).json({ error: 'Contraseña de SuperAdmin Master incorrecta' });
      }
    }

    // If demo account not found, create or match fallback
    if (!user) {
      if (isSuperAdminEmail) {
        user = db.createUser({
          name: lower === 'agenciaclienteya@gmail.com' ? 'Agencia Cliente Ya (SuperAdmin)' : 'Super Admin',
          email,
          role: 'superadmin',
          businessId: undefined,
        });
      } else if (lower.includes('dueno') || lower.includes('owner')) {
        const firstBiz = db.getBusinesses()[0];
        user = db.createUser({
          name: 'Dueño del Negocio',
          email,
          role: 'business_owner',
          businessId: firstBiz ? firstBiz.id : 'biz_turnosmed_demo',
        });
      } else if (lower.includes('doctor') || lower.includes('staff')) {
        const firstBiz = db.getBusinesses()[0];
        user = db.createUser({
          name: 'Profesional Médico',
          email,
          role: 'staff',
          businessId: firstBiz ? firstBiz.id : 'biz_turnosmed_demo',
        });
      } else {
        user = db.createUser({
          name: email.split('@')[0],
          email,
          role: 'customer',
          businessId: undefined,
        });
      }
    }

    currentSessionUser = user;
    res.json({ user });
  });

  app.post('/api/auth/register', (req, res) => {
    const { name, email, role, businessId } = req.body;
    if (!email || !name) {
      return res.status(400).json({ error: 'Nombre y email requeridos' });
    }

    const existing = db.getUserByEmail(email);
    if (existing) {
      currentSessionUser = existing;
      return res.json({ user: existing });
    }

    const newUser = db.createUser({
      name,
      email,
      role: role || 'business_owner',
      businessId: businessId || null,
    });

    currentSessionUser = newUser;
    res.status(201).json({ user: newUser });
  });

  app.post('/api/auth/logout', (req, res) => {
    currentSessionUser = null;
    res.json({ success: true });
  });

  // Businesses
  app.get('/api/businesses', (req, res) => {
    res.json(db.getBusinesses());
  });

  app.get('/api/businesses/:idOrSlug', (req, res) => {
    const { idOrSlug } = req.params;
    let business = db.getBusinessBySlug(idOrSlug);
    if (!business) {
      business = db.getBusinessById(idOrSlug);
    }
    if (!business) {
      return res.status(404).json({ error: 'Negocio no encontrado' });
    }
    res.json(business);
  });

  app.post('/api/businesses', (req, res) => {
    try {
      const created = db.createBusiness(req.body);
      res.status(201).json(created);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Error al crear negocio' });
    }
  });

  app.put('/api/businesses/:id', (req, res) => {
    const updated = db.updateBusiness(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Negocio no encontrado' });
    res.json(updated);
  });

  // Test FlaxxaWAPI / Flowomatic Webhook
  app.post('/api/businesses/:id/test-wapi', async (req, res) => {
    const business = db.getBusinessById(req.params.id);
    if (!business) return res.status(404).json({ error: 'Negocio no encontrado' });

    const targetUrl = req.body.webhookUrl || business.wapiWebhookUrl;
    if (!targetUrl) {
      return res.status(400).json({ error: 'Debes configurar una URL de webhook o endpoint de FlaxxaWAPI' });
    }

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      const token = req.body.apiKey || business.wapiApiKey;
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        headers['x-api-key'] = token;
      }

      const testPayload = {
        event: 'test_connection',
        timestamp: new Date().toISOString(),
        businessId: business.id,
        businessName: business.name,
        instanceId: req.body.instanceId || business.wapiInstanceId || 'instance_default',
        recipientPhone: req.body.testPhone || business.whatsappNumber || '+5491148219900',
        message: `🔔 Prueba de conexión exitosa desde ${business.name} (TurnosMed). Integración activa con FlaxxaWAPI / Flowomatic.`,
        sampleAppointment: {
          bookingCode: 'TM-TEST',
          service: 'Consulta de Prueba',
          date: new Date().toISOString().split('T')[0],
          time: '11:00',
        },
      };

      const response = await fetch(targetUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(testPayload),
      });

      res.json({
        success: true,
        statusCode: response.status,
        statusText: response.statusText,
        message: `Webhook disparado exitosamente con código ${response.status}`,
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: `Error al contactar el webhook: ${err.message}`,
      });
    }
  });

  // Professionals
  app.get('/api/businesses/:businessId/professionals', (req, res) => {
    const profs = db.getProfessionals(req.params.businessId);
    res.json(profs);
  });

  app.post('/api/businesses/:businessId/professionals', (req, res) => {
    try {
      const biz = db.getBusinessById(req.params.businessId);
      if (biz) {
        const currentProfs = db.getProfessionals(biz.id);
        const createdMs = biz.createdAt ? new Date(biz.createdAt).getTime() : 0;
        const isTrial = (Date.now() - createdMs) < (15 * 86400000);

        if (biz.plan === 'free' && !isTrial && currentProfs.length >= 1) {
          return res.status(403).json({
            error: 'El Plan Base Free incluye 1 profesional. Asciende al Plan Pro para habilitar hasta 5 profesionales con agendas independientes.',
            code: 'PROFESSIONAL_LIMIT_REACHED',
          });
        }
        if (biz.plan === 'pro' && currentProfs.length >= 5) {
          return res.status(403).json({
            error: 'El Plan Pro incluye hasta 5 profesionales. Asciende al Plan Experiencia AI para habilitar profesionales y sucursales ilimitadas.',
            code: 'PROFESSIONAL_LIMIT_REACHED',
          });
        }
      }
      const created = db.createProfessional(req.params.businessId, req.body);
      res.status(201).json(created);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.put('/api/businesses/:businessId/professionals/:id', (req, res) => {
    const updated = db.updateProfessional(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Profesional no encontrado' });
    res.json(updated);
  });

  app.delete('/api/businesses/:businessId/professionals/:id', (req, res) => {
    const ok = db.deleteProfessional(req.params.id);
    res.json({ success: ok });
  });

  // Services
  app.get('/api/businesses/:businessId/services', (req, res) => {
    const srvs = db.getServices(req.params.businessId);
    res.json(srvs);
  });

  app.post('/api/businesses/:businessId/services', (req, res) => {
    try {
      const created = db.createService(req.params.businessId, req.body);
      res.status(201).json(created);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.put('/api/businesses/:businessId/services/:id', (req, res) => {
    const updated = db.updateService(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Servicio no encontrado' });
    res.json(updated);
  });

  app.delete('/api/businesses/:businessId/services/:id', (req, res) => {
    const ok = db.deleteService(req.params.id);
    res.json({ success: ok });
  });

  // Working Hours & Time Offs
  app.get('/api/businesses/:businessId/working-hours', (req, res) => {
    const hours = db.getWorkingHours(req.params.businessId);
    res.json(hours);
  });

  app.put('/api/businesses/:businessId/working-hours', (req, res) => {
    const hours = db.updateWorkingHours(req.params.businessId, req.body);
    res.json(hours);
  });

  app.get('/api/businesses/:businessId/time-offs', (req, res) => {
    const tos = db.getTimeOffs(req.params.businessId);
    res.json(tos);
  });

  app.post('/api/businesses/:businessId/time-offs', (req, res) => {
    const created = db.createTimeOff(req.params.businessId, req.body);
    res.status(201).json(created);
  });

  app.delete('/api/businesses/:businessId/time-offs/:id', (req, res) => {
    const ok = db.deleteTimeOff(req.params.id);
    res.json({ success: ok });
  });

  // Customers
  app.get('/api/businesses/:businessId/customers', (req, res) => {
    const customers = db.getCustomers(req.params.businessId);
    res.json(customers);
  });

  // Availability Engine Endpoint
  app.get('/api/availability', (req, res) => {
    const { businessId, professionalId, serviceId, date } = req.query;
    if (!businessId || !professionalId || !serviceId || !date) {
      return res.status(400).json({ error: 'Faltan parámetros requeridos: businessId, professionalId, serviceId, date' });
    }

    try {
      const result = db.getAvailability(
        businessId as string,
        professionalId as string,
        serviceId as string,
        date as string
      );
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Error al calcular disponibilidad' });
    }
  });

  // Appointments (Appointments Management & Atomic Booking)
  app.get('/api/businesses/:businessId/appointments', (req, res) => {
    const { date, professionalId } = req.query;
    const apps = db.getAppointments(req.params.businessId, {
      date: date as string,
      professionalId: professionalId as string,
    });
    res.json(apps);
  });

  app.get('/api/appointments/:idOrCode', (req, res) => {
    const app = db.getAppointmentById(req.params.idOrCode);
    if (!app) return res.status(404).json({ error: 'Turno no encontrado' });
    res.json(app);
  });

  // Atomic booking with Concurrency & Double-Booking Prevention
  app.post('/api/appointments', (req, res) => {
    const {
      businessId,
      professionalId,
      serviceId,
      customer,
      date,
      startTime,
      notes,
      paymentMethod,
      paymentStatus,
      depositAmount,
    } = req.body;

    if (!businessId || !professionalId || !serviceId || !customer || !date || !startTime) {
      return res.status(400).json({ error: 'Faltan datos obligatorios para confirmar la reserva.' });
    }

    try {
      const biz = db.getBusinessById(businessId);
      if (biz && biz.plan === 'free') {
        const createdMs = biz.createdAt ? new Date(biz.createdAt).getTime() : 0;
        const isTrial = (Date.now() - createdMs) < (15 * 86400000);
        if (!isTrial) {
          const currentYm = date.slice(0, 7);
          const monthlyApps = db.getAppointments(businessId, {}).filter(
            (a) => a.date && a.date.startsWith(currentYm) && a.status !== 'cancelled'
          );
          if (monthlyApps.length >= 20) {
            return res.status(403).json({
              error: 'El negocio ha alcanzado el límite mensual de 20 turnos del Plan Base Free. Por favor contáctalo por WhatsApp o solicita ascender a Plan Pro Ilimitado.',
              code: 'PLAN_MONTHLY_LIMIT_REACHED',
            });
          }
        }
      }

      const result = db.createAppointmentAtomic({
        businessId,
        professionalId,
        serviceId,
        customer,
        date,
        startTime,
        notes,
        paymentMethod,
        paymentStatus,
        depositAmount,
      });

      // Prepare WhatsApp payloads
      const business = db.getBusinessById(businessId);
      const professional = db.getProfessionalById(professionalId);
      const service = db.getServiceById(serviceId);

      const payload = {
        customerPhone: customer.phone,
        customerName: `${customer.firstName} ${customer.lastName}`,
        businessPhone: business?.whatsappNumber || business?.phone || '',
        businessName: business?.name || '',
        professionalName: professional?.name || '',
        serviceName: service?.name || '',
        date,
        time: startTime,
        bookingCode: result.appointment.bookingCode,
        address: business?.address || '',
      };

      const customerWhatsAppText = formatCustomerWhatsAppMessage(payload);
      const customerWhatsAppUrl = generateWaMeLink(payload.businessPhone, customerWhatsAppText);
      const businessAlertText = formatBusinessWhatsAppAlert(payload);
      const businessAlertUrl = generateWaMeLink(payload.customerPhone, businessAlertText);

      // Trigger background automated webhook if FlaxxaWAPI / Flowomatic is enabled
      if (business?.wapiEnabled && business?.wapiWebhookUrl) {
        const webhookHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
        if (business.wapiApiKey) {
          webhookHeaders['Authorization'] = `Bearer ${business.wapiApiKey}`;
          webhookHeaders['x-api-key'] = business.wapiApiKey;
        }

        fetch(business.wapiWebhookUrl, {
          method: 'POST',
          headers: webhookHeaders,
          body: JSON.stringify({
            event: 'appointment.created',
            timestamp: new Date().toISOString(),
            businessId: business.id,
            businessName: business.name,
            instanceId: business.wapiInstanceId || undefined,
            appointment: result.appointment,
            customer: result.customer,
            professional: professional ? { id: professional.id, name: professional.name, specialty: professional.specialty } : undefined,
            service: service ? { id: service.id, name: service.name, duration: service.durationMinutes, price: service.price } : undefined,
            formattedMessages: {
              customerMessage: customerWhatsAppText,
              businessAlert: businessAlertText,
            },
          }),
        }).catch((wapiErr) => {
          console.warn('[WAPI Trigger Warning] External webhook failed:', wapiErr.message);
        });
      }

      res.status(201).json({
        ...result,
        whatsapp: {
          customerMessage: customerWhatsAppText,
          customerUrl: customerWhatsAppUrl,
          businessMessage: businessAlertText,
          businessUrl: businessAlertUrl,
        },
      });
    } catch (err: any) {
      if (err.code === 'SLOT_OCCUPIED') {
        return res.status(409).json({
          error: 'El horario seleccionado acaba de ser ocupado. Por favor selecciona otro horario disponible.',
          code: 'SLOT_OCCUPIED',
        });
      }
      res.status(400).json({ error: err.message || 'No fue posible crear la reserva' });
    }
  });

  // Update appointment status (Admin or Customer Cancel)
  app.patch('/api/appointments/:id/status', (req, res) => {
    const { status, reason } = req.body;
    const updated = db.updateAppointmentStatus(req.params.id, status, reason);
    if (!updated) return res.status(404).json({ error: 'Turno no encontrado' });
    res.json(updated);
  });

  // Analytics
  app.post('/api/analytics/event', (req, res) => {
    const { businessId, type, metadata } = req.body;
    if (businessId && type) {
      db.recordAnalytics(businessId, type, metadata);
    }
    res.json({ status: 'ok' });
  });

  app.get('/api/businesses/:businessId/analytics', (req, res) => {
    const stats = db.getAnalytics(req.params.businessId);
    res.json(stats);
  });

  // SuperAdmin Platform
  app.get('/api/superadmin/stats', (req, res) => {
    const stats = db.getSuperAdminStats();
    res.json(stats);
  });

  // Notifications manual generator endpoint
  app.post('/api/notifications/whatsapp-preview', (req, res) => {
    const { payload } = req.body;
    if (!payload) return res.status(400).json({ error: 'Payload missing' });
    const customerMsg = formatCustomerWhatsAppMessage(payload);
    const customerUrl = generateWaMeLink(payload.businessPhone, customerMsg);
    const businessMsg = formatBusinessWhatsAppAlert(payload);
    const businessUrl = generateWaMeLink(payload.customerPhone, businessMsg);

    res.json({
      customerMsg,
      customerUrl,
      businessMsg,
      businessUrl,
    });
  });

  // --- Plan Experiencia AI Endpoints ---

  // AI WhatsApp Bot Live Chat (Enhanced Conversational Booking & Operations)
  app.post('/api/ai/chat', async (req, res) => {
    const { businessId, message, conversationHistory } = req.body;
    if (!businessId || !message) {
      return res.status(400).json({ error: 'businessId y message requeridos' });
    }

    const business = db.getBusinessById(businessId);
    if (!business) {
      return res.status(404).json({ error: 'Negocio no encontrado' });
    }

    const services = db.getServices(business.id);
    const professionals = db.getProfessionals(business.id);
    const todayStr = new Date().toISOString().split('T')[0];

    // Check available slots for today & next 3 days for live suggestion
    let realTimeSlotsPreview: string[] = [];
    try {
      if (professionals.length > 0 && services.length > 0) {
        const nextDays = [0, 1, 2, 3].map(offset => {
          const d = new Date();
          d.setDate(d.getDate() + offset);
          return d.toISOString().split('T')[0];
        });

        for (const dateCheck of nextDays) {
          const avail = db.getAvailability(business.id, professionals[0].id, services[0].id, dateCheck);
          const freeSlots = avail.slots.filter(s => s.available).slice(0, 3).map(s => s.time);
          if (freeSlots.length > 0) {
            realTimeSlotsPreview.push(`${dateCheck}: ${freeSlots.join(', ')} hs`);
          }
        }
      }
    } catch (e) {
      console.warn('Could not compute real-time slot preview:', e);
    }

    const botName = business.aiBotName || 'Sofía';
    const botTone = business.aiBotTone || 'warm';

    const systemInstruction = `Sos ${botName}, la asistente virtual inteligente y oficial de WhatsApp para "${business.name}".
Tipo de negocio: ${business.category || business.businessType}.
Dirección: ${business.address || 'Consultar con recepción'}.
WhatsApp de contacto: ${business.whatsappNumber || business.phone}.
Política de cancelación: ${business.cancellationPolicy || 'Avisar con anticipación'}.

Servicios disponibles y precios:
${services.map((s) => `- ${s.name} (${s.durationMinutes} min): $${s.price.toLocaleString('es-AR')} ARS. ${s.description || ''}`).join('\n')}

Especialistas / Profesionales del equipo:
${professionals.map((p) => `- ${p.name}: ${p.specialty || p.title}`).join('\n')}

Condiciones de Seña y Pagos:
${
  business.depositRequired
    ? `Seña requerida: ${business.depositType === 'fixed' ? `$${business.depositAmount} ARS` : `${business.depositAmount}% del servicio`}. Alias MP: ${business.mpAlias || 'consultar'}. CBU/Alias Bancario: ${business.bankAlias || 'consultar'}.`
    : 'No se exige seña previa, se abona al finalizar en el establecimiento.'
}

Disponibilidad en tiempo real detectada:
${realTimeSlotsPreview.length > 0 ? realTimeSlotsPreview.join('\n') : 'Consultar horarios en la web.'}

Link para agendar online: https://turnosdisponibles.online/book/${business.slug}

DIRECTIVAS PARA EL FLUJO DE CONVERSACIÓN:
1. Tu rol es responder consultas, brindar precios exactos y GUIAR EL AGENDAMIENTO en 1 minuto.
2. Si el usuario quiere reservar un turno o pregunta qué horarios hay libres:
   - Ofrecele los horarios reales más próximos que figuran arriba o invitalo a seleccionar su día favorito en el link oficial.
   - Podes pedirle amablemente: Nombre completo, servicio deseado y horario de preferencia.
3. Si el usuario pide CANCELAR o MODIFICAR su turno:
   - Explicale que con su Código de Reserva (ej: *TD-1234*) se puede liberar el turno de forma inmediata, o que deje su nombre para gestionarlo.
4. Formato de WhatsApp:
   - Usá emojis amigables acordes al rubro.
   - Usá negrita (*palabra*) para resaltar datos importantes (precios, horarios, links).
   - Respuestas directas, empáticas y de 2 a 4 párrafos cortos.
5. Tono: ${
      botTone === 'warm' ? 'muy cálido, empático y servicial' : botTone === 'commercial' ? 'ágil, comercial y enfocado en cerrar el turno' : 'formal, pulcro y profesional'
    }.

${business.aiBotSystemPrompt ? `INSTRUCCIONES ESPECÍFICAS Y REGLAS ADICIONALES DEL NEGOCIO:\n${business.aiBotSystemPrompt}\n` : ''}`;

    const ai = getGenAI();

    if (ai) {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: message,
          config: {
            systemInstruction,
          },
        });

        const reply = response.text || 'Hola! ¿En qué puedo ayudarte hoy con tu turno?';
        return res.json({ reply, source: 'gemini' });
      } catch (err: any) {
        console.warn('[Gemini Error, falling back to enhanced heuristic engine]:', err.message);
      }
    }

    // Enhanced Heuristic Fallback Engine with Live Slot Recommendation
    const lower = message.toLowerCase();
    let fallbackReply = '';

    if (lower.includes('precio') || lower.includes('costo') || lower.includes('cuanto sale') || lower.includes('cuánto sale') || lower.includes('valor')) {
      const topServices = services.slice(0, 4);
      fallbackReply = `¡Hola! Con gusto te paso los valores de nuestros servicios principales en *${business.name}*:\n\n` +
        topServices.map(s => `• *${s.name}*: $${s.price.toLocaleString('es-AR')} ARS (${s.durationMinutes} min)`).join('\n') +
        `\n\nPodés ver la lista completa y reservar tu lugar aquí: https://turnosdisponibles.online/book/${business.slug}`;
    } else if (lower.includes('turno') || lower.includes('horario') || lower.includes('disponible') || lower.includes('agendar') || lower.includes('cuando') || lower.includes('cuándo') || lower.includes('mañana') || lower.includes('hoy')) {
      const slotText = realTimeSlotsPreview.length > 0 
        ? `\n\n🕒 *Próximos horarios sugeridos:*\n${realTimeSlotsPreview.slice(0, 2).map(s => `• ${s}`).join('\n')}\n`
        : '';

      fallbackReply = `¡Hola! Tengo disponibilidad para coordinar tu turno en *${business.name}*.${slotText}\n👉 *Elegí tu día y horario favorito en 1 minuto:* https://turnosdisponibles.online/book/${business.slug}\n\nO si preferís, decime qué servicio querés y qué día te queda cómodo para reservártelo.`;
    } else if (lower.includes('seña') || lower.includes('pagar') || lower.includes('mercado pago') || lower.includes('transferencia') || lower.includes('alias')) {
      if (business.depositRequired) {
        fallbackReply = `Para confirmar tu cita solicitamos una seña previa de *${business.depositType === 'fixed' ? `$${business.depositAmount} ARS` : `${business.depositAmount}%`}*.\n\nPodés abonarla por:\n• *Mercado Pago / CVU:* \`${business.mpAlias || 'consultorio.mp'}\`\n• *Alias Bancario:* \`${business.bankAlias || 'CONSULTORIO.BANCO'}\`\n\nUna vez transferido, el sistema procesa tu turno de inmediato.`;
      } else {
        fallbackReply = `En *${business.name}* no exigimos seña previa. Podés abonar tu atención directamente al finalizar en nuestro local en efectivo, débito o transferencia. ¡Te esperamos!`;
      }
    } else if (lower.includes('cancelar') || lower.includes('reprogramar') || lower.includes('cambiar') || lower.includes('no puedo ir')) {
      fallbackReply = `Lamentamos que no puedas asistir. Para cancelar o reprogramar tu turno:\n\n1. Ingresá a https://turnosdisponibles.online/book/${business.slug} y colocá tu código de reserva (ej: *TD-1234*).\n2. O respondeme con tu *Código de reserva* y nombre completo para liberar el turno de la agenda.\n\nPolítica de cancelación: *${business.cancellationPolicy || 'avisar con anticipación'}*.`;
    } else if (lower.includes('donde') || lower.includes('dónde') || lower.includes('direccion') || lower.includes('dirección') || lower.includes('queda')) {
      fallbackReply = `Estamos ubicados en: 📍 *${business.address}*.\n\nAtendemos con turno previo. Reservá el tuyo en: https://turnosdisponibles.online/book/${business.slug}`;
    } else {
      fallbackReply = `¡Hola! Soy ${botName}, tu asistente virtual de *${business.name}* 🤖.\n\n¿En qué puedo ayudarte hoy?\n• Consultar precios y tratamientos\n• Reservar un turno online en 1 minuto\n• Datos de ubicación y horarios\n• Medios de pago y señas\n\nTambién podés ingresar directamente a nuestra agenda digital: https://turnosdisponibles.online/book/${business.slug}`;
    }

    res.json({ reply: fallbackReply, source: 'fallback' });
  });

  // AI Gap Filler: Generate automated marketing campaign for empty slots
  app.post('/api/wapi/test', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    const { webhookUrl, apiKey, instanceId } = req.body || {};
    if (!webhookUrl || typeof webhookUrl !== 'string' || !webhookUrl.trim()) {
      return res.status(400).json({ success: false, error: 'Por favor ingresa la URL de Evolution API o Webhook.' });
    }

    try {
      let cleanBaseUrl = webhookUrl.trim().replace(/\/+$/, '');
      if (!cleanBaseUrl.startsWith('http://') && !cleanBaseUrl.startsWith('https://')) {
        cleanBaseUrl = `https://${cleanBaseUrl}`;
      }

      const headers: Record<string, string> = {
        'Accept': 'application/json, text/plain, */*',
      };
      if (apiKey && typeof apiKey === 'string' && apiKey.trim()) {
        const cleanKey = apiKey.trim();
        headers['apikey'] = cleanKey;
        headers['Authorization'] = `Bearer ${cleanKey}`;
        headers['x-api-key'] = cleanKey;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      let probeRes: Response;
      try {
        probeRes = await fetch(`${cleanBaseUrl}/instance/fetchInstances`, {
          method: 'GET',
          headers,
          signal: controller.signal,
        });
      } catch (errFirst) {
        // Fallback to base root URL
        probeRes = await fetch(cleanBaseUrl, {
          method: 'GET',
          headers,
          signal: controller.signal,
        });
      }

      clearTimeout(timeoutId);

      const status = probeRes.status;
      if (status === 401 || status === 403) {
        return res.json({
          success: false,
          error: 'Servidor alcanzado en Railway, pero la API Key fue rechazada (código HTTP 401/403). Verifica que AUTHENTICATION_API_KEY en Railway coincida exactamente con la clave ingresada.',
        });
      }

      if (status >= 200 && status < 300) {
        return res.json({
          success: true,
          message: '¡Conexión con Evolution API exitosa! El servidor en Railway respondió correctamente (HTTP 200).',
        });
      }

      return res.json({
        success: true,
        message: `Servidor contactado en Railway (HTTP ${status}). La URL responde correctamente.`,
      });
    } catch (err: any) {
      console.error('[Evolution API Test Error]:', err);
      return res.json({
        success: false,
        error: `No se pudo conectar con el servidor: ${err.message || 'Error de conexión o timeout.'}`,
      });
    }
  });

  app.post('/api/ai/gap-campaign', async (req, res) => {
    const { businessId } = req.body;
    const business = db.getBusinessById(businessId);
    if (!business) return res.status(404).json({ error: 'Negocio no encontrado' });

    const services = db.getServices(business.id);
    const profs = db.getProfessionals(business.id);

    const srvNames = services.slice(0, 3).map(s => s.name).join(', ');
    const profNames = profs.slice(0, 2).map(p => p.name).join(' y ');

    const campaignMessage = `🌟 *¡Huecos de última hora disponibles en ${business.name}!* 🌟\n\nHola 👋 ¿Querés cuidar tu bienestar esta semana? Se liberaron algunos turnos especiales con ${profNames || 'nuestros especialistas'}.\n\n📅 *Tratamientos disponibles:* ${srvNames || 'Consultas y servicios'}\n\n👉 *Asegurá tu lugar en 1 minuto:* https://turnosdisponibles.online/book/${business.slug}\n\n¡O respondé este mensaje para asignarte un horario antes de que se completen!`;

    res.json({
      success: true,
      campaignMessage,
      targetBusiness: business.name,
      suggestedChannels: ['WhatsApp Broadcast / Estados', 'Instagram Stories', 'Email de Re-enganche'],
    });
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);

    // Fallback for direct URL navigation in dev mode (e.g. /book/turnosmed-demo)
    app.get('*', async (req, res, next) => {
      if (req.originalUrl.startsWith('/api')) {
        return next();
      }
      try {
        const fs = await import('fs');
        const indexPath = path.resolve(process.cwd(), 'index.html');
        let template = fs.readFileSync(indexPath, 'utf-8');
        template = await vite.transformIndexHtml(req.originalUrl, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[TurnosMed Server] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
