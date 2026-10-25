import React from "react";
import { MonitorStatus } from "../types";

interface StatusBadgeProps {
  status: MonitorStatus;
  size?: "sm" | "md" | "lg";
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = "md" }) => {
  const configs = {
    UP: { text: "text-emerald-400", dot: "bg-emerald-400", label: "Operational" },
    DEGRADED: { text: "text-amber-400", dot: "bg-amber-400", label: "Degraded" },
    DOWN: { text: "text-rose-400", dot: "bg-rose-400", label: "Outage" },
    PENDING: { text: "text-slate-400", dot: "bg-slate-500", label: "Pending" },
  };

  const config = configs[status] || configs.PENDING;
  const sizeClass = size === "lg" ? "text-sm" : size === "sm" ? "text-[11px]" : "text-xs";

  return (
    <span className={`inline-flex items-center gap-2 font-medium ${sizeClass} ${config.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
};
