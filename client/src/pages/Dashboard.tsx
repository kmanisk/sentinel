import React, { useEffect, useMemo, useState } from "react";
import { Clock3, ExternalLink, RefreshCw } from "lucide-react";
import { Heartbeat, Monitor } from "../types";
import { MonitorCard } from "../components/MonitorCard";
import { LatencyChart } from "../components/LatencyChart";
import { StatusBadge } from "../components/StatusBadge";
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

  const latestCheck = useMemo(() => {
    const times = monitors
      .map((monitor) => monitor.lastCheckAt)
      .filter((value): value is string => Boolean(value))
      .map((value) => new Date(value).getTime())
      .filter(Number.isFinite);

    return times.length ? new Date(Math.max(...times)) : null;
  }, [monitors]);

  useEffect(() => {
    if (!selectedMonitor) {
      setMetricsData([]);
      return;
    }

    ApiClient.getMetrics(selectedMonitor.id, 60)
      .then((res) => setMetricsData(res.metrics))
      .catch((err) => console.error("Error fetching metrics:", err));
  }, [selectedMonitor?.id, selectedMonitor?.lastCheckAt]);

  const headline =
    downCount > 0
      ? `${downCount} endpoint${downCount === 1 ? "" : "s"} need attention`
      : degradedCount > 0
      ? `${degradedCount} endpoint${degradedCount === 1 ? "" : "s"} are degraded`
      : "All monitored endpoints are operational";

  return (
    <div className="space-y-5">
      <section className="section-reveal flex flex-col gap-5 border-b border-[var(--ink)] pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">
            {headline}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
            Uptime, response time and incident state across {totalMonitors || "your"} configured endpoints.
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--muted)]">
          <Clock3 className="h-3.5 w-3.5" />
          <span>
            {latestCheck
              ? `Last sample ${latestCheck.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`
              : "Awaiting first sample"}
          </span>
        </div>
      </section>

      <section className="section-reveal section-reveal-delay grid border-y border-[var(--ink)] bg-[var(--paper-raised)] sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Monitors", String(totalMonitors), "configured endpoints"],
          ["Avg latency", `${avgGlobalLatency} ms`, "latest samples"],
          ["24h uptime", `${avgUptime.toFixed(2)}%`, "mean availability"],
          ["Incidents", String(downCount), downCount ? "open now" : "none open"],
        ].map(([label, value, detail], index) => (
          <div
            key={label}
            className={`px-4 py-4 sm:px-5 ${
              index > 0 ? "border-t border-[var(--line)] sm:border-l sm:border-t-0" : ""
            } ${index === 2 ? "sm:border-t lg:border-t-0" : ""}`}
          >
            <div className="sentinel-eyebrow">{label}</div>
            <div className="mt-2 font-mono text-2xl font-semibold tracking-[-0.04em]">{value}</div>
            <div className="mt-1 text-[11px] text-[var(--muted)]">{detail}</div>
          </div>
        ))}
      </section>

      {selectedMonitor && (
        <div className="section-reveal section-reveal-delay-2 grid gap-4 xl:grid-cols-[minmax(0,1fr)_310px]">
          <LatencyChart data={metricsData} monitorName={selectedMonitor.name} />

          <aside className="sentinel-sheet flex min-h-[360px] flex-col">
            <div className="border-b border-[var(--line)] px-4 py-3">
              <p className="sentinel-eyebrow">Selected endpoint</p>
              <div className="mt-2 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate text-base font-semibold tracking-[-0.02em]">
                    {selectedMonitor.name}
                  </h2>
                  <a
                    href={selectedMonitor.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-flex max-w-full items-center gap-1 font-mono text-[10px] text-[var(--muted)] underline-offset-4 hover:text-[var(--ink)] hover:underline"
                  >
                    <span className="truncate">{selectedMonitor.url}</span>
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                </div>
                <StatusBadge status={selectedMonitor.status} size="sm" />
              </div>
            </div>

            <dl className="divide-y divide-[var(--line)]">
              {[
                ["Method", selectedMonitor.method],
                [
                  "Last latency",
                  selectedMonitor.lastLatency !== null && selectedMonitor.lastLatency !== undefined
                    ? `${selectedMonitor.lastLatency} ms`
                    : "—",
                ],
                ["24h uptime", `${selectedMonitor.uptime24h.toFixed(2)}%`],
                ["Interval", `${selectedMonitor.interval}s`],
                ["Timeout", `${selectedMonitor.timeout} ms`],
                ["Expected HTTP", String(selectedMonitor.expectedStatus)],
              ].map(([label, value]) => (
                <div key={label} className="grid grid-cols-[1fr_auto] gap-4 px-4 py-3">
                  <dt className="text-xs text-[var(--muted)]">{label}</dt>
                  <dd className="font-mono text-xs font-semibold">{value}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-auto border-t border-[var(--line)] px-4 py-3 font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--muted)]">
              ID {selectedMonitor.id.slice(0, 8)}
            </div>
          </aside>
        </div>
      )}

      <section className="section-reveal section-reveal-delay-2 pt-1">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 className="mt-1 text-lg font-semibold tracking-[-0.02em]">Monitored endpoints</h2>
          </div>
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="sentinel-key h-8 px-2.5 text-[11px] font-semibold"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {monitors.length === 0 ? (
          <div className="sentinel-sheet border-dashed px-6 py-14 text-center">
            <p className="text-sm font-medium">No endpoints are being monitored.</p>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Create a monitor to start collecting uptime and latency data.
            </p>
          </div>
        ) : (
          <div className="border-x border-b border-[var(--line)] bg-[var(--paper-raised)]">
            <div className="hidden grid-cols-[minmax(0,1.65fr)_130px_105px_190px_95px_100px] gap-3 border-y border-[var(--ink)] px-4 py-2 lg:grid">
              {["Endpoint", "State", "Latency", "24h timeline", "Checked", "Actions"].map((label) => (
                <span
                  key={label}
                  className={`sentinel-eyebrow ${label === "Actions" ? "text-right" : ""}`}
                >
                  {label}
                </span>
              ))}
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
