import React from "react";
import { Heartbeat } from "../types";

interface UptimeBarProps {
  heartbeats?: Heartbeat[];
  uptimePercentage: number;
}

export const UptimeBar: React.FC<UptimeBarProps> = ({ heartbeats = [], uptimePercentage }) => {
  const totalSlots = 24;
  const recent = [...heartbeats].slice(0, totalSlots).reverse();
  const placeholdersCount = Math.max(0, totalSlots - recent.length);
  const slots: (Heartbeat | null)[] = [
    ...Array(placeholdersCount).fill(null),
    ...recent,
  ];

  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="flex h-5 min-w-0 flex-1 items-end gap-[2px]" aria-label={`${uptimePercentage.toFixed(1)}% uptime`}>
        {slots.map((hb, idx) => {
          let bg = "bg-[var(--line)]";
          let title = "No data recorded";

          if (hb) {
            if (hb.status === "UP") {
              bg = "bg-[var(--signal)]";
              title = `UP: ${hb.latency}ms (${new Date(hb.createdAt).toLocaleTimeString()})`;
            } else if (hb.status === "DEGRADED") {
              bg = "bg-[var(--warning)]";
              title = `DEGRADED: ${hb.latency}ms (${new Date(hb.createdAt).toLocaleTimeString()})`;
            } else if (hb.status === "DOWN") {
              bg = "bg-[var(--danger)]";
              title = `DOWN: ${hb.error || "Failure"} (${new Date(hb.createdAt).toLocaleTimeString()})`;
            }
          }

          return (
            <span
              key={idx}
              title={title}
              className={`h-full min-w-[2px] flex-1 ${bg} transition-[height,opacity] duration-150 hover:h-[22px] hover:opacity-80`}
            />
          );
        })}
      </div>
      <span className="shrink-0 font-mono text-[10px] text-[var(--muted)]">
        {uptimePercentage.toFixed(1)}%
      </span>
    </div>
  );
};
