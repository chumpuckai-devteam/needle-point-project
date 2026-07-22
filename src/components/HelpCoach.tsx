import { useEffect, useLayoutEffect, useState, type CSSProperties } from "react";
import { CircleHelp, X } from "lucide-react";
import { useHelpTips } from "../context/HelpTipsContext";

type AnchorRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

const BOTTOM_NAV_ANCHORS = new Set(["nav-studio", "nav-discover", "nav-shops", "nav-more", "nav-saved", "nav-meetups", "nav-messages", "nav-help"]);

function readAnchorRect(anchor: string): AnchorRect | null {
  const candidates = Array.from(document.querySelectorAll<HTMLElement>(`[data-help-anchor="${anchor}"]`));
  if (!candidates.length) return null;
  const visible =
    candidates.find((node) => {
      const style = window.getComputedStyle(node);
      if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") return false;
      const r = node.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    }) ?? null;
  const target = visible ?? candidates[0];
  const r = target.getBoundingClientRect();
  if (r.width <= 0 || r.height <= 0) return null;
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

function isBottomChromeAnchor(anchor: string, rect: AnchorRect | null): boolean {
  if (BOTTOM_NAV_ANCHORS.has(anchor)) return true;
  if (!rect) return false;
  // Treat anything in the lower ~18% of the viewport as bottom chrome.
  return rect.top + rect.height / 2 > window.innerHeight * 0.82;
}

/**
 * Keep the tip card fully above bottom nav / sheet chrome so it never covers
 * the highlighted control. Card always sits above dimming (caller sets z-index).
 */
function placeCard(anchor: string, rect: AnchorRect | null): CSSProperties {
  const margin = 14;
  const cardW = Math.min(360, window.innerWidth - margin * 2);
  const base: CSSProperties = {
    position: "fixed",
    width: cardW,
    zIndex: 120,
  };

  // Bottom nav / More sheet targets → float card in the safe mid-upper band.
  if (isBottomChromeAnchor(anchor, rect)) {
    return {
      ...base,
      left: "50%",
      transform: "translateX(-50%)",
      // Clear 4-tab bar (~72px) + home indicator + a little air.
      bottom: "max(108px, calc(76px + env(safe-area-inset-bottom, 0px) + 28px))",
      top: "auto",
    };
  }

  if (!rect) {
    return {
      ...base,
      left: "50%",
      transform: "translateX(-50%)",
      bottom: "max(108px, calc(76px + env(safe-area-inset-bottom, 0px) + 28px))",
    };
  }

  const cardMaxH = 240;
  const gap = 14;
  const spaceAbove = rect.top;
  const spaceBelow = window.innerHeight - (rect.top + rect.height);
  // Prefer above the target when near the bottom; below when target is high.
  const preferAbove = spaceBelow < cardMaxH + gap || rect.top > window.innerHeight * 0.45;

  let top: number;
  if (preferAbove && spaceAbove >= 120) {
    top = Math.max(margin, rect.top - cardMaxH - gap);
  } else {
    top = Math.min(rect.top + rect.height + gap, window.innerHeight - cardMaxH - margin);
  }

  // Never invade the bottom nav band.
  const navBandTop = window.innerHeight - 100;
  if (top + 160 > navBandTop) {
    top = Math.max(margin, navBandTop - 180);
  }

  let left = rect.left + rect.width / 2 - cardW / 2;
  left = Math.max(margin, Math.min(left, window.innerWidth - cardW - margin));

  return {
    ...base,
    top,
    left,
    transform: "none",
  };
}

/**
 * Lightweight coach-mark overlay.
 * Spotlight rings the control; card stays fully opaque and never covers bottom tabs.
 */
export function HelpCoach() {
  const { active, tip, tips, stepIndex, next, back, skipAll } = useHelpTips();
  const [rect, setRect] = useState<AnchorRect | null>(null);

  useLayoutEffect(() => {
    if (!active || !tip) {
      setRect(null);
      return;
    }

    let cancelled = false;
    const measure = () => {
      if (cancelled) return;
      setRect(readAnchorRect(tip.anchor));
    };

    measure();
    const t1 = window.setTimeout(measure, 80);
    const t2 = window.setTimeout(measure, 280);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);

    return () => {
      cancelled = true;
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [active, tip]);

  useEffect(() => {
    if (!active) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        skipAll();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, skipAll]);

  if (!active || !tip) return null;

  const isLast = stepIndex >= tips.length - 1;
  const cardStyle = placeCard(tip.anchor, rect);
  const stepLabel = `${stepIndex + 1} of ${tips.length}`;
  const bottomChrome = isBottomChromeAnchor(tip.anchor, rect);

  return (
    <div className="help-coach" data-testid="help-coach" role="dialog" aria-modal="false" aria-labelledby="help-coach-title">
      {/* Full dim lives only on the backdrop — not via spotlight box-shadow — so the card stays crisp */}
      <div className="help-coach-backdrop" aria-hidden onClick={skipAll} />
      {rect ? (
        <div
          className={`help-coach-spotlight${bottomChrome ? " help-coach-spotlight-nav" : ""}`}
          style={{
            top: rect.top - 4,
            left: rect.left - 4,
            width: rect.width + 8,
            height: rect.height + 8,
          }}
          aria-hidden
        />
      ) : null}
      <div className="help-coach-card panel" style={cardStyle}>
        <div className="help-coach-card-head">
          <p className="help-coach-step" aria-live="polite">
            <CircleHelp size={15} aria-hidden /> Help · {stepLabel}
          </p>
          <button type="button" className="help-coach-close" onClick={skipAll} aria-label="Dismiss help tips">
            <X size={16} aria-hidden />
          </button>
        </div>
        <h2 id="help-coach-title" className="help-coach-title">
          {tip.title}
        </h2>
        <p className="help-coach-body">{tip.body}</p>
        <div className="help-coach-actions">
          <button type="button" className="text-button help-coach-skip" onClick={skipAll}>
            Skip tips
          </button>
          <div className="help-coach-nav">
            {stepIndex > 0 ? (
              <button type="button" className="secondary" onClick={back}>
                Back
              </button>
            ) : null}
            <button type="button" className="primary" onClick={next} data-testid="help-coach-next" autoFocus>
              {isLast ? "Done" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
