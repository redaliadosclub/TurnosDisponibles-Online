import { Business } from '../types';

export interface LocationOption {
  value: string;
  label: string;
  count?: number;
}

/**
 * Extrae dinámicamente zonas, barrios y ciudades únicas de los negocios activos registrados.
 */
export function extractLocationsFromBusinesses(businesses: Business[]): LocationOption[] {
  const locationCounts: Record<string, number> = {};

  businesses.forEach((biz) => {
    if (biz.status === 'suspended' || !biz.address) return;

    const rawAddress = biz.address.trim();
    if (!rawAddress) return;

    // Fragmentar la dirección por comas
    const parts = rawAddress.split(',').map((p) => p.trim()).filter(Boolean);

    // Filtrar partes que sean calles, alturas o pisos
    const cleanParts = parts.filter((part) => {
      // Ignorar pisos, departamentos, números de oficina o alturas
      if (/^(piso|depto|dto|oficina|of|nro|n°|#|\d+)/i.test(part)) return false;
      if (/^(av\.|avenida|calle|pasaje|bulevar|blvd|ruta|diagonal)/i.test(part)) return false;
      // Ignorar números puros
      if (/^\d+$/.test(part)) return false;
      return true;
    });

    if (cleanParts.length > 0) {
      cleanParts.forEach((loc) => {
        // Normalizar mayúsculas/minúsculas
        const formattedLoc = loc
          .split(' ')
          .map((w) => {
            const lower = w.toLowerCase();
            if (['caba', 'ba', 'sf', 'cba'].includes(lower)) return lower.toUpperCase();
            return w.length > 2 ? w.charAt(0).toUpperCase() + w.slice(1) : w;
          })
          .join(' ');

        locationCounts[formattedLoc] = (locationCounts[formattedLoc] || 0) + 1;
      });
    } else {
      // Si no se pudo segmentar, guardar la dirección como fallback si es breve
      locationCounts[rawAddress] = (locationCounts[rawAddress] || 0) + 1;
    }
  });

  const options: LocationOption[] = [
    { value: 'all', label: 'Todas las zonas' },
  ];

  // Ordenar por cantidad de negocios primero, luego alfabéticamente
  const sortedKeys = Object.keys(locationCounts).sort((a, b) => {
    if (locationCounts[b] !== locationCounts[a]) {
      return locationCounts[b] - locationCounts[a];
    }
    return a.localeCompare(b);
  });

  sortedKeys.forEach((key) => {
    options.push({
      value: key,
      label: `${key} (${locationCounts[key]})`,
      count: locationCounts[key],
    });
  });

  return options;
}
