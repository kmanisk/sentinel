import React, { useEffect, useState } from "react";
import { Bell, CheckCircle2, Send, Trash2, X } from "lucide-react";
import { AlertConfig } from "../types";
import { ApiClient } from "../services/api";

interface AlertSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AlertSettingsModal: React.FC<AlertSettingsModalProps> = ({ isOpen, onClose }) => {
  const [alerts, setAlerts] = useState<AlertConfig[]>([]);
  const [type, setType] = useState<"DISCORD" | "SLACK" | "TELEGRAM" | "WEBHOOK">("DISCORD");
  const [destination, setDestination] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ id: string; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchAlerts = async () => {
    try {
      setIsLoading(true);
      const res = await ApiClient.getAlerts();
      setAlerts(res.alerts);
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAlerts();
      setTestResult(null);
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAddAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!destination.trim()) return;

    try {
      await ApiClient.createAlert({ type, destination });
      setDestination("");
      await fetchAlerts();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to add alert channel");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await ApiClient.deleteAlert(id);
      setAlerts((prev) => prev.filter((a) => a.id !== id));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete alert");
    }
  };

  const handleTest = async (id: string) => {
    try {
      setTestResult(null);
      const res = await ApiClient.testAlert(id);
      setTestResult({ id, message: res.message || "Test notification dispatched!" });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to test alert");
    }
  };

  return (
    <div className="sentinel-modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-[#171714]/35 p-4 backdrop-blur-[2px]">
      <div className="sentinel-modal-sheet w-full max-w-xl border border-[var(--ink)] bg-[var(--paper-raised)] shadow-[0_8px_0_rgba(23,23,20,0.14)]">
        <div className="flex items-start justify-between border-b border-[var(--ink)] px-5 py-4">
          <div>
            <p className="sentinel-eyebrow">Notifications</p>
            <div className="mt-1 flex items-center gap-2">
              <Bell className="h-4 w-4 text-[var(--signal-dark)]" />
              <h2 className="text-xl font-semibold tracking-[-0.03em]">Alert channels</h2>
            </div>
          </div>
          <button type="button" onClick={onClose} className="sentinel-icon-key" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5 p-5">
          {error && (
            <div className="border border-[var(--danger)] bg-[var(--danger-soft)] px-3 py-2 text-xs text-[var(--danger)]">
              {error}
            </div>
          )}

          <form onSubmit={handleAddAlert} className="space-y-3 border-b border-[var(--line)] pb-5">
            <div>
              <p className="sentinel-eyebrow">Connect a channel</p>
              <p className="mt-1 text-xs text-[var(--muted)]">Send incident transitions to an external destination.</p>
            </div>

            <div className="grid gap-2 sm:grid-cols-[170px_minmax(0,1fr)]">
              <select
                value={type}
                onChange={(e) => setType(e.target.value as "DISCORD" | "SLACK" | "TELEGRAM" | "WEBHOOK")}
                className="sentinel-field px-3 py-2 text-sm"
              >
                <option value="DISCORD">Discord webhook</option>
                <option value="SLACK">Slack webhook</option>
                <option value="TELEGRAM">Telegram bot</option>
                <option value="WEBHOOK">HTTP webhook</option>
              </select>

              <input
                type="text"
                required
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder={type === "TELEGRAM" ? "BOT_TOKEN:CHAT_ID" : "https://..."}
                className="sentinel-field px-3 py-2 font-mono text-xs"
              />
            </div>

            <button type="submit" className="sentinel-key sentinel-key-primary h-9 px-4 text-xs font-semibold">
              Connect channel
            </button>
          </form>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="sentinel-eyebrow">Configured / {alerts.length}</p>
            </div>

            {isLoading ? (
              <p className="py-4 text-xs text-[var(--muted)]">Loading channels…</p>
            ) : alerts.length === 0 ? (
              <div className="border border-dashed border-[var(--line-strong)] px-4 py-6 text-center text-xs text-[var(--muted)]">
                No notification channels configured.
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto border-y border-[var(--line)]">
                {alerts.map((alert) => (
                  <div key={alert.id} className="grid grid-cols-[1fr_auto] items-center gap-3 border-b border-[var(--line)] px-3 py-3 last:border-b-0">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="border border-[var(--line-strong)] px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-[0.08em]">
                          {alert.type}
                        </span>
                        {testResult?.id === alert.id && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[var(--signal-dark)]">
                            <CheckCircle2 className="h-3 w-3" /> Sent
                          </span>
                        )}
                      </div>
                      <p className="mt-1 truncate font-mono text-[10px] text-[var(--muted)]">{alert.destination}</p>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleTest(alert.id)}
                        title="Send test notification"
                        className="sentinel-icon-key"
                        aria-label={`Test ${alert.type} alert`}
                      >
                        <Send className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(alert.id)}
                        title="Remove channel"
                        className="sentinel-icon-key hover:!border-[var(--danger)] hover:!bg-[var(--danger-soft)] hover:!text-[var(--danger)]"
                        aria-label={`Remove ${alert.type} alert`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
