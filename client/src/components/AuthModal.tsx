import React, { useEffect, useState } from "react";
import { Github, X } from "lucide-react";
import { ApiClient, OAuthProvider } from "../services/api";
import { User } from "../types";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: User) => void;
}

const inputClass = "sentinel-field px-3 py-2.5 text-sm";

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [providers, setProviders] = useState<Record<OAuthProvider, boolean>>({
    google: false,
    github: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    ApiClient.getAuthProviders()
      .then((res) => setProviders(res.providers))
      .catch(() => setProviders({ google: false, github: false }));
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = isRegister
        ? await ApiClient.register({ email, password, name })
        : await ApiClient.login({ email, password });
      onSuccess(res.user);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleProvider = (provider: OAuthProvider) => {
    if (!providers[provider]) return;
    ApiClient.startOAuth(provider);
  };

  const useDemoCredentials = () => {
    setEmail("admin@sentinel.dev");
    setPassword("sentinel123");
    setIsRegister(false);
    setError(null);
  };

  return (
    <div className="sentinel-modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-[#171714]/35 p-4 backdrop-blur-[2px]">
      <div className="sentinel-modal-sheet w-full max-w-[440px] border border-[var(--ink)] bg-[var(--paper-raised)] shadow-[0_8px_0_rgba(23,23,20,0.14)]">
        <div className="flex items-start justify-between border-b border-[var(--ink)] px-5 py-4">
          <div>
            <p className="sentinel-eyebrow">Identity</p>
            <h2 className="mt-1 text-xl font-semibold tracking-[-0.03em]">
              {isRegister ? "Create account" : "Sign in to Sentinel"}
            </h2>
            <p className="mt-1 text-xs text-[var(--muted)]">
              {isRegister ? "Keep monitors and alert settings under your account." : "Manage monitors and notification channels."}
            </p>
          </div>
          <button type="button" onClick={onClose} className="sentinel-icon-key" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 pt-5">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleProvider("google")}
              disabled={!providers.google}
              title={providers.google ? "Continue with Google" : "Google OAuth is not configured on this deployment"}
              className="sentinel-key h-10 px-3 text-xs font-semibold disabled:opacity-40"
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full border border-[var(--line-strong)] bg-white text-[11px] font-bold text-[#4285f4]">
                G
              </span>
              Google
            </button>
            <button
              type="button"
              onClick={() => handleProvider("github")}
              disabled={!providers.github}
              title={providers.github ? "Continue with GitHub" : "GitHub OAuth is not configured on this deployment"}
              className="sentinel-key h-10 px-3 text-xs font-semibold disabled:opacity-40"
            >
              <Github className="h-4 w-4" />
              GitHub
            </button>
          </div>

          {!providers.google && !providers.github && (
            <p className="mt-2 text-[10px] text-[var(--muted)]">
              OAuth activates when provider credentials are configured on the server.
            </p>
          )}

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-[var(--line)]" />
            <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--muted)]">or use email</span>
            <div className="h-px flex-1 bg-[var(--line)]" />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-5 pb-5">
          {error && (
            <div className="border border-[var(--danger)] bg-[var(--danger-soft)] px-3 py-2 text-xs text-[var(--danger)]">
              {error}
            </div>
          )}

          {isRegister && (
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium">Name</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className={inputClass}
              />
            </label>
          )}

          <label className="block">
            <span className="mb-1.5 block text-xs font-medium">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className={inputClass}
              autoComplete="email"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-medium">Password</span>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="6+ characters"
              className={inputClass}
              autoComplete={isRegister ? "new-password" : "current-password"}
            />
          </label>

          <button
            type="submit"
            disabled={isLoading}
            className="sentinel-key sentinel-key-primary h-10 w-full text-sm font-semibold"
          >
            {isLoading ? "Working…" : isRegister ? "Create account" : "Sign in"}
          </button>

          {!isRegister && (
            <button
              type="button"
              onClick={useDemoCredentials}
              className="w-full text-center text-[11px] text-[var(--muted)] underline-offset-4 hover:text-[var(--ink)] hover:underline"
            >
              Use demo credentials
            </button>
          )}

          <div className="border-t border-[var(--line)] pt-4 text-center">
            <button
              type="button"
              onClick={() => {
                setIsRegister((value) => !value);
                setError(null);
              }}
              className="text-xs text-[var(--muted)] underline-offset-4 hover:text-[var(--ink)] hover:underline"
            >
              {isRegister ? "Already have an account? Sign in" : "New to Sentinel? Create an account"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
