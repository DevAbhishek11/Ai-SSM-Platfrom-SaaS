import { LogOut, MonitorSmartphone, ShieldCheck, UserCog } from "lucide-react";
import { revokeSession } from "@/app/(dashboard)/account-actions";
import { formatRelativeTime, formatTime } from "@/lib/format";
import { authorizedFetch, type Session } from "@/lib/session";
import { PasswordForm } from "./password-form";
import { ProfileForm } from "./profile-form";

type ApiSession = {
  id: string;
  workspaceId: string;
  role: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  lastUsedAt: string;
  expiresAt: string;
  /** When the inactivity timer, rather than the absolute lifetime, ends it. */
  idleExpiresAt?: string;
  current: boolean;
};

/** Turns a raw user-agent string into something a human can scan in a table. */
function describeClient(userAgent?: string): string {
  if (!userAgent) {
    return "Unknown client";
  }

  const browser =
    /Edg\//.test(userAgent) ? "Edge"
    : /Chrome\//.test(userAgent) ? "Chrome"
    : /Safari\//.test(userAgent) && !/Chrome\//.test(userAgent) ? "Safari"
    : /Firefox\//.test(userAgent) ? "Firefox"
    : "Browser";

  const platform =
    /Windows/.test(userAgent) ? "Windows"
    : /Macintosh|Mac OS X/.test(userAgent) ? "macOS"
    : /Android/.test(userAgent) ? "Android"
    : /iPhone|iPad/.test(userAgent) ? "iOS"
    : /Linux/.test(userAgent) ? "Linux"
    : "Unknown OS";

  return `${browser} · ${platform}`;
}

async function loadSessions(): Promise<ApiSession[]> {
  try {
    const response = await authorizedFetch("/auth/sessions");
    if (!response.ok) {
      return [];
    }
    return (await response.json()) as ApiSession[];
  } catch {
    return [];
  }
}

export async function AccountSecurityPanel({ session }: { session: Session }) {
  const sessions = await loadSessions();

  return (
    <section className="card grid gap-6 p-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="grid size-9 place-items-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent-strong)]">
            <ShieldCheck size={18} aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-base font-semibold">Your account</h2>
            <p className="text-sm text-[var(--muted)]">
              Profile details, password, and the devices currently signed in as{" "}
              <span className="font-medium text-[var(--foreground)]">{session.user.email}</span>.
            </p>
          </div>
        </div>
        <span className="chip capitalize">
          {session.role.replace(/_/g, " ")} · {session.workspace.workspaceName}
        </span>
      </header>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="grid content-start gap-3 rounded-lg border border-[var(--border)] bg-[var(--panel-soft)] p-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <UserCog size={15} aria-hidden="true" /> Profile
          </h3>
          <ProfileForm
            name={session.user.name}
            email={session.user.email}
            timezone={session.user.timezone}
            language={session.user.language}
          />
        </div>

        <div className="grid content-start gap-3 rounded-lg border border-[var(--border)] bg-[var(--panel-soft)] p-4">
          <h3 className="text-sm font-semibold">Password</h3>
          <PasswordForm />
        </div>
      </div>

      <div className="grid gap-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <MonitorSmartphone size={15} aria-hidden="true" /> Active sessions
          <span className="badge badge-plain">{sessions.length}</span>
        </h3>

        {sessions.length === 0 ? (
          <p className="rounded-lg border border-dashed border-[var(--border)] p-4 text-sm text-[var(--muted)]">
            No active sessions were returned by the API.
          </p>
        ) : (
          <div className="scroll-thin overflow-x-auto rounded-[var(--radius-sm)] border border-[var(--border)]">
            <table className="data-table min-w-[46rem]">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>IP address</th>
                  <th>Last used</th>
                  <th>Signs out</th>
                  <th className="sr-only">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{describeClient(item.userAgent)}</span>
                        {item.current ? <span className="badge badge-success">This device</span> : null}
                      </div>
                      <p className="text-xs capitalize text-[var(--muted)]">
                        {item.role.replace(/_/g, " ")} · started {formatTime(item.createdAt)}
                      </p>
                    </td>
                    <td className="text-[var(--muted)]">{item.ipAddress ?? "—"}</td>
                    <td className="text-[var(--muted)]">{formatRelativeTime(item.lastUsedAt)}</td>
                    <td className="text-[var(--muted)]">
                      {formatTime(item.idleExpiresAt ?? item.expiresAt)}
                      <span className="block text-xs">
                        {item.idleExpiresAt ? "if left idle" : "absolute expiry"}
                      </span>
                    </td>
                    <td className="text-right">
                      <form action={revokeSession}>
                        <input type="hidden" name="sessionId" value={item.id} />
                        <input type="hidden" name="current" value={String(item.current)} />
                        <button type="submit" className="btn-danger btn-sm">
                          <LogOut size={14} aria-hidden="true" />
                          {item.current ? "Sign out" : "Revoke"}
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
