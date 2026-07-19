import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { completeOnboarding } from "../api/profiles";
import { useAuth } from "../context/AuthContext";
import { loadFromStorage, saveToStorage } from "../lib/storage";
import { SectionHeader } from "../components/ui";

export function OnboardingPage() {
  const { handle, user, isDemoMode } = useAuth();
  const navigate = useNavigate();
  const interests = ["beginner projects", "ornaments", "canvases", "pillows", "holiday", "florals", "animals", "modern patterns"];
  const [selected, setSelected] = useState<string[]>(() => loadFromStorage("needle-point-project:interests", ["ornaments", "florals"]));
  const [skill, setSkill] = useState(() => loadFromStorage("needle-point-project:skill", "confident beginner"));

  function toggleInterest(interest: string) {
    setSelected((current) => (current.includes(interest) ? current.filter((item) => item !== interest) : [...current, interest]));
  }

  async function finish() {
    saveToStorage("needle-point-project:interests", selected);
    saveToStorage("needle-point-project:skill", skill);
    if (!isDemoMode && user) {
      try {
        await completeOnboarding(user.id, selected, skill);
      } catch {
        // still allow local completion
      }
    }
    navigate("/");
  }

  return (
    <section className="page">
      <SectionHeader eyebrow="Onboarding" title="Set up your stitching profile" />
      <div className="panel form-grid">
        <p className="full-field">Welcome @{handle}. Pick interests (skippable) so discovery can feel craft-specific from day one.</p>
        <label htmlFor="onboarding-skill" className="full-field">
          Skill level
          <select id="onboarding-skill" value={skill} onChange={(event) => setSkill(event.target.value)}>
            <option>beginner</option>
            <option>confident beginner</option>
            <option>intermediate</option>
            <option>advanced</option>
          </select>
        </label>
        <div className="tag-row full-field">
          {interests.map((interest) => (
            <button key={interest} type="button" className={selected.includes(interest) ? "selected" : ""} onClick={() => toggleInterest(interest)}>
              {interest}
            </button>
          ))}
        </div>
        <button className="secondary" type="button" onClick={() => navigate("/")}>
          Skip for now
        </button>
        <button className="primary" type="button" onClick={() => void finish()}>
          Save preferences
        </button>
      </div>
    </section>
  );
}
