import { Service, Professional } from '../types';

/**
 * Returns the effective price for a service given a specific professional.
 * Checks service.customPrices[profId] first, then prof.customServicePrices[serviceId],
 * and falls back to service.price.
 */
export function getServicePriceForProfessional(
  service?: Service | null,
  prof?: Professional | string | null
): number {
  if (!service) return 0;
  const profId = typeof prof === 'string' ? prof : prof?.id;
  if (!profId) return service.price || 0;

  // 1. Check custom price registered on the Service for this doctor
  if (service.customPrices && typeof service.customPrices[profId] === 'number') {
    return service.customPrices[profId];
  }

  // 2. Check custom price registered on the Professional for this service
  if (typeof prof === 'object' && prof?.customServicePrices && typeof prof.customServicePrices[service.id] === 'number') {
    return prof.customServicePrices[service.id];
  }

  return service.price || 0;
}

/**
 * Determines whether a professional performs a specific service.
 * Supports bidirectional assignments: both service.assignedProfessionalIds and prof.serviceIds.
 */
export function isProfessionalAssignedToService(
  prof?: Professional | null,
  service?: Service | null
): boolean {
  if (!prof || !service) return false;

  const hasServiceRestriction = Array.isArray(service.assignedProfessionalIds) && service.assignedProfessionalIds.length > 0;
  const hasProfRestriction = Array.isArray(prof.serviceIds) && prof.serviceIds.length > 0;

  // If the service restricts which professionals provide it, prof must be in the list
  if (hasServiceRestriction && !service.assignedProfessionalIds.includes(prof.id)) {
    return false;
  }

  // If the professional restricts which services they attend, service must be in the list
  if (hasProfRestriction && !prof.serviceIds.includes(service.id)) {
    return false;
  }

  // Both allow or neither restricts
  return true;
}
