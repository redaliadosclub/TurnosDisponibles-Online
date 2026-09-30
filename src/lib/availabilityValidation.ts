import { WorkingHours, Shift, TimeOff, TimeOffType } from '../types';

export interface WorkingHourConflict {
  dayOfWeek: number;
  dayLabel: string;
  type:
    | 'clinic_closed_day'
    | 'outside_clinic_hours'
    | 'clinic_inactivity_gap'
    | 'clinic_holiday'
    | 'clinic_inactivity_partial'
    | 'overlapping_shifts'
    | 'invalid_shift';
  severity: 'error' | 'warning';
  message: string;
  suggestedAction?: string;
  details?: {
    staffShift?: Shift;
    clinicShifts?: Shift[];
    clinicBounds?: { start: string; end: string };
    holiday?: {
      date: string;
      reason: string;
      type: TimeOffType;
    };
  };
}

export interface AvailabilityValidationResult {
  valid: boolean; // true if errors.length === 0
  hasConflicts: boolean; // true if conflicts.length > 0 (errors or warnings)
  errors: WorkingHourConflict[];
  warnings: WorkingHourConflict[];
  conflicts: WorkingHourConflict[];
  summary: string;
}

export const DAYS_NAMES: Record<number, string> = {
  0: 'Domingo',
  1: 'Lunes',
  2: 'Martes',
  3: 'Miércoles',
  4: 'Jueves',
  5: 'Viernes',
  6: 'Sábado',
};

function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function formatMinutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

/**
 * Valida los horarios de atención y días de disponibilidad definidos por un profesional/staff
 * frente a los horarios de inactividad de la clínica (días cerrados, ventanas fuera de apertura, recesos)
 * y los feriados o bloqueos generales institucionales configurados por el dueño en el BusinessDashboard.
 */
