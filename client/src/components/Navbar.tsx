import React from "react";
import { Bell, LogIn, LogOut, Plus, Radio } from "lucide-react";
import { User } from "../types";

interface NavbarProps {
  systemStatus: "UP" | "DEGRADED" | "DOWN";
  isWsConnected: boolean;
  currentUser: User | null;
  onOpenAddMonitor: () => void;
  onOpenAlerts: () => void;
  onOpenAuth: () => void;
  onLogout: () => void;
}

const statusCopy = {
  UP: "All systems operational",
  DEGRADED: "Performance degraded",
  DOWN: "Active incident",
};

const statusStyle = {
  UP: "bg-[var(--signal)]",
  DEGRADED: "bg-[var(--warning)]",
  DOWN: "bg-[var(--danger)]",
};

export const Navbar: React.FC<NavbarProps> = ({
  systemStatus,
  isWsConnected,
  currentUser,
  onOpenAddMonitor,
  onOpenAlerts,
  onOpenAuth,
  onLogout,
}) => {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--ink)] bg-[color:rgba(245,242,234,0.96)] backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-[1500px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-5">
          <a href="/" className="flex items-center gap-2.5" aria-label="Sentinel home">
            <span className="flex h-8 w-8 items-center justify-center border border-[var(--ink)] bg-[var(--paper-raised)]">
              <img
                src="/sentinel-icon.svg"
                alt=""
                aria-hidden="true"
                className="h-6 w-6 [image-rendering:pixelated]"
              />
            </span>
            <span className="text-[15px] font-semibold tracking-[-0.02em]">Sentinel</span>
          </a>

          <div className="hidden items-center gap-2 border-l border-[var(--line-strong)] pl-5 text-xs text-[var(--muted)] md:flex">
            <span className={`h-2 w-2 rounded-full ${statusStyle[systemStatus]}`} />
            <span>{statusCopy[systemStatus]}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div
            className="mr-1 hidden items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--muted)] sm:flex"
            title={isWsConnected ? "WebSocket connected" : "Telemetry reconnecting"}
          >
            <Radio className={`h-3.5 w-3.5 ${isWsConnected ? "text-[var(--signal)]" : "text-[var(--warning)]"}`} />
            <span className={isWsConnected ? "sentinel-live-dot" : ""}>
              {isWsConnected ? "Live" : "Reconnecting"}
            </span>
          </div>

          <button
            onClick={onOpenAlerts}
            title="Alert channels"
            className="sentinel-icon-key"
            aria-label="Alert channels"
          >
            <Bell className="h-4 w-4" />
          </button>

          <button
            onClick={onOpenAddMonitor}
            className="sentinel-key sentinel-key-primary h-9 px-3 text-xs font-semibold"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">New monitor</span>
          </button>

          {currentUser ? (
            <div className="ml-1 flex items-center gap-2 border-l border-[var(--line-strong)] pl-3">
              <div className="hidden min-w-0 text-right md:block">
                <div className="max-w-[150px] truncate text-xs font-medium">
                  {currentUser.name || currentUser.email}
                </div>
                <div className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--muted)]">
                  {currentUser.role.toLowerCase()}
                </div>
              </div>
              <button
                onClick={onLogout}
                title="Sign out"
                className="sentinel-icon-key"
                aria-label="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="sentinel-key h-9 px-3 text-xs font-semibold"
            >
              <LogIn className="h-3.5 w-3.5" />
              Sign in
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
