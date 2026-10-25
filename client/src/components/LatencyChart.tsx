import React from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
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
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;

  return (
    <div className="min-w-[170px] border border-[#343943] bg-[#0c0f13] p-3 text-xs shadow-2xl">
      <div className="mb-2 flex items-center justify-between gap-4 border-b border-[#242830] pb-2">
        <span className="font-mono text-slate-500">{new Date(item.createdAt).toLocaleTimeString()}</span>
        <span className={item.status === "UP" ? "text-emerald-400" : "text-rose-400"}>{item.status}</span>
      </div>
      <dl className="space-y-1.5">
        <div className="flex justify-between gap-4">
          <dt className="text-slate-500">Latency</dt>
          <dd className="font-mono text-slate-200">{item.latency} ms</dd>
        </div>
        {item.ttfb !== undefined && item.ttfb !== null && (
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">TTFB</dt>
            <dd className="font-mono text-slate-300">{item.ttfb} ms</dd>
          </div>
        )}
        {item.dnsTime !== undefined && item.dnsTime !== null && (
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">DNS</dt>
            <dd className="font-mono text-slate-300">{item.dnsTime} ms</dd>
          </div>
        )}
        {item.statusCode && (
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">HTTP</dt>
            <dd className="font-mono text-slate-300">{item.statusCode}</dd>
          </div>
        )}
      </dl>
      {item.error && <p className="mt-2 border-t border-[#242830] pt-2 text-rose-400">{item.error}</p>}
    </div>
  );
};

export const LatencyChart: React.FC<LatencyChartProps> = ({ data, monitorName }) => {
  if (!data?.length) {
    return (
      <div className="flex h-64 items-center justify-center border border-[#242830] bg-[#0d1014] text-sm text-slate-600">
        Waiting for telemetry from {monitorName}.
      </div>
    );
  }

  const chartData = [...data]
    .reverse()
    .map((d) => ({
      ...d,
      timeLabel: new Date(d.createdAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    }));

  const latencies = data.map((d) => d.latency);
  const avgLatency = Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length);
  const maxLatency = Math.max(...latencies);

  return (
    <div className="border border-[#242830] bg-[#0d1014]">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#242830] px-4 py-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-slate-600">Latency history</p>
          <h2 className="mt-1 text-sm font-medium text-slate-100">{monitorName}</h2>
        </div>
        <div className="flex gap-6 text-xs">
          <div>
            <div className="text-[10px] text-slate-600">Average</div>
            <div className="mt-0.5 font-mono text-slate-300">{avgLatency} ms</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-600">Peak</div>
            <div className="mt-0.5 font-mono text-slate-300">{maxLatency} ms</div>
          </div>
        </div>
      </div>

      <div className="h-64 w-full px-2 pb-3 pt-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 4, right: 12, left: -18, bottom: 0 }}>
            <CartesianGrid stroke="#20242b" strokeDasharray="2 6" vertical={false} />
            <XAxis
              dataKey="timeLabel"
              stroke="#555c68"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              minTickGap={28}
            />
            <YAxis
              stroke="#555c68"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              unit="ms"
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#353b46", strokeDasharray: "3 3" }} />
            <Line
              type="monotone"
              dataKey="latency"
              stroke="#8b93ff"
              strokeWidth={1.75}
              dot={false}
              activeDot={{ r: 3, fill: "#c7cbff", stroke: "#8b93ff", strokeWidth: 1 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
