import { useState, useEffect } from 'react';
import { User } from '../../types';
import {
  Calendar,
  Search,
  LogIn,
  LogOut,
  Menu,
  X,
  Sparkles,
  Building2,
  Tag,
  BookOpen,
  HelpCircle,
  ArrowUpRight,
  ShieldCheck,
  User as UserIcon,
  LayoutDashboard,
} from 'lucide-react';

interface PortalNavbarProps {
  onOpenLookupModal: () => void;
  onOpenAuthModal: () => void;
  onNavigateSection: (sectionId: string) => void;
  activeSection?: string;
  currentUser?: User | null;
  onLogout?: () => void;
  onGoToAdmin?: () => void;
  onGoToSuperAdmin?: () => void;
}

export function PortalNavbar({
  onOpenLookupModal,
  onOpenAuthModal,
  onNavigateSection,
  activeSection = 'hero',
  currentUser,
  onLogout,
  onGoToAdmin,
  onGoToSuperAdmin,
}: PortalNavbarProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { id: 'directorio', label: 'Explorar Negocios', icon: Building2 },
    { id: 'b2b-ventajas', label: 'Para Profesionales', icon: Sparkles },
    { id: 'precios', label: 'Planes & Precios', icon: Tag },
    { id: 'blog', label: 'Blog & Consejos', icon: BookOpen },
    { id: 'faq', label: 'Preguntas Frecuentes', icon: HelpCircle },
  ];

  const handleNavClick = (id: string) => {
    setMobileMenuOpen(false);
    onNavigateSection(id);
  };

  const getRoleBadge = () => {
    if (!currentUser) return null;
    if (currentUser.role === 'superadmin') {
      return { label: 'SuperAdmin', color: 'bg-amber-950 text-amber-300 border-amber-500/40' };
    }
    if (currentUser.role === 'business_owner') {
      return { label: 'Dueño', color: 'bg-teal-950 text-teal-300 border-teal-500/40' };
    }
    if (currentUser.role === 'staff') {
      return { label: 'Doctor / Staff', color: 'bg-sky-950 text-sky-300 border-sky-500/40' };
    }
    return { label: 'Paciente', color: 'bg-emerald-950 text-emerald-300 border-emerald-500/40' };
  };

  const roleInfo = getRoleBadge();

  return (
    <header
      id="portal-navbar"
      className={`sticky top-0 z-40 w-full transition-all duration-300 ${
        isScrolled
          ? 'bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 shadow-lg py-2.5'
          : 'bg-slate-950/80 backdrop-blur-sm border-b border-slate-850 py-3.5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Brand Logo */}
        <button
          id="btn-brand-logo"
          onClick={() => handleNavClick('hero')}
          className="flex items-center gap-2.5 group text-left focus:outline-none"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 p-0.5 shadow-lg shadow-teal-500/20 group-hover:scale-105 transition-transform">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Calendar className="w-5 h-5 text-teal-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-lg text-white tracking-tight leading-none">
                Turnos<span className="text-teal-400">Disponibles</span>
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-teal-950/80 text-teal-300 border border-teal-500/30">
                .online
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              Directorio & Reservas Inteligentes
            </p>
          </div>
        </button>

        {/* Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              id={`nav-item-${item.id}`}
              onClick={() => handleNavClick(item.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeSection === item.id
                  ? 'text-teal-400 bg-teal-950/60 border border-teal-800/40 shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Action Buttons */}
        <div className="hidden sm:flex items-center gap-2.5">
          {currentUser ? (
            <div className="flex items-center gap-2">
              {/* User Profile Pill */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-850 border border-slate-750 text-xs">
                <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-semibold text-slate-200 max-w-[130px] truncate">{currentUser.name}</span>
                {roleInfo && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${roleInfo.color}`}>
                    {roleInfo.label}
                  </span>
                )}
              </div>

              {/* Patient: "Mis Turnos" button */}
              {currentUser.role === 'customer' && (
                <button
                  type="button"
                  onClick={onOpenLookupModal}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-teal-300 bg-teal-950/60 hover:bg-teal-900/80 border border-teal-700/50 flex items-center gap-1.5 transition-all shadow-xs"
                >
                  <Calendar className="w-3.5 h-3.5 text-teal-400" />
                  <span>Mis Turnos</span>
                </button>
              )}

              {/* Business Owner or Staff: "Mi Panel de Gestión" */}
              {(currentUser.role === 'business_owner' || currentUser.role === 'staff') && onGoToAdmin && (
                <button
                  type="button"
                  onClick={onGoToAdmin}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-teal-400 to-emerald-400 hover:from-teal-300 hover:to-emerald-300 shadow-md flex items-center gap-1.5 transition-all hover:scale-[1.02]"
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span>Mi Panel</span>
                </button>
              )}

              {/* Superadmin: "Panel SuperAdmin" */}
              {currentUser.role === 'superadmin' && onGoToSuperAdmin && (
                <button
                  type="button"
                  onClick={onGoToSuperAdmin}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-amber-950 bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-300 hover:to-orange-300 shadow-md flex items-center gap-1.5 transition-all hover:scale-[1.02]"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Panel SuperAdmin</span>
                </button>
              )}

              {/* Logout button */}
              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 border border-slate-700 transition"
                  title="Cerrar sesión"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Consultar mi turno button */}
              <button
                id="btn-nav-lookup-appointment"
                type="button"
                onClick={onOpenLookupModal}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-200 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/80 hover:text-white flex items-center gap-1.5 transition-all shadow-sm"
              >
                <Search className="w-3.5 h-3.5 text-teal-400" />
                <span>Consultar mi Turno</span>
              </button>

              {/* Acceso Profesional CTA */}
              <button
                id="btn-nav-professional-access"
                type="button"
                onClick={onOpenAuthModal}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-teal-400 to-emerald-400 hover:from-teal-300 hover:to-emerald-300 shadow-md shadow-teal-500/20 flex items-center gap-1.5 transition-all hover:scale-[1.02]"
              >
                <LogIn className="w-3.5 h-3.5 text-slate-950" />
                <span>Ingresar / Registro</span>
              </button>
            </>
          )}
        </div>

        {/* Mobile menu hamburger */}
        <div className="flex items-center gap-2 sm:hidden">
          <button
            id="btn-mobile-lookup"
            type="button"
            onClick={onOpenLookupModal}
            className="p-2 rounded-lg bg-slate-800 text-teal-400 border border-slate-700"
            title="Consultar mi turno"
          >
            <Search className="w-4 h-4" />
          </button>

          <button
            id="btn-toggle-mobile-menu"
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-800 bg-slate-950/95 backdrop-blur-xl px-4 pt-3 pb-6 space-y-3 animate-in slide-in-from-top-4 duration-200">
          <div className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  id={`mobile-nav-${item.id}`}
                  onClick={() => handleNavClick(item.id)}
                  className="w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-semibold text-slate-200 hover:text-teal-400 hover:bg-slate-900 flex items-center gap-3 transition-colors"
                >
                  <Icon className="w-4 h-4 text-teal-400" />
                  {item.label}
                </button>
              );
            })}
          </div>

          <div className="pt-3 border-t border-slate-800/80 space-y-2">
            {currentUser ? (
              <div className="space-y-2">
                <div className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-200">{currentUser.name}</span>
                  {roleInfo && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${roleInfo.color}`}>
                      {roleInfo.label}
                    </span>
                  )}
                </div>

                {currentUser.role === 'customer' && (
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onOpenLookupModal();
                    }}
                    className="w-full py-2.5 px-4 bg-teal-950/80 text-teal-300 border border-teal-700/60 rounded-xl text-xs font-bold flex items-center justify-center gap-2"
                  >
                    <Calendar className="w-4 h-4 text-teal-400" />
                    Mis Turnos
                  </button>
                )}

                {(currentUser.role === 'business_owner' || currentUser.role === 'staff') && onGoToAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onGoToAdmin();
                    }}
                    className="w-full py-2.5 px-4 bg-gradient-to-r from-teal-400 to-emerald-400 text-slate-950 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg"
                  >
                    <LayoutDashboard className="w-4 h-4 text-slate-950" />
                    Ir a mi Panel de Gestión
                  </button>
                )}

                {currentUser.role === 'superadmin' && onGoToSuperAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onGoToSuperAdmin();
                    }}
                    className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-400 to-orange-400 text-amber-950 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    Ir a Panel SuperAdmin
                  </button>
                )}

                {onLogout && (
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onLogout();
                    }}
                    className="w-full py-2.5 px-4 bg-rose-950/40 text-rose-300 border border-rose-800/40 rounded-xl text-xs font-bold flex items-center justify-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    Cerrar Sesión
                  </button>
                )}
              </div>
            ) : (
              <>
                <button
                  id="btn-mobile-lookup-full"
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenLookupModal();
                  }}
                  className="w-full py-2.5 px-4 bg-slate-800 text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border border-slate-700"
                >
                  <Search className="w-4 h-4 text-teal-400" />
                  Consultar mi Turno por Código
                </button>

                <button
                  id="btn-mobile-auth-full"
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenAuthModal();
                  }}
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-teal-400 to-emerald-400 text-slate-950 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg"
                >
                  <LogIn className="w-4 h-4 text-slate-950" />
                  Ingresar / Registrarse
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
