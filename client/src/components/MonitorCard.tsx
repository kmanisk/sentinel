import React, { useState } from "react";
import { Edit2, ExternalLink, Play, Trash2 } from "lucide-react";
import { Monitor } from "../types";
import { StatusBadge } from "./StatusBadge";
import { UptimeBar } from "./UptimeBar";
import { ApiClient } from "../services/api";

interface MonitorCardProps {
  monitor: Monitor;
  isSelected: boolean;
  onSelect: (monitor: Monitor) => void;
  onEdit: (monitor: Monitor) => void;
  onDelete: (id: string) => void;
}

const latencyClass = (latency?: number | null) => {
  if (latency === null || latency === undefined) return "text-slate-500";
  if (latency < 300) return "text-emerald-400";
  if (latency < 1000) return "text-amber-400";
  return "text-rose-400";
};

export const MonitorCard: React.FC<MonitorCardProps> = ({
  monitor,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
}) => {
  const [isTesting, setIsTesting] = useState(false);

  const handleTestNow = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setIsTesting(true);
      await ApiClient.triggerCheck(monitor.id);
    } catch (err) {
      console.error("Test check failed:", err);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <article
      onClick={() => onSelect(monitor)}
      className={`group cursor-pointer border transition ${
        isSelected
          ? "border-[#555e72] bg-[#11151b]"
          : "border-[#22262d] bg-[#0d1014] hover:border-[#343943] hover:bg-[#101319]"
      }`}
    >
      <div className="grid gap-4 px-4 py-4 lg:grid-cols-[minmax(0,1.7fr)_150px_110px_120px_120px] lg:items-center">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <span className="rounded border border-[#303640] bg-[#171b21] px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-400">
              {monitor.method}
            </span>
            <h3 className="truncate text-sm font-medium text-slate-100">{monitor.name}</h3>
          </div>
          <a
            href={monitor.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="mt-1 inline-flex max-w-full items-center gap-1 text-[11px] text-slate-500 transition hover:text-slate-300"
          >
            <span className="truncate font-mono">{monitor.url}</span>
            <ExternalLink className="h-3 w-3 shrink-0" />
          </a>
        </div>

        <div className="flex items-center lg:block">
          <StatusBadge status={monitor.status} />
        </div>

        <div>
          <div className="text-[10px] uppercase tracking-[0.12em] text-slate-600 lg:hidden">Latency</div>
          <div className={`font-mono text-sm font-medium ${latencyClass(monitor.lastLatency)}`}>
            {monitor.lastLatency !== null && monitor.lastLatency !== undefined
              ? `${monitor.lastLatency} ms`
              : "—"}
          </div>
        </div>

        <div className="min-w-0">
          <div className="mb-1 flex items-center justify-between text-[10px] text-slate-600">
            <span>24h</span>
            <span className="font-mono text-slate-400">{monitor.uptime24h.toFixed(2)}%</span>
          </div>
          <UptimeBar heartbeats={monitor.heartbeats} uptimePercentage={monitor.uptime24h} />
        </div>

        <div className="flex items-center justify-between gap-3 lg:justify-end">
          <span className="text-[10px] text-slate-600 lg:hidden">
            {monitor.lastCheckAt
              ? new Date(monitor.lastCheckAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
              : "Not checked"}
          </span>

          <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={handleTestNow}
              disabled={isTesting}
              title="Run check now"
              className="p-2 text-slate-500 transition hover:bg-[#191d24] hover:text-slate-100 disabled:opacity-40"
            >
              <Play className={`h-3.5 w-3.5 ${isTesting ? "animate-pulse" : ""}`} />
            </button>
            <button
              onClick={() => onEdit(monitor)}
              title="Edit monitor"
              className="p-2 text-slate-500 transition hover:bg-[#191d24] hover:text-slate-100"
            >
              <Edit2 className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => onDelete(monitor.id)}
              title="Delete monitor"
              className="p-2 text-slate-500 transition hover:bg-rose-500/10 hover:text-rose-400"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
};
