import React from 'react';
import { Business } from '../types';
import { SearchX, ArrowRight, Building2, LogIn, ExternalLink, HelpCircle } from 'lucide-react';

interface NotFoundBusinessViewProps {
  searchedSlug: string;
  availableBusinesses: Business[];
  onSelectBusiness: (business: Business) => void;
  onGoToLogin: () => void;
}

export function NotFoundBusinessView({
  searchedSlug,
  availableBusinesses,
  onSelectBusiness,
  onGoToLogin,
}: NotFoundBusinessViewProps) {
  return (
    <main id="not-found-business-view" className="min-h-screen bg-slate-50 flex flex-col justify-between py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl mx-auto w-full">
        {/* Top Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-white shadow-xs border border-slate-200/80 mb-4">
            <span className="w-7 h-7 rounded-xl bg-teal-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
              TD
            </span>
            <span className="font-extrabold tracking-tight text-slate-900 text-base">
              TurnosDisponibles <span className="text-xs text-teal-600 font-semibold">.online</span>
            </span>
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200/90 overflow-hidden">
          <div className="p-8 sm:p-10 text-center">
            {/* Illustration / Icon */}
            <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-600 mx-auto flex items-center justify-center mb-6 shadow-xs">
              <SearchX className="w-8 h-8" />
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-3">
              Negocio no encontrado
            </h1>

            <p className="text-slate-600 text-sm sm:text-base leading-relaxed mb-6">
              No existe ningún centro médico o negocio registrado con el identificador{' '}
              <span className="inline-block px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-900 font-mono font-semibold text-xs border border-slate-200">
                {searchedSlug || 'desconocido'}
              </span>
            </p>

            <div className="bg-slate-50 rounded-2xl p-4 text-left border border-slate-200/80 mb-8 space-y-2">
              <div className="flex items-start gap-2.5 text-xs text-slate-600">
                <HelpCircle className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                <span>Verifica que el enlace que te compartieron o pegaste en el navegador esté completo.</span>
              </div>
              <div className="flex items-start gap-2.5 text-xs text-slate-600">
                <Building2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                <span>Si eres el titular o profesional de este centro, inicia sesión para revisar el slug de tu cuenta.</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
              {availableBusinesses.length > 0 && (
                <button
                  type="button"
                  id="btn-goto-default-biz"
                  onClick={() => onSelectBusiness(availableBusinesses[0])}
                  className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold shadow-md shadow-teal-600/20 transition cursor-pointer"
                >
                  <span>Ver {availableBusinesses[0].name}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}

              <button
                type="button"
                id="btn-goto-login-notfound"
                onClick={onGoToLogin}
                className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-semibold border border-slate-200 transition cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>Ingresar a mi cuenta</span>
              </button>
            </div>

            {/* Available Businesses Directory list */}
            {availableBusinesses.length > 1 && (
              <div className="border-t border-slate-100 pt-6 text-left">
                <h2 className="text-xs uppercase font-bold text-slate-400 tracking-wider mb-3">
                  Otros centros disponibles en la plataforma:
                </h2>
                <div className="space-y-2">
                  {availableBusinesses.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => onSelectBusiness(b)}
                      className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-teal-50/70 border border-slate-200/70 hover:border-teal-300 transition text-left group cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs shrink-0"
                          style={{ backgroundColor: b.primaryColor || '#0d9488' }}
                        >
                          {b.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800 group-hover:text-teal-900">
                            {b.name}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {b.category || b.businessType}
                          </p>
                        </div>
                      </div>
                      <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-teal-600 transition shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center text-xs text-slate-400 mt-8">
        TurnosDisponibles.online • Sistema multi-tenant de reservas online
      </footer>
    </main>
  );
}
