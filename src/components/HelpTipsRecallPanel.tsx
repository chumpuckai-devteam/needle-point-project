import { useHelpTipsOptional } from "../context/HelpTipsContext";

/** Account / Help entry to replay first-time tips. */
export function HelpTipsRecallPanel() {
  const help = useHelpTipsOptional();
  const active = Boolean(help?.active);

  return (
    <div className="panel help-tips-recall" data-testid="help-tips-recall" data-help-anchor="help-report">
      <h2>Help tips</h2>
      <p className="field-help">
        Short guides for Studio, Discover, Shops, Saved boards, Meetups, Messages, and Report. Replay anytime — tips stay
        off after you skip or finish until you ask again.
      </p>
      <button
        type="button"
        className="secondary"
        data-testid="help-tips-restart"
        disabled={active || !help}
        onClick={() => help?.startTour()}
      >
        {active ? "Tips are open…" : "Show help tips again"}
      </button>
    </div>
  );
}
