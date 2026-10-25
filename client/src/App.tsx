import React, { useCallback, useEffect, useState } from "react";
import { Monitor, User } from "./types";
import { ApiClient } from "./services/api";
import { TelemetrySocket } from "./services/websocket";
import { Navbar } from "./components/Navbar";
import { Dashboard } from "./pages/Dashboard";
import { MonitorModal } from "./components/MonitorModal";
import { AlertSettingsModal } from "./components/AlertSettingsModal";
import { AuthModal } from "./components/AuthModal";

export const App: React.FC = () => {
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [selectedMonitor, setSelectedMonitor] = useState<Monitor | null>(null);
  const [monitorToEdit, setMonitorToEdit] = useState<Monitor | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAlertsModalOpen, setIsAlertsModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isWsConnected, setIsWsConnected] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadMonitors = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const res = await ApiClient.getMonitors();
      setMonitors(res.monitors);
      setSelectedMonitor((current) => {
        if (!res.monitors.length) return null;
        if (!current) return res.monitors[0];
        return res.monitors.find((monitor) => monitor.id === current.id) || res.monitors[0];
      });
    } catch (err) {
      console.error("Failed to load monitors:", err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const oauthToken = hash.get("auth_token");
    const oauthError = hash.get("auth_error");

    if (oauthToken) {
      ApiClient.setToken(oauthToken);
    }

    if (oauthToken || oauthError) {
      window.history.replaceState({}, document.title, `${window.location.pathname}${window.location.search}`);
    }

    if (oauthError) {
      setIsAuthModalOpen(true);
    }

    ApiClient.getMe()
      .then((res) => setCurrentUser(res.user))
      .catch(() => setCurrentUser(null));
  }, []);

  useEffect(() => {
    const ws = TelemetrySocket.getInstance();
    ws.connect();

    const unsubConn = ws.onConnectionChange(setIsWsConnected);

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

    loadMonitors();

    return () => {
      unsubConn();
      unsubHeartbeat();
      unsubUpdate();
      unsubDelete();
    };
  }, [loadMonitors]);

  const overallSystemStatus: "UP" | "DEGRADED" | "DOWN" = monitors.some((m) => m.status === "DOWN")
    ? "DOWN"
    : monitors.some((m) => m.status === "DEGRADED")
    ? "DEGRADED"
    : "UP";

  const handleSaveMonitor = async (data: Partial<Monitor>) => {
    if (monitorToEdit) {
      const res = await ApiClient.updateMonitor(monitorToEdit.id, data);
      setMonitors((prev) => prev.map((m) => (m.id === res.monitor.id ? res.monitor : m)));
      setSelectedMonitor((current) => (current?.id === res.monitor.id ? res.monitor : current));
    } else {
      const res = await ApiClient.createMonitor(data);
      setMonitors((prev) => [res.monitor, ...prev]);
      setSelectedMonitor((current) => current || res.monitor);
    }
    setMonitorToEdit(null);
  };

  const handleDeleteMonitor = async (id: string) => {
    if (!confirm("Delete this monitor and its recorded telemetry?")) return;

    await ApiClient.deleteMonitor(id);
    setMonitors((prev) => {
      const next = prev.filter((m) => m.id !== id);
      setSelectedMonitor((current) => (current?.id === id ? next[0] || null : current));
      return next;
    });
  };

  const handleEditClick = (monitor: Monitor) => {
    setMonitorToEdit(monitor);
    setIsAddModalOpen(true);
  };

  const handleLogout = () => {
    ApiClient.logout();
    setCurrentUser(null);
  };

  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      <Navbar
        systemStatus={overallSystemStatus}
        isWsConnected={isWsConnected}
        currentUser={currentUser}
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
          onRefresh={loadMonitors}
          isRefreshing={isRefreshing}
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
        onSuccess={(user) => setCurrentUser(user)}
      />
    </div>
  );
};
