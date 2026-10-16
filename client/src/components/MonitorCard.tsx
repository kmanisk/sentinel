import React, { useState } from "react";
import { Play, LineChart, Edit2, Trash2, ExternalLink } from "lucide-react";
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
    <div
      onClick={() => onSelect(monitor)}
      className={`group relative p-5 rounded-xl border transition-all duration-200 cursor-pointer ${
        isSelected
          ? "bg-slate-900/90 border-indigo-500/80 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500/40"
          : "bg-[#111827]/70 hover:bg-[#111827] border-slate-800 hover:border-slate-700 shadow-sm"
      }`}
    >
      {/* Top Header Row */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700/60">
              {monitor.method}
            </span>
            <h3 className="font-semibold text-slate-100 truncate text-base group-hover:text-indigo-300 transition-colors">
              {monitor.name}
            </h3>
          </div>

          <a
            href={monitor.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 text-xs font-mono text-slate-400 hover:text-indigo-400 truncate max-w-full transition-colors"
          >
            <span className="truncate">{monitor.url}</span>
            <ExternalLink className="w-3 h-3 flex-shrink-0 opacity-70" />
          </a>
        </div>

        <div className="flex-shrink-0">
          <StatusBadge status={monitor.status} />
        </div>
      </div>

      {/* Latency & Telemetry Metric Row */}
      <div className="grid grid-cols-2 gap-4 my-4 py-3 border-y border-slate-800/80">
        <div>
          <div className="text-xs text-slate-500">Current Latency</div>
          <div className="text-xl font-mono font-bold text-slate-100 mt-0.5 flex items-baseline gap-1">
            {monitor.lastLatency !== null && monitor.lastLatency !== undefined ? (
              <>
                <span
                  className={
                    monitor.lastLatency < 300
                      ? "text-emerald-400"
                      : monitor.lastLatency < 1000
                      ? "text-amber-400"
                      : "text-rose-400"
                  }
                >
                  {monitor.lastLatency}
                </span>
                <span className="text-xs font-normal text-slate-400">ms</span>
              </>
            ) : (
              <span className="text-slate-500 text-sm">Waiting...</span>
            )}
          </div>
        </div>

        <div>
          <div className="text-xs text-slate-500">Check Interval</div>
          <div className="text-sm font-mono text-slate-300 mt-1">
            every <span className="font-semibold text-slate-100">{monitor.interval}s</span>
          </div>
        </div>
      </div>

      {/* Uptime History Bar */}
      <div className="mb-4">
        <UptimeBar heartbeats={monitor.heartbeats} uptimePercentage={monitor.uptime24h} />
      </div>

      {/* Footer Controls */}
      <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
        <span className="text-[11px] text-slate-500">
          {monitor.lastCheckAt
            ? `Checked ${new Date(monitor.lastCheckAt).toLocaleTimeString()}`
            : "Pending first check"}
        </span>

        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={handleTestNow}
            disabled={isTesting}
            title="Trigger Instant Health Check"
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-indigo-600/30 text-slate-300 hover:text-indigo-300 border border-slate-700/60 transition-colors disabled:opacity-50"
          >
            <Play className={`w-3.5 h-3.5 ${isTesting ? "animate-spin" : ""}`} />
          </button>

          <button
            onClick={() => onSelect(monitor)}
            title="Inspect Real-time Latency Chart"
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-indigo-600/30 text-slate-300 hover:text-indigo-300 border border-slate-700/60 transition-colors"
          >
            <LineChart className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => onEdit(monitor)}
            title="Edit Monitor"
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-slate-100 border border-slate-700/60 transition-colors"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => onDelete(monitor.id)}
            title="Delete Monitor"
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 border border-slate-700/60 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
