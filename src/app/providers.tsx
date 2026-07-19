import type { ReactNode } from "react";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "../context/AuthContext";

/** Top-level app providers. Keep Auth outside the router so auth pages can navigate. */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <BrowserRouter>{children}</BrowserRouter>
    </AuthProvider>
  );
}
