import React, { useMemo, useState } from 'react';
import { Business } from '../../types';
import { extractLocationsFromBusinesses } from '../../lib/locationUtils';
import {
  Search,
  MapPin,
  Sparkles,
  CheckCircle2,
  CalendarCheck,
  Zap,
  ShieldCheck,
  ArrowRight,
  TrendingUp,
  Clock,
  Star,
  Navigation,
} from 'lucide-react';

interface PortalHeroProps {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  selectedCategory: string;
  onCategoryChange: (val: string) => void;
  selectedLocation: string;
  onLocationChange: (val: string) => void;
  onExecuteSearch: () => void;
  onOpenAuthModal: () => void;
  businesses?: Business[];
}

export function PortalHero({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  selectedLocation,
  onLocationChange,
  onExecuteSearch,
  onOpenAuthModal,
  businesses = [],
}: PortalHeroProps) {
  const [isLocating, setIsLocating] = useState(false);

  const categories = [
    { value: 'all', label: 'Todas las categorías' },
    { value: 'beauty', label: 'Estética & Spa' },
    { value: 'medical', label: 'Consultorios Médicos' },
    { value: 'dental', label: 'Odontología' },
    { value: 'services', label: 'Peluquería & Barbería' },
    { value: 'veterinary', label: 'Veterinarias' },
  ];

  // Extraer automáticamente las zonas y ciudades reales de los negocios registrados
  const dynamicLocations = useMemo(() => {
    return extractLocationsFromBusinesses(businesses);
  }, [businesses]);

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      alert('La geolocalización no está disponible en este dispositivo.');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        // Filtra por Cerca de mí
        onLocationChange('near_me');
        onExecuteSearch();
      },
      (err) => {
        setIsLocating(false);
        console.warn('Geolocation denied or failed', err);
        alert('No pudimos acceder a tu ubicación. Por favor selecciona tu zona manualmente.');
      },
      { timeout: 10000 }
    );
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onExecuteSearch();
  };

  return (
    <section
      id="hero"
      className="relative bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white overflow-hidden pt-12 pb-20 sm:pt-16 sm:pb-24 border-b border-slate-800"
    >
      {/* Ambient background glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-br from-teal-500/15 via-emerald-500/10 to-transparent blur-3xl pointer-events-none -z-0" />
      <div className="absolute -top-24 right-10 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -z-0" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto space-y-6">
          {/* Tagline Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/80 text-teal-300 text-xs font-semibold shadow-inner backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
            <span>El portal oficial de reservas inmediatas en Argentina</span>
            <span className="hidden sm:inline text-slate-500">|</span>
            <span className="hidden sm:inline text-slate-300">Sin llamadas ni demoras</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.15]">
            Encuentra y reserva tu turno en segundos con{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-emerald-300 to-teal-200">
              confirmación directa por WhatsApp
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg text-slate-300 leading-relaxed font-normal max-w-2xl mx-auto">
            El directorio más confiable de centros de estética, consultorios médicos, clínicas dentales y barberías.
            Consulta disponibilidad en tiempo real y asegura tu horario con seña transparente.
          </p>

          {/* Live Search Box */}
          <div className="pt-4 max-w-4xl mx-auto">
            <form
              onSubmit={handleFormSubmit}
              className="p-2 sm:p-3 bg-slate-900/90 rounded-2xl sm:rounded-3xl border border-slate-700/80 shadow-2xl backdrop-blur-xl flex flex-col md:flex-row gap-2.5 items-stretch"
            >
              {/* Keyword input */}
              <div className="flex-1 relative flex items-center min-w-0">
                <Search className="absolute left-3.5 w-4 h-4 text-teal-400 pointer-events-none" />
                <input
                  id="hero-input-search"
                  type="text"
                  placeholder="¿Qué servicio o centro buscas? (ej. Peeling, Ortodoncia...)"
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="w-full pl-10 pr-3 py-3 bg-slate-800/60 hover:bg-slate-800 focus:bg-slate-800 rounded-xl border border-slate-700/60 text-white placeholder:text-slate-400 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 transition-colors"
                />
              </div>

              {/* Category selector */}
              <div className="w-full md:w-56 relative flex items-center">
                <Sparkles className="absolute left-3.5 w-4 h-4 text-emerald-400 pointer-events-none" />
                <select
                  id="hero-select-category"
                  value={selectedCategory}
                  onChange={(e) => onCategoryChange(e.target.value)}
                  className="w-full pl-10 pr-8 py-3 bg-slate-800/60 hover:bg-slate-800 focus:bg-slate-800 rounded-xl border border-slate-700/60 text-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 transition-colors cursor-pointer appearance-none"
                >
                  {categories.map((cat) => (
                    <option key={cat.value} value={cat.value} className="bg-slate-900 text-white">
                      {cat.label}
                    </option>
                  ))}
                </select>
                <span className="absolute right-3.5 text-slate-400 pointer-events-none text-xs">▼</span>
              </div>

              {/* Location selector */}
              <div className="w-full md:w-56 relative flex items-center gap-1.5">
                <div className="relative flex-1 flex items-center min-w-0">
                  <MapPin className="absolute left-3.5 w-4 h-4 text-indigo-400 pointer-events-none" />
                  <select
                    id="hero-select-location"
                    value={selectedLocation}
                    onChange={(e) => onLocationChange(e.target.value)}
                    className="w-full pl-10 pr-8 py-3 bg-slate-800/60 hover:bg-slate-800 focus:bg-slate-800 rounded-xl border border-slate-700/60 text-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 transition-colors cursor-pointer appearance-none truncate"
                  >
                    <option value="near_me" className="bg-slate-900 text-teal-300 font-semibold">
                      📍 Usar mi ubicación actual
                    </option>
                    {dynamicLocations.map((loc) => (
                      <option key={loc.value} value={loc.value} className="bg-slate-900 text-white">
                        {loc.label}
                      </option>
                    ))}
                  </select>
                  <span className="absolute right-3 text-slate-400 pointer-events-none text-xs">▼</span>
                </div>

                <button
                  type="button"
                  id="hero-btn-geolocation"
                  title="Detectar mi ubicación cercana"
                  onClick={handleDetectLocation}
                  disabled={isLocating}
                  className="p-3 bg-slate-800/80 hover:bg-slate-700 text-teal-400 hover:text-teal-300 rounded-xl border border-slate-700/60 transition-colors flex items-center justify-center flex-shrink-0"
                >
                  <Navigation className={`w-4 h-4 ${isLocating ? 'animate-spin text-amber-400' : ''}`} />
                </button>
              </div>

              {/* CTA Search Button */}
              <button
                id="hero-btn-search"
                type="submit"
                className="w-full md:w-auto px-7 py-3 bg-gradient-to-r from-teal-400 to-emerald-400 hover:from-teal-300 hover:to-emerald-300 text-slate-950 font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-teal-500/25 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] flex-shrink-0"
              >
                <Search className="w-4 h-4" />
                <span>Buscar Turnos</span>
              </button>
            </form>
          </div>

          {/* Quick popular tags */}
          <div className="flex items-center justify-center gap-2 flex-wrap text-xs text-slate-400 pt-1">
            <span className="text-slate-500 font-medium">Búsquedas frecuentes:</span>
            {['Limpieza Facial', 'Blanqueamiento', 'Dermatología', 'Corte & Barba', 'Consulta Médica'].map(
              (tag) => (
                <button
                  key={tag}
                  id={`tag-${tag.toLowerCase().replace(/\s+/g, '-')}`}
                  type="button"
                  onClick={() => {
                    onSearchChange(tag);
                    onExecuteSearch();
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-teal-300 border border-slate-700/50 transition-colors"
                >
                  {tag}
                </button>
              )
            )}
          </div>
        </div>

        {/* Trust Metrics Bar */}
        <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 max-w-5xl mx-auto">
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 text-center backdrop-blur-sm">
            <div className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-teal-500/10 text-teal-400 mb-2">
              <CalendarCheck className="w-4 h-4" />
            </div>
            <p className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">+5.000</p>
            <p className="text-xs text-slate-400 font-medium">Turnos Gestionados</p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 text-center backdrop-blur-sm">
            <div className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 mb-2">
              <Zap className="w-4 h-4" />
            </div>
            <p className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">Instantáneo</p>
            <p className="text-xs text-slate-400 font-medium">Aviso Directo WhatsApp</p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 text-center backdrop-blur-sm">
            <div className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 mb-2">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <p className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">0% Oculto</p>
            <p className="text-xs text-slate-400 font-medium">Cero Comisiones Extra</p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 text-center backdrop-blur-sm">
            <div className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 mb-2">
              <TrendingUp className="w-4 h-4" />
            </div>
            <p className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">99.8%</p>
            <p className="text-xs text-slate-400 font-medium">Asistencia con Señas</p>
          </div>
        </div>

        {/* Dual Impact Banner for Business Owners */}
        <div className="mt-8 max-w-5xl mx-auto bg-gradient-to-r from-teal-950/60 via-slate-900/90 to-slate-900/60 border border-teal-800/40 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-center sm:text-left">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-300 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">
                ¿Eres dueño de un centro de estética, consultorio o estudio?
              </p>
              <p className="text-xs text-slate-300">
                Digitaliza tu agenda en 5 minutos: 15 días gratis con todas las funciones del Plan PRO y cobro de señas automático.
              </p>
            </div>
          </div>
          <button
            id="hero-btn-b2b-cta"
            type="button"
            onClick={onOpenAuthModal}
            className="px-4 py-2 bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-400/30 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 whitespace-nowrap shadow-sm"
          >
            Probar 15 Días Gratis <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </section>
  );
}
