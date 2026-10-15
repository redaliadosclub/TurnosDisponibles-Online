import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  GuidedRole,
  GuideStepItem,
  RoleGuideConfig,
  ROLE_GUIDE_CONFIGS,
} from '../data/roleGuideSteps';
import { Role } from '../types';

export interface GuidedModeContextType {
  currentUserRole: GuidedRole;
  previewRole: GuidedRole | null;
  effectiveRole: GuidedRole;
  setPreviewRole: (role: GuidedRole | null) => void;
  roleConfig: RoleGuideConfig;
  isGuidedMode: boolean;
  toggleGuidedMode: () => void;
  setGuidedMode: (active: boolean) => void;
  currentStepIndex: number;
  setCurrentStepIndex: (idx: number) => void;
  currentStepItem: GuideStepItem;
  completedStepIds: string[];
  isStepCompleted: (stepId: string) => boolean;
  toggleStepCompletion: (stepId: string) => void;
  markStepComplete: (stepId: string, completed?: boolean) => void;
  resetRoleProgress: () => void;
  isGuideModalOpen: boolean;
  guideModalTab: 'quick' | 'steps' | 'faq' | 'permissions';
  openGuideModal: (role?: GuidedRole, tab?: 'quick' | 'steps' | 'faq' | 'permissions') => void;
  closeGuideModal: () => void;
  setGuideModalTab: (tab: 'quick' | 'steps' | 'faq' | 'permissions') => void;
  navigateToAction: (targetView: 'portal' | 'public' | 'business' | 'superadmin' | 'staff', targetTab?: string) => void;
}

const GuidedModeContext = createContext<GuidedModeContextType | null>(null);

export function mapUserRoleToGuidedRole(role?: Role | null, currentView?: string): GuidedRole {
  if (role === 'superadmin') return 'superadmin';
  if (role === 'business_owner') return 'tenant_owner';
  if (role === 'staff') return 'staff';
  if (role === 'customer') return 'end_user';

  // If no user is logged in, infer from current view:
  if (currentView === 'staff') return 'staff';
  if (currentView === 'superadmin') return 'superadmin';
  if (currentView === 'business') return 'tenant_owner';
  return 'end_user';
}

interface GuidedModeProviderProps {
  children: React.ReactNode;
  userRole?: Role | null;
  activeView?: string;
  onNavigateView?: (view: 'portal' | 'public' | 'business' | 'superadmin' | 'staff', tab?: string) => void;
}

