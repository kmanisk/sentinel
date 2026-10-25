import React, { useEffect, useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { Monitor } from "../types";

interface MonitorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<Monitor>) => Promise<void>;
  monitorToEdit?: Monitor | null;
}

const inputClass =
  "w-full rounded-md border border-[#2b3038] bg-[#0b0e12] px-3 py-2.5 text-sm text-slate-200 outline-none transition placeholder:text-slate-700 focus:border-[#6972a8]";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-[2px]">
      <div className="w-full max-w-2xl border border-[#2a2f37] bg-[#101318] shadow-2xl">
        <div className="flex items-start justify-between border-b border-[#242830] px-5 py-4">
          <div>
            <h2 className="text-base font-medium text-slate-100">
              {monitorToEdit ? "Edit monitor" : "Create monitor"}
            </h2>
            <p className="mt-1 text-xs text-slate-600">
              Define the endpoint and how Sentinel should evaluate it.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-600 transition hover:bg-[#181c22] hover:text-slate-300"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-5">
          {error && (
            <div className="border border-rose-500/25 bg-rose-500/5 px-3 py-2 text-xs text-rose-400">
              {error}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-[150px_minmax(0,1fr)]">
            <label className="block">
              <span className="mb-1.5 block text-xs text-slate-500">Method</span>
              <select value={method} onChange={(e) => setMethod(e.target.value)} className={inputClass}>
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="HEAD">HEAD</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs text-slate-500">Endpoint URL</span>
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
            <span className="mb-1.5 block text-xs text-slate-500">Display name</span>
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
              <span className="mb-1.5 block text-xs text-slate-500">Check every</span>
              <div className="relative">
                <input
                  type="number"
                  min="5"
                  max="3600"
                  value={interval}
                  onChange={(e) => setInterval(Number(e.target.value))}
                  className={`${inputClass} pr-10 font-mono`}
                />
                <span className="pointer-events-none absolute right-3 top-2.5 text-xs text-slate-700">sec</span>
              </div>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs text-slate-500">Timeout</span>
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
                <span className="pointer-events-none absolute right-3 top-2.5 text-xs text-slate-700">ms</span>
              </div>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs text-slate-500">Expected status</span>
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

          <details className="group border-t border-[#242830] pt-4">
            <summary className="flex cursor-pointer list-none items-center justify-between text-xs text-slate-500 transition hover:text-slate-300">
              Request headers
              <ChevronDown className="h-3.5 w-3.5 transition group-open:rotate-180" />
            </summary>
            <div className="pt-3">
              <textarea
                rows={3}
                value={headers}
                onChange={(e) => setHeaders(e.target.value)}
                placeholder='{"Authorization":"Bearer token"}'
                className={`${inputClass} resize-y font-mono text-xs`}
              />
              <p className="mt-1.5 text-[10px] text-slate-700">Optional JSON object sent with each check.</p>
            </div>
          </details>

          <div className="flex items-center justify-end gap-2 border-t border-[#242830] pt-4">
            <button
              type="button"
              onClick={onClose}
              className="h-9 rounded-md px-3 text-xs text-slate-500 transition hover:bg-[#171a20] hover:text-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="h-9 rounded-md bg-[#e9ebf1] px-4 text-xs font-medium text-[#111318] transition hover:bg-white disabled:opacity-50"
            >
              {isSubmitting ? "Saving…" : monitorToEdit ? "Save changes" : "Create monitor"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
