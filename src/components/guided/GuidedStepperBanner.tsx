import React, { useState } from 'react';
import { useGuidedMode } from '../../context/GuidedModeContext';
import {
  CheckCircle2,
  Circle,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  HelpCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Compass,
  Check,
  RotateCcw,
  BookOpen,
  Info,
  Shield,
  Building2,
  Stethoscope,
  Calendar,
} from 'lucide-react';

export function GuidedStepperBanner() {
  const {
    effectiveRole,
    roleConfig,
    isGuidedMode,
    toggleGuidedMode,
    currentStepIndex,
    setCurrentStepIndex,
    currentStepItem,
    isStepCompleted,
    toggleStepCompletion,
    markStepComplete,
    resetRoleProgress,
    openGuideModal,
    navigateToAction,
    previewRole,
    setPreviewRole,
  } = useGuidedMode();

  const [isCollapsed, setIsCollapsed] = useState(false);

  // If guided mode is turned off, the banner is hidden
  if (!isGuidedMode) {
    return null;
  }

  const steps = roleConfig.steps;
  const totalSteps = steps.length;
  const completedCount = steps.filter((s) => isStepCompleted(s.id)).length;
  const progressPercent = Math.round((completedCount / totalSteps) * 100);
  const isCurrentDone = isStepCompleted(currentStepItem.id);

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

  const handleNextStep = () => {
    if (currentStepIndex < totalSteps - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };

  const handlePrevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const handleActionClick = () => {
    // Navigate directly to the module
    navigateToAction(currentStepItem.targetView, currentStepItem.targetTab);
  };

  return (
    <aside aria-label="Guía de Onboarding Paso a Paso" className="w-full bg-slate-900/95 border-b border-slate-800 text-slate-100 shadow-xl backdrop-blur-md transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 py-3">
        {/* Top bar of Stepper: Role Badge, Progress, Mode Switcher, and Collapse */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-2.5">
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Dynamic Role Badge */}
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${roleConfig.theme.badgeBg} ${roleConfig.theme.badgeText} ${roleConfig.theme.badgeBorder}`}
            >
              {getRoleIcon()}
              <span>{roleConfig.roleTitle}</span>
              {previewRole && (
                <span className="text-[10px] ml-1 bg-slate-800/80 px-1.5 py-0.2 rounded-sm text-slate-300">
                  (Previsualización)
                </span>
              )}
            </span>

            {/* Stepper Tag */}
            <div className="flex items-center gap-1.5 text-xs text-slate-300 font-medium">
              <Compass className="w-3.5 h-3.5 text-teal-400 animate-spin-slow" />
              <span>Modo Guiado Activo:</span>
              <span className="text-white font-bold">
                Paso {currentStepIndex + 1} de {totalSteps}
              </span>
            </div>

            {/* Completion Pill */}
            <div className="hidden sm:flex items-center gap-1 text-[11px] text-slate-400 bg-slate-950/60 px-2 py-0.5 rounded-md border border-slate-800">
              <span className="font-semibold text-teal-400">{completedCount}/{totalSteps}</span> completados ({progressPercent}%)
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Switch to Modo Libre */}
            <button
              type="button"
              onClick={toggleGuidedMode}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition cursor-pointer"
              title="Ocultar el stepper y navegar libremente"
            >
              <Compass className="w-3 h-3 text-slate-400" />
              <span>Pasar a Modo Libre</span>
            </button>

            {/* Manual & Tutorial modal button */}
            <button
              type="button"
              onClick={() => openGuideModal(effectiveRole, 'steps')}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 transition cursor-pointer"
              title="Abrir Manual & Tutorial completo"
            >
              <BookOpen className="w-3.5 h-3.5 text-teal-400" />
              <span className="hidden sm:inline">Manual & Tutorial</span>
            </button>

            {/* Collapse toggle */}
            <button
              type="button"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              title={isCollapsed ? 'Expandir guía' : 'Minimizar guía'}
            >
              {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Global Progress Line */}
        <div className="w-full bg-slate-800/80 rounded-full h-1.5 overflow-hidden mb-3">
          <div
            className={`h-full transition-all duration-500 rounded-full ${roleConfig.theme.progressBg}`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Steps Chips / Navigation Stepper Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-700">
          {steps.map((step, idx) => {
            const isDone = isStepCompleted(step.id);
            const isCurrent = idx === currentStepIndex;

            return (
              <button
                key={step.id}
                type="button"
                onClick={() => setCurrentStepIndex(idx)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition cursor-pointer shrink-0 border ${
                  isCurrent
                    ? 'bg-slate-800 border-teal-500 text-white shadow-md ring-1 ring-teal-500/40'
                    : isDone
                    ? 'bg-slate-950/70 border-emerald-500/30 text-emerald-300 hover:bg-slate-800'
                    : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                {isDone ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <span
                    className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                      isCurrent
                        ? 'bg-teal-500 text-slate-950'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {idx + 1}
                  </span>
                )}
                <span>{step.shortTitle}</span>
              </button>
            );
          })}
        </div>

        {/* Expandable Current Step Detailed Card */}
        {!isCollapsed && (
          <div className="mt-3 bg-slate-950/80 border border-slate-800 rounded-xl p-3 sm:p-4 transition-all">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-xs font-bold text-teal-400 tracking-wide uppercase">
                    Paso {currentStepIndex + 1} de {totalSteps}
                  </span>
                  <span className="text-slate-500">•</span>
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    Estimado: ~{currentStepItem.estimatedMinutes} min
                  </span>
                  {isCurrentDone && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded-md border border-emerald-500/30">
                      <Check className="w-3 h-3" /> Completado
                    </span>
                  )}
                </div>

                <h4 className="text-sm sm:text-base font-bold text-white mb-1">
                  {currentStepItem.title}
                </h4>

                <p className="text-xs text-slate-300 leading-relaxed mb-2">
                  {currentStepItem.summary}
                </p>

                {/* Why it's important (Eliminating confusion!) */}
                <div className="flex items-start gap-1.5 text-xs text-slate-400 bg-slate-900/60 p-2 rounded-lg border border-slate-800/80 mb-2">
                  <Info className="w-3.5 h-3.5 text-teal-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-slate-200 font-semibold">¿Por qué es importante?: </span>
                    <span>{currentStepItem.whyImportant}</span>
                  </div>
                </div>

                {/* Pro tip */}
                {currentStepItem.proTip && (
                  <div className="text-[11px] text-amber-300/90 flex items-center gap-1.5">
                    <span className="font-semibold text-amber-400">Consejo clave:</span>
                    <span>{currentStepItem.proTip}</span>
                  </div>
                )}
              </div>

              {/* Action and Step Control Buttons */}
              <div className="flex flex-wrap md:flex-col items-stretch justify-end gap-2 shrink-0 md:min-w-[210px]">
                {/* Main Action Button (Deep link to module) */}
                <button
                  type="button"
                  onClick={handleActionClick}
                  className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-md hover:shadow-teal-500/20 transition-all cursor-pointer"
                >
                  <span>{currentStepItem.actionLabel}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>

                {/* Mark as completed / Toggle */}
                <button
                  type="button"
                  onClick={() => toggleStepCompletion(currentStepItem.id)}
                  className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition cursor-pointer ${
                    isCurrentDone
                      ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300 hover:bg-emerald-950/70'
                      : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {isCurrentDone ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Completado</span>
                    </>
                  ) : (
                    <>
                      <Circle className="w-3.5 h-3.5 text-slate-400" />
                      <span>Marcar como Hecho</span>
                    </>
                  )}
                </button>

                {/* Stepper Navigation: Previous and Next */}
                <div className="flex items-center gap-1.5 w-full">
                  <button
                    type="button"
                    onClick={handlePrevStep}
                    disabled={currentStepIndex === 0}
                    className="flex-1 flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                  >
                    <ArrowLeft className="w-3 h-3" />
                    <span>Anterior</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleNextStep}
                    disabled={currentStepIndex === totalSteps - 1}
                    className="flex-1 flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                  >
                    <span>Siguiente</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
