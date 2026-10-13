import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/_workspace")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/login", search: { next: location.pathname } });
  },
  component: Workspace,
});

function Workspace() {
  const { ready, loadError, team, refresh } = useStore();
  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-3 text-muted-foreground" role="status">
        <Loader2 className="size-5 animate-spin text-primary" /> <span className="font-mono text-sm">Loading your workspace…</span>
      </div>
    );
  }
  if (loadError || !team) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="font-display text-3xl">We couldn't load your workspace.</p>
        <p className="max-w-md text-sm text-muted-foreground">{loadError ?? "Your account isn't part of a team yet."}</p>
        <button onClick={() => void refresh()} className="btn-primary">Try again</button>
      </div>
    );
  }
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
