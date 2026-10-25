import React, { useEffect, useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { Monitor } from "../types";

interface MonitorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<Monitor>) => Promise<void>;
  monitorToEdit?: Monitor | null;
}

const inputClass = "sentinel-field px-3 py-2.5 text-sm";

export const MonitorModal: React.FC<MonitorModalProps> = ({
  isOpen,
  onClose,
  onSave,
  monitorToEdit,
}) => {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [method, setMethod] = useState("GET");
  const [interval, setInterval] = useState(30);
  const [timeout, setTimeoutVal] = useState(5000);
  const [expectedStatus, setExpectedStatus] = useState(200);
  const [headers, setHeaders] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (monitorToEdit) {
      setName(monitorToEdit.name);
      setUrl(monitorToEdit.url);
      setMethod(monitorToEdit.method || "GET");
      setInterval(monitorToEdit.interval || 30);
      setTimeoutVal(monitorToEdit.timeout || 5000);
      setExpectedStatus(monitorToEdit.expectedStatus || 200);
      setHeaders(monitorToEdit.headers || "");
    } else {
      setName("");
      setUrl("https://");
      setMethod("GET");
      setInterval(30);
      setTimeoutVal(5000);
      setExpectedStatus(200);
      setHeaders("");
    }
    setError(null);
  }, [monitorToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Give this monitor a name.");
      return;
    }

    try {
      const parsedUrl = new URL(url);
      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        throw new Error("Unsupported protocol");
      }
    } catch {
      setError("Enter a valid HTTP or HTTPS endpoint.");
      return;
    }

    try {
      setIsSubmitting(true);
      await onSave({
        name: name.trim(),
        url,
        method,
        interval: Number(interval),
        timeout: Number(timeout),
        expectedStatus: Number(expectedStatus),
        headers: headers.trim() || undefined,
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save monitor");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="sentinel-modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-[#171714]/35 p-4 backdrop-blur-[2px]">
      <div className="sentinel-modal-sheet w-full max-w-2xl border border-[var(--ink)] bg-[var(--paper-raised)] shadow-[0_8px_0_rgba(23,23,20,0.14)]">
        <div className="flex items-start justify-between border-b border-[var(--ink)] px-5 py-4">
          <div>
            <p className="sentinel-eyebrow">Monitor configuration</p>
            <h2 className="mt-1 text-xl font-semibold tracking-[-0.03em]">
              {monitorToEdit ? "Edit endpoint" : "Create endpoint"}
            </h2>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Define the request and the response Sentinel should consider healthy.
            </p>
          </div>
          <button type="button" onClick={onClose} className="sentinel-icon-key" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-5">
          {error && (
            <div className="border border-[var(--danger)] bg-[var(--danger-soft)] px-3 py-2 text-xs text-[var(--danger)]">
              {error}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-[150px_minmax(0,1fr)]">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium">Method</span>
              <select value={method} onChange={(e) => setMethod(e.target.value)} className={inputClass}>
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="HEAD">HEAD</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-medium">Endpoint URL</span>
              <input
                type="url"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://api.example.com/health"
                className={`${inputClass} font-mono`}
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-xs font-medium">Display name</span>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Production API"
              className={inputClass}
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium">Check every</span>
              <div className="relative">
                <input
                  type="number"
                  min="5"
                  max="3600"
                  value={interval}
                  onChange={(e) => setInterval(Number(e.target.value))}
                  className={`${inputClass} pr-10 font-mono`}
                />
                <span className="pointer-events-none absolute right-3 top-2.5 text-xs text-[var(--muted)]">sec</span>
              </div>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-medium">Timeout</span>
              <div className="relative">
                <input
                  type="number"
                  min="500"
                  max="30000"
                  step="500"
                  value={timeout}
                  onChange={(e) => setTimeoutVal(Number(e.target.value))}
                  className={`${inputClass} pr-10 font-mono`}
                />
                <span className="pointer-events-none absolute right-3 top-2.5 text-xs text-[var(--muted)]">ms</span>
              </div>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-medium">Expected status</span>
              <input
                type="number"
                min="100"
                max="599"
                value={expectedStatus}
                onChange={(e) => setExpectedStatus(Number(e.target.value))}
                className={`${inputClass} font-mono`}
              />
            </label>
          </div>

          <details className="group border-t border-[var(--line)] pt-4">
            <summary className="flex cursor-pointer list-none items-center justify-between text-xs font-medium text-[var(--muted)] hover:text-[var(--ink)]">
              Request headers
              <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200 group-open:rotate-180" />
            </summary>
            <div className="pt-3">
              <textarea
                rows={3}
                value={headers}
                onChange={(e) => setHeaders(e.target.value)}
                placeholder='{"Authorization":"Bearer token"}'
                className={`${inputClass} resize-y font-mono text-xs`}
              />
              <p className="mt-1.5 text-[10px] text-[var(--muted)]">Optional JSON object sent with each check.</p>
            </div>
          </details>

          <div className="flex items-center justify-end gap-2 border-t border-[var(--line)] pt-4">
            <button type="button" onClick={onClose} className="sentinel-key h-9 px-3 text-xs font-semibold">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="sentinel-key sentinel-key-primary h-9 px-4 text-xs font-semibold"
            >
              {isSubmitting ? "Saving…" : monitorToEdit ? "Save changes" : "Create monitor"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
