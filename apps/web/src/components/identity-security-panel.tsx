"use client";

import { useState } from "react";
import {
  ssoProviderTypes,
  type AuthSession,
  type SsoConnection,
  type SsoProviderType,
  type TrustedDevice
} from "@ssm/domain";
import { KeyRound, LogOut, MonitorSmartphone, ShieldCheck } from "lucide-react";
import { formatTime } from "@/lib/format";
import { StatusBadge } from "./status-badge";

export function IdentitySecurityPanel({
  workspaceId,
  ssoConnections,
  sessions,
  devices
}: {
  workspaceId: string;
  ssoConnections: SsoConnection[];
  sessions: AuthSession[];
  devices: TrustedDevice[];
}) {
  const [connectionRows, setConnectionRows] = useState(ssoConnections);
  const [sessionRows, setSessionRows] = useState(sessions);
  const [deviceRows, setDeviceRows] = useState(devices);
  const [providerType, setProviderType] = useState<SsoProviderType>("okta");
  const [domain, setDomain] = useState("acmegrowth-secure.test");
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function postJson<T>(path: string, body?: unknown): Promise<T> {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api"}${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-user-role": "owner"
      },
      body: body ? JSON.stringify(body) : undefined
    });

    if (!response.ok) {
      const errorBody = (await response.json().catch(() => null)) as { message?: string } | null;
      throw new Error(errorBody?.message ?? "Identity action failed");
    }

    return (await response.json()) as T;
  }

  async function createSsoConnection() {
    setLoading("sso");
    setMessage(null);
    try {
      const connection = await postJson<SsoConnection>("/identity/sso-connections", {
        workspaceId,
        providerType,
        domain,
        entityId: `https://${domain}/app/ssm`,
        ssoUrl: `https://${domain}/app/ssm/sso/saml`,
        certificateFingerprint: `SHA256:${domain.toUpperCase().replace(/[^A-Z0-9]/g, "-")}`,
        metadata: {
          jitProvisioning: true,
          enforcedForDomains: [domain]
        }
      });
      setConnectionRows((current) => [connection, ...current]);
      setMessage(`Created ${connection.providerType} SSO connection for ${connection.domain}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create SSO connection");
    } finally {
      setLoading(null);
    }
  }

  async function testSsoConnection(id: string) {
    setLoading(id);
    setMessage(null);
    try {
      const connection = await postJson<SsoConnection>(`/identity/sso-connections/${id}/test`);
      setConnectionRows((current) =>
        current.map((item) => (item.id === connection.id ? connection : item))
      );
      setMessage(`SSO test passed for ${connection.domain}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not test SSO connection");
    } finally {
      setLoading(null);
    }
  }

  async function disableSsoConnection(id: string) {
    setLoading(id);
    setMessage(null);
    try {
      const connection = await postJson<SsoConnection>(`/identity/sso-connections/${id}/disable`);
      setConnectionRows((current) =>
        current.map((item) => (item.id === connection.id ? connection : item))
      );
      setMessage(`Disabled SSO for ${connection.domain}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not disable SSO connection");
    } finally {
      setLoading(null);
    }
  }

  async function revokeSession(id: string) {
    setLoading(id);
    setMessage(null);
    try {
      const session = await postJson<AuthSession>(`/identity/sessions/${id}/revoke`);
      setSessionRows((current) => current.map((item) => (item.id === session.id ? session : item)));
      setMessage(`Revoked session from ${session.userAgent ?? "unknown device"}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not revoke session");
    } finally {
      setLoading(null);
    }
  }

  async function trustDevice(device: TrustedDevice) {
    setLoading(device.id);
    setMessage(null);
    try {
      const trusted = await postJson<TrustedDevice>(`/identity/devices/${device.id}/trust`, {
        name: device.name
      });
      setDeviceRows((current) => current.map((item) => (item.id === trusted.id ? trusted : item)));
      setMessage(`Trusted ${trusted.name}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not trust device");
    } finally {
      setLoading(null);
    }
  }

  async function revokeDevice(id: string) {
    setLoading(id);
    setMessage(null);
    try {
      const device = await postJson<TrustedDevice>(`/identity/devices/${id}/revoke`);
      setDeviceRows((current) => current.map((item) => (item.id === device.id ? device : item)));
      setSessionRows((current) =>
        current.map((session) =>
          session.deviceId === device.id && session.status === "active"
            ? { ...session, status: "revoked", revokedAt: device.revokedAt }
            : session
        )
      );
      setMessage(`Revoked ${device.name} and its active sessions.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not revoke device");
    } finally {
      setLoading(null);
    }
  }

  const activeSessions = sessionRows.filter((session) => session.status === "active").length;
  const trustedDevices = deviceRows.filter((device) => device.status === "trusted").length;

  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">Identity security</h3>
          <p className="text-sm text-[var(--muted)]">
            Configure enterprise SSO, review active sessions, and control trusted devices.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-md bg-[var(--panel-soft)] px-3 py-2">
            <strong className="block">{activeSessions}</strong>
            <span className="text-[var(--muted)]">sessions</span>
          </div>
          <div className="rounded-md bg-[var(--panel-soft)] px-3 py-2">
            <strong className="block">{trustedDevices}</strong>
            <span className="text-[var(--muted)]">trusted</span>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[170px_1fr_auto]">
        <label className="grid gap-1 text-sm font-medium">
          Provider
          <select
            value={providerType}
            onChange={(event) => setProviderType(event.target.value as SsoProviderType)}
            className="rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm"
          >
            {ssoProviderTypes.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Domain
          <input
            value={domain}
            onChange={(event) => setDomain(event.target.value)}
            className="rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm"
            aria-label="SSO domain"
          />
        </label>
        <button
          type="button"
          onClick={createSsoConnection}
          disabled={loading !== null || !domain.trim()}
          className="self-end rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {loading === "sso" ? "Creating" : "Add SSO"}
        </button>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <div className="grid gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <KeyRound className="size-4" />
            SSO connections
          </div>
          {connectionRows.map((connection) => (
            <article key={connection.id} className="rounded-md border border-[var(--border)] p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{connection.domain}</p>
                  <p className="text-xs text-[var(--muted)]">
                    {connection.providerType} / tested {formatTime(connection.lastTestedAt)}
                  </p>
                </div>
                <StatusBadge status={connection.status} />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => testSsoConnection(connection.id)}
                  disabled={loading !== null || connection.status === "disabled"}
                  className="rounded-md border border-[var(--border)] px-2 py-1 text-xs font-medium disabled:opacity-60"
                >
                  Test
                </button>
                {connection.status !== "disabled" ? (
                  <button
                    type="button"
                    onClick={() => disableSsoConnection(connection.id)}
                    disabled={loading !== null}
                    className="rounded-md border border-[var(--border)] px-2 py-1 text-xs font-medium disabled:opacity-60"
                  >
                    Disable
                  </button>
                ) : null}
              </div>
            </article>
          ))}
        </div>

        <div className="grid gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <LogOut className="size-4" />
            Sessions
          </div>
          {sessionRows.map((session) => (
            <article key={session.id} className="rounded-md border border-[var(--border)] p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{session.userAgent ?? "Unknown agent"}</p>
                  <p className="text-xs text-[var(--muted)]">
                    {session.ipAddress ?? "No IP"} / seen {formatTime(session.lastSeenAt)}
                  </p>
                </div>
                <StatusBadge status={session.status} />
              </div>
              {session.status === "active" ? (
                <button
                  type="button"
                  onClick={() => revokeSession(session.id)}
                  disabled={loading !== null}
                  className="mt-3 rounded-md border border-[var(--border)] px-2 py-1 text-xs font-medium disabled:opacity-60"
                >
                  Revoke
                </button>
              ) : null}
            </article>
          ))}
        </div>

        <div className="grid gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <MonitorSmartphone className="size-4" />
            Devices
          </div>
          {deviceRows.map((device) => (
            <article key={device.id} className="rounded-md border border-[var(--border)] p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{device.name}</p>
                  <p className="text-xs text-[var(--muted)]">Seen {formatTime(device.lastSeenAt)}</p>
                </div>
                <StatusBadge status={device.status} />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {device.status !== "trusted" ? (
                  <button
                    type="button"
                    onClick={() => trustDevice(device)}
                    disabled={loading !== null || device.status === "revoked"}
                    className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] px-2 py-1 text-xs font-medium disabled:opacity-60"
                  >
                    <ShieldCheck className="size-3" />
                    Trust
                  </button>
                ) : null}
                {device.status !== "revoked" ? (
                  <button
                    type="button"
                    onClick={() => revokeDevice(device.id)}
                    disabled={loading !== null}
                    className="rounded-md border border-[var(--border)] px-2 py-1 text-xs font-medium disabled:opacity-60"
                  >
                    Revoke
                  </button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </div>

      {message ? <p className="mt-4 rounded-md bg-[var(--panel-soft)] p-3 text-sm">{message}</p> : null}
    </section>
  );
}
