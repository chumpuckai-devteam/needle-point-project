import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import type { ThemePreference } from "../lib/theme";

const OPTIONS: { id: ThemePreference; label: string; hint: string; Icon: typeof Sun }[] = [
  { id: "system", label: "System", hint: "Match device", Icon: Monitor },
  { id: "light", label: "Light", hint: "Moss & flax day", Icon: Sun },
  { id: "dark", label: "Dark", hint: "Evening studio", Icon: Moon },
];

/**
 * Light / Dark / System theme control.
 * Used on Account and guest home (and signed-out auth).
 */
export function ThemeToggle({
  compact = false,
  showHeading = true,
}: {
  compact?: boolean;
  showHeading?: boolean;
}) {
  const { preference, resolved, setPreference } = useTheme();

  return (
    <section
      className={`theme-toggle panel${compact ? " theme-toggle-compact" : ""}`}
      data-testid="theme-toggle"
      aria-label="Color theme"
    >
      {showHeading ? (
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
        {OPTIONS.map(({ id, label, hint, Icon }) => {
          const selected = preference === id;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={selected}
              className={`theme-toggle-option${selected ? " selected" : ""}`}
              onClick={() => setPreference(id)}
              data-testid={`theme-option-${id}`}
            >
              <Icon size={compact ? 16 : 18} aria-hidden />
              <span className="theme-toggle-option-label">
                <strong>{label}</strong>
                {!compact ? <small>{hint}</small> : null}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
