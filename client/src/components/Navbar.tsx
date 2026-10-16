import React from "react";
import { Activity, Plus, Bell, LogIn, LogOut, Radio } from "lucide-react";
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
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-[#0B0F17]/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand & System Status */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-md shadow-indigo-600/10">
              <Activity className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <span className="font-bold text-slate-100 tracking-tight text-lg font-mono">
                SENTINEL
              </span>
              <span className="hidden sm:inline-block ml-2 text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                v1.0
              </span>
            </div>
          </div>

          <div className="hidden md:flex items-center pl-3 border-l border-slate-800">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                systemStatus === "UP"
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : systemStatus === "DEGRADED"
                  ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                  : "bg-rose-500/10 text-rose-400 border-rose-500/20"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  systemStatus === "UP"
                    ? "bg-emerald-500"
                    : systemStatus === "DEGRADED"
                    ? "bg-amber-500"
                    : "bg-rose-500 animate-ping"
                }`}
              />
              {systemStatus === "UP"
                ? "All Systems Operational"
                : systemStatus === "DEGRADED"
                ? "Degraded Performance"
                : "Active Incidents Detected"}
            </span>
          </div>
        </div>

        {/* Live WS Telemetry & Controls */}
        <div className="flex items-center gap-3">
          {/* Live WS Status Pill */}
          <div
            title={isWsConnected ? "Live WebSocket connection established" : "Attempting reconnect to telemetry stream"}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-400"
          >
            <Radio
              className={`w-3.5 h-3.5 ${
                isWsConnected ? "text-emerald-400 animate-pulse" : "text-amber-500"
              }`}
            />
            <span>{isWsConnected ? "Live Telemetry" : "Reconnecting"}</span>
          </div>

          <button
            onClick={onOpenAlerts}
            title="Configure Alert Webhooks"
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-slate-100 transition-colors"
          >
            <Bell className="w-4 h-4" />
          </button>

          <button
            onClick={onOpenAddMonitor}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-md shadow-indigo-600/20 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Monitor</span>
          </button>

          {/* User Auth */}
          {currentUser ? (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
              <span className="text-xs font-mono text-slate-300 hidden md:inline truncate max-w-[120px]">
                {currentUser.name || currentUser.email}
              </span>
              <button
                onClick={onLogout}
                title="Sign Out"
                className="p-2 rounded-xl bg-slate-900 hover:bg-rose-500/20 border border-slate-800 text-slate-400 hover:text-rose-400 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-slate-100 text-xs font-medium transition-colors"
            >
              <LogIn className="w-3.5 h-3.5 text-indigo-400" />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
