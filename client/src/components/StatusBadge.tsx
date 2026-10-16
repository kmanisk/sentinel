import React from "react";
import { MonitorStatus } from "../types";

interface StatusBadgeProps {
  status: MonitorStatus;
  size?: "sm" | "md" | "lg";
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = "md" }) => {
  const configs = {
    UP: {
      bg: "bg-emerald-500/10",
      text: "text-emerald-400",
      border: "border-emerald-500/20",
      dot: "bg-emerald-500",
      ping: "bg-emerald-400",
      label: "Operational",
    },
    DEGRADED: {
      bg: "bg-amber-500/10",
      text: "text-amber-400",
      border: "border-amber-500/20",
      dot: "bg-amber-500",
      ping: "bg-amber-400",
      label: "Degraded",
    },
    DOWN: {
      bg: "bg-rose-500/10",
      text: "text-rose-400",
      border: "border-rose-500/20",
      dot: "bg-rose-500",
      ping: "bg-rose-400",
      label: "Outage",
    },
    PENDING: {
      bg: "bg-slate-500/10",
      text: "text-slate-400",
      border: "border-slate-500/20",
      dot: "bg-slate-500",
      ping: "bg-slate-400",
      label: "Pending",
    },
  };

  const config = configs[status] || configs.PENDING;

  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-2.5 py-1 text-xs",
    lg: "px-3.5 py-1.5 text-sm",
  }[size];

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${config.bg} ${config.text} ${config.border} ${sizeClasses}`}
    >
      <span className="relative flex h-2 w-2">
        {status === "UP" && (
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${config.ping}`} />
        )}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${config.dot}`} />
      </span>
      {config.label}
    </span>
  );
};
