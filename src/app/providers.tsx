import type { ReactNode } from "react";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "../context/AuthContext";
import { HelpTipsProvider } from "../context/HelpTipsContext";
import { ThemeProvider } from "../context/ThemeContext";

/** Top-level app providers. Theme wraps all UI; Auth outside router for auth pages. */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <HelpTipsProvider>{children}</HelpTipsProvider>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
