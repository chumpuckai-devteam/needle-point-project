import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const src = (p) => readFileSync(resolve(root, p), "utf8");

test("theme preference: system default + account/guest controls", () => {
  const theme = src("src/lib/theme.ts");
  assert.match(theme, /ThemePreference/);
  assert.match(theme, /prefers-color-scheme/);
  assert.match(theme, /system/);

  const provider = src("src/context/ThemeContext.tsx");
  assert.match(provider, /ThemeProvider/);
  assert.match(provider, /matchMedia/);

  const toggle = src("src/components/ThemeToggle.tsx");
  assert.match(toggle, /theme-option-\$\{id\}/);
  assert.match(toggle, /id: "light"/);
  assert.match(toggle, /id: "dark"/);
  assert.match(toggle, /id: "system"/);

  const home = src("src/pages/HomePage.tsx");
  assert.match(home, /guest-theme-toggle/);
  assert.match(home, /ThemeToggle/);

  const auth = src("src/pages/AuthPage.tsx");
  assert.match(auth, /ThemeToggle/);

  const css = src("src/styles.css");
  assert.match(css, /html\[data-theme="dark"\]/);

  const html = src("index.html");
  assert.match(html, /prefers-color-scheme/);
  assert.match(html, /needlepoint:themePreference/);
});
