import { createFileRoute } from "@tanstack/react-router";
import App from "@/horizonte/App";
import { ErrorBoundary } from "@/horizonte/components/ErrorBoundary";
import { MobileLandscapeFrame } from "@/horizonte/components/MobileLandscapeFrame";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return (
    <ErrorBoundary fallbackTitle="Horizonte Estelar — Recuperação de Sessão" onReset={() => window.location.reload()}>
      <MobileLandscapeFrame>
        <App />
      </MobileLandscapeFrame>
    </ErrorBoundary>
  );
}