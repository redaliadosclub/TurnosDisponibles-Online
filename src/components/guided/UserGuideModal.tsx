import React, { useEffect, useState } from 'react';
import { useGuidedMode } from '../../context/GuidedModeContext';
import {
  ROLE_GUIDE_CONFIGS,
  GuidedRole,
  GuideStepItem,
  TroubleshootingItem,
  QuickFlowItem,
} from '../../data/roleGuideSteps';
import {
  BookOpen,
  X,
  CheckCircle2,
  Circle,
  HelpCircle,
  Shield,
  Building2,
  Stethoscope,
  Calendar,
  ExternalLink,
  ChevronRight,
  Zap,
  ListOrdered,
  AlertTriangle,
  Lock,
  Check,
  RotateCcw,
  Sparkles,
  Info,
  Clock,
  ArrowRight,
  Sliders,
  Compass,
} from 'lucide-react';

export function UserGuideModal() {
  const {
    currentUserRole,
    previewRole,
    setPreviewRole,
    effectiveRole,
    roleConfig,
    isGuideModalOpen,
    closeGuideModal,
    guideModalTab,
    setGuideModalTab,
    isGuidedMode,
    setGuidedMode,
    currentStepIndex,
    setCurrentStepIndex,
    isStepCompleted,
    toggleStepCompletion,
    resetRoleProgress,
    navigateToAction,
  } = useGuidedMode();

  // Selected step inside the "Tutorial Paso a Paso" tab for detailed reading
  const [selectedTutorialStepId, setSelectedTutorialStepId] = useState<string>(
    roleConfig.steps[currentStepIndex]?.id || roleConfig.steps[0]?.id
  );

  // Accordion state for troubleshooting
  const [openTroubleshootIdx, setOpenTroubleshootIdx] = useState<number | null>(0);

  // Keep selected tutorial step in sync when role or step changes
  useEffect(() => {
    if (roleConfig.steps.length > 0) {
      setSelectedTutorialStepId(roleConfig.steps[0].id);
      setOpenTroubleshootIdx(0);
    }
  }, [effectiveRole, roleConfig]);

  // Accessibility: close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isGuideModalOpen) {
        closeGuideModal();
      }
    };
    if (isGuideModalOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isGuideModalOpen, closeGuideModal]);

  if (!isGuideModalOpen) {
    return null;
  }

  const steps = roleConfig.steps;
  const currentTutorialStep =
    steps.find((s) => s.id === selectedTutorialStepId) || steps[0];

  const getRoleIcon = (roleKey: GuidedRole) => {
    switch (roleKey) {
      case 'superadmin':
        return <Shield className="w-4 h-4" />;
      case 'tenant_owner':
        return <Building2 className="w-4 h-4" />;
      case 'staff':
        return <Stethoscope className="w-4 h-4" />;
      case 'end_user':
        return <Calendar className="w-4 h-4" />;
    }
  };

  const handleAction = (targetView: 'portal' | 'public' | 'business' | 'superadmin' | 'staff', targetTab?: string) => {
    closeGuideModal();
    navigateToAction(targetView, targetTab);
  };

  // Only allow switching roles in preview if user is superadmin or tenant_owner, or for exploring
  const canSwitchRolePreview = currentUserRole === 'superadmin' || currentUserRole === 'tenant_owner';

  const roleOptions: { id: GuidedRole; label: string }[] = [
    { id: 'superadmin', label: 'SuperAdmin SaaS' },
    { id: 'tenant_owner', label: 'Dueño de Clínica' },
    { id: 'staff', label: 'Staff / Médico' },
    { id: 'end_user', label: 'Paciente / Cliente' },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="guide-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          closeGuideModal();
        }
      }}
    >
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden relative text-slate-100">
        {/* MODAL HEADER */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/90 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 id="guide-modal-title" className="text-base sm:text-lg font-bold text-white">
                  Manual & Tutorial del Sistema
                </h3>
                {/* Role Badge */}
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${roleConfig.theme.badgeBg} ${roleConfig.theme.badgeText} ${roleConfig.theme.badgeBorder}`}
                >
                  {getRoleIcon(effectiveRole)}
                  <span>{roleConfig.roleTitle}</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {roleConfig.roleSubtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Role switcher for Admins & Owners */}
            {canSwitchRolePreview && (
              <div className="flex items-center gap-1.5 bg-slate-900 px-2 py-1 rounded-xl border border-slate-800 text-xs text-slate-300">
                <span className="text-[11px] text-slate-400 hidden sm:inline">Ver como:</span>
                <select
                  value={effectiveRole}
                  onChange={(e) => setPreviewRole(e.target.value as GuidedRole)}
                  className="bg-transparent text-white font-semibold text-xs border-none focus:outline-none cursor-pointer"
                >
                  {roleOptions.map((opt) => (
                    <option key={opt.id} value={opt.id} className="bg-slate-900 text-white">
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Close X Button */}
            <button
              type="button"
              onClick={closeGuideModal}
              className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
              title="Cerrar modal (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* TABS NAVIGATION */}
        <div className="bg-slate-950/60 border-b border-slate-800 px-4 pt-2 flex items-center gap-2 overflow-x-auto scrollbar-none shrink-0">
          <button
            type="button"
            onClick={() => setGuideModalTab('quick')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition whitespace-nowrap cursor-pointer ${
              guideModalTab === 'quick'
                ? 'border-teal-400 text-teal-300 bg-teal-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Flujo Rápido (3 Pasos)</span>
          </button>

          <button
            type="button"
            onClick={() => setGuideModalTab('steps')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition whitespace-nowrap cursor-pointer ${
              guideModalTab === 'steps'
                ? 'border-teal-400 text-teal-300 bg-teal-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ListOrdered className="w-3.5 h-3.5" />
            <span>Tutorial Paso a Paso ({steps.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setGuideModalTab('faq')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition whitespace-nowrap cursor-pointer ${
              guideModalTab === 'faq'
                ? 'border-teal-400 text-teal-300 bg-teal-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Solución de Problemas (FAQ)</span>
          </button>

          <button
            type="button"
            onClick={() => setGuideModalTab('permissions')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition whitespace-nowrap cursor-pointer ${
              guideModalTab === 'permissions'
                ? 'border-teal-400 text-teal-300 bg-teal-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Permisos de tu Rol</span>
          </button>
        </div>

        {/* MODAL BODY CONTENT */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* TAB 1: FLUJO RÁPIDO */}
          {guideModalTab === 'quick' && (
            <div className="space-y-5 animate-fade-in">
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4">
                <h4 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Resumen Ejecutivo del Rol</span>
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {roleConfig.summary}
                </p>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                  Tu Flujo de Trabajo en 3 Claves:
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {roleConfig.quickFlow.map((item, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 flex flex-col justify-between hover:border-slate-700 transition"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xl font-extrabold text-teal-400">
                            {item.number}
                          </span>
                          <span className="text-[10px] font-semibold text-amber-300 bg-amber-950/60 border border-amber-500/30 px-2 py-0.5 rounded-full">
                            {item.highlight}
                          </span>
                        </div>
                        <h5 className="text-sm font-bold text-white mb-1">
                          {item.title}
                        </h5>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Activation Card for Guided Mode */}
              <div className="bg-gradient-to-r from-teal-950/50 via-slate-900 to-blue-950/50 border border-teal-500/30 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-300 flex items-center justify-center shrink-0">
                    <Compass className="w-5 h-5 animate-spin-slow" />
                  </div>
                  <div>
                    <h5 className="text-xs sm:text-sm font-bold text-white">
                      {isGuidedMode ? 'El Modo Guiado está activo' : '¿Prefieres que te acompañemos paso a paso?'}
                    </h5>
                    <p className="text-xs text-slate-300">
                      {isGuidedMode
                        ? 'Verás el stepper interactivo en la parte superior para ir completando tu configuración.'
                        : 'Activa el Modo Guiado para ver las recomendaciones contextuales en cada pantalla.'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setGuidedMode(true);
                    closeGuideModal();
                  }}
                  className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-md transition cursor-pointer shrink-0"
                >
                  {isGuidedMode ? 'Continuar en Modo Guiado' : 'Activar Modo Guiado Ahora'}
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: TUTORIAL PASO A PASO */}
          {guideModalTab === 'steps' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 animate-fade-in">
              {/* Left Column: Steps List */}
              <div className="md:col-span-5 space-y-2 border-r border-slate-800 pr-0 md:pr-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Pasos de Onboarding ({steps.length})
                  </span>
                  <button
                    type="button"
                    onClick={resetRoleProgress}
                    className="text-[11px] text-slate-400 hover:text-amber-300 flex items-center gap-1 transition"
                    title="Reiniciar progreso"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reiniciar</span>
                  </button>
                </div>

                <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
                  {steps.map((step, idx) => {
                    const isDone = isStepCompleted(step.id);
                    const isSelected = step.id === currentTutorialStep.id;

                    return (
                      <div
                        key={step.id}
                        onClick={() => setSelectedTutorialStepId(step.id)}
                        className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex items-center justify-between gap-2 ${
                          isSelected
                            ? 'bg-slate-800 border-teal-500 shadow-md ring-1 ring-teal-500/30'
                            : 'bg-slate-950/50 border-slate-800 hover:bg-slate-800/60'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleStepCompletion(step.id);
                            }}
                            className="text-slate-400 hover:text-white transition"
                          >
                            {isDone ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            ) : (
                              <Circle className="w-4 h-4 text-slate-500 shrink-0" />
                            )}
                          </button>
                          <div>
                            <div className="text-xs font-semibold text-white">
                              {idx + 1}. {step.shortTitle}
                            </div>
                            <div className="text-[10px] text-slate-400 truncate max-w-[180px]">
                              {step.summary}
                            </div>
                          </div>
                        </div>

                        <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Selected Step Detail */}
              <div className="md:col-span-7 bg-slate-950/80 border border-slate-800 rounded-xl p-4 sm:p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-bold text-teal-400 uppercase tracking-wide">
                      Paso {currentTutorialStep.stepNumber} de {steps.length}
                    </span>
                    <span className="text-[11px] text-slate-400 flex items-center gap-1 bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800">
                      <Clock className="w-3 h-3 text-amber-400" />
                      ~{currentTutorialStep.estimatedMinutes} min
                    </span>
                  </div>

                  <h4 className="text-base font-bold text-white mb-2">
                    {currentTutorialStep.title}
                  </h4>

                  <p className="text-xs text-slate-300 leading-relaxed mb-3">
                    {currentTutorialStep.description}
                  </p>

                  {/* Why important */}
                  <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3 mb-3">
                    <div className="flex items-start gap-2 text-xs">
                      <Info className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-teal-300">¿Por qué es fundamental este paso?: </span>
                        <span className="text-slate-300">{currentTutorialStep.whyImportant}</span>
                      </div>
                    </div>
                  </div>

                  {/* Checklist if provided */}
                  {currentTutorialStep.checklist && (
                    <div className="mb-3">
                      <div className="text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                        Acciones clave a verificar:
                      </div>
                      <div className="space-y-1">
                        {currentTutorialStep.checklist.map((item, cIdx) => (
                          <div key={cIdx} className="flex items-center gap-2 text-xs text-slate-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-teal-400 shrink-0" />
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Pro Tip */}
                  {currentTutorialStep.proTip && (
                    <div className="text-xs text-amber-300/90 bg-amber-950/30 border border-amber-500/20 p-2.5 rounded-lg flex items-start gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-amber-400">Consejo experto: </span>
                        <span>{currentTutorialStep.proTip}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom Action Footer for Step */}
                <div className="mt-5 pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => toggleStepCompletion(currentTutorialStep.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition cursor-pointer ${
                      isStepCompleted(currentTutorialStep.id)
                        ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
                        : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white'
                    }`}
                  >
                    {isStepCompleted(currentTutorialStep.id) ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Completado</span>
                      </>
                    ) : (
                      <>
                        <Circle className="w-3.5 h-3.5 text-slate-400" />
                        <span>Marcar Hecho</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAction(currentTutorialStep.targetView, currentTutorialStep.targetTab)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-md transition cursor-pointer"
                  >
                    <span>{currentTutorialStep.actionLabel}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SOLUCIÓN DE PROBLEMAS (FAQ) */}
          {guideModalTab === 'faq' && (
            <div className="space-y-3 animate-fade-in">
              <div className="text-xs text-slate-400 mb-2">
                Respuestas directas a las dudas y situaciones más frecuentes para el rol{' '}
                <span className="text-white font-semibold">{roleConfig.roleTitle}</span>:
              </div>

              {roleConfig.troubleshooting.map((item, idx) => {
                const isOpen = openTroubleshootIdx === idx;

                return (
                  <div
                    key={idx}
                    className="bg-slate-950/70 border border-slate-800 rounded-xl overflow-hidden transition"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenTroubleshootIdx(isOpen ? null : idx)}
                      className="w-full p-3.5 sm:p-4 text-left flex items-center justify-between gap-3 hover:bg-slate-800/40 transition cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <HelpCircle className="w-4 h-4 text-amber-400 shrink-0" />
                        <span className="text-xs sm:text-sm font-bold text-white">
                          {item.question}
                        </span>
                      </div>
                      <ChevronRight
                        className={`w-4 h-4 text-slate-400 transition-transform ${
                          isOpen ? 'rotate-90' : ''
                        }`}
                      />
                    </button>

                    {isOpen && (
                      <div className="px-4 pb-4 pt-1 border-t border-slate-800/80 bg-slate-900/40 space-y-2.5 text-xs">
                        <div className="text-slate-300 leading-relaxed">
                          {item.answer}
                        </div>

                        {item.cause && (
                          <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800">
                            <span className="font-semibold text-amber-400">Causa raíz: </span>
                            <span className="text-slate-300">{item.cause}</span>
                          </div>
                        )}

                        {item.solution && (
                          <div className="bg-teal-950/30 p-2.5 rounded-lg border border-teal-500/20">
                            <span className="font-semibold text-teal-300">Solución recomendada: </span>
                            <span className="text-slate-200">{item.solution}</span>
                          </div>
                        )}

                        {item.targetView && (
                          <div className="pt-1 flex justify-end">
                            <button
                              type="button"
                              onClick={() => handleAction(item.targetView!, item.targetTab)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-xs transition cursor-pointer"
                            >
                              <span>{item.actionLabel || 'Ir a solucionar ahora'}</span>
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 4: PERMISOS DE TU ROL */}
          {guideModalTab === 'permissions' && (
            <div className="space-y-4 animate-fade-in">
              <div className="text-xs text-slate-400">
                Matriz de acceso y seguridad basada en roles (Multi-Tenant RBAC) para{' '}
                <span className="text-white font-semibold">{roleConfig.roleTitle}</span>:
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {roleConfig.permissions.map((group, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-teal-400" />
                        <span>{group.category}</span>
                      </h4>

                      {/* Allowed items */}
                      <div className="mb-3">
                        <div className="text-[11px] font-semibold text-emerald-400 mb-1 flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          <span>Acciones Habilitadas:</span>
                        </div>
                        <ul className="space-y-1">
                          {group.allowed.map((item, aIdx) => (
                            <li key={aIdx} className="text-xs text-slate-300 flex items-start gap-1.5">
                              <span className="w-1 h-1 rounded-full bg-emerald-400 shrink-0 mt-1.5" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Restricted items */}
                      <div>
                        <div className="text-[11px] font-semibold text-rose-400 mb-1 flex items-center gap-1">
                          <X className="w-3 h-3" />
                          <span>Límites & Restricciones:</span>
                        </div>
                        <ul className="space-y-1">
                          {group.restricted.map((item, rIdx) => (
                            <li key={rIdx} className="text-xs text-slate-400 flex items-start gap-1.5">
                              <span className="w-1 h-1 rounded-full bg-rose-400 shrink-0 mt-1.5" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="p-3 sm:p-4 border-t border-slate-800 bg-slate-950/90 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Modo de Experiencia:</span>
            <button
              type="button"
              onClick={() => setGuidedMode(!isGuidedMode)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                isGuidedMode
                  ? 'bg-teal-500/10 text-teal-300 border-teal-500/30'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              {isGuidedMode ? 'Modo Guiado (Activo)' : 'Modo Libre (Activo)'}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={closeGuideModal}
              className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold transition cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
