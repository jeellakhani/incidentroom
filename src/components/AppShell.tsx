import { Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useState, type ReactNode } from "react";
import {
  Bell, ClipboardList, FileText, LayoutGrid, LogOut, Menu, Plus, ScrollText, Settings, Siren, Users,
} from "lucide-react";
import { fmtAgo, person, type NotifCategory } from "@/lib/data";
import { isActive, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Avatar } from "./ir";

const NAV = [
  { to: "/dashboard", label: "Overview", icon: LayoutGrid },
  { to: "/incidents", label: "Incidents", icon: Siren },
  { to: "/actions", label: "My Actions", icon: ClipboardList },
  { to: "/team", label: "Team", icon: Users },
  { to: "/reports", label: "Reports", icon: FileText },
  { to: "/audit", label: "Audit Log", icon: ScrollText },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function Logo({ className }: { className?: string }) {
  return (
    <Link to="/" className={cn("flex items-center gap-2 font-semibold tracking-tight", className)}>
      <span className="flex size-6 items-center justify-center rounded bg-primary text-primary-foreground">
        <span className="size-2 rounded-full bg-primary-foreground" />
      </span>
      IncidentRoom
    </Link>
  );
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const { actions, incidents, userId } = useStore();
  const myOpen = actions.filter((a) => a.owner === userId && a.status !== "done" && incidents.find((i) => i.id === a.incidentId && isActive(i))).length;
  return (
    <nav aria-label="Main" className="space-y-0.5">
      {NAV.map(({ to, label, icon: Icon }) => (
        <Link
          key={to}
          to={to}
          onClick={onNavigate}
          className="flex min-h-10 items-center gap-3 rounded-md px-3 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          activeProps={{ className: "!bg-accent !text-foreground font-medium" }}
        >
          <Icon className="size-4" aria-hidden />
          {label}
          {to === "/actions" && myOpen > 0 && (
            <span className="ml-auto rounded bg-primary/15 px-1.5 font-mono text-[11px] text-primary">{myOpen}</span>
          )}
        </Link>
      ))}
    </nav>
  );
}

const CATS: { key: NotifCategory | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "mentions", label: "Mentions" },
  { key: "assignments", label: "Assignments" },
  { key: "updates", label: "Incident updates" },
  { key: "system", label: "System" },
];

function Notifications() {
  const { notifications, now, markAllRead } = useStore();
  const [open, setOpen] = useState(false);
  const [cat, setCat] = useState<NotifCategory | "all">("all");
  const unread = notifications.filter((n) => !n.read).length;
  const list = notifications.filter((n) => cat === "all" || n.category === cat);
  return (
    <>
      <button onClick={() => setOpen(true)} className="relative flex size-9 items-center justify-center rounded-md hover:bg-accent" aria-label={`Notifications, ${unread} unread`}>
        <Bell className="size-4" />
        {unread > 0 && <span className="absolute right-1.5 top-1.5 flex size-4 items-center justify-center rounded-full bg-primary font-mono text-[9px] font-bold text-primary-foreground">{unread}</span>}
      </button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full border-border bg-popover sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Notifications</SheetTitle>
          </SheetHeader>
          <div className="flex flex-wrap gap-1 px-4">
            {CATS.map((c) => (
              <button key={c.key} onClick={() => setCat(c.key)} className={cn("rounded-full border px-2.5 py-1 text-xs", cat === c.key ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground")}>
                {c.label}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto px-4">
            {list.length === 0 ? (
              <div className="py-16 text-center"><p className="font-display text-2xl">Nothing new.</p><p className="text-sm text-muted-foreground">You're caught up.</p></div>
            ) : (
              <ul className="divide-y">
                {list.map((n) => (
                  <li key={n.id} className="animate-enter py-3">
                    <div className="flex items-center gap-2">
                      {!n.read && <span className="size-1.5 rounded-full bg-primary" aria-label="Unread" />}
                      <span className="font-mono text-[11px] text-muted-foreground">{fmtAgo(now - n.at)}</span>
                      <span className="eyebrow ml-auto !text-[10px]">{n.category}</span>
                    </div>
                    <p className="mt-1 text-sm font-medium">{n.title}</p>
                    <p className="text-sm text-muted-foreground">{n.body}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="border-t p-4"><button onClick={markAllRead} className="btn-ghost w-full justify-center">Mark all as read</button></div>
        </SheetContent>
      </Sheet>
    </>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { incidents, team, userId, canEdit } = useStore();
  const navigate = useNavigate();
  const me = person(userId);
  const signOut = async () => { await supabase.auth.signOut(); navigate({ to: "/login" }); };
  const [mobileOpen, setMobileOpen] = useState(false);
  const active = incidents.filter(isActive);
  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r bg-surface px-3 py-4 lg:flex">
        <Logo className="px-3" />
        <p className="mt-1 truncate px-3 text-xs text-muted-foreground">{team?.name}</p>
        {canEdit && <Link to="/incidents/new" className="btn-primary mx-1 mt-6 justify-center"><Plus className="size-4" /> Declare incident</Link>}
        <div className="mt-6"><NavList /></div>
        <div className="mt-auto flex items-center gap-3 border-t px-2 pt-4">
          <Avatar id={userId} />
          <div className="min-w-0 flex-1 text-sm leading-tight"><p className="truncate font-medium">{me.name}</p><p className="text-xs capitalize text-muted-foreground">{me.teamRole}</p></div>
          <button onClick={signOut} aria-label="Sign out" className="flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"><LogOut className="size-4" /></button>
        </div>
      </aside>

      <div className="lg:pl-60">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur sm:px-6">
          <button className="flex size-9 items-center justify-center rounded-md hover:bg-accent lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu"><Menu className="size-5" /></button>
          <Logo className="lg:hidden" />
          <Link to="/incidents" className="ml-auto inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium hover:bg-accent lg:ml-0">
            <span className={cn("size-2 rounded-full", active.length ? "bg-critical" : "bg-success")} aria-hidden />
            <span className="font-mono">{active.length}</span> Active Incident{active.length === 1 ? "" : "s"}
          </Link>
          <span className="ml-auto" />
          <Notifications />
        </header>
        <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 border-border bg-surface p-4">
          <SheetHeader className="p-0"><SheetTitle className="sr-only">Menu</SheetTitle><Logo /></SheetHeader>
          <Link to="/incidents/new" onClick={() => setMobileOpen(false)} className="btn-primary mt-4 justify-center"><Plus className="size-4" /> Declare incident</Link>
          <div className="mt-4"><NavList onNavigate={() => setMobileOpen(false)} /></div>
          <button onClick={signOut} className="btn-ghost mt-6 w-full justify-center"><LogOut className="size-4" /> Sign out</button>
        </SheetContent>
      </Sheet>
    </div>
  );
}
