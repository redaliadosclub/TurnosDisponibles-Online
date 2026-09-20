import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Business } from '../types';
import { extractLocationsFromBusinesses } from '../lib/locationUtils';
import { MapPin, Check, X, Sparkles, Globe, Compass } from 'lucide-react';

interface SuperAdminLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  businesses: Business[];
  onConfigUpdated?: (newLocation: string) => void;
}

export function SuperAdminLocationModal({
  isOpen,
  onClose,
  businesses,
  onConfigUpdated,
}: SuperAdminLocationModalProps) {
  const [selectedDefaultLocation, setSelectedDefaultLocation] = useState<string>('all');
  const [customCity, setCustomCity] = useState<string>('');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // Available locations from registered businesses
  const dynamicLocations = extractLocationsFromBusinesses(businesses);

  useEffect(() => {
    if (isOpen) {
      setSavedSuccess(false);
      try {
        const stored = localStorage.getItem('td_platform_default_location');
        if (stored) {
          setSelectedDefaultLocation(stored);
          const found = dynamicLocations.some((l) => l.value.toLowerCase() === stored.toLowerCase());
          if (!found && stored !== 'all' && stored !== 'near_me') {
            setCustomCity(stored);
          }
        } else {
          setSelectedDefaultLocation('all');
        }
      } catch {
        setSelectedDefaultLocation('all');
      }
    }
  }, [isOpen, businesses]);

  if (!isOpen) return null;

  const handleSave = () => {
    setLoading(true);
    let finalLocation = selectedDefaultLocation;
    if (selectedDefaultLocation === 'custom') {
      finalLocation = customCity.trim() || 'all';
    }

    try {
      localStorage.setItem('td_platform_default_location', finalLocation);
      setSavedSuccess(true);
      if (onConfigUpdated) {
        onConfigUpdated(finalLocation);
      }
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 1200);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-6 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg leading-tight">Ciudad o Zona por Defecto</h3>
              <p className="text-xs text-slate-300">
                Controla qué localidad se filtra automáticamente al abrir el portal
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          <div className="bg-indigo-50/70 border border-indigo-200 rounded-2xl p-4 text-xs text-indigo-900 flex items-start gap-3">
            <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold mb-1">Estrategia de Lanzamiento Local</p>
              <p className="text-indigo-800 leading-relaxed">
                Si lanzas una campaña publicitaria en una ciudad o barrio específico (por ejemplo <strong>Palermo</strong>, <strong>Recoleta</strong>, <strong>Rosario</strong> o <strong>Salto</strong>), puedes definirla aquí para que cada visitante nuevo vea instantáneamente los consultorios de esa zona sin tener que filtrar a mano.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Seleccionar Zona Inicial del Portal
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition">
                <input
                  type="radio"
                  name="defaultLocation"
                  value="all"
                  checked={selectedDefaultLocation === 'all'}
                  onChange={() => setSelectedDefaultLocation('all')}
                  className="w-4 h-4 text-teal-600 focus:ring-teal-500"
                />
                <div className="flex-1">
                  <div className="text-xs font-bold text-slate-900">Todas las zonas (Nacional / Abierto)</div>
                  <div className="text-[11px] text-slate-500">Muestra todos los consultorios y prestadores sin filtrar por localidad.</div>
                </div>
              </label>

              {dynamicLocations
                .filter((l) => l.value !== 'all')
                .map((loc) => (
                  <label
                    key={loc.value}
                    className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition"
                  >
                    <input
                      type="radio"
                      name="defaultLocation"
                      value={loc.value}
                      checked={selectedDefaultLocation.toLowerCase() === loc.value.toLowerCase()}
                      onChange={() => setSelectedDefaultLocation(loc.value)}
                      className="w-4 h-4 text-teal-600 focus:ring-teal-500"
                    />
                    <div className="flex-1">
                      <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                        <span>{loc.label}</span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Filtra por los centros registrados en esta zona ({loc.count || 0} disponibles).
                      </div>
                    </div>
                  </label>
                ))}

              <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition">
                <input
                  type="radio"
                  name="defaultLocation"
                  value="custom"
                  checked={selectedDefaultLocation === 'custom' || (!dynamicLocations.some((l) => l.value.toLowerCase() === selectedDefaultLocation.toLowerCase()) && selectedDefaultLocation !== 'all')}
                  onChange={() => setSelectedDefaultLocation('custom')}
                  className="w-4 h-4 text-teal-600 focus:ring-teal-500"
                />
                <div className="flex-1">
                  <div className="text-xs font-bold text-slate-900">Otra ciudad o zona personalizada</div>
                  <div className="text-[11px] text-slate-500">Escribe el nombre de la ciudad para futuras altas o campañas.</div>
                  {(selectedDefaultLocation === 'custom' || (!dynamicLocations.some((l) => l.value.toLowerCase() === selectedDefaultLocation.toLowerCase()) && selectedDefaultLocation !== 'all')) && (
                    <input
                      type="text"
                      placeholder="Ej: Córdoba, Rosario, Salto, Mar del Plata..."
                      value={customCity}
                      onChange={(e) => {
                        setCustomCity(e.target.value);
                        setSelectedDefaultLocation('custom');
                      }}
                      className="mt-2 w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  )}
                </div>
              </label>
            </div>
          </div>

          {savedSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>¡Zona por defecto guardada! El portal ahora priorizará esta localidad.</span>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-sm flex items-center gap-2 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Guardar Configuración</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
