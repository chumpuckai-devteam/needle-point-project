import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import type { ThemePreference } from "../lib/theme";

const OPTIONS: { id: ThemePreference; label: string; Icon: typeof Sun }[] = [
  { id: "system", label: "System theme", Icon: Monitor },
  { id: "light", label: "Light theme", Icon: Sun },
  { id: "dark", label: "Dark theme", Icon: Moon },
];

/**
 * Light / Dark / System theme control.
 * Compact / icons-only on guest home; full labels when showHeading on Account.
 */
export function ThemeToggle({
  compact = false,
  showHeading = true,
  iconsOnly = false,
}: {
  compact?: boolean;
  showHeading?: boolean;
  /** Icon buttons only (aria-label on each). Default true when compact. */
  iconsOnly?: boolean;
}) {
  const { preference, resolved, setPreference } = useTheme();
  const iconButtons = iconsOnly || compact;

  return (
    <section
      className={`theme-toggle panel${compact ? " theme-toggle-compact" : ""}${iconButtons ? " theme-toggle-icons-only" : ""}`}
      data-testid="theme-toggle"
      aria-label="Color theme"
    >
      {showHeading && !iconButtons ? (
        <header className="theme-toggle-head">
          <h2 className="theme-toggle-title">Appearance</h2>
          <p className="field-help">
            {preference === "system"
              ? `Using your device setting (currently ${resolved}).`
              : `${preference === "dark" ? "Dark" : "Light"} mode is on.`}
          </p>
        </header>
      ) : null}

      <div className="theme-toggle-options" role="radiogroup" aria-label="Choose color theme">
        {OPTIONS.map(({ id, label, Icon }) => {
          const selected = preference === id;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={label}
              title={label}
              className={`theme-toggle-option${selected ? " selected" : ""}`}
              onClick={() => setPreference(id)}
              data-testid={`theme-option-${id}`}
            >
              <Icon size={iconButtons ? 18 : 18} aria-hidden />
              {!iconButtons ? (
                <span className="theme-toggle-option-label">
                  <strong>{label.replace(/ theme$/i, "")}</strong>
                </span>
              ) : (
                <span className="sr-only">{label}</span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
