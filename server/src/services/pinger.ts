import dns from "node:dns/promises";
import { performance } from "node:perf_hooks";
import { Monitor } from "@prisma/client";
import { PingResult } from "../types";

export class PingerService {
  /**
   * Pings a target endpoint and measures granular network timings
   */
  public static async ping(monitor: Monitor): Promise<PingResult> {
    const startTime = performance.now();
    let dnsTime: number | undefined;
    let ttfb: number | undefined;

    // Optional: measure DNS resolution separately if hostname is valid
    try {
      const parsedUrl = new URL(monitor.url);
      const dnsStart = performance.now();
      await dns.lookup(parsedUrl.hostname);
      dnsTime = Math.round(performance.now() - dnsStart);
    } catch {
      // DNS lookup failed directly
      return {
        monitorId: monitor.id,
        status: "DOWN",
        latency: Math.round(performance.now() - startTime),
        error: "DNS Resolution Failed (ENOTFOUND)",
      };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), monitor.timeout || 5000);

    try {
      const headers: Record<string, string> = {
        "User-Agent": "Sentinel-Health-Monitor/1.0",
        Accept: "*/*",
      };

      if (monitor.headers) {
        try {
          const parsedHeaders = JSON.parse(monitor.headers);
          Object.assign(headers, parsedHeaders);
        } catch {
          // ignore invalid custom header JSON
        }
      }

      const fetchStart = performance.now();
      const response = await fetch(monitor.url, {
        method: monitor.method || "GET",
        headers,
        body: monitor.method !== "GET" && monitor.method !== "HEAD" ? monitor.body || undefined : undefined,
        signal: controller.signal,
        redirect: "follow",
      });

      ttfb = Math.round(performance.now() - fetchStart);
      // Consume small body chunk to finalize stream
      await response.arrayBuffer();
      clearTimeout(timeoutId);

      const totalLatency = Math.round(performance.now() - startTime);
      const expectedStatus = monitor.expectedStatus || 200;

      const isStatusMatch = response.status === expectedStatus;
      let status: "UP" | "DOWN" | "DEGRADED" = "UP";
      let error: string | undefined;

      if (!isStatusMatch) {
        status = "DOWN";
        error = `Expected HTTP ${expectedStatus}, received ${response.status} ${response.statusText}`;
      } else if (totalLatency > 1500) {
        status = "DEGRADED";
        error = `High latency detected: ${totalLatency}ms`;
      }

      return {
        monitorId: monitor.id,
        status,
        statusCode: response.status,
        latency: totalLatency,
        dnsTime,
        ttfb,
        error,
      };
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      const totalLatency = Math.round(performance.now() - startTime);

      let errorMessage = "Unknown network error";
      if (err instanceof Error) {
        if (err.name === "AbortError") {
          errorMessage = `Request timed out after ${monitor.timeout || 5000}ms`;
        } else {
          errorMessage = err.message;
        }
      }

      return {
        monitorId: monitor.id,
        status: "DOWN",
        latency: totalLatency,
        dnsTime,
        error: errorMessage,
      };
    }
  }
}
