import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { db } from './server/db';
import {
  formatCustomerWhatsAppMessage,
  formatBusinessWhatsAppAlert,
  generateWaMeLink,
} from './src/lib/notifications';

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
