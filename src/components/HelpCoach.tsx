import { useEffect, useLayoutEffect, useState, type CSSProperties } from "react";
import { CircleHelp, X } from "lucide-react";
import { useHelpTips } from "../context/HelpTipsContext";

type AnchorRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

function readAnchorRect(anchor: string): AnchorRect | null {
  const el = document.querySelector<HTMLElement>(`[data-help-anchor="${anchor}"]`);
  if (!el) return null;
  // Prefer visible anchors (mobile more sheet may hide desktop twins).
  const candidates = Array.from(document.querySelectorAll<HTMLElement>(`[data-help-anchor="${anchor}"]`));
  const visible =
    candidates.find((node) => {
      const style = window.getComputedStyle(node);
      if (style.display === "none" || style.visibility === "hidden") return false;
      const r = node.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    }) ?? null;
  const target = visible ?? el;
  const r = target.getBoundingClientRect();
  if (r.width <= 0 || r.height <= 0) return null;
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

function placeCard(rect: AnchorRect | null): CSSProperties {
  const margin = 12;
  const cardW = Math.min(340, window.innerWidth - margin * 2);
  const cardMaxH = 220;

  if (!rect) {
    return {
      position: "fixed",
      left: "50%",
      bottom: "max(96px, calc(72px + env(safe-area-inset-bottom) + 16px))",
      transform: "translateX(-50%)",
      width: cardW,
      zIndex: 90,
    };
  }

  const spaceBelow = window.innerHeight - (rect.top + rect.height);
  const placeBelow = spaceBelow >= cardMaxH + margin || rect.top < cardMaxH + margin;
  const top = placeBelow
    ? Math.min(rect.top + rect.height + margin, window.innerHeight - cardMaxH - margin)
    : Math.max(margin, rect.top - cardMaxH - margin);

  let left = rect.left + rect.width / 2 - cardW / 2;
  left = Math.max(margin, Math.min(left, window.innerWidth - cardW - margin));

  return {
    position: "fixed",
    top,
    left,
    width: cardW,
    zIndex: 90,
  };
}

/**
 * Lightweight coach-mark overlay. Non-blocking: users can still tap Skip
 * or finish; backdrop does not trap the whole app permanently.
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
    // Anchors may appear after More sheet opens or route paints.
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
  const cardStyle = placeCard(rect);
  const stepLabel = `${stepIndex + 1} of ${tips.length}`;

  return (
    <div className="help-coach" data-testid="help-coach" role="dialog" aria-modal="false" aria-labelledby="help-coach-title">
      {rect ? (
        <div
          className="help-coach-spotlight"
          style={{
            top: rect.top - 6,
            left: rect.left - 6,
            width: rect.width + 12,
            height: rect.height + 12,
          }}
          aria-hidden
        />
      ) : (
        <div className="help-coach-backdrop" aria-hidden onClick={skipAll} />
      )}
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
