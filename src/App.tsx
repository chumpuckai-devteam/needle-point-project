import { AppProviders } from "./app/providers";
import { AppShell } from "./app/AppShell";

/**
 * App entry — providers + shell only.
 * Routes: app/AppRoutes · Layout: app/AppLayout · State: app/AppShell
 */
function App() {
  return (
    <AppProviders>
      <AppShell />
    </AppProviders>
  );
}

export default App;
