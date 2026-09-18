import { Calendar, MessageCircle, Mail, Phone, ShieldCheck, Heart, ArrowUp } from 'lucide-react';

interface PortalFooterProps {
  onNavigateSection: (sectionId: string) => void;
  onOpenAuthModal: () => void;
  onOpenLookupModal: () => void;
}

export function PortalFooter({
  onNavigateSection,
  onOpenAuthModal,
  onOpenLookupModal,
}: PortalFooterProps) {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer id="portal-footer" className="bg-slate-950 text-slate-400 border-t border-slate-800/80 pt-16 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-slate-850">
          {/* Col 1: Brand info */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 p-0.5 shadow-lg shadow-teal-500/20">
                <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-teal-400" />
                </div>
              </div>
              <div>
                <span className="font-extrabold text-lg text-white tracking-tight">
                  Turnos<span className="text-teal-400">Disponibles</span>
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 ml-1.5 rounded-full bg-teal-950 text-teal-300 border border-teal-500/30">
                  .online
                </span>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-sm">
              Plataforma y directorio digital de gestión de turnos para centros de estética, consultorios médicos, odontología y bienestar en Argentina. Reservas 24/7 con confirmación por WhatsApp y cobro de señas automáticas.
            </p>

            <div className="pt-2 flex items-center gap-3 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-4 h-4 text-teal-400" /> Conexión Segura SSL
              </span>
              <span>•</span>
              <span>Servidores en la Nube</span>
            </div>
          </div>

          {/* Col 2: Para Pacientes */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Para Clientes</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  onClick={() => onNavigateSection('directorio')}
                  className="hover:text-teal-300 transition-colors"
                >
                  Explorar Negocios
                </button>
              </li>
              <li>
                <button
                  onClick={onOpenLookupModal}
                  className="hover:text-teal-300 transition-colors flex items-center gap-1 font-semibold text-teal-400"
                >
                  Consultar mi Turno
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigateSection('faq')}
                  className="hover:text-teal-300 transition-colors"
                >
                  Preguntas Frecuentes
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigateSection('directorio')}
                  className="hover:text-teal-300 transition-colors"
                >
                  Estética & Spa
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigateSection('directorio')}
                  className="hover:text-teal-300 transition-colors"
                >
                  Consultorios Médicos
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: Para Negocios */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Para Negocios</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  onClick={() => onNavigateSection('b2b-ventajas')}
                  className="hover:text-teal-300 transition-colors"
                >
                  Ventajas & Ahorro
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigateSection('precios')}
                  className="hover:text-teal-300 transition-colors"
                >
                  Planes & Precios
                </button>
              </li>
              <li>
                <button
                  onClick={onOpenAuthModal}
                  className="hover:text-teal-300 transition-colors font-bold text-emerald-400"
                >
                  Ingresar a mi Panel
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigateSection('blog')}
                  className="hover:text-teal-300 transition-colors"
                >
                  Blog de Gestión & Señas
                </button>
              </li>
              <li>
                <a
                  href="https://wa.me/5492474478646?text=Hola,%20quiero%20solicitar%20una%20demo%20de%20TurnosDisponibles"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-teal-300 transition-colors"
                >
                  Solicitar Demo Guiada
                </a>
              </li>
            </ul>
          </div>

          {/* Col 4: Contacto directo */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Contacto & Soporte</h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <a
                  href="https://wa.me/5492474478646?text=Hola,%20necesito%20asistencia%20de%20TurnosDisponibles"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-emerald-400 hover:text-emerald-300 transition-colors font-semibold"
                >
                  <MessageCircle className="w-4 h-4 flex-shrink-0" />
                  <span>+54 9 2474 47-8646</span>
                </a>
              </li>
              <li className="flex items-center gap-2 text-slate-400">
                <Mail className="w-4 h-4 flex-shrink-0 text-slate-500" />
                <span>contacto@turnosdisponibles.online</span>
              </li>
              <li className="text-[11px] text-slate-500 pt-1">
                Atención comercial y soporte técnico de Lunes a Sábados de 09:00 a 20:00 hs.
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} TurnosDisponibles.online. Todos los derechos reservados.</p>

          <div className="flex items-center gap-4 text-xs">
            <span className="hover:text-slate-400 cursor-pointer">Términos del Servicio</span>
            <span>•</span>
            <span className="hover:text-slate-400 cursor-pointer">Política de Privacidad</span>
            <span>•</span>
            <button
              onClick={scrollToTop}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-teal-400 border border-slate-800 transition-colors ml-2"
              title="Volver arriba"
            >
              <ArrowUp className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
