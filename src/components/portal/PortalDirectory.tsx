import { useState, useMemo } from 'react';
import { Business, Service, Professional } from '../../types';
import { extractLocationsFromBusinesses } from '../../lib/locationUtils';
import {
  Sparkles,
  MapPin,
  Star,
  ShieldCheck,
  CalendarCheck,
  ArrowRight,
  Search,
  SlidersHorizontal,
  Clock,
  DollarSign,
  Tag,
  Stethoscope,
  Smile,
  Scissors,
  PawPrint,
  Brain,
  Dumbbell,
  Briefcase,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';

interface PortalDirectoryProps {
  businesses: Business[];
  servicesMap: Record<string, Service[]>;
  professionalsMap: Record<string, Professional[]>;
  searchQuery: string;
  onSearchChange: (val: string) => void;
  selectedCategory: string;
  onCategoryChange: (val: string) => void;
  selectedLocation: string;
  onLocationChange: (val: string) => void;
  onSelectBooking: (slug: string) => void;
}

export function PortalDirectory({
  businesses,
  servicesMap,
  professionalsMap,
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  selectedLocation,
  onLocationChange,
  onSelectBooking,
}: PortalDirectoryProps) {
  const [sortBy, setSortBy] = useState<'recommended' | 'rating' | 'name'>('recommended');
  const [quickDetailBiz, setQuickDetailBiz] = useState<Business | null>(null);

  // Extraer automáticamente las zonas y ciudades de los negocios registrados
  const dynamicLocations = useMemo(() => {
    return extractLocationsFromBusinesses(businesses);
  }, [businesses]);

  // Category filters configuration
  const categoryFilters = [
    { id: 'all', label: 'Todos', icon: Sparkles },
    { id: 'beauty', label: 'Estética & Spa', icon: Sparkles },
    { id: 'medical', label: 'Consultorios Médicos', icon: Stethoscope },
    { id: 'dental', label: 'Odontología', icon: Smile },
    { id: 'services', label: 'Peluquería & Barbería', icon: Scissors },
    { id: 'veterinary', label: 'Veterinarias', icon: PawPrint },
    { id: 'psychology', label: 'Psicología & Terapia', icon: Brain },
  ];

  // Filter businesses
  const filteredBusinesses = useMemo(() => {
    return businesses.filter((biz) => {
      // Only show active businesses
      if (biz.status === 'suspended') return false;

      // Category match
      if (selectedCategory !== 'all' && biz.businessType !== selectedCategory) {
        return false;
      }

      // Location match
      if (selectedLocation !== 'all' && biz.address) {
        if (!biz.address.toLowerCase().includes(selectedLocation.toLowerCase())) {
          return false;
        }
      }

      // Query text match (name, description, category, services)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const bizServices = servicesMap[biz.id] || [];
        const matchesServices = bizServices.some(
          (s) => s.name.toLowerCase().includes(q) || (s.description && s.description.toLowerCase().includes(q))
        );
        const matchesProfs = (professionalsMap[biz.id] || []).some((p) =>
          p.name.toLowerCase().includes(q) || (p.specialty && p.specialty.toLowerCase().includes(q))
        );
        const matchesBiz =
          biz.name.toLowerCase().includes(q) ||
          (biz.description && biz.description.toLowerCase().includes(q)) ||
          (biz.category && biz.category.toLowerCase().includes(q)) ||
          (biz.address && biz.address.toLowerCase().includes(q));

        if (!matchesBiz && !matchesServices && !matchesProfs) {
          return false;
        }
      }

      return true;
    });
  }, [businesses, selectedCategory, selectedLocation, searchQuery, servicesMap, professionalsMap]);

  // Count items per category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: businesses.length };
    businesses.forEach((b) => {
      counts[b.businessType] = (counts[b.businessType] || 0) + 1;
    });
    return counts;
  }, [businesses]);

  // Mock static reviews and badges for realism
  const getBizBadge = (biz: Business) => {
    switch (biz.businessType) {
      case 'beauty':
        return { rating: 4.9, reviews: 84, badge: 'Top Spa & Belleza' };
      case 'dental':
        return { rating: 5.0, reviews: 112, badge: 'Clínica Dental Destacada' };
      case 'medical':
        return { rating: 4.9, reviews: 96, badge: 'Especialistas Certificados' };
      case 'veterinary':
        return { rating: 4.8, reviews: 67, badge: 'Atención Veterinaria' };
      case 'services':
        return { rating: 4.9, reviews: 140, badge: 'Barbería & Estilo' };
      default:
        return { rating: 4.9, reviews: 50, badge: 'Verificado' };
    }
  };

  const getCoverImage = (biz: Business) => {
    if (biz.businessType === 'beauty') {
      return 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=600&auto=format&fit=crop&q=80';
    }
    if (biz.businessType === 'dental') {
      return 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=600&auto=format&fit=crop&q=80';
    }
    if (biz.businessType === 'medical') {
      return 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=600&auto=format&fit=crop&q=80';
    }
    if (biz.businessType === 'veterinary') {
      return 'https://images.unsplash.com/photo-1548767797-d8c844163c4c?w=600&auto=format&fit=crop&q=80';
    }
    if (biz.businessType === 'services') {
      return 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=600&auto=format&fit=crop&q=80';
    }
    return 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&auto=format&fit=crop&q=80';
  };

  return (
    <section id="directorio" className="py-16 sm:py-24 bg-slate-900 text-slate-100 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-950 border border-teal-800/60 text-teal-400 text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5" /> Directorio de Profesionales & Centros
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              Explora y agenda en tu centro favorito
            </h2>
            <p className="text-slate-400 text-sm sm:text-base mt-2 max-w-xl">
              Selecciona tu categoría, consulta los tratamientos destacados y reserva tu horario disponible al instante.
            </p>
          </div>

          <div className="text-xs text-slate-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>
              Mostrando <strong className="text-white">{filteredBusinesses.length}</strong> centros con agenda abierta
            </span>
          </div>
        </div>

        {/* Filters & Controls Bar */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 mb-8">
          {/* Category Pills Bar */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0 scrollbar-none flex-1">
            {categoryFilters.map((cat) => {
              const Icon = cat.icon;
              const count = categoryCounts[cat.id] || 0;
              const isSelected = selectedCategory === cat.id;

              return (
                <button
                  key={cat.id}
                  id={`category-pill-${cat.id}`}
                  onClick={() => onCategoryChange(cat.id)}
                  className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold flex items-center gap-2.5 whitespace-nowrap transition-all flex-shrink-0 ${
                    isSelected
                      ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 shadow-lg shadow-teal-500/20 font-bold scale-[1.02]'
                      : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/60 hover:text-white'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isSelected ? 'text-slate-950' : 'text-teal-400'}`} />
                  <span>{cat.label}</span>
                  {count > 0 && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        isSelected ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Dynamic Location Filter */}
          <div className="flex items-center gap-2 bg-slate-800/90 p-1.5 px-3 rounded-2xl border border-slate-700/80 flex-shrink-0">
            <MapPin className="w-4 h-4 text-indigo-400 flex-shrink-0" />
            <span className="text-xs text-slate-400 font-medium whitespace-nowrap hidden sm:inline">Zona:</span>
            <select
              id="directory-select-location"
              value={selectedLocation}
              onChange={(e) => onLocationChange(e.target.value)}
              className="bg-slate-900 border border-slate-700/80 text-slate-200 text-xs sm:text-sm rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer font-medium max-w-[200px] truncate"
            >
              <option value="near_me">📍 Cerca de mí</option>
              {dynamicLocations.map((loc) => (
                <option key={loc.value} value={loc.value}>
                  {loc.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Directory Cards Grid */}
        {filteredBusinesses.length === 0 ? (
          <div className="bg-slate-800/50 border border-slate-700 rounded-3xl p-12 text-center max-w-xl mx-auto space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-700/60 text-slate-400 flex items-center justify-center mx-auto">
              <Search className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-white">No encontramos negocios para esta búsqueda</h3>
            <p className="text-xs sm:text-sm text-slate-400">
              Intenta cambiar los términos de búsqueda o seleccionar "Todos" en la categoría y ubicación.
            </p>
            <button
              id="btn-reset-filters"
              onClick={() => {
                onSearchChange('');
                onCategoryChange('all');
                onLocationChange('all');
              }}
              className="px-5 py-2.5 bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold rounded-xl transition-colors inline-flex items-center gap-2"
            >
              Restablecer filtros
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBusinesses.map((biz) => {
              const meta = getBizBadge(biz);
              const bizServices = (servicesMap[biz.id] || []).filter((s) => s.active);
              const bizProfs = (professionalsMap[biz.id] || []).filter((p) => p.active);
              const coverImg = biz.logoUrl ? getCoverImage(biz) : getCoverImage(biz);

              return (
                <div
                  key={biz.id}
                  id={`card-business-${biz.slug}`}
                  className="bg-slate-800/90 border border-slate-700/70 hover:border-teal-500/50 rounded-3xl overflow-hidden shadow-xl hover:shadow-2xl hover:shadow-teal-950/40 transition-all duration-300 flex flex-col group"
                >
                  {/* Card Cover & Header */}
                  <div className="relative h-44 w-full overflow-hidden bg-slate-950">
                    <img
                      src={coverImg}
                      alt={biz.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-80"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />

                    {/* Verified & Category Badges */}
                    <div className="absolute top-3.5 left-3.5 right-3.5 flex items-center justify-between">
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-950/80 text-teal-300 backdrop-blur-md border border-teal-500/30 flex items-center gap-1 shadow-sm">
                        <ShieldCheck className="w-3.5 h-3.5 text-teal-400" /> {meta.badge}
                      </span>

                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/90 text-slate-950 backdrop-blur-md flex items-center gap-1 shadow-sm">
                        <CalendarCheck className="w-3.5 h-3.5" /> Agenda Abierta
                      </span>
                    </div>

                    {/* Logo & Rating Overlay */}
                    <div className="absolute -bottom-4 left-4 right-4 flex items-end justify-between">
                      <div className="w-14 h-14 rounded-2xl bg-slate-900 p-1 shadow-xl border-2 border-slate-700 overflow-hidden flex-shrink-0">
                        <img
                          src={biz.logoUrl || 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=150&auto=format&fit=crop&q=80'}
                          alt={biz.name}
                          className="w-full h-full object-cover rounded-xl"
                        />
                      </div>

                      <div className="flex items-center gap-1.5 bg-slate-950/90 px-3 py-1 rounded-xl border border-slate-700/80 text-xs shadow-lg backdrop-blur-md">
                        <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                        <span className="font-bold text-white">{meta.rating}</span>
                        <span className="text-slate-400 text-[10px]">({meta.reviews})</span>
                      </div>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-5 pt-7 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <h3 className="font-bold text-lg text-white group-hover:text-teal-300 transition-colors leading-snug">
                        {biz.name}
                      </h3>

                      {biz.address && (
                        <p className="text-xs text-slate-400 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-teal-400 flex-shrink-0" />
                          <span className="truncate">{biz.address}</span>
                        </p>
                      )}

                      <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed font-normal">
                        {biz.description || biz.welcomeMessage}
                      </p>
                    </div>

                    {/* Featured Treatments with Reference Prices */}
                    {bizServices.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                          Tratamientos destacados:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {bizServices.slice(0, 3).map((svc) => (
                            <span
                              key={svc.id}
                              className="px-2.5 py-1 rounded-lg bg-slate-750/90 text-[11px] font-medium text-slate-200 border border-slate-700 flex items-center gap-1"
                            >
                              <span>{svc.name.length > 22 ? `${svc.name.substring(0, 20)}...` : svc.name}</span>
                              <strong className="text-teal-400 font-bold">${svc.price.toLocaleString('es-AR')}</strong>
                            </span>
                          ))}
                          {bizServices.length > 3 && (
                            <span className="px-2 py-1 rounded-lg bg-slate-800 text-[10px] text-slate-400 border border-slate-700/50">
                              +{bizServices.length - 3} más
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Deposit & Policy Info */}
                    <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between text-xs text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                        <span>
                          {biz.depositRequired
                            ? `Seña de reserva: $${biz.depositAmount?.toLocaleString('es-AR')} (MP / CBU)`
                            : 'Reserva sin seña previa'}
                        </span>
                      </div>
                    </div>

                    {/* Primary CTA Button: Reservar Turno */}
                    <div className="pt-2">
                      <button
                        id={`btn-book-${biz.slug}`}
                        type="button"
                        onClick={() => onSelectBooking(biz.slug)}
                        className="w-full py-3 px-4 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-bold text-xs sm:text-sm rounded-2xl shadow-lg shadow-teal-500/20 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99]"
                      >
                        <CalendarCheck className="w-4 h-4" />
                        <span>Reservar Turno Online</span>
                        <ArrowRight className="w-4 h-4 ml-auto" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
