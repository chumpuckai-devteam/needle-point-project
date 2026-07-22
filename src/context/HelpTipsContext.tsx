import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  HELP_TIPS,
  loadHelpTipsPrefs,
  markHelpTipsCompleted,
  resetHelpTipsPrefs,
  shouldAutoStartHelpTips,
  type HelpTip,
  type HelpTipsPrefs,
} from "../lib/helpTips";

type HelpTipsContextValue = {
  active: boolean;
  stepIndex: number;
  tip: HelpTip | null;
  tips: HelpTip[];
  prefs: HelpTipsPrefs;
  /** Sidebar reads this to open the mobile More sheet for relevant steps. */
  forceMoreOpen: boolean;
  startTour: () => void;
  next: () => void;
  back: () => void;
  skipAll: () => void;
};

const HelpTipsContext = createContext<HelpTipsContextValue | null>(null);

const AUTO_START_DELAY_MS = 900;

export function HelpTipsProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [prefs, setPrefs] = useState<HelpTipsPrefs>(() => loadHelpTipsPrefs());
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [forceMoreOpen, setForceMoreOpen] = useState(false);

  const tips = HELP_TIPS;
  const tip = active ? (tips[stepIndex] ?? null) : null;

  const applyStep = useCallback(
    (index: number) => {
      const nextTip = tips[index];
      if (!nextTip) return;
      setStepIndex(index);
      setForceMoreOpen(Boolean(nextTip.openMore));
      if (nextTip.path && location.pathname !== nextTip.path) {
        navigate(nextTip.path);
      }
    },
    [tips, location.pathname, navigate],
  );

  const startTour = useCallback(() => {
    const nextPrefs = resetHelpTipsPrefs();
    setPrefs(nextPrefs);
    setActive(true);
    applyStep(0);
  }, [applyStep]);

  const finish = useCallback(() => {
    setActive(false);
    setForceMoreOpen(false);
    setPrefs(markHelpTipsCompleted());
  }, []);

  const next = useCallback(() => {
    if (stepIndex >= tips.length - 1) {
      finish();
      return;
    }
    applyStep(stepIndex + 1);
  }, [stepIndex, tips.length, applyStep, finish]);

  const back = useCallback(() => {
    if (stepIndex <= 0) return;
    applyStep(stepIndex - 1);
  }, [stepIndex, applyStep]);

  const skipAll = useCallback(() => {
    finish();
  }, [finish]);

  // Auto-start once for first session when tips not completed.
  useEffect(() => {
    if (prefs.completed || active) return;
    if (!shouldAutoStartHelpTips(location.pathname)) return;

    const timer = window.setTimeout(() => {
      // Re-check prefs in case Account reset raced.
      const latest = loadHelpTipsPrefs();
      if (latest.completed) return;
      if (!shouldAutoStartHelpTips(window.location.pathname)) return;
      setActive(true);
      applyStep(0);
    }, AUTO_START_DELAY_MS);

    return () => window.clearTimeout(timer);
    // Only gate on completed + first mount path family; don't restart on every route change.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional one-shot auto-start
  }, [prefs.completed]);

  // Keep More sheet open while tip needs it (re-assert after route changes).
  useEffect(() => {
    if (!active || !tip) {
      setForceMoreOpen(false);
      return;
    }
    setForceMoreOpen(Boolean(tip.openMore));
  }, [active, tip]);

  const value = useMemo<HelpTipsContextValue>(
    () => ({
      active,
      stepIndex,
      tip,
      tips,
      prefs,
      forceMoreOpen,
      startTour,
      next,
      back,
      skipAll,
    }),
    [active, stepIndex, tip, tips, prefs, forceMoreOpen, startTour, next, back, skipAll],
  );

  return <HelpTipsContext.Provider value={value}>{children}</HelpTipsContext.Provider>;
}

export function useHelpTips(): HelpTipsContextValue {
  const ctx = useContext(HelpTipsContext);
  if (!ctx) {
    throw new Error("useHelpTips must be used within HelpTipsProvider");
  }
  return ctx;
}

/** Safe optional access for chrome that may render outside the provider in tests. */
export function useHelpTipsOptional(): HelpTipsContextValue | null {
  return useContext(HelpTipsContext);
}
