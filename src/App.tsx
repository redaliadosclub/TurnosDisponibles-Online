import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './lib/firebase';
import { Business, User } from './types';
import { api, INITIAL_BUSINESSES } from './services/api';
import { PublicBookingPage } from './components/PublicBookingPage';
import { BusinessDashboard } from './components/BusinessDashboard';
import { SuperAdminDashboard } from './components/SuperAdminDashboard';
import { StaffWorkspace } from './components/StaffWorkspace';
import { AuthModal } from './components/AuthModal';
import { NotFoundBusinessView } from './components/NotFoundBusinessView';
import { LandingPortalPage } from './components/portal/LandingPortalPage';
import {
  Building2,
  Shield,
  LogIn,
  LogOut,
  Globe,
  LayoutDashboard,
  Calendar,
  X,
  Stethoscope,
} from 'lucide-react';

export default function App() {
  // Helper to find a business by slug/id in an array
  const findBusinessBySlug = (list: Business[], slug: string): Business | undefined => {
    if (!slug) return undefined;
    const clean = slug.toLowerCase().trim();
    return list.find(
      (b) =>
        b.slug.toLowerCase() === clean ||
        b.id.toLowerCase() === clean ||
        b.slug.toLowerCase().replace(/[-_]/g, '') === clean.replace(/[-_]/g, '') ||
        b.slug.toLowerCase().includes(clean) ||
        clean.includes(b.slug.toLowerCase())
    );
  };

  // Helper to extract requested slug from URL
  const getRequestedSlug = () => {
    // 1. Check query parameters (?b=... or ?slug=... or ?business=... or ?negocio=...)
    const searchParams = new URLSearchParams(window.location.search);
    const querySlug =
      searchParams.get('b') ||
      searchParams.get('slug') ||
      searchParams.get('business') ||
      searchParams.get('negocio') ||
      searchParams.get('biz');
    if (querySlug) return decodeURIComponent(querySlug).toLowerCase().trim();

    // 2. Normalize and check hash
    let hash = window.location.hash || '';
    hash = hash.replace(/^[#/!]+/, '').trim();

    // Portal section hashes or home aliases should remain on portal
    const portalSections = ['portal', 'home', 'inicio', 'directorio', 'b2b-ventajas', 'precios', 'blog', 'faq'];
    if (portalSections.includes(hash)) {
      return '';
    }

    if (hash.startsWith('booking-')) hash = hash.replace(/^booking-/, '');
    if (hash.startsWith('book/')) hash = hash.replace(/^book\//, '');
    if (hash.startsWith('b/')) hash = hash.replace(/^b\//, '');
    hash = hash.replace(/[#/]+$/, '');
    if (hash && hash !== 'public' && hash !== 'booking' && hash !== 'portal') {
      return decodeURIComponent(hash).toLowerCase();
    }

    // 3. Check pathname (/book/slug, /booking-slug, or /slug)
    let path = window.location.pathname.replace(/^\/+/, '').trim();
    if (path.startsWith('book/')) path = path.replace(/^book\//, '');
    if (path.startsWith('booking-')) path = path.replace(/^booking-/, '');
    if (path.startsWith('b/')) path = path.replace(/^b\//, '');
    path = path.replace(/[#/]+$/, '');
    if (path && path !== 'index.html' && path !== 'public' && path !== 'booking' && path !== 'portal') {
      return decodeURIComponent(path).toLowerCase();
    }

    return '';
  };

  // Helper to extract staff portal invitation parameters (?clinic=...&code=... or #staff)
  const getStaffParamsFromUrl = () => {
    try {
      const fullUrl = window.location.href;
      const hash = window.location.hash || '';
      const isStaffRoute =
        hash.includes('staff') ||
        hash.includes('portal-medico') ||
        hash.includes('consultorio') ||
        fullUrl.includes('staff=true');
      if (!isStaffRoute) return null;

      let clinic = '';
      let code = '';

      if (hash.includes('?')) {
        const hashQuery = hash.split('?')[1];
        const hashParams = new URLSearchParams(hashQuery);
        clinic = hashParams.get('clinic') || hashParams.get('negocio') || hashParams.get('b') || '';
        code = hashParams.get('code') || hashParams.get('clave') || '';
      }

      if (!clinic || !code) {
        const urlObj = new URL(fullUrl);
        if (!clinic) clinic = urlObj.searchParams.get('clinic') || urlObj.searchParams.get('negocio') || urlObj.searchParams.get('b') || '';
        if (!code) code = urlObj.searchParams.get('code') || urlObj.searchParams.get('clave') || '';
      }

      return { clinic: clinic.trim(), code: code.trim() };
    } catch {
      return null;
    }
  };

  const LEGACY_DEMO_IDS = new Set(['biz_turnosmed_demo', 'biz_estetica_bella', 'turnosmed-demo', 'estetica-bella']);

  const getCleanSavedBusinesses = (): Business[] => {
    try {
      const raw = localStorage.getItem('td_data_businesses');
      if (raw) {
        const saved: Business[] = JSON.parse(raw);
        const filtered = saved.filter(
          (b) => !LEGACY_DEMO_IDS.has(b.id) && !LEGACY_DEMO_IDS.has(b.slug)
        );
        if (filtered.length !== saved.length) {
          localStorage.setItem('td_data_businesses', JSON.stringify(filtered));
        }
        const map = new Map<string, Business>();
        INITIAL_BUSINESSES.forEach((b) => map.set(b.id, b));
        filtered.forEach((b) => map.set(b.id, b));
        return Array.from(map.values());
      }
    } catch {}
    return INITIAL_BUSINESSES;
  };

  // Synchronous resolution of initial view and business
  const initialSlug = getRequestedSlug();
  const initialStaffParams = getStaffParamsFromUrl();
  const initialBizs = getCleanSavedBusinesses();
  const matchedInitialBiz = initialStaffParams?.clinic
    ? findBusinessBySlug(initialBizs, initialStaffParams.clinic)
    : initialSlug
    ? findBusinessBySlug(initialBizs, initialSlug)
    : undefined;

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [businesses, setBusinesses] = useState<Business[]>(initialBizs);
  const [currentBusiness, setCurrentBusiness] = useState<Business>(
    matchedInitialBiz || initialBizs[0] || INITIAL_BUSINESSES[0]
  );
  const [notFoundSlug, setNotFoundSlug] = useState<string | null>(
    initialSlug && !matchedInitialBiz && !initialStaffParams ? initialSlug : null
  );
  const [staffInitialCode, setStaffInitialCode] = useState<string>(initialStaffParams?.code || '');
  const [activeView, setActiveView] = useState<'portal' | 'public' | 'business' | 'superadmin' | 'staff'>(() => {
    if (initialStaffParams) return 'staff';
    if (initialSlug) return 'public';
    return 'portal';
  });
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // Demo bar switch: only accessible when authenticated as superadmin
  const [showDemoBar, setShowDemoBar] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('td_demo_bar_visible');
      return saved === 'true';
    } catch {
      return false;
    }
  });

  const isSuperAdmin = Boolean(currentUser && currentUser.role === 'superadmin');

  const toggleDemoBar = () => {
    if (!isSuperAdmin) return;
    setShowDemoBar((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('td_demo_bar_visible', String(next));
      } catch {}
      return next;
    });
  };

  // Auto-clean malformed double hashes in browser URL bar if present
  useEffect(() => {
    if (window.location.hash.startsWith('##') || window.location.hash.includes('/#')) {
      const cleanHash = window.location.hash.replace(/^[#/]+/, '');
      try {
        window.history.replaceState(null, '', `/#${cleanHash}`);
      } catch {}
    }
  }, []);

  // Guard: if somehow on superadmin view without proper role, kick back to portal
  useEffect(() => {
    if (activeView === 'superadmin' && currentUser?.role !== 'superadmin') {
      setActiveView('portal');
    }
  }, [activeView, currentUser]);

  // Initial load: get user session and businesses
  const initialize = async () => {
    try {
      setLoading(true);
      const [user, bizList] = await Promise.all([
        api.getCurrentUser(),
        api.getAllBusinesses(),
      ]);
      setCurrentUser(user);
      const currentList = bizList && bizList.length > 0 ? bizList : businesses;
      if (bizList && bizList.length > 0) {
        setBusinesses(bizList);
      }

      const targetSlug = getRequestedSlug();
      const allAvailable = [
        ...currentList,
        ...INITIAL_BUSINESSES,
      ];

      if (targetSlug) {
        const matchedBiz = findBusinessBySlug(allAvailable, targetSlug);
        if (matchedBiz) {
          setCurrentBusiness(matchedBiz);
          setNotFoundSlug(null);
          setActiveView('public');
        } else {
          setNotFoundSlug(targetSlug);
          setActiveView('public');
        }
      } else {
        setNotFoundSlug(null);
        if (user && user.businessId) {
          const userBiz = currentList.find((b) => b.id === user.businessId) || (await api.getBusinessById(user.businessId).catch(() => null));
          if (userBiz) setCurrentBusiness(userBiz);
        }
      }
    } catch (err) {
      console.error('Initialization error', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initialize();
  }, []);

  // Firebase Auth listener (onAuthStateChanged) for session persistence & validity verification
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser && firebaseUser.email) {
          // Firebase Auth user is authenticated - verify validity and update currentUser state
          const verifiedUser = await api.getUserByEmail(firebaseUser.email);
          if (verifiedUser) {
            setCurrentUser(verifiedUser);
            if (verifiedUser.role === 'superadmin') {
              setShowDemoBar(true);
            } else if (verifiedUser.role === 'staff' && activeView !== 'public') {
              setActiveView('staff');
            }
          } else {
            const validSession = await api.verifyUserSession();
            setCurrentUser(validSession);
            if (validSession?.role === 'staff' && activeView !== 'public') {
              setActiveView('staff');
            }
          }
        } else {
          // If no active Firebase Auth session, verify whether existing local session is still valid
          // instead of relying solely on unverified local variables
          const verifiedUser = await api.verifyUserSession();
          if (!verifiedUser) {
            setCurrentUser(null);
          } else {
            setCurrentUser(verifiedUser);
            if (verifiedUser.role === 'staff' && activeView !== 'public') {
              setActiveView('staff');
            }
          }
        }
      } catch (err) {
        console.warn('Firebase Auth session persistence check error:', err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Listen to hash changes in real-time
  useEffect(() => {
    const handleHashChange = () => {
      const staffParams = getStaffParamsFromUrl();
      if (staffParams) {
        if (staffParams.clinic) {
          const match = findBusinessBySlug([...businesses, ...INITIAL_BUSINESSES], staffParams.clinic);
          if (match) setCurrentBusiness(match);
        }
        if (staffParams.code) {
          setStaffInitialCode(staffParams.code);
        }
        setActiveView('staff');
        return;
      }

      const targetSlug = getRequestedSlug();
      const allAvailable = [
        ...businesses,
        ...INITIAL_BUSINESSES,
      ];

      if (targetSlug) {
        const found = findBusinessBySlug(allAvailable, targetSlug);
        if (found) {
          setCurrentBusiness(found);
          setNotFoundSlug(null);
          setActiveView('public');
        } else {
          setNotFoundSlug(targetSlug);
          setActiveView('public');
        }
      } else {
        setNotFoundSlug(null);
        // If hash is cleared or section hash on portal, keep portal view
        if (activeView === 'public' && !targetSlug) {
          setActiveView('portal');
        }
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [businesses, activeView]);

  const handleLogout = async () => {
    try {
      localStorage.removeItem('td_superadmin_autologged');
    } catch {}
    await api.logout();
    setCurrentUser(null);
    setActiveView('portal');
  };

  const handleLoginSuccess = async (user: User) => {
    setCurrentUser(user);
    if (user.role === 'superadmin') {
      setActiveView('superadmin');
      setShowDemoBar(true);
    } else if (user.role === 'staff') {
      if (user.businessId) {
        try {
          const directBiz = await api.getBusinessById(user.businessId).catch(() => null);
          const freshList = await api.getBusinesses();
          setBusinesses(freshList);
          const match = directBiz || freshList.find((b) => b.id === user.businessId || b.slug === user.businessId);
          if (match) {
            setCurrentBusiness(match);
          }
        } catch {}
      }
      setActiveView('staff');
    } else if (user.businessId) {
      try {
        const directBiz = await api.getBusinessById(user.businessId).catch(() => null);
        const freshList = await api.getBusinesses();
        setBusinesses(freshList);
        const match = directBiz || freshList.find((b) => b.id === user.businessId || b.slug === user.businessId);
        if (match) {
          setCurrentBusiness(match);
        }
      } catch {}
      setActiveView('business');
    } else {
      if (activeView !== 'public') {
        setActiveView('portal');
      }
    }
  };

  const activeBusiness = currentBusiness || businesses[0] || INITIAL_BUSINESSES[0];

  // The top bar is displayed ONLY if user is logged in (SuperAdmin or Business Owner)
  // When in Staff view, it is hidden so doctors have an ultra-clean, dedicated medical workspace
  const shouldRenderTopBar = currentUser !== null && activeView !== 'staff' && (activeView !== 'portal' || showDemoBar);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col relative">
      {/* Top Demo & Multi-Tenant Control Bar */}
      {shouldRenderTopBar && (
        <nav className="bg-slate-950 text-white border-b border-slate-800 text-xs py-2 px-4 sticky top-0 z-50 shadow-md">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
            {/* Brand & View Switcher */}
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => {
                  try {
                    window.location.hash = '';
                  } catch {}
                  setActiveView('portal');
                }}
                className="flex items-center gap-2 hover:opacity-90 transition text-left"
              >
                <span className="w-6 h-6 rounded-lg bg-teal-500 text-slate-950 flex items-center justify-center font-extrabold text-xs">
                  TD
                </span>
                <span className="font-extrabold tracking-tight text-white text-sm">
                  TurnosDisponibles <span className="text-[10px] text-teal-400 font-medium">.online</span>
                </span>
              </button>

              {/* View Selector Tabs */}
              <div className="flex items-center bg-slate-900 rounded-xl p-1 border border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    try {
                      window.location.hash = '';
                    } catch {}
                    setActiveView('portal');
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-semibold transition cursor-pointer ${
                    activeView === 'portal'
                      ? 'bg-teal-500 text-slate-950 shadow-xs'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Portal Principal</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveView('public')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-semibold transition cursor-pointer ${
                    activeView === 'public'
                      ? 'bg-teal-500 text-slate-950 shadow-xs'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Reserva Clínica</span>
                </button>

                {/* Panel Negocio */}
                <button
                  type="button"
                  onClick={() => {
                    if (!currentUser) {
                      setShowAuthModal(true);
                    } else {
                      setActiveView('business');
                    }
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-semibold transition cursor-pointer ${
                    activeView === 'business'
                      ? 'bg-teal-500 text-slate-950 shadow-xs'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span>Panel Negocio</span>
                </button>

                {/* Portal Médico / Staff Workspace */}
                <button
                  type="button"
                  onClick={() => setActiveView('staff')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-semibold transition cursor-pointer ${
                    activeView === 'staff'
                      ? 'bg-teal-500 text-slate-950 shadow-xs'
                      : 'text-teal-400 hover:text-teal-200'
                  }`}
                >
                  <Stethoscope className="w-3.5 h-3.5" />
                  <span>Portal Médico</span>
                </button>

                {/* SuperAdmin Tab */}
                {currentUser?.role === 'superadmin' && (
                  <button
                    type="button"
                    onClick={() => setActiveView('superadmin')}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-semibold transition cursor-pointer ${
                      activeView === 'superadmin'
                        ? 'bg-amber-400 text-slate-950 shadow-xs'
                        : 'text-amber-300 hover:text-white'
                    }`}
                  >
                    <Shield className="w-3.5 h-3.5" />
                    <span>SuperAdmin Master</span>
                  </button>
                )}
              </div>
            </div>

            {/* Tenant Selector & Auth / Profile */}
            <div className="flex items-center gap-3">
              {/* Tenant selector: ONLY superadmin can switch businesses */}
              {currentUser?.role === 'superadmin' ? (
                <div className="flex items-center gap-1.5 bg-slate-900 px-2.5 py-1 rounded-xl border border-slate-800">
                  <Building2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">Tenant:</span>
                  <select
                    value={currentBusiness.id}
                    onChange={(e) => {
                      const found = businesses.find((b) => b.id === e.target.value);
                      if (found) setCurrentBusiness(found);
                    }}
                    className="bg-transparent text-white font-semibold text-xs border-none focus:outline-none cursor-pointer"
                  >
                    {businesses.map((b) => (
                      <option key={b.id} value={b.id} className="bg-slate-900 text-white">
                        {b.name} ({b.businessType})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 bg-slate-900 px-2.5 py-1 rounded-xl border border-slate-800 text-slate-300 font-medium text-xs">
                  <Building2 className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                  <span className="truncate max-w-[150px]">{currentBusiness.name}</span>
                </div>
              )}

              {/* Auth Button / Profile */}
              {currentUser ? (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-300 hidden md:inline">
                    {currentUser.name}{' '}
                    <span className={`font-bold ${currentUser.role === 'superadmin' ? 'text-amber-400' : 'text-teal-400'}`}>
                      ({currentUser.role})
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                    title="Cerrar sesión"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowAuthModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold border border-slate-700 transition cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Ingresar</span>
                </button>
              )}

              {/* Quick Hide Button */}
              {activeView !== 'superadmin' && showDemoBar && (
                <button
                  type="button"
                  onClick={() => setShowDemoBar(false)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
                  title="Ocultar barra demo"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </nav>
      )}

      {/* Main View Render */}
      <div className="flex-1">
        {activeView === 'portal' && (
          <LandingPortalPage
            currentUser={currentUser}
            onLogout={handleLogout}
            onGoToAdmin={() => setActiveView('business')}
            onGoToSuperAdmin={() => setActiveView('superadmin')}
            onSelectBooking={(slug) => {
              const allAvailable = [...businesses, ...INITIAL_BUSINESSES];
              const match = findBusinessBySlug(allAvailable, slug);
              if (match) {
                setCurrentBusiness(match);
                setNotFoundSlug(null);
                setActiveView('public');
                try {
                  window.location.hash = `#booking-${match.slug}`;
                } catch {}
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }}
            onOpenAuthModal={() => setShowAuthModal(true)}
          />
        )}

        {activeView === 'public' &&
          (notFoundSlug ? (
            <NotFoundBusinessView
              searchedSlug={notFoundSlug}
              availableBusinesses={businesses.length > 0 ? businesses : INITIAL_BUSINESSES}
              onSelectBusiness={(b) => {
                setCurrentBusiness(b);
                setNotFoundSlug(null);
                try {
                  window.location.hash = `#booking-${b.slug}`;
                } catch {}
              }}
              onGoToLogin={() => setShowAuthModal(true)}
            />
          ) : (
            <PublicBookingPage
              key={activeBusiness.id}
              business={activeBusiness}
              currentUser={currentUser}
              onBackToPortal={() => {
                try {
                  window.location.hash = '';
                } catch {}
                setActiveView('portal');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onGoToAdmin={() => {
                if (!currentUser) {
                  setShowAuthModal(true);
                } else {
                  setActiveView('business');
                }
              }}
            />
          ))}

        {activeView === 'business' && (
          <BusinessDashboard
            business={activeBusiness}
            userRole={currentUser?.role || 'business_owner'}
            currentUser={currentUser}
            onUpdateBusiness={(updated) => {
              setCurrentBusiness(updated);
              setBusinesses((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
            }}
            onViewPublicPage={() => setActiveView('public')}
          />
        )}

        {activeView === 'staff' && (
          <StaffWorkspace
            business={activeBusiness}
            currentUser={currentUser}
            initialCode={staffInitialCode}
            onLogout={handleLogout}
            onSwitchToOwner={
              currentUser?.role === 'business_owner' || currentUser?.role === 'superadmin'
                ? () => setActiveView('business')
                : undefined
            }
            onUserUpdate={(updated) => setCurrentUser(updated)}
          />
        )}

        {activeView === 'superadmin' && currentUser?.role === 'superadmin' && (
          <SuperAdminDashboard
            onSelectBusiness={(b) => {
              setCurrentBusiness(b);
              setActiveView('business');
            }}
            onViewBusinessPublic={(b) => {
              setCurrentBusiness(b);
              setActiveView('public');
            }}
          />
        )}
      </div>

      {/* Floating Demo Switcher Button: Strictly rendered ONLY when authenticated as superadmin */}
      {isSuperAdmin && (
        <div className="fixed bottom-4 right-4 z-50">
          <button
            type="button"
            onClick={toggleDemoBar}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/90 hover:bg-slate-900 text-white text-xs font-medium shadow-xl border border-slate-700/80 backdrop-blur-sm transition-all cursor-pointer hover:scale-105"
            title="Conmutar barra demo (solo visible para SuperAdmin)"
          >
            <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
            <span className="font-semibold">Modo Demo</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-800 text-slate-300 font-mono">
              {showDemoBar ? 'Barra Visible' : 'Barra Oculta'}
            </span>
          </button>
        </div>
      )}

      {/* Authentication Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onLoginSuccess={handleLoginSuccess}
        currentBusinessId={currentBusiness.id}
        allowSuperAdminQuickLogin={true}
        currentUser={currentUser}
      />
    </div>
  );
}