export function validateStaffWorkingHoursAgainstClinic(
  staffHours: WorkingHours[],
  clinicHours: WorkingHours[],
  clinicTimeOffs: TimeOff[] = [],
  options: {
    strictOperatingHours?: boolean;
    referenceDateRangeDays?: number;
  } = {}
): AvailabilityValidationResult {
  const { strictOperatingHours = true, referenceDateRangeDays = 60 } = options;
  const errors: WorkingHourConflict[] = [];
  const warnings: WorkingHourConflict[] = [];

  // Filtrar solo los horarios generales de la clínica (professionalId === null)
  const generalClinicHours = clinicHours.filter((h) => h.professionalId === null);

  // Filtrar solo feriados y bloqueos generales de la clínica (professionalId === null)
  const generalTimeOffs = clinicTimeOffs.filter((to) => to.professionalId === null);

  // Fecha de referencia hoy
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;

  for (const staffDay of staffHours) {
    const dayNum = staffDay.dayOfWeek;
    const dayLabel = DAYS_NAMES[dayNum] || `Día ${dayNum}`;

    // Si el staff no atiende este día, no hay conflicto posible
    if (!staffDay.enabled || !staffDay.shifts || staffDay.shifts.length === 0) {
      continue;
    }

    // 1. Validar integridad básica de los turnos del staff (horas válidas y no solapadas)
    const sortedShifts = [...staffDay.shifts].sort(
      (a, b) => parseTimeToMinutes(a.start) - parseTimeToMinutes(b.start)
    );

    for (let i = 0; i < sortedShifts.length; i++) {
      const shift = sortedShifts[i];
      const startMin = parseTimeToMinutes(shift.start);
      const endMin = parseTimeToMinutes(shift.end);

      if (endMin <= startMin) {
        errors.push({
          dayOfWeek: dayNum,
          dayLabel,
          type: 'invalid_shift',
          severity: 'error',
          message: `El rango ${shift.start} - ${shift.end} hs en ${dayLabel} es inválido: la hora de finalización debe ser posterior a la de inicio.`,
          suggestedAction: 'Modifica la hora de inicio o fin para que el rango sea cronológico.',
          details: { staffShift: shift },
        });
      }

      // Comprobar solapamiento entre turnos propios del staff el mismo día
      if (i > 0) {
        const prevShift = sortedShifts[i - 1];
        const prevEndMin = parseTimeToMinutes(prevShift.end);
        if (startMin < prevEndMin) {
          errors.push({
            dayOfWeek: dayNum,
            dayLabel,
            type: 'overlapping_shifts',
            severity: 'error',
            message: `Superposición de turnos en ${dayLabel}: el turno ${shift.start} - ${shift.end} se superpone con ${prevShift.start} - ${prevShift.end}.`,
            suggestedAction: 'Separa los turnos para que no compartan franjas horarias.',
            details: { staffShift: shift },
          });
        }
      }
    }

    // 2. Validar frente a los Días de Inactividad de la Clínica
    const clinicDay = generalClinicHours.find((h) => h.dayOfWeek === dayNum);

    // Si la clínica configuró este día como inactivo / cerrado
    if (!clinicDay || !clinicDay.enabled || !clinicDay.shifts || clinicDay.shifts.length === 0) {
      errors.push({
        dayOfWeek: dayNum,
        dayLabel,
        type: 'clinic_closed_day',
        severity: 'error',
        message: `Conflicto de inactividad: La clínica permanece cerrada los días ${dayLabel} según la configuración general establecida por la dirección.`,
        suggestedAction: `Desactiva la atención los días ${dayLabel} o solicita a la administración habilitar la apertura del establecimiento.`,
      });
      continue; // No evaluar horas si el día completo está cerrado
    }

    // 3. Validar frente a las Horas de Inactividad de la Clínica durante ese día
    // Calcular el horario de apertura (mínimo) y cierre (máximo) de la clínica
    let clinicMinStart = Number.MAX_SAFE_INTEGER;
    let clinicMaxEnd = 0;
    const clinicIntervals: Array<{ start: number; end: number }> = [];

    for (const cShift of clinicDay.shifts) {
      const sStart = parseTimeToMinutes(cShift.start);
      const sEnd = parseTimeToMinutes(cShift.end);
      if (sStart < clinicMinStart) clinicMinStart = sStart;
      if (sEnd > clinicMaxEnd) clinicMaxEnd = sEnd;
      clinicIntervals.push({ start: sStart, end: sEnd });
    }

    clinicIntervals.sort((a, b) => a.start - b.start);

    for (const shift of staffDay.shifts) {
      const staffStart = parseTimeToMinutes(shift.start);
      const staffEnd = parseTimeToMinutes(shift.end);

      // A) Inicia antes de que la clínica abra (horas de inactividad matutina)
      if (staffStart < clinicMinStart) {
        const errorItem: WorkingHourConflict = {
          dayOfWeek: dayNum,
          dayLabel,
          type: 'outside_clinic_hours',
          severity: strictOperatingHours ? 'error' : 'warning',
          message: `Inactividad de clínica: Tu turno de las ${shift.start} hs inicia antes de la hora de apertura del centro (${formatMinutesToTime(clinicMinStart)} hs) los ${dayLabel}.`,
          suggestedAction: `Ajusta el inicio de tu turno a partir de las ${formatMinutesToTime(clinicMinStart)} hs.`,
          details: {
            staffShift: shift,
            clinicShifts: clinicDay.shifts,
            clinicBounds: {
              start: formatMinutesToTime(clinicMinStart),
              end: formatMinutesToTime(clinicMaxEnd),
            },
          },
        };
        if (strictOperatingHours) errors.push(errorItem);
        else warnings.push(errorItem);
      }

      // B) Finaliza después de que la clínica cierre (horas de inactividad nocturna)
      if (staffEnd > clinicMaxEnd) {
        const errorItem: WorkingHourConflict = {
          dayOfWeek: dayNum,
          dayLabel,
          type: 'outside_clinic_hours',
          severity: strictOperatingHours ? 'error' : 'warning',
          message: `Inactividad de clínica: Tu turno finaliza a las ${shift.end} hs, después de la hora de cierre del centro (${formatMinutesToTime(clinicMaxEnd)} hs) los ${dayLabel}.`,
          suggestedAction: `Ajusta el final de tu turno hasta las ${formatMinutesToTime(clinicMaxEnd)} hs.`,
          details: {
            staffShift: shift,
            clinicShifts: clinicDay.shifts,
            clinicBounds: {
              start: formatMinutesToTime(clinicMinStart),
              end: formatMinutesToTime(clinicMaxEnd),
            },
          },
        };
        if (strictOperatingHours) errors.push(errorItem);
        else warnings.push(errorItem);
      }

      // C) Cae dentro de un receso o período de inactividad intermedio de la clínica (split break)
      if (clinicIntervals.length > 1) {
        for (let g = 0; g < clinicIntervals.length - 1; g++) {
          const gapStart = clinicIntervals[g].end;
          const gapEnd = clinicIntervals[g + 1].start;
          if (gapEnd > gapStart) {
            // Existe un intervalo de inactividad de la clínica en medio del día
            const overlapsGap = Math.max(staffStart, gapStart) < Math.min(staffEnd, gapEnd);
            if (overlapsGap) {
              const gapItem: WorkingHourConflict = {
                dayOfWeek: dayNum,
                dayLabel,
                type: 'clinic_inactivity_gap',
                severity: strictOperatingHours ? 'error' : 'warning',
                message: `Receso de clínica: Tu turno ${shift.start} - ${shift.end} hs invade el horario de inactividad/receso del centro (${formatMinutesToTime(gapStart)} - ${formatMinutesToTime(gapEnd)} hs) los ${dayLabel}.`,
                suggestedAction: `Divide tu horario en dos bloques o respeta el receso institucional de ${formatMinutesToTime(gapStart)} a ${formatMinutesToTime(gapEnd)} hs.`,
                details: {
                  staffShift: shift,
                  clinicShifts: clinicDay.shifts,
                },
              };
              if (strictOperatingHours) errors.push(gapItem);
              else warnings.push(gapItem);
            }
          }
        }
      }
    }

    // 4. Validar frente a Días Feriados e Inactividades Programadas de la Clínica (TimeOff generales)
    // Buscamos si hay feriados configurados por el dueño en fechas próximas que caigan en este día de la semana
    for (const to of generalTimeOffs) {
      if (to.endDate < todayStr) continue; // Feriados ya pasados

      // Expandir las fechas del TimeOff dentro del rango de evaluación
      const [sy, sm, sd] = to.startDate.split('-').map(Number);
      const [ey, em, ed] = to.endDate.split('-').map(Number);
      const startD = new Date(sy, sm - 1, sd);
      const endD = new Date(ey, em - 1, ed);

      const maxCheck = new Date();
      maxCheck.setDate(maxCheck.getDate() + referenceDateRangeDays);

      let curr = new Date(Math.max(startD.getTime(), now.getTime()));
      while (curr <= endD && curr <= maxCheck) {
        if (curr.getDay() === dayNum) {
          const dateStr = `${curr.getFullYear()}-${(curr.getMonth() + 1).toString().padStart(2, '0')}-${curr.getDate().toString().padStart(2, '0')}`;
          const isFullDay = !to.startTime || !to.endTime;
          const typeLabel =
            to.type === 'holiday'
              ? 'Feriado Institucional'
              : to.type === 'manual_block'
              ? 'Bloqueo General de Inactividad'
              : 'Asueto / Ausencia Clínica';

          if (isFullDay) {
            warnings.push({
              dayOfWeek: dayNum,
              dayLabel,
              type: 'clinic_holiday',
              severity: 'warning',
              message: `Aviso de Feriado/Cierre General: El próximo ${dayLabel} ${dateStr} la clínica permanecerá cerrada por "${to.reason}" (${typeLabel}). El sistema bloqueará automáticamente la agenda en esa fecha específica.`,
              details: {
                holiday: {
                  date: dateStr,
                  reason: to.reason,
                  type: to.type,
                },
              },
            });
          } else {
            // Feriado o bloqueo parcial de horas
            const toStart = parseTimeToMinutes(to.startTime!);
            const toEnd = parseTimeToMinutes(to.endTime!);
            const overlapsAnyStaffShift = staffDay.shifts.some((s) => {
              const ss = parseTimeToMinutes(s.start);
              const se = parseTimeToMinutes(s.end);
              return Math.max(ss, toStart) < Math.min(se, toEnd);
            });

            if (overlapsAnyStaffShift) {
              warnings.push({
                dayOfWeek: dayNum,
                dayLabel,
                type: 'clinic_inactivity_partial',
                severity: 'warning',
                message: `Aviso de Inactividad Parcial: El ${dayLabel} ${dateStr} habrá un receso de ${to.startTime} a ${to.endTime} hs por "${to.reason}". Los turnos en esa franja no estarán disponibles en dicha fecha.`,
                details: {
                  holiday: {
                    date: dateStr,
                    reason: to.reason,
                    type: to.type,
                  },
                },
              });
            }
          }
        }
        curr.setDate(curr.getDate() + 1);
      }
    }
  }

  const conflicts = [...errors, ...warnings];
  const valid = errors.length === 0;

  let summary = 'Los horarios configurados son 100% compatibles con la clínica.';
  if (errors.length > 0) {
    summary = `Se detectaron ${errors.length} conflicto(s) bloqueante(s) con las horas de inactividad o días de cierre de la clínica. Debes corregirlos para guardar.`;
  } else if (warnings.length > 0) {
    summary = `Horarios válidos. Se encontraron ${warnings.length} advertencia(s) sobre feriados o recesos programados por la clínica (la agenda se adaptará automáticamente).`;
  }

  return {
    valid,
    hasConflicts: conflicts.length > 0,
    errors,
    warnings,
    conflicts,
    summary,
  };
}
