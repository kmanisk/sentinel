import React from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
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
    <div className="min-w-[170px] border border-[var(--ink)] bg-[var(--paper-raised)] p-3 text-xs shadow-[var(--tooltip-shadow)]">
      <div className="mb-2 flex items-center justify-between gap-4 border-b border-[var(--line)] pb-2">
        <span className="font-mono text-[var(--muted)]">{new Date(item.createdAt).toLocaleTimeString()}</span>
        <span className={item.status === "UP" ? "text-[var(--signal-dark)]" : "text-[var(--danger)]"}>
          {item.status}
        </span>
      </div>
      <dl className="space-y-1.5">
        <div className="flex justify-between gap-4">
          <dt className="text-[var(--muted)]">Latency</dt>
          <dd className="font-mono font-semibold">{item.latency} ms</dd>
        </div>
        {item.ttfb !== undefined && item.ttfb !== null && (
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--muted)]">TTFB</dt>
            <dd className="font-mono">{item.ttfb} ms</dd>
          </div>
        )}
        {item.dnsTime !== undefined && item.dnsTime !== null && (
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--muted)]">DNS</dt>
            <dd className="font-mono">{item.dnsTime} ms</dd>
          </div>
        )}
        {item.statusCode && (
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--muted)]">HTTP</dt>
            <dd className="font-mono">{item.statusCode}</dd>
          </div>
        )}
      </dl>
      {item.error && <p className="mt-2 border-t border-[var(--line)] pt-2 text-[var(--danger)]">{item.error}</p>}
    </div>
  );
};

export const LatencyChart: React.FC<LatencyChartProps> = ({ data, monitorName }) => {
  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (!data?.length) {
    return (
      <div className="sentinel-sheet flex min-h-[360px] items-center justify-center px-6 text-sm text-[var(--muted)]">
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
    <section className="sentinel-sheet overflow-hidden">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--line)] px-4 py-3 sm:px-5">
        <div>
          <p className="sentinel-eyebrow">Latency trace</p>
          <h2 className="mt-1 text-base font-semibold tracking-[-0.02em]">{monitorName}</h2>
        </div>
        <div className="flex gap-6 font-mono text-[10px] text-[var(--muted)]">
          <div>
            <div className="uppercase tracking-[0.12em]">Average</div>
            <div className="mt-1 text-sm font-semibold text-[var(--ink)]">{avgLatency} ms</div>
          </div>
          <div>
            <div className="uppercase tracking-[0.12em]">Peak</div>
            <div className="mt-1 text-sm font-semibold text-[var(--ink)]">{maxLatency} ms</div>
          </div>
        </div>
      </div>

      <div className="chart-grid h-[330px] w-full px-2 pb-3 pt-5 sm:px-3">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 4, right: 14, left: -16, bottom: 0 }}>
            <CartesianGrid stroke="var(--grid-line)" vertical={false} />
            <XAxis
              dataKey="timeLabel"
              stroke="var(--muted)"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              minTickGap={28}
            />
            <YAxis
              stroke="var(--muted)"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              unit="ms"
            />
            <ReferenceLine
              y={avgLatency}
              stroke="var(--signal)"
              strokeDasharray="4 5"
              strokeOpacity={0.45}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ stroke: "var(--line-strong)", strokeDasharray: "3 3" }}
            />
            <Line
              type="monotone"
              dataKey="latency"
              stroke="var(--signal)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: "var(--paper-raised)", stroke: "var(--signal)", strokeWidth: 2 }}
              isAnimationActive={!reduceMotion}
              animationDuration={460}
              animationEasing="ease-out"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
};
