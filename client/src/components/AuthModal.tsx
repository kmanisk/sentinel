import React, { useEffect, useState } from "react";
import { Github, X } from "lucide-react";
import { ApiClient, OAuthProvider } from "../services/api";
import { User } from "../types";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: User) => void;
}

const inputClass =
  "w-full rounded-md border border-[#2b3038] bg-[#0b0e12] px-3 py-2.5 text-sm text-slate-200 outline-none transition placeholder:text-slate-700 focus:border-[#6972a8]";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-[2px]">
      <div className="w-full max-w-[430px] border border-[#2a2f37] bg-[#101318] shadow-2xl">
        <div className="flex items-start justify-between border-b border-[#242830] px-5 py-4">
          <div>
            <h2 className="text-base font-medium text-slate-100">
              {isRegister ? "Create an account" : "Sign in"}
            </h2>
            <p className="mt-1 text-xs text-slate-600">
              {isRegister ? "Save monitors and alert settings to your account." : "Manage monitors and alert channels."}
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

        <div className="px-5 pt-5">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleProvider("google")}
              disabled={!providers.google}
              title={providers.google ? "Continue with Google" : "Google OAuth is not configured on this deployment"}
              className="flex h-10 items-center justify-center gap-2 rounded-md border border-[#30353e] bg-[#15191f] text-xs font-medium text-slate-300 transition hover:bg-[#1a1f26] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[11px] font-bold text-[#4285f4]">
                G
              </span>
              Google
            </button>
            <button
              type="button"
              onClick={() => handleProvider("github")}
              disabled={!providers.github}
              title={providers.github ? "Continue with GitHub" : "GitHub OAuth is not configured on this deployment"}
              className="flex h-10 items-center justify-center gap-2 rounded-md border border-[#30353e] bg-[#15191f] text-xs font-medium text-slate-300 transition hover:bg-[#1a1f26] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Github className="h-4 w-4" />
              GitHub
            </button>
          </div>

          {!providers.google && !providers.github && (
            <p className="mt-2 text-[10px] text-slate-700">
              OAuth buttons activate when provider credentials are configured on the server.
            </p>
          )}

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-[#242830]" />
            <span className="text-[10px] uppercase tracking-[0.12em] text-slate-700">or use email</span>
            <div className="h-px flex-1 bg-[#242830]" />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-5 pb-5">
          {error && (
            <div className="border border-rose-500/25 bg-rose-500/5 px-3 py-2 text-xs text-rose-400">
              {error}
            </div>
          )}

          {isRegister && (
            <label className="block">
              <span className="mb-1.5 block text-xs text-slate-500">Name</span>
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
            <span className="mb-1.5 block text-xs text-slate-500">Email</span>
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
            <span className="mb-1.5 block text-xs text-slate-500">Password</span>
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
            className="h-10 w-full rounded-md bg-[#e9ebf1] text-sm font-medium text-[#101217] transition hover:bg-white disabled:opacity-50"
          >
            {isLoading ? "Working…" : isRegister ? "Create account" : "Sign in"}
          </button>

          {!isRegister && (
            <button
              type="button"
              onClick={useDemoCredentials}
              className="w-full text-center text-[11px] text-slate-600 transition hover:text-slate-300"
            >
              Use demo credentials
            </button>
          )}

          <div className="border-t border-[#242830] pt-4 text-center">
            <button
              type="button"
              onClick={() => {
                setIsRegister((value) => !value);
                setError(null);
              }}
              className="text-xs text-slate-500 transition hover:text-slate-200"
            >
              {isRegister ? "Already have an account? Sign in" : "New to Sentinel? Create an account"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
