import { useState, useEffect } from 'react';
import { Business, Service, Professional, User } from '../../types';
import { api } from '../../services/api';
import { BlogArticle } from '../../data/blogArticles';
import { PortalNavbar } from './PortalNavbar';
import { PortalHero } from './PortalHero';
import { PortalDirectory } from './PortalDirectory';
import { PortalB2BValue } from './PortalB2BValue';
import { PortalPricing } from './PortalPricing';
import { PortalBlog } from './PortalBlog';
import { PortalFaq } from './PortalFaq';
import { PortalFooter } from './PortalFooter';
import { BookingLookupModal } from './BookingLookupModal';
import { BlogArticleModal } from './BlogArticleModal';

interface LandingPortalPageProps {
  onSelectBooking: (slug: string) => void;
  onOpenAuthModal: () => void;
  currentUser?: User | null;
  onLogout?: () => void;
  onGoToAdmin?: () => void;
  onGoToSuperAdmin?: () => void;
}

export function LandingPortalPage({
  onSelectBooking,
  onOpenAuthModal,
  currentUser,
  onLogout,
  onGoToAdmin,
  onGoToSuperAdmin,
}: LandingPortalPageProps) {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [servicesMap, setServicesMap] = useState<Record<string, Service[]>>({});
  const [professionalsMap, setProfessionalsMap] = useState<Record<string, Professional[]>>({});
  const [loading, setLoading] = useState(true);

  // Search & Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedLocation, setSelectedLocation] = useState(() => {
    try {
      const stored = localStorage.getItem('td_platform_default_location');
      return stored && stored.trim() ? stored : 'all';
    } catch {
      return 'all';
    }
  });
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [activeSection, setActiveSection] = useState('hero');

  // Modals state
  const [isLookupOpen, setIsLookupOpen] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<BlogArticle | null>(null);

  // Load directory data
  useEffect(() => {
    let isMounted = true;

    async function loadDirectoryData() {
      try {
        setLoading(true);
        const bizList = await api.getBusinesses();
        if (!isMounted) return;
        setBusinesses(bizList);

        // Fetch services & professionals for all businesses
        const sMap: Record<string, Service[]> = {};
        const pMap: Record<string, Professional[]> = {};

        await Promise.all(
          bizList.map(async (b) => {
            const [services, profs] = await Promise.all([
              api.getServices(b.id),
              api.getProfessionals(b.id),
            ]);
            sMap[b.id] = services;
            pMap[b.id] = profs;
          })
        );

        if (isMounted) {
          setServicesMap(sMap);
          setProfessionalsMap(pMap);
        }
      } catch (err) {
        console.error('Error loading directory businesses:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadDirectoryData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Smooth scroll to section
  const handleNavigateSection = (sectionId: string) => {
    setActiveSection(sectionId);
    if (sectionId === 'hero') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const elem = document.getElementById(sectionId);
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleExecuteSearch = () => {
    handleNavigateSection('directorio');
  };

  return (
    <div id="landing-portal-page" className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-teal-500 selection:text-slate-950 font-sans">
      {/* 1. Upper Navbar */}
      <PortalNavbar
        onOpenLookupModal={() => setIsLookupOpen(true)}
        onOpenAuthModal={onOpenAuthModal}
        onNavigateSection={handleNavigateSection}
        activeSection={activeSection}
        currentUser={currentUser}
        onLogout={onLogout}
        onGoToAdmin={onGoToAdmin}
        onGoToSuperAdmin={onGoToSuperAdmin}
      />

      {/* Main Content Sections */}
      <main className="flex-1">
        {/* 2. Hero Section (Doble Impacto) */}
        <PortalHero
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          selectedLocation={selectedLocation}
          onLocationChange={setSelectedLocation}
          onExecuteSearch={handleExecuteSearch}
          onOpenAuthModal={onOpenAuthModal}
          businesses={businesses}
          onSetUserCoords={setUserCoords}
        />

        {/* 3. Directorio de Negocios y Categorías */}
        <PortalDirectory
          businesses={businesses}
          servicesMap={servicesMap}
          professionalsMap={professionalsMap}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          selectedLocation={selectedLocation}
          onLocationChange={setSelectedLocation}
          onSelectBooking={onSelectBooking}
          userCoords={userCoords}
          onSetUserCoords={setUserCoords}
        />

        {/* 4. Propuesta de Valor B2B */}
        <PortalB2BValue
          onOpenPricing={() => handleNavigateSection('precios')}
          onOpenAuthModal={onOpenAuthModal}
        />

        {/* 5. Tabla de Planes y Precios */}
        <PortalPricing onOpenAuthModal={onOpenAuthModal} />

        {/* 6. Blog & Consejos de Gestión */}
        <PortalBlog onSelectArticle={(art) => setSelectedArticle(art)} />

        {/* 7. Preguntas Frecuentes (FAQ) */}
        <PortalFaq />
      </main>

      {/* 8. Footer */}
      <PortalFooter
        onNavigateSection={handleNavigateSection}
        onOpenAuthModal={onOpenAuthModal}
        onOpenLookupModal={() => setIsLookupOpen(true)}
      />

      {/* Modals */}
      <BookingLookupModal
        isOpen={isLookupOpen}
        onClose={() => setIsLookupOpen(false)}
        currentUser={currentUser}
        onGoToBooking={(slug) => {
          setIsLookupOpen(false);
          onSelectBooking(slug);
        }}
      />

      <BlogArticleModal
        article={selectedArticle}
        onClose={() => setSelectedArticle(null)}
        onOpenPricing={() => {
          setSelectedArticle(null);
          handleNavigateSection('precios');
        }}
      />
    </div>
  );
}
