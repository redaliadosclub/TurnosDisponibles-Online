import { Business } from '../types';

export interface LocationOption {
  value: string;
  label: string;
  count?: number;
}

/**
 * Extrae dinámicamente zonas, barrios y ciudades únicas de los negocios activos registrados.
 * Analiza en tiempo real las direcciones reales de los negocios activos registrados y
 * genera opciones únicas ordenadas por relevancia y cantidad de centros disponibles.
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
      if (/^(av\.|avenida|calle|pasaje|bulevar|blvd|ruta|diagonal|boulevard)/i.test(part)) return false;
      // Ignorar números puros o códigos postales
      if (/^\d+$/.test(part) || /^b\d{4}/i.test(part) || /^cp\s*\d+/i.test(part)) return false;
      return true;
    });

    if (cleanParts.length > 0) {
      cleanParts.forEach((loc) => {
        // Normalizar mayúsculas/minúsculas
        const formattedLoc = loc
          .split(' ')
          .map((w) => {
            const lower = w.toLowerCase();
            if (['caba', 'ba', 'sf', 'cba', 'gba'].includes(lower)) return lower.toUpperCase();
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

  // Ordenar por cantidad de centros disponibles primero (mayor relevancia), luego alfabéticamente
  const sortedKeys = Object.keys(locationCounts).sort((a, b) => {
    if (locationCounts[b] !== locationCounts[a]) {
      return locationCounts[b] - locationCounts[a];
    }
    return a.localeCompare(b);
  });

  sortedKeys.forEach((key) => {
    const count = locationCounts[key];
    options.push({
      value: key,
      label: `${key} (${count} ${count === 1 ? 'centro' : 'centros'})`,
      count,
    });
  });

  return options;
}

/**
 * Coordenadas aproximadas de referencia para localidades y barrios frecuentes de Argentina.
 */
const KNOWN_COORDINATES: Record<string, { lat: number; lng: number }> = {
  // CABA y Barrios
  'palermo': { lat: -34.5889, lng: -58.4306 },
  'belgrano': { lat: -34.5614, lng: -58.4566 },
  'recoleta': { lat: -34.5875, lng: -58.3974 },
  'caballito': { lat: -34.6186, lng: -58.4428 },
  'almagro': { lat: -34.6103, lng: -58.4239 },
  'villa urquiza': { lat: -34.5728, lng: -58.4878 },
  'caba': { lat: -34.6037, lng: -58.3816 },
  'buenos aires': { lat: -34.6037, lng: -58.3816 },

  // GBA & Provincia de Buenos Aires
  'salto': { lat: -34.2929, lng: -60.2547 },
  'pergamino': { lat: -33.8964, lng: -60.5739 },
  'san nicolas': { lat: -33.3333, lng: -60.2167 },
  'san nicolás': { lat: -33.3333, lng: -60.2167 },
  'junin': { lat: -34.5838, lng: -60.9433 },
  'junín': { lat: -34.5838, lng: -60.9433 },
  'la plata': { lat: -34.9215, lng: -57.9545 },
  'san isidro': { lat: -34.4717, lng: -58.5283 },
  'vicente lopez': { lat: -34.5268, lng: -58.4786 },
  'vicente lópez': { lat: -34.5268, lng: -58.4786 },
  'quilmes': { lat: -34.7206, lng: -58.2546 },
  'lomas de zamora': { lat: -34.7606, lng: -58.4039 },
  'moron': { lat: -34.6534, lng: -58.6198 },
  'morón': { lat: -34.6534, lng: -58.6198 },
  'mar del plata': { lat: -38.0055, lng: -57.5562 },
  'bahia blanca': { lat: -38.7183, lng: -62.2663 },
  'bahía blanca': { lat: -38.7183, lng: -62.2663 },

  // Provincias del Interior
  'rosario': { lat: -32.9468, lng: -60.6393 },
  'santa fe': { lat: -31.6333, lng: -60.7000 },
  'cordoba': { lat: -31.4201, lng: -64.1888 },
  'córdoba': { lat: -31.4201, lng: -64.1888 },
  'mendoza': { lat: -32.8895, lng: -68.8458 },
  'san miguel de tucuman': { lat: -26.8241, lng: -65.2226 },
  'salta': { lat: -24.7821, lng: -65.4232 },
  'neuquen': { lat: -38.9516, lng: -68.0591 },
  'neuquén': { lat: -38.9516, lng: -68.0591 },
};

/**
 * Fórmula Haversine para calcular distancia en km entre dos coordenadas geográficas.
 */
export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radio de la Tierra en km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Estima las coordenadas geográficas de un negocio según su dirección.
 */
export function getBusinessCoordinates(address: string): { lat: number; lng: number } | null {
  if (!address) return null;
  const lower = address.toLowerCase();

  for (const [key, coords] of Object.entries(KNOWN_COORDINATES)) {
    if (lower.includes(key)) {
      return coords;
    }
  }

  // Si incluye CABA / Capital Federal por defecto
  if (lower.includes('caba') || lower.includes('capital federal')) {
    return KNOWN_COORDINATES['caba'];
  }

  return null;
}
