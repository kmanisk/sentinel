import React, { useState, useEffect, useCallback } from "react";
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

  // Fetch monitors list
  const loadMonitors = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const res = await ApiClient.getMonitors();
      setMonitors(res.monitors);
      if (res.monitors.length > 0 && !selectedMonitor) {
        setSelectedMonitor(res.monitors[0]);
      }
    } catch (err) {
      console.error("Failed to load monitors:", err);
    } finally {
      setIsRefreshing(false);
    }
  }, [selectedMonitor]);

  // Check current session
  useEffect(() => {
    ApiClient.getMe()
      .then((res) => setCurrentUser(res.user))
      .catch(() => setCurrentUser(null));
  }, []);

  // Connect WebSocket & bind event listeners
  useEffect(() => {
    const ws = TelemetrySocket.getInstance();
    ws.connect();

    const unsubConn = ws.onConnectionChange((connected) => {
      setIsWsConnected(connected);
    });

    const unsubHeartbeat = ws.onHeartbeat(({ monitor, heartbeat }) => {
      setMonitors((prev) =>
        prev.map((m) => {
          if (m.id === monitor.id) {
            const existingHbs = m.heartbeats || [];
            return {
              ...monitor,
              heartbeats: [heartbeat, ...existingHbs.slice(0, 23)],
            };
          }
          return m;
        })
      );

      // Also update selected monitor in real-time if it's the active one
      setSelectedMonitor((cur) => (cur?.id === monitor.id ? { ...cur, ...monitor } : cur));
    });

    const unsubUpdate = ws.onMonitorUpdated(({ monitor }) => {
      setMonitors((prev) => {
        const idx = prev.findIndex((m) => m.id === monitor.id);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = { ...updated[idx], ...monitor };
          return updated;
        }
        return [monitor, ...prev];
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

  // Overall system health calculation
  const overallSystemStatus: "UP" | "DEGRADED" | "DOWN" = monitors.some((m) => m.status === "DOWN")
    ? "DOWN"
    : monitors.some((m) => m.status === "DEGRADED")
    ? "DEGRADED"
    : "UP";

  // CRUD Handlers
  const handleSaveMonitor = async (data: Partial<Monitor>) => {
    if (monitorToEdit) {
      const res = await ApiClient.updateMonitor(monitorToEdit.id, data);
      setMonitors((prev) => prev.map((m) => (m.id === res.monitor.id ? res.monitor : m)));
    } else {
      const res = await ApiClient.createMonitor(data);
      setMonitors((prev) => [res.monitor, ...prev]);
      if (!selectedMonitor) setSelectedMonitor(res.monitor);
    }
    setMonitorToEdit(null);
  };

  const handleDeleteMonitor = async (id: string) => {
    if (confirm("Are you sure you want to delete this monitor?")) {
      await ApiClient.deleteMonitor(id);
      setMonitors((prev) => prev.filter((m) => m.id !== id));
      if (selectedMonitor?.id === id) {
        setSelectedMonitor(monitors.find((m) => m.id !== id) || null);
      }
    }
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
    <div className="min-h-screen flex flex-col bg-[#0B0F17] text-slate-100 font-sans selection:bg-indigo-500/20">
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

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Dashboard
          monitors={monitors}
          selectedMonitor={selectedMonitor}
          onSelectMonitor={(m) => setSelectedMonitor(m)}
          onEditMonitor={handleEditClick}
          onDeleteMonitor={handleDeleteMonitor}
          onRefresh={loadMonitors}
          isRefreshing={isRefreshing}
        />
      </main>

      {/* Modern Developer Footer */}
      <footer className="border-t border-slate-800/80 bg-[#0B0F17] py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-mono font-semibold text-slate-400">SENTINEL</span>
            <span>— Production-grade API Health & Latency Telemetry Engine</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400 font-mono text-[11px]">
            <span>Fastify</span>
            <span>•</span>
            <span>React 18</span>
            <span>•</span>
            <span>WebSockets</span>
            <span>•</span>
            <span>Prisma</span>
            <span>•</span>
            <span>Docker</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
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
