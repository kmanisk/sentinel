import React, { useState, useEffect } from "react";
import { X, Bell, Trash2, Send, CheckCircle2 } from "lucide-react";
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-xl bg-[#111827] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2 text-indigo-400">
            <Bell className="w-5 h-5" />
            <h3 className="font-semibold text-slate-100 text-lg">Alerting & Notification Channels</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
              {error}
            </div>
          )}

          {/* New Channel Form */}
          <form onSubmit={handleAddAlert} className="space-y-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Add New Notification Channel
            </h4>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-sm focus:outline-none focus:border-indigo-500"
                >
                  <option value="DISCORD">Discord Webhook</option>
                  <option value="SLACK">Slack Webhook</option>
                  <option value="TELEGRAM">Telegram Bot</option>
                  <option value="WEBHOOK">Custom HTTP Webhook</option>
                </select>
              </div>

              <div className="col-span-2">
                <input
                  type="text"
                  required
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder={
                    type === "TELEGRAM"
                      ? "BOT_TOKEN:CHAT_ID"
                      : "https://discord.com/api/webhooks/..."
                  }
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs font-mono focus:outline-none focus:border-indigo-500 placeholder:text-slate-600"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-md transition-colors"
            >
              Connect Notification Channel
            </button>
          </form>

          {/* Configured Channels List */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Active Alert Channels ({alerts.length})
            </h4>

            {isLoading ? (
              <p className="text-xs text-slate-500 py-3 text-center">Loading channels...</p>
            ) : alerts.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center border border-dashed border-slate-800 rounded-xl">
                No notification channels configured yet. Add a Discord or Slack webhook above!
              </p>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-900/40 border border-slate-800 text-xs"
                  >
                    <div className="space-y-0.5 min-w-0 flex-1 pr-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-200 font-mono px-1.5 py-0.5 rounded bg-slate-800 text-[11px]">
                          {alert.type}
                        </span>
                        {testResult?.id === alert.id && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                            <CheckCircle2 className="w-3 h-3" /> Sent!
                          </span>
                        )}
                      </div>
                      <p className="font-mono text-slate-500 truncate text-[11px]">{alert.destination}</p>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleTest(alert.id)}
                        title="Send Test Notification"
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-indigo-600/30 text-slate-300 hover:text-indigo-300 transition-colors"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(alert.id)}
                        title="Remove Channel"
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
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
