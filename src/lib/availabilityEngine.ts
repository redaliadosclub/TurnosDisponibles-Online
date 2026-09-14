import {
  Business,
  Professional,
  Service,
  WorkingHours,
  TimeOff,
  Appointment,
  TimeSlot,
  AvailabilityResponse,
} from '../types';

function parseTimeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function formatMinutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

export function calculateAvailability(params: {
  business: Business;
  professional: Professional;
  service: Service;
  date: string; // YYYY-MM-DD
  workingHoursList: WorkingHours[];
  timeOffList: TimeOff[];
  appointments: Appointment[];
  currentTimeStr?: string; // For testing / today check
  todayDateStr?: string; // YYYY-MM-DD
}): AvailabilityResponse {
  const {
    business,
    professional,
    service,
    date,
    workingHoursList,
    timeOffList,
    appointments,
  } = params;

  // Determine Day of Week (0=Sun, 1=Mon, ..., 6=Sat) in local time
  const [year, month, day] = date.split('-').map(Number);
  const targetDate = new Date(year, month - 1, day);
  const dayOfWeek = targetDate.getDay();

  // Find Working Hours: specific to professional or business fallback
  const profHours = workingHoursList.find(
    (wh) => wh.professionalId === professional.id && wh.dayOfWeek === dayOfWeek
  );
  const bizHours = workingHoursList.find(
    (wh) => wh.professionalId === null && wh.dayOfWeek === dayOfWeek
  );

  const activeHours = profHours || bizHours;

  if (!activeHours || !activeHours.enabled || activeHours.shifts.length === 0) {
    return {
      date,
      professionalId: professional.id,
      serviceId: service.id,
      slots: [],
      totalAvailable: 0,
      totalSlots: 0,
      status: 'full',
    };
  }

  // Check Full-day TimeOff
  const fullDayOff = timeOffList.find((to) => {
    const isTargetProf = to.professionalId === null || to.professionalId === professional.id;
    if (!isTargetProf) return false;
    const isWithinDate = date >= to.startDate && date <= to.endDate;
    const isFullDay = !to.startTime || !to.endTime;
    return isWithinDate && isFullDay;
  });

  if (fullDayOff) {
    return {
      date,
      professionalId: professional.id,
      serviceId: service.id,
      slots: [],
      totalAvailable: 0,
      totalSlots: 0,
      status: 'full',
    };
  }

  // Find partial time offs
  const partialTimeOffs = timeOffList.filter((to) => {
    const isTargetProf = to.professionalId === null || to.professionalId === professional.id;
    if (!isTargetProf) return false;
    const isWithinDate = date >= to.startDate && date <= to.endDate;
    return isWithinDate && !!to.startTime && !!to.endTime;
  });

  // Filter active appointments for this date and professional
  const activeAppointments = appointments.filter(
    (app) =>
      app.businessId === business.id &&
      app.professionalId === professional.id &&
      app.date === date &&
      app.status !== 'cancelled'
  );

  const duration = service.durationMinutes || 30;
  const buffer = business.bufferMinutes || 0;
  const slotInterval = duration + buffer;

  const slots: TimeSlot[] = [];

  // Today check
  const now = new Date();
  const todayStr =
    params.todayDateStr ||
    `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
  const isPastDate = date < todayStr;
  const isToday = date === todayStr;
  const currentMinutes =
    now.getHours() * 60 + now.getMinutes();

  for (const shift of activeHours.shifts) {
    const shiftStart = parseTimeToMinutes(shift.start);
    const shiftEnd = parseTimeToMinutes(shift.end);

    let current = shiftStart;
    while (current + duration <= shiftEnd) {
      const slotStartMin = current;
      const slotEndMin = current + duration;
      const slotStartTimeStr = formatMinutesToTime(slotStartMin);
      const slotEndTimeStr = formatMinutesToTime(slotEndMin);

      // Check if past
      let isPast = isPastDate;
      if (isToday && slotStartMin <= currentMinutes) {
        isPast = true;
      }

      // Check appointment conflict
      const hasAppConflict = activeAppointments.some((app) => {
        const appStart = parseTimeToMinutes(app.startTime);
        const appEnd = parseTimeToMinutes(app.endTime);
        // Overlap: slotStart < appEnd && slotEnd > appStart
        return slotStartMin < appEnd && slotEndMin > appStart;
      });

      // Check partial time off conflict
      const hasTimeOffConflict = partialTimeOffs.some((to) => {
        if (!to.startTime || !to.endTime) return false;
        const toStart = parseTimeToMinutes(to.startTime);
        const toEnd = parseTimeToMinutes(to.endTime);
        return slotStartMin < toEnd && slotEndMin > toStart;
      });

      const available = !isPast && !hasAppConflict && !hasTimeOffConflict;
      let reason: TimeSlot['reason'] = undefined;
      if (hasAppConflict) reason = 'booked';
      else if (hasTimeOffConflict) reason = 'time_off';
      else if (isPast) reason = 'past';

      slots.push({
        time: slotStartTimeStr,
        endTime: slotEndTimeStr,
        available,
        reason,
      });

      current += slotInterval;
    }
  }

  const totalAvailable = slots.filter((s) => s.available).length;
  const totalSlots = slots.length;

  let status: AvailabilityResponse['status'] = 'available';
  if (totalAvailable === 0) {
    status = 'full';
  } else if (totalAvailable <= 3) {
    status = 'low_availability';
  }

  return {
    date,
    professionalId: professional.id,
    serviceId: service.id,
    slots,
    totalAvailable,
    totalSlots,
    status,
  };
}