export function GuidedModeProvider({
  children,
  userRole,
  activeView,
  onNavigateView,
}: GuidedModeProviderProps) {
  // 1. Determine base role from session or view
  const baseRole = useMemo(() => mapUserRoleToGuidedRole(userRole, activeView), [userRole, activeView]);

  // 2. Optional role preview (for Superadmin or Tenant Owner who wants to inspect staff or patient experience)
  const [previewRole, setPreviewRole] = useState<GuidedRole | null>(null);

  const effectiveRole = previewRole || baseRole;
  const roleConfig = ROLE_GUIDE_CONFIGS[effectiveRole] || ROLE_GUIDE_CONFIGS.end_user;

  // 3. Guided Mode state (per role, persisted in localStorage)
  const [isGuidedMode, setIsGuidedModeState] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(`${effectiveRole}_guided_mode`);
      if (stored !== null) return stored === 'true';
    } catch {}
    return true; // Default to Guided Mode enabled for immediate user clarity
  });

  // Keep state in sync when effectiveRole switches
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`${effectiveRole}_guided_mode`);
      if (stored !== null) {
        setIsGuidedModeState(stored === 'true');
      } else {
        setIsGuidedModeState(true);
      }
    } catch {
      setIsGuidedModeState(true);
    }
  }, [effectiveRole]);

  const setGuidedMode = useCallback(
    (active: boolean) => {
      setIsGuidedModeState(active);
      try {
        localStorage.setItem(`${effectiveRole}_guided_mode`, String(active));
      } catch {}
    },
    [effectiveRole]
  );

  const toggleGuidedMode = useCallback(() => {
    setGuidedMode(!isGuidedMode);
  }, [isGuidedMode, setGuidedMode]);

  // 4. Stepper index (per role)
  const [currentStepIndex, setCurrentStepIndexState] = useState<number>(() => {
    try {
      const stored = localStorage.getItem(`${effectiveRole}_current_step`);
      if (stored !== null) {
        const parsed = parseInt(stored, 10);
        if (!isNaN(parsed) && parsed >= 0) return parsed;
      }
    } catch {}
    return 0;
  });

  useEffect(() => {
    try {
      const stored = localStorage.getItem(`${effectiveRole}_current_step`);
      if (stored !== null) {
        const parsed = parseInt(stored, 10);
        if (!isNaN(parsed) && parsed >= 0 && parsed < roleConfig.steps.length) {
          setCurrentStepIndexState(parsed);
          return;
        }
      }
    } catch {}
    setCurrentStepIndexState(0);
  }, [effectiveRole, roleConfig.steps.length]);

  const setCurrentStepIndex = useCallback(
    (idx: number) => {
      const safeIdx = Math.max(0, Math.min(idx, roleConfig.steps.length - 1));
      setCurrentStepIndexState(safeIdx);
      try {
        localStorage.setItem(`${effectiveRole}_current_step`, String(safeIdx));
      } catch {}
    },
    [effectiveRole, roleConfig.steps.length]
  );

  const safeStepIndex = Math.min(currentStepIndex, roleConfig.steps.length - 1);
  const currentStepItem = roleConfig.steps[safeStepIndex] || roleConfig.steps[0];

  // 5. Completed Steps (per role)
  const [completedStepIds, setCompletedStepIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(`${effectiveRole}_completed_steps`);
      if (stored) return JSON.parse(stored);
    } catch {}
    return [];
  });

  useEffect(() => {
    try {
      const stored = localStorage.getItem(`${effectiveRole}_completed_steps`);
      if (stored) {
        setCompletedStepIds(JSON.parse(stored));
        return;
      }
    } catch {}
    setCompletedStepIds([]);
  }, [effectiveRole]);

  const isStepCompleted = useCallback(
    (stepId: string) => completedStepIds.includes(stepId),
    [completedStepIds]
  );

  const markStepComplete = useCallback(
    (stepId: string, completed = true) => {
      setCompletedStepIds((prev) => {
        const next = completed
          ? Array.from(new Set([...prev, stepId]))
          : prev.filter((id) => id !== stepId);
        try {
          localStorage.setItem(`${effectiveRole}_completed_steps`, JSON.stringify(next));
        } catch {}
        return next;
      });
    },
    [effectiveRole]
  );

  const toggleStepCompletion = useCallback(
    (stepId: string) => {
      const isDone = completedStepIds.includes(stepId);
      markStepComplete(stepId, !isDone);
    },
    [completedStepIds, markStepComplete]
  );

  const resetRoleProgress = useCallback(() => {
    setCompletedStepIds([]);
    setCurrentStepIndexState(0);
    try {
      localStorage.removeItem(`${effectiveRole}_completed_steps`);
      localStorage.setItem(`${effectiveRole}_current_step`, '0');
    } catch {}
  }, [effectiveRole]);

  // 6. Manual & Tutorial Modal State
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [guideModalTab, setGuideModalTab] = useState<'quick' | 'steps' | 'faq' | 'permissions'>('quick');

  const openGuideModal = useCallback(
    (role?: GuidedRole, tab: 'quick' | 'steps' | 'faq' | 'permissions' = 'quick') => {
      if (role) {
        setPreviewRole(role);
      }
      setGuideModalTab(tab);
      setIsGuideModalOpen(true);
    },
    []
  );

  const closeGuideModal = useCallback(() => {
    setIsGuideModalOpen(false);
  }, []);

  // 7. Navigation dispatcher
  const navigateToAction = useCallback(
    (targetView: 'portal' | 'public' | 'business' | 'superadmin' | 'staff', targetTab?: string) => {
      if (onNavigateView) {
        onNavigateView(targetView, targetTab);
      }
    },
    [onNavigateView]
  );

  return (
    <GuidedModeContext.Provider
      value={{
        currentUserRole: baseRole,
        previewRole,
        effectiveRole,
        setPreviewRole,
        roleConfig,
        isGuidedMode,
        toggleGuidedMode,
        setGuidedMode,
        currentStepIndex: safeStepIndex,
        setCurrentStepIndex,
        currentStepItem,
        completedStepIds,
        isStepCompleted,
        toggleStepCompletion,
        markStepComplete,
        resetRoleProgress,
        isGuideModalOpen,
        guideModalTab,
        openGuideModal,
        closeGuideModal,
        setGuideModalTab,
        navigateToAction,
      }}
    >
      {children}
    </GuidedModeContext.Provider>
  );
}

export function useGuidedMode() {
  const context = useContext(GuidedModeContext);
  if (!context) {
    throw new Error('useGuidedMode must be used within a GuidedModeProvider');
  }
  return context;
}
