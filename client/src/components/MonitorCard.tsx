import React, { useState } from "react";
import { Edit2, ExternalLink, LoaderCircle, Play, Trash2 } from "lucide-react";
import { Monitor } from "../types";
import { StatusBadge } from "./StatusBadge";
import { UptimeBar } from "./UptimeBar";
import { ApiClient } from "../services/api";
import { ToastTone } from "./Toast";

interface MonitorCardProps {
  monitor: Monitor;
  isSelected: boolean;
  onSelect: (monitor: Monitor) => void;
  onEdit: (monitor: Monitor) => void;
  onDelete: (id: string) => void;
  onNotify: (title: string, tone: ToastTone, detail?: string) => void;
}

const latencyClass = (latency?: number | null) => {
  if (latency === null || latency === undefined) return "text-[var(--muted)]";
  if (latency < 300) return "text-[var(--signal-dark)]";
  if (latency < 1000) return "text-[var(--warning)]";
  return "text-[var(--danger)]";
};

export const MonitorCard: React.FC<MonitorCardProps> = ({
  monitor,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  onNotify,
}) => {
  const [isTesting, setIsTesting] = useState(false);

  const handleTestNow = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setIsTesting(true);
      const { result } = await ApiClient.triggerCheck(monitor.id);
      const tone: ToastTone =
        result.status === "DOWN" ? "error" : result.status === "DEGRADED" ? "warning" : "success";

      onNotify(
        `${monitor.name} checked`,
        tone,
        `${result.status.toLowerCase()} · ${result.latency} ms`
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "The check could not be completed.";
      console.error("Test check failed:", err);
      onNotify("Check failed", "error", message);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <article
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      data-selected={isSelected}
      onClick={() => onSelect(monitor)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(monitor);
        }
      }}
      className="sentinel-row cursor-pointer"
    >
      <div className="grid gap-3 px-4 py-3 lg:grid-cols-[minmax(0,1.65fr)_130px_105px_190px_95px_100px] lg:items-center">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <span className="border border-[var(--line-strong)] bg-[var(--paper-raised)] px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-[0.08em] text-[var(--muted)]">
              {monitor.method}
            </span>
            <h3 className="truncate text-sm font-semibold tracking-[-0.01em]">{monitor.name}</h3>
          </div>
          <a
            href={monitor.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="mt-1 inline-flex max-w-full items-center gap-1 text-[10px] text-[var(--muted)] underline-offset-4 hover:text-[var(--ink)] hover:underline"
          >
            <span className="truncate font-mono">{monitor.url}</span>
            <ExternalLink className="h-3 w-3 shrink-0" />
          </a>
        </div>

        <div className="flex items-center lg:block">
          <StatusBadge status={monitor.status} />
        </div>

        <div>
          <div className="sentinel-eyebrow mb-1 lg:hidden">Latency</div>
          <div className={`font-mono text-xs font-semibold ${latencyClass(monitor.lastLatency)}`}>
            {monitor.lastLatency !== null && monitor.lastLatency !== undefined
              ? `${monitor.lastLatency} ms`
              : "—"}
          </div>
        </div>

        <UptimeBar heartbeats={monitor.heartbeats} uptimePercentage={monitor.uptime24h} />

        <div className="font-mono text-[10px] text-[var(--muted)]">
          {monitor.lastCheckAt
            ? new Date(monitor.lastCheckAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            : "Not yet"}
        </div>

        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={handleTestNow}
            disabled={isTesting}
            title={isTesting ? "Running check" : "Run check now"}
            className="sentinel-icon-key"
            aria-label={`Run ${monitor.name} check now`}
            aria-busy={isTesting}
          >
            {isTesting ? (
              <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Play className="h-3.5 w-3.5" />
            )}
          </button>
          <button
            type="button"
            onClick={() => onEdit(monitor)}
            title="Edit monitor"
            className="sentinel-icon-key"
            aria-label={`Edit ${monitor.name}`}
          >
            <Edit2 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(monitor.id)}
            title="Delete monitor"
            className="sentinel-icon-key hover:!border-[var(--danger)] hover:!bg-[var(--danger-soft)] hover:!text-[var(--danger)]"
            aria-label={`Delete ${monitor.name}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </article>
  );
};
