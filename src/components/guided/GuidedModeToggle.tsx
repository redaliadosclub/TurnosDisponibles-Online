import React from 'react';
import { useGuidedMode } from '../../context/GuidedModeContext';
import {
  Compass,
  BookOpen,
  Sparkles,
  Shield,
  Building2,
  Stethoscope,
  Calendar,
} from 'lucide-react';

interface GuidedModeToggleProps {
  compact?: boolean;
}

export function GuidedModeToggle({ compact = false }: GuidedModeToggleProps) {
  const {
    effectiveRole,
    roleConfig,
    isGuidedMode,
    toggleGuidedMode,
    openGuideModal,
  } = useGuidedMode();

  const getRoleIcon = () => {
    switch (effectiveRole) {
      case 'superadmin':
        return <Shield className="w-3.5 h-3.5" />;
      case 'tenant_owner':
        return <Building2 className="w-3.5 h-3.5" />;
      case 'staff':
        return <Stethoscope className="w-3.5 h-3.5" />;
      case 'end_user':
        return <Calendar className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      {/* Dual Mode Switcher: "Modo Guiado" vs "Modo Libre" */}
      <button
        type="button"
        onClick={toggleGuidedMode}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold border transition cursor-pointer ${
          isGuidedMode
            ? 'bg-teal-500/10 text-teal-300 border-teal-500/30 hover:bg-teal-500/20'
            : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-800'
        }`}
        title={
          isGuidedMode
            ? 'Modo Guiado Activo: Haz clic para pasar a Modo Libre'
            : 'Modo Libre Activo: Haz clic para activar el Modo Guiado'
        }
      >
        <Compass
          className={`w-3.5 h-3.5 ${
            isGuidedMode ? 'text-teal-400 animate-spin-slow' : 'text-slate-400'
          }`}
        />
        <span className="hidden md:inline">
          {isGuidedMode ? 'Modo Guiado' : 'Modo Libre'}
        </span>
        <span
          className={`w-2 h-2 rounded-full ${
            isGuidedMode ? 'bg-teal-400 shadow-xs shadow-teal-400/50' : 'bg-slate-600'
          }`}
        />
      </button>

      {/* Manual & Tutorial Button with Role Badge */}
      <button
        type="button"
        onClick={() => openGuideModal(effectiveRole, 'quick')}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border transition cursor-pointer shadow-xs ${roleConfig.theme.badgeBg} ${roleConfig.theme.badgeText} ${roleConfig.theme.badgeBorder} hover:brightness-125`}
        title={`Abrir Manual & Tutorial para ${roleConfig.roleTitle}`}
      >
        <BookOpen className="w-3.5 h-3.5" />
        <span className={compact ? 'hidden lg:inline' : 'hidden sm:inline'}>
          Manual & Tutorial
        </span>
        <span className="text-[10px] opacity-75 hidden xl:inline">
          ({roleConfig.steps.length} pasos)
        </span>
      </button>
    </div>
  );
}
