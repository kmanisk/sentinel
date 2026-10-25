import React, { useCallback, useEffect, useRef, useState } from "react";
import { Monitor, User } from "./types";
import { ApiClient } from "./services/api";
import { TelemetrySocket } from "./services/websocket";
import { Navbar } from "./components/Navbar";
import { Dashboard } from "./pages/Dashboard";
import { MonitorModal } from "./components/MonitorModal";
import { AlertSettingsModal } from "./components/AlertSettingsModal";
import { AuthModal } from "./components/AuthModal";
import { ToastNotice, ToastStack, ToastTone } from "./components/Toast";

type Theme = "light" | "dark";

const initialTheme = (): Theme => {
  if (typeof window === "undefined") return "light";

  const stored = localStorage.getItem("sentinel-theme");
  if (stored === "light" || stored === "dark") return stored;

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

export const App: React.FC = () => {
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [selectedMonitor, setSelectedMonitor] = useState<Monitor | null>(null);
  const [monitorToEdit, setMonitorToEdit] = useState<Monitor | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAlertsModalOpen, setIsAlertsModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [theme, setTheme] = useState<Theme>(initialTheme);
  const [toasts, setToasts] = useState<ToastNotice[]>([]);
  const toastId = useRef(0);
  const toastTimers = useRef(new Map<number, number>());

  const dismissToast = useCallback((id: number) => {
    const timer = toastTimers.current.get(id);
    if (timer) window.clearTimeout(timer);
    toastTimers.current.delete(id);
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const pushToast = useCallback((title: string, tone: ToastTone = "info", detail?: string) => {
    const id = ++toastId.current;
    setToasts((current) => [...current.slice(-2), { id, title, detail, tone }]);

    const timer = window.setTimeout(() => {
      toastTimers.current.delete(id);
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 3200);

    toastTimers.current.set(id, timer);
  }, []);

  useEffect(() => {
    return () => {
      toastTimers.current.forEach((timer) => window.clearTimeout(timer));
      toastTimers.current.clear();
    };
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    localStorage.setItem("sentinel-theme", theme);
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", theme === "dark" ? "#141511" : "#f5f2ea");
  }, [theme]);

  const loadMonitors = useCallback(
    async (announce = false) => {
      try {
        setIsRefreshing(true);
        const res = await ApiClient.getMonitors();
        setMonitors(res.monitors);
        setSelectedMonitor((current) => {
          if (!res.monitors.length) return null;
          if (!current) return res.monitors[0];
          return res.monitors.find((monitor) => monitor.id === current.id) || res.monitors[0];
        });

        if (announce) {
          pushToast(
            "Endpoint data refreshed",
            "success",
            `${res.monitors.length} monitor${res.monitors.length === 1 ? "" : "s"} synced`
          );
        }
      } catch (err: unknown) {
        console.error("Failed to load monitors:", err);
        if (announce) {
          pushToast(
            "Refresh failed",
            "error",
            err instanceof Error ? err.message : "Monitor data could not be loaded."
          );
        }
      } finally {
        setIsRefreshing(false);
      }
    },
    [pushToast]
  );

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const oauthToken = hash.get("auth_token");
    const oauthError = hash.get("auth_error");

    if (oauthToken) {
      ApiClient.setToken(oauthToken);
      pushToast("OAuth sign-in completed", "success");
    }

    if (oauthToken || oauthError) {
      window.history.replaceState({}, document.title, `${window.location.pathname}${window.location.search}`);
    }

    if (oauthError) {
      setIsAuthModalOpen(true);
      pushToast("OAuth sign-in failed", "error", oauthError);
    }

    ApiClient.getMe()
      .then((res) => setCurrentUser(res.user))
      .catch(() => setCurrentUser(null));
  }, [pushToast]);

  useEffect(() => {
    const ws = TelemetrySocket.getInstance();
    ws.connect();

    const unsubHeartbeat = ws.onHeartbeat(({ monitor, heartbeat }) => {
      setMonitors((prev) =>
        prev.map((m) => {
          if (m.id !== monitor.id) return m;
          const existingHbs = m.heartbeats || [];
          return {
            ...monitor,
            heartbeats: [heartbeat, ...existingHbs.slice(0, 23)],
          };
        })
      );

      setSelectedMonitor((cur) => (cur?.id === monitor.id ? { ...cur, ...monitor } : cur));
    });

    const unsubUpdate = ws.onMonitorUpdated(({ monitor }) => {
      setMonitors((prev) => {
        const idx = prev.findIndex((m) => m.id === monitor.id);
        if (idx < 0) return [monitor, ...prev];
        const updated = [...prev];
        updated[idx] = { ...updated[idx], ...monitor };
        return updated;
      });
    });

    const unsubDelete = ws.onMonitorDeleted(({ id }) => {
      setMonitors((prev) => prev.filter((m) => m.id !== id));
      setSelectedMonitor((cur) => (cur?.id === id ? null : cur));
    });

    void loadMonitors();

    return () => {
      unsubHeartbeat();
      unsubUpdate();
      unsubDelete();
    };
  }, [loadMonitors]);

  const handleToggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    pushToast(`${next === "dark" ? "Dark" : "Light"} mode enabled`, "info");
  };

  const handleSaveMonitor = async (data: Partial<Monitor>) => {
    if (monitorToEdit) {
      const res = await ApiClient.updateMonitor(monitorToEdit.id, data);
      setMonitors((prev) => prev.map((m) => (m.id === res.monitor.id ? res.monitor : m)));
      setSelectedMonitor((current) => (current?.id === res.monitor.id ? res.monitor : current));
      pushToast("Monitor updated", "success", res.monitor.name);
    } else {
      const res = await ApiClient.createMonitor(data);
      setMonitors((prev) => [res.monitor, ...prev]);
      setSelectedMonitor((current) => current || res.monitor);
      pushToast("Monitor created", "success", res.monitor.name);
    }
    setMonitorToEdit(null);
  };

  const handleDeleteMonitor = async (id: string) => {
    const monitor = monitors.find((item) => item.id === id);
    if (!confirm(`Delete ${monitor?.name || "this monitor"} and its recorded telemetry?`)) return;

    try {
      await ApiClient.deleteMonitor(id);
      setMonitors((prev) => {
        const next = prev.filter((m) => m.id !== id);
        setSelectedMonitor((current) => (current?.id === id ? next[0] || null : current));
        return next;
      });
      pushToast("Monitor deleted", "success", monitor?.name);
    } catch (err: unknown) {
      pushToast(
        "Delete failed",
        "error",
        err instanceof Error ? err.message : "The monitor could not be deleted."
      );
    }
  };

  const handleEditClick = (monitor: Monitor) => {
    setMonitorToEdit(monitor);
    setIsAddModalOpen(true);
  };

  const handleLogout = () => {
    ApiClient.logout();
    setCurrentUser(null);
    pushToast("Signed out", "info");
  };

  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      <Navbar
        currentUser={currentUser}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onOpenAddMonitor={() => {
          setMonitorToEdit(null);
          setIsAddModalOpen(true);
        }}
        onOpenAlerts={() => setIsAlertsModalOpen(true)}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
      />

      <main className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <Dashboard
          monitors={monitors}
          selectedMonitor={selectedMonitor}
          onSelectMonitor={setSelectedMonitor}
          onEditMonitor={handleEditClick}
          onDeleteMonitor={handleDeleteMonitor}
          onRefresh={() => void loadMonitors(true)}
          isRefreshing={isRefreshing}
          onNotify={pushToast}
        />
      </main>

      <footer className="mt-10 border-t border-[var(--line)]">
        <div className="mx-auto flex max-w-[1500px] flex-col gap-2 px-4 py-4 text-[11px] text-[var(--muted)] sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <span className="font-mono">SENTINEL / API HEALTH WORKSPACE</span>
          <div className="flex items-center gap-4">
            <a className="underline-offset-4 hover:underline" href="/health">Health</a>
            <a
              className="underline-offset-4 hover:underline"
              href="https://github.com/kmanisk/sentinel"
              target="_blank"
              rel="noreferrer"
            >
              Source
            </a>
          </div>
        </div>
      </footer>

      <MonitorModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setMonitorToEdit(null);
        }}
        onSave={handleSaveMonitor}
        monitorToEdit={monitorToEdit}
      />

      <AlertSettingsModal
        isOpen={isAlertsModalOpen}
        onClose={() => setIsAlertsModalOpen(false)}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={(user) => {
          setCurrentUser(user);
          pushToast("Signed in", "success", user.name || user.email);
        }}
      />

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};
