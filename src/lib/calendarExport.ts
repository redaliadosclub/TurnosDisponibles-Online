import { Appointment, Business, Service, Professional } from '../types';

/**
 * Format Date & Time to iCal format: YYYYMMDDTHHmmssZ
 */
function formatToIcsDate(dateStr: string, timeStr: string): string {
  // dateStr: "YYYY-MM-DD", timeStr: "HH:mm"
  const cleanDate = dateStr.replace(/-/g, '');
  const cleanTime = timeStr.replace(/:/g, '') + '00';
  return `${cleanDate}T${cleanTime}`;
}

/**
 * Generate a direct Google Calendar web link for an appointment
 */
export function generateGoogleCalendarUrl(
  appointment: Appointment,
  business: Business,
  service?: Service,
  professional?: Professional
): string {
  const title = encodeURIComponent(
    `Turno: ${service?.name || 'Consulta'} - ${business.name}`
  );
  
  const startIso = formatToIcsDate(appointment.date, appointment.startTime);
  const endIso = formatToIcsDate(appointment.date, appointment.endTime || appointment.startTime);
  const dates = `${startIso}/${endIso}`;

  const details = encodeURIComponent(
    `Código de Reserva: ${appointment.bookingCode}\n` +
    `Profesional: ${professional?.name || 'A designar'}\n` +
    `Servicio: ${service?.name || 'Consulta'} ($${service?.price?.toLocaleString('es-AR') || 0} ARS)\n` +
    `Paciente: ${appointment.customerName} (${appointment.customerPhone})\n` +
    `Centro: ${business.name}\n` +
    `Dirección: ${business.address || 'Consultar con recepción'}\n` +
    `Teléfono / WhatsApp: ${business.whatsappNumber || business.phone}\n` +
    `Política de cancelación: ${business.cancellationPolicy || 'Avisar con anticipación'}`
  );

  const location = encodeURIComponent(business.address || business.name);

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}&location=${location}`;
}

/**
 * Generate an RFC 5545 .ics calendar content string for single appointment
 */
export function generateSingleIcsContent(
  appointment: Appointment,
  business: Business,
  service?: Service,
  professional?: Professional
): string {
  const start = formatToIcsDate(appointment.date, appointment.startTime);
  const end = formatToIcsDate(appointment.date, appointment.endTime || appointment.startTime);
  const uid = `${appointment.id}@turnosdisponibles.online`;
  const summary = `Turno: ${service?.name || 'Consulta'} - ${business.name}`;
  const description = `Código: ${appointment.bookingCode} | Profesional: ${professional?.name || 'Especialista'} | Paciente: ${appointment.customerName} | Tel: ${appointment.customerPhone} | ${business.address}`;

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//TurnosDisponibles//Turnos Online//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${formatToIcsDate(new Date().toISOString().slice(0, 10), '00:00')}Z`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${business.address || business.name}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

/**
 * Generate an .ics calendar file containing multiple appointments (e.g. today's or weekly agenda)
 */
export function generateAgendaIcsContent(
  appointments: Appointment[],
  business: Business,
  services: Service[],
  professionals: Professional[]
): string {
  const events = appointments.map((app) => {
    const srv = services.find((s) => s.id === app.serviceId);
    const prof = professionals.find((p) => p.id === app.professionalId);
    const start = formatToIcsDate(app.date, app.startTime);
    const end = formatToIcsDate(app.date, app.endTime || app.startTime);
    const uid = `${app.id}@turnosdisponibles.online`;
    const summary = `[${app.bookingCode}] ${app.customerName} - ${srv?.name || 'Turno'}`;
    const description = `Profesional: ${prof?.name || 'N/A'}\\nPaciente: ${app.customerName}\\nTel: ${app.customerPhone}\\nServicio: ${srv?.name || ''} ($${srv?.price || 0})\\nEstado Seña: ${app.paymentStatus || 'Pendiente'}`;

    return [
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${description}`,
      `LOCATION:${business.address || business.name}`,
      `STATUS:${app.status === 'cancelled' ? 'CANCELLED' : 'CONFIRMED'}`,
      'END:VEVENT',
    ].join('\r\n');
  });

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//TurnosDisponibles//Agenda Export//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:Agenda ${business.name}`,
    ...events,
    'END:VCALENDAR',
  ].join('\r\n');
}

/**
 * Trigger browser download of an .ics file
 */
export function downloadIcsFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename.endsWith('.ics') ? filename : `${filename}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
