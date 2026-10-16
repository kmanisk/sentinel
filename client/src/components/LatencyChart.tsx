import React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Heartbeat } from "../types";

interface LatencyChartProps {
  data: Heartbeat[];
  monitorName: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    payload: Heartbeat;
  }>;
  label?: string;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const item = payload[0].payload;
    return (
      <div className="bg-[#111827] border border-slate-700/80 rounded-lg p-3 shadow-xl backdrop-blur-md text-xs space-y-1.5 min-w-[160px]">
        <div className="flex items-center justify-between font-mono text-slate-400">
          <span>{new Date(item.createdAt).toLocaleTimeString()}</span>
          <span className={item.status === "UP" ? "text-emerald-400" : "text-rose-400 font-semibold"}>
            {item.status}
          </span>
        </div>
        <div className="border-t border-slate-800 pt-1.5 space-y-1">
          <div className="flex justify-between">
            <span className="text-slate-400">Total Latency:</span>
            <span className="font-mono font-semibold text-indigo-400">{item.latency} ms</span>
          </div>
          {item.ttfb !== undefined && (
            <div className="flex justify-between text-slate-500">
              <span>TTFB:</span>
              <span className="font-mono">{item.ttfb} ms</span>
            </div>
          )}
          {item.dnsTime !== undefined && (
            <div className="flex justify-between text-slate-500">
              <span>DNS Lookup:</span>
              <span className="font-mono">{item.dnsTime} ms</span>
            </div>
          )}
          {item.statusCode && (
            <div className="flex justify-between text-slate-500">
              <span>HTTP Status:</span>
              <span className="font-mono">{item.statusCode}</span>
            </div>
          )}
          {item.error && (
            <div className="text-rose-400 text-[11px] pt-1 border-t border-slate-800">
              {item.error}
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
};

export const LatencyChart: React.FC<LatencyChartProps> = ({ data, monitorName }) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-slate-500 border border-slate-800/80 rounded-xl bg-slate-900/40">
        <p className="text-sm">No telemetry records available yet.</p>
        <p className="text-xs text-slate-600 mt-1">Metrics will stream here automatically.</p>
      </div>
    );
  }

  const chartData = data.map((d) => ({
    ...d,
    timeLabel: new Date(d.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
  }));

  const latencies = data.map((d) => d.latency);
  const avgLatency = Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length);
  const maxLatency = Math.max(...latencies, 100);

  return (
    <div className="border border-slate-800/80 rounded-xl bg-slate-900/40 p-4 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h4 className="text-sm font-semibold text-slate-200">{monitorName} — Latency Telemetry</h4>
          <p className="text-xs text-slate-500">Response time stream over recent health checks</p>
        </div>
        <div className="flex items-center gap-3 text-xs font-mono">
          <span className="text-slate-400">
            Avg: <span className="text-emerald-400 font-semibold">{avgLatency}ms</span>
          </span>
          <span className="text-slate-400">
            Peak: <span className="text-indigo-400 font-semibold">{maxLatency}ms</span>
          </span>
        </div>
      </div>

      <div className="h-56 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="latencyGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
            <XAxis
              dataKey="timeLabel"
              stroke="#64748b"
              fontSize={10}
              tickLine={false}
              axisLine={{ stroke: "#1f2937" }}
            />
            <YAxis
              stroke="#64748b"
              fontSize={10}
              tickLine={false}
              axisLine={{ stroke: "#1f2937" }}
              unit="ms"
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="latency"
              stroke="#818cf8"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#latencyGradient)"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
