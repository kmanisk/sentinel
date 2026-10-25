import React, { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Heartbeat, Monitor } from "../types";
import { MonitorCard } from "../components/MonitorCard";
import { LatencyChart } from "../components/LatencyChart";
import { ApiClient } from "../services/api";

interface DashboardProps {
  monitors: Monitor[];
  selectedMonitor: Monitor | null;
  onSelectMonitor: (m: Monitor) => void;
  onEditMonitor: (m: Monitor) => void;
  onDeleteMonitor: (id: string) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export const Dashboard: React.FC<DashboardProps> = ({
  monitors,
  selectedMonitor,
  onSelectMonitor,
  onEditMonitor,
  onDeleteMonitor,
  onRefresh,
  isRefreshing,
}) => {
  const [metricsData, setMetricsData] = useState<Heartbeat[]>([]);

  const totalMonitors = monitors.length;
  const downCount = monitors.filter((m) => m.status === "DOWN").length;
  const degradedCount = monitors.filter((m) => m.status === "DEGRADED").length;

  const validLatencies = monitors
    .map((m) => m.lastLatency)
    .filter((l): l is number => typeof l === "number" && l >= 0);

  const avgGlobalLatency = validLatencies.length
    ? Math.round(validLatencies.reduce((a, b) => a + b, 0) / validLatencies.length)
    : 0;

  const avgUptime = monitors.length
    ? monitors.reduce((sum, m) => sum + m.uptime24h, 0) / monitors.length
    : 100;

  useEffect(() => {
    if (!selectedMonitor) {
      setMetricsData([]);
      return;
    }

    ApiClient.getMetrics(selectedMonitor.id, 60)
      .then((res) => setMetricsData(res.metrics))
      .catch((err) => console.error("Error fetching metrics:", err));
  }, [selectedMonitor?.id, selectedMonitor?.lastCheckAt]);

  return (
    <div className="space-y-7">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-slate-600">Monitoring workspace</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-slate-100">Overview</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Health, response time and incidents across {totalMonitors || "your"} monitored endpoints.
          </p>
        </div>
        <div className="text-xs text-slate-500">
          {downCount > 0
            ? `${downCount} endpoint${downCount === 1 ? "" : "s"} down`
            : degradedCount > 0
            ? `${degradedCount} endpoint${degradedCount === 1 ? "" : "s"} degraded`
            : "No active incidents"}
        </div>
      </section>

      <section className="grid border-y border-[#242830] bg-[#0d1014] sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Monitors", String(totalMonitors), "configured endpoints"],
          ["Avg latency", `${avgGlobalLatency} ms`, "latest checks"],
          ["24h uptime", `${avgUptime.toFixed(2)}%`, "average availability"],
          ["Incidents", String(downCount), downCount ? "requires attention" : "currently open"],
        ].map(([label, value, detail], index) => (
          <div
            key={label}
            className={`px-4 py-4 ${index > 0 ? "border-t border-[#242830] sm:border-l sm:border-t-0" : ""} ${
              index === 2 ? "sm:border-t lg:border-t-0" : ""
            }`}
          >
            <div className="text-[10px] uppercase tracking-[0.14em] text-slate-600">{label}</div>
            <div className="mt-2 font-mono text-xl font-medium tracking-[-0.03em] text-slate-100">{value}</div>
            <div className="mt-1 text-[11px] text-slate-600">{detail}</div>
          </div>
        ))}
      </section>

      {selectedMonitor && <LatencyChart data={metricsData} monitorName={selectedMonitor.name} />}

      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-medium text-slate-200">Endpoints</h2>
            <p className="mt-0.5 text-[11px] text-slate-600">Select a row to inspect its recent latency.</p>
          </div>
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 rounded-md border border-[#2b3038] px-2.5 py-1.5 text-[11px] text-slate-400 transition hover:bg-[#14171c] hover:text-slate-200 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {monitors.length === 0 ? (
          <div className="border border-dashed border-[#2b3038] bg-[#0d1014] px-6 py-14 text-center">
            <p className="text-sm text-slate-400">No endpoints are being monitored.</p>
            <p className="mt-1 text-xs text-slate-600">Create a monitor to start collecting uptime and latency data.</p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="hidden grid-cols-[minmax(0,1.7fr)_150px_110px_120px_120px] gap-4 px-4 text-[10px] uppercase tracking-[0.12em] text-slate-600 lg:grid">
              <span>Endpoint</span>
              <span>Status</span>
              <span>Latency</span>
              <span>Uptime</span>
              <span className="text-right">Actions</span>
            </div>
            {monitors.map((monitor) => (
              <MonitorCard
                key={monitor.id}
                monitor={monitor}
                isSelected={selectedMonitor?.id === monitor.id}
                onSelect={onSelectMonitor}
                onEdit={onEditMonitor}
                onDelete={onDeleteMonitor}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
