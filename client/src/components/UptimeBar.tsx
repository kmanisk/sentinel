import React from "react";
import { Heartbeat } from "../types";

interface UptimeBarProps {
  heartbeats?: Heartbeat[];
  uptimePercentage: number;
}

export const UptimeBar: React.FC<UptimeBarProps> = ({ heartbeats = [], uptimePercentage }) => {
  // Pad with placeholders if fewer than 20 checks available
  const totalSlots = 24;
  const recent = [...heartbeats].slice(0, totalSlots).reverse();
  const placeholdersCount = Math.max(0, totalSlots - recent.length);
  const slots: (Heartbeat | null)[] = [
    ...Array(placeholdersCount).fill(null),
    ...recent,
  ];

  return (
    <div className="w-full space-y-1.5">
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span className="font-mono">24h History</span>
        <span className="font-mono font-medium text-emerald-400">{uptimePercentage.toFixed(1)}% uptime</span>
      </div>

      <div className="flex items-center gap-1 h-6 w-full bg-slate-900/50 p-1 rounded-md border border-slate-800/80">
        {slots.map((hb, idx) => {
          let bg = "bg-slate-800";
          let title = "No data recorded";

          if (hb) {
            if (hb.status === "UP") {
              bg = "bg-emerald-500 hover:bg-emerald-400";
              title = `UP: ${hb.latency}ms (${new Date(hb.createdAt).toLocaleTimeString()})`;
            } else if (hb.status === "DEGRADED") {
              bg = "bg-amber-500 hover:bg-amber-400";
              title = `DEGRADED: ${hb.latency}ms (${new Date(hb.createdAt).toLocaleTimeString()})`;
            } else if (hb.status === "DOWN") {
              bg = "bg-rose-500 hover:bg-rose-400";
              title = `DOWN: ${hb.error || "Failure"} (${new Date(hb.createdAt).toLocaleTimeString()})`;
            }
          }

          return (
            <div
              key={idx}
              title={title}
              className={`flex-1 h-full rounded-sm transition-all duration-150 cursor-pointer ${bg}`}
            />
          );
        })}
      </div>
    </div>
  );
};
