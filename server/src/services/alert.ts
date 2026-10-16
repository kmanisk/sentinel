import { AlertConfig, Monitor } from "@prisma/client";
import { prisma } from "../db/prisma";
import { PingResult } from "../types";

export class AlertService {
  /**
   * Evaluates state change and dispatches alerts if monitor transitioned
   */
  public static async handleStateChange(
    monitor: Monitor,
    previousStatus: string,
    result: PingResult
  ): Promise<void> {
    // If status hasn't changed, do not trigger alert
    if (previousStatus === result.status) {
      return;
    }

    // 1. Transition: UP -> DOWN
    if (result.status === "DOWN" && previousStatus !== "DOWN") {
      // Create an open incident
      await prisma.incident.create({
        data: {
          monitorId: monitor.id,
          status: "DOWN",
          error: result.error || "Endpoint became unreachable",
          startedAt: new Date(),
        },
      });

      await this.dispatchToAllConfigs(monitor, "DOWN", result);
    }

    // 2. Transition: DOWN -> UP (Recovery)
    else if (result.status === "UP" && previousStatus === "DOWN") {
      // Find open incident and mark resolved
      const openIncident = await prisma.incident.findFirst({
        where: {
          monitorId: monitor.id,
          status: "DOWN",
          resolvedAt: null,
        },
        orderBy: { startedAt: "desc" },
      });

      if (openIncident) {
        const resolvedAt = new Date();
        const durationSec = Math.round((resolvedAt.getTime() - openIncident.startedAt.getTime()) / 1000);

        await prisma.incident.update({
          where: { id: openIncident.id },
          data: {
            status: "RESOLVED",
            resolvedAt,
            duration: durationSec,
          },
        });
      }

      await this.dispatchToAllConfigs(monitor, "RECOVERED", result);
    }
  }

  /**
   * Dispatches alerts to all configured channels for this monitor or global user
   */
  public static async dispatchToAllConfigs(
    monitor: Monitor,
    event: "DOWN" | "RECOVERED" | "TEST",
    result?: PingResult
  ): Promise<void> {
    const alertConfigs = await prisma.alertConfig.findMany({
      where: {
        isEnabled: true,
        OR: [{ monitorId: monitor.id }, { monitorId: null }],
      },
    });

    for (const config of alertConfigs) {
      try {
        await this.sendAlert(config, monitor, event, result);
      } catch (err) {
        console.error(`Failed to send alert to ${config.type} (${config.id}):`, err);
      }
    }
  }

  /**
   * Routes alert to specific webhook driver
   */
  public static async sendAlert(
    config: AlertConfig,
    monitor: Monitor,
    event: "DOWN" | "RECOVERED" | "TEST",
    result?: PingResult
  ): Promise<void> {
    const isDown = event === "DOWN";
    const isRecovered = event === "RECOVERED";
    const title = isDown
      ? `[ALERT] Sentinel: ${monitor.name} is DOWN`
      : isRecovered
      ? `[RECOVERED] Sentinel: ${monitor.name}`
      : `[TEST] Sentinel Alert: ${monitor.name}`;

    const color = isDown ? 0xff3333 : isRecovered ? 0x00cc66 : 0x3399ff;

    switch (config.type.toUpperCase()) {
      case "DISCORD": {
        await fetch(config.destination, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            embeds: [
              {
                title,
                description: isDown
                  ? `**Endpoint:** \`${monitor.url}\`\n**Error:** ${result?.error || "Status code failure"}\n**Latency:** ${result?.latency ?? 0}ms`
                  : `**Endpoint:** \`${monitor.url}\`\n**Latency:** ${result?.latency ?? 0}ms\n**Status:** Operational`,
                color,
                timestamp: new Date().toISOString(),
                footer: { text: "Sentinel Uptime & Latency Monitor" },
              },
            ],
          }),
        });
        break;
      }

      case "SLACK": {
        await fetch(config.destination, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: `${title}\nEndpoint: ${monitor.url} | Latency: ${result?.latency ?? 0}ms\nDetails: ${result?.error || "All checks passing"}`,
          }),
        });
        break;
      }

      case "TELEGRAM": {
        // destination format: "BOT_TOKEN:CHAT_ID"
        const [botToken, chatId] = config.destination.split(":");
        if (botToken && chatId) {
          const text = `*${title}*\nURL: \`${monitor.url}\`\nLatency: \`${result?.latency ?? 0}ms\`\nStatus: *${result?.status || event}*`;
          await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: chatId,
              text,
              parse_mode: "Markdown",
            }),
          });
        }
        break;
      }

      case "WEBHOOK":
      default: {
        await fetch(config.destination, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event,
            monitor: {
              id: monitor.id,
              name: monitor.name,
              url: monitor.url,
            },
            result,
            timestamp: new Date().toISOString(),
          }),
        });
        break;
      }
    }
  }
}
