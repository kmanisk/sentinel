import React from "react";
import { Bell, LogIn, LogOut, Moon, Plus, Sun } from "lucide-react";
import { User } from "../types";

interface NavbarProps {
  currentUser: User | null;
  theme: "light" | "dark";
  onToggleTheme: () => void;
  onOpenAddMonitor: () => void;
  onOpenAlerts: () => void;
  onOpenAuth: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  theme,
  onToggleTheme,
  onOpenAddMonitor,
  onOpenAlerts,
  onOpenAuth,
  onLogout,
}) => {
  const nextTheme = theme === "dark" ? "light" : "dark";

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--ink)] bg-[var(--header)] backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-[1500px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
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

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleTheme}
            title={`Switch to ${nextTheme} mode`}
            className="sentinel-icon-key"
            aria-label={`Switch to ${nextTheme} mode`}
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          <button
            type="button"
            onClick={onOpenAlerts}
            title="Alert channels"
            className="sentinel-icon-key"
            aria-label="Alert channels"
          >
            <Bell className="h-4 w-4" />
          </button>

          <button
            type="button"
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
                type="button"
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
              type="button"
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
