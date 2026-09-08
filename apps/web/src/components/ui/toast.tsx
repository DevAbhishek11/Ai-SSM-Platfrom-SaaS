"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from "react";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";

export type ToastTone = "success" | "error" | "warning" | "info";

export type Toast = {
  id: string;
  tone: ToastTone;
  title: string;
  description?: string;
  /** Milliseconds before auto-dismiss; `0` keeps it until dismissed. */
  duration?: number;
  action?: { label: string; onClick: () => void };
};

type ToastInput = Omit<Toast, "id">;

type ToastContextValue = {
  toast: (input: ToastInput) => string;
  success: (title: string, description?: string) => string;
  error: (title: string, description?: string) => string;
  dismiss: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const toneStyles: Record<ToastTone, { icon: typeof Info; className: string }> = {
  success: { icon: CheckCircle2, className: "border-[var(--success-border)] bg-[var(--success-soft)] text-[var(--success)]" },
  error: { icon: XCircle, className: "border-[var(--danger-border)] bg-[var(--danger-soft)] text-[var(--danger)]" },
  warning: { icon: AlertTriangle, className: "border-[var(--warning-border)] bg-[var(--warning-soft)] text-[var(--warning)]" },
  info: { icon: Info, className: "border-[var(--info-border)] bg-[var(--info-soft)] text-[var(--info)]" }
};

/**
 * Application-wide toasts.
 *
 * Errors default to staying on screen: an action that failed is worth more of
 * the user's attention than one that worked, and auto-dismissing a failure
 * routinely means nobody ever reads it.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((entry) => entry.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const toast = useCallback(
    (input: ToastInput) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const duration = input.duration ?? (input.tone === "error" ? 0 : 5000);

      setToasts((current) => [...current.slice(-3), { ...input, id }]);

      if (duration > 0) {
        timers.current.set(
          id,
          setTimeout(() => dismiss(id), duration)
        );
      }

      return id;
    },
    [dismiss]
  );

  // Timers must not outlive the provider, or a dismissed toast can resurrect a
  // state update on an unmounted tree.
  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const timer of pending.values()) clearTimeout(timer);
      pending.clear();
    };
  }, []);

  const value = useMemo<ToastContextValue>(
    () => ({
      toast,
      dismiss,
      success: (title, description) => toast({ tone: "success", title, description }),
      error: (title, description) => toast({ tone: "error", title, description })
    }),
    [toast, dismiss]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-full max-w-sm flex-col gap-2"
      >
        {toasts.map((entry) => {
          const { icon: Icon, className } = toneStyles[entry.tone];
          return (
            <div
              key={entry.id}
              role={entry.tone === "error" ? "alert" : "status"}
              className={`pointer-events-auto flex items-start gap-3 rounded-lg border px-3 py-2.5 shadow-lg ${className}`}
            >
              <Icon size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{entry.title}</p>
                {entry.description ? (
                  <p className="mt-0.5 text-xs opacity-90">{entry.description}</p>
                ) : null}
                {entry.action ? (
                  <button
                    type="button"
                    onClick={() => {
                      entry.action?.onClick();
                      dismiss(entry.id);
                    }}
                    className="mt-1.5 text-xs font-semibold underline underline-offset-2"
                  >
                    {entry.action.label}
                  </button>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => dismiss(entry.id)}
                aria-label="Dismiss notification"
                className="shrink-0 opacity-70 transition hover:opacity-100"
              >
                <X size={14} aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

/**
 * Toast handle.
 *
 * Returns a no-op outside a provider rather than throwing: a missing toast is
 * a cosmetic problem, and crashing a whole page over one would be worse than
 * the bug it reports.
 */
export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);

  return (
    context ?? {
      toast: () => "",
      success: () => "",
      error: () => "",
      dismiss: () => undefined
    }
  );
}
