import { AppProvider } from "./provider.tsx";
import { SessionScreen } from "./session-screen.tsx";

export function App() {
  return (
    <AppProvider>
      <SessionScreen />
    </AppProvider>
  );
}
