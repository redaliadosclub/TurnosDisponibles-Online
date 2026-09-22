export function formatDateSpanish(dateStr: string): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

export function formatDateShort(dateStr: string): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
}

export function getDayNameSpanish(dayIndex: number): string {
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  return days[dayIndex] || '';
}

export function generateNextDays(count = 14): Array<{ dateStr: string; label: string; dayName: string; dayNum: number }> {
  const list = [];
  const today = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    const dayName = i === 0 ? 'Hoy' : i === 1 ? 'Mañana' : d.toLocaleDateString('es-ES', { weekday: 'short' });
    const fullDayName = d.toLocaleDateString('es-ES', { weekday: 'long' });
    list.push({
      dateStr,
      label: `${dayName} ${d.getDate()}`,
      dayName: fullDayName,
      dayNum: d.getDate(),
    });
  }
  return list;
}

// Generate Google Calendar Link
export function generateGoogleCalendarUrl(appointment: {
  serviceName: string;
  professionalName: string;
  businessName: string;
  address: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  bookingCode: string;
}): string {
  const { serviceName, professionalName, businessName, address, date, startTime, endTime, bookingCode } = appointment;
  const cleanDate = date.replace(/-/g, '');
  const cleanStart = startTime.replace(':', '') + '00';
  const cleanEnd = endTime.replace(':', '') + '00';

  const datesParam = `${cleanDate}T${cleanStart}/${cleanDate}T${cleanEnd}`;
  const title = encodeURIComponent(`${serviceName} - ${businessName}`);
  const details = encodeURIComponent(
    `Turno confirmado con ${professionalName}.\nCódigo de reserva: ${bookingCode}.\nUbicación: ${address}`
  );
  const location = encodeURIComponent(address);

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${datesParam}&details=${details}&location=${location}`;
}

// Generate and trigger .ics file download
export function downloadIcsFile(appointment: {
  serviceName: string;
  professionalName: string;
  businessName: string;
  address: string;
  date: string;
  startTime: string;
  endTime: string;
  bookingCode: string;
}) {
  const { serviceName, professionalName, businessName, address, date, startTime, endTime, bookingCode } = appointment;
  const cleanDate = date.replace(/-/g, '');
  const cleanStart = startTime.replace(':', '') + '00';
  const cleanEnd = endTime.replace(':', '') + '00';

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//TurnosDisponibles//Reserva de Turnos//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${bookingCode}-${Date.now()}@turnosdisponibles.online`,
    `DTSTAMP:${cleanDate}T${cleanStart}Z`,
    `DTSTART:${cleanDate}T${cleanStart}`,
    `DTEND:${cleanDate}T${cleanEnd}`,
    `SUMMARY:${serviceName} - ${businessName}`,
    `DESCRIPTION:Turno con ${professionalName}. Código: ${bookingCode}. Ubicación: ${address}`,
    `LOCATION:${address}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `turno-${bookingCode}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function generateWaMeLink(phone: string, message: string): string {
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}
