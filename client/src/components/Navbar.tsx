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
  DEGRADED: "Degraded performance",
  DOWN: "Active incident",
};

const statusDot = {
  UP: "bg-emerald-400",
  DEGRADED: "bg-amber-400",
  DOWN: "bg-rose-400",
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
    <header className="sticky top-0 z-40 border-b border-[#20242b] bg-[#0a0c10]/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-5">
          <a href="/" className="flex items-center gap-2.5" aria-label="Sentinel home">
            <img
              src="/sentinel-icon.svg"
              alt=""
              aria-hidden="true"
              className="h-7 w-7 [image-rendering:pixelated]"
            />
            <span className="text-sm font-semibold tracking-[-0.01em] text-slate-100">Sentinel</span>
          </a>

          <div className="hidden items-center gap-2 border-l border-[#282c34] pl-5 text-xs text-slate-400 md:flex">
            <span className={`h-1.5 w-1.5 rounded-full ${statusDot[systemStatus]}`} />
            <span>{statusCopy[systemStatus]}</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <div
            className="mr-2 hidden items-center gap-2 text-[11px] text-slate-500 sm:flex"
            title={isWsConnected ? "WebSocket connected" : "Telemetry reconnecting"}
          >
            <Radio className={`h-3.5 w-3.5 ${isWsConnected ? "text-emerald-400" : "text-amber-400"}`} />
            <span>{isWsConnected ? "Live" : "Reconnecting"}</span>
          </div>

          <button
            onClick={onOpenAlerts}
            title="Alert channels"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-transparent text-slate-400 transition hover:border-[#2b3038] hover:bg-[#12151a] hover:text-slate-100"
          >
            <Bell className="h-4 w-4" />
          </button>

          <button
            onClick={onOpenAddMonitor}
            className="inline-flex h-9 items-center gap-2 rounded-md border border-[#39404b] bg-[#e8eaf0] px-3 text-xs font-medium text-[#111318] transition hover:bg-white"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">New monitor</span>
          </button>

          {currentUser ? (
            <div className="ml-1 flex items-center gap-2 border-l border-[#282c34] pl-3">
              <div className="hidden min-w-0 text-right md:block">
                <div className="max-w-[150px] truncate text-xs text-slate-300">
                  {currentUser.name || currentUser.email}
                </div>
                <div className="text-[10px] text-slate-600">{currentUser.role.toLowerCase()}</div>
              </div>
              <button
                onClick={onLogout}
                title="Sign out"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-500 transition hover:bg-[#15181e] hover:text-slate-200"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="ml-1 inline-flex h-9 items-center gap-2 rounded-md px-3 text-xs font-medium text-slate-300 transition hover:bg-[#15181e] hover:text-white"
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
