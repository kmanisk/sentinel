import React from "react";
import { MonitorStatus } from "../types";

interface StatusBadgeProps {
  status: MonitorStatus;
  size?: "sm" | "md" | "lg";
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = "md" }) => {
  const configs = {
    UP: { text: "text-[var(--signal-dark)]", dot: "bg-[var(--signal)]", label: "Operational" },
    DEGRADED: { text: "text-[var(--warning)]", dot: "bg-[var(--warning)]", label: "Degraded" },
    DOWN: { text: "text-[var(--danger)]", dot: "bg-[var(--danger)]", label: "Outage" },
    PENDING: { text: "text-[var(--muted)]", dot: "bg-[var(--faint)]", label: "Pending" },
  };

  const config = configs[status] || configs.PENDING;
  const sizeClass = size === "lg" ? "text-sm" : size === "sm" ? "text-[11px]" : "text-xs";

  return (
    <span className={`inline-flex items-center gap-2 font-medium ${sizeClass} ${config.text}`}>
      <span className={`h-2 w-2 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
};
