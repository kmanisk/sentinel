import React, { useState, useEffect } from "react";
import { Server, Activity, Percent, AlertTriangle, RefreshCw } from "lucide-react";
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

  // Calculate high-level KPIs
  const totalMonitors = monitors.length;
  const activeOutages = monitors.filter((m) => m.status === "DOWN").length;

  const validLatencies = monitors
    .map((m) => m.lastLatency)
    .filter((l): l is number => typeof l === "number" && l > 0);

  const avgGlobalLatency =
    validLatencies.length > 0
      ? Math.round(validLatencies.reduce((a, b) => a + b, 0) / validLatencies.length)
      : 0;

  const avgUptime =
    monitors.length > 0
      ? (monitors.reduce((sum, m) => sum + m.uptime24h, 0) / monitors.length).toFixed(1)
      : "100.0";

  // Fetch full metrics for the selected monitor
  useEffect(() => {
    if (selectedMonitor) {
      ApiClient.getMetrics(selectedMonitor.id, 60)
        .then((res) => setMetricsData(res.metrics))
        .catch((err) => console.error("Error fetching metrics:", err));
    }
  }, [selectedMonitor?.id, selectedMonitor?.lastCheckAt]);

  return (
    <div className="space-y-8">
      {/* KPI Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Monitored Services */}
        <div className="p-5 rounded-2xl bg-[#111827]/80 border border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">Services</span>
            <Server className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100">{totalMonitors}</div>
          <div className="text-[11px] text-slate-500">Active health check targets</div>
        </div>

        {/* Global Latency */}
        <div className="p-5 rounded-2xl bg-[#111827]/80 border border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">Avg Latency</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100 flex items-baseline gap-1">
            <span>{avgGlobalLatency}</span>
            <span className="text-xs font-normal text-slate-400">ms</span>
          </div>
          <div className="text-[11px] text-slate-500">Across operational nodes</div>
        </div>

        {/* Uptime % */}
        <div className="p-5 rounded-2xl bg-[#111827]/80 border border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">24h Uptime</span>
            <Percent className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400">{avgUptime}%</div>
          <div className="text-[11px] text-slate-500">Rolling SLA availability</div>
        </div>

        {/* Active Outages */}
        <div className="p-5 rounded-2xl bg-[#111827]/80 border border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">Active Incidents</span>
            <AlertTriangle className={`w-4 h-4 ${activeOutages > 0 ? "text-rose-400" : "text-slate-500"}`} />
          </div>
          <div
            className={`text-2xl font-bold font-mono ${
              activeOutages > 0 ? "text-rose-400" : "text-slate-100"
            }`}
          >
            {activeOutages}
          </div>
          <div className="text-[11px] text-slate-500">
            {activeOutages === 0 ? "Zero outages recorded" : "Action required"}
          </div>
        </div>
      </div>

      {/* Selected Monitor Chart Section */}
      {selectedMonitor && (
        <section className="animate-fade-in">
          <LatencyChart data={metricsData} monitorName={selectedMonitor.name} />
        </section>
      )}

      {/* Monitors Grid Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">Monitored Endpoints</h2>
            <p className="text-xs text-slate-400">Real-time status probes and latency streams</p>
          </div>

          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-300 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-indigo-400" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>

        {monitors.length === 0 ? (
          <div className="py-16 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-900/20 space-y-2">
            <Activity className="w-10 h-10 text-slate-600 mx-auto" />
            <h3 className="text-sm font-semibold text-slate-300">No Monitored Endpoints Yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Add your first API endpoint to begin capturing sub-second latency telemetry and uptime analytics.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
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
