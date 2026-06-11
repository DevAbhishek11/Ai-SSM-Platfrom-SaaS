"use client";

import { useState } from "react";
import {
  permissions,
  roles,
  type ApiKey,
  type Role,
  type TeamMember,
  type WorkspaceInvitation
} from "@ssm/domain";
import { formatTime } from "@/lib/format";
import { StatusBadge } from "./status-badge";

type InviteResponse = {
  invitation: WorkspaceInvitation;
  acceptUrl: string;
};

type ApiKeyResponse = {
  apiKey: Omit<ApiKey, "secretHash">;
  secret: string;
};

export function TeamAccessPanel({
  workspaceId,
  members,
  invitations,
  apiKeys
}: {
  workspaceId: string;
  members: TeamMember[];
  invitations: WorkspaceInvitation[];
  apiKeys: ApiKey[];
}) {
  const [email, setEmail] = useState("strategist@acmegrowth.test");
  const [role, setRole] = useState<Role>("manager");
  const [keyName, setKeyName] = useState("Analytics exporter");
  const [selectedScopes, setSelectedScopes] = useState(["analytics.view", "analytics.export"]);
  const [message, setMessage] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

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
      throw new Error(errorBody?.message ?? "Access action failed");
    }

    return (await response.json()) as T;
  }

  async function inviteMember() {
    setLoading("invite");
    setMessage(null);
    setSecret(null);
    try {
      const body = await postJson<InviteResponse>("/members/invitations", {
        workspaceId,
        email,
        role
      });
      setMessage(`Invitation created for ${body.invitation.email}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create invitation");
    } finally {
      setLoading(null);
    }
  }

  async function createApiKey() {
    setLoading("api-key");
    setMessage(null);
    setSecret(null);
    try {
      const body = await postJson<ApiKeyResponse>("/api-keys", {
        workspaceId,
        name: keyName,
        scopes: selectedScopes
      });
      setSecret(body.secret);
      setMessage(`Created API key ${body.apiKey.keyPrefix}. Copy the secret before leaving this page.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create API key");
    } finally {
      setLoading(null);
    }
  }

  async function revokeApiKey(id: string) {
    setLoading(id);
    setMessage(null);
    setSecret(null);
    try {
      const apiKey = await postJson<Omit<ApiKey, "secretHash">>(`/api-keys/${id}/revoke`);
      setMessage(`Revoked API key ${apiKey.keyPrefix}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not revoke API key");
    } finally {
      setLoading(null);
    }
  }

  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">Team access</h3>
          <p className="text-sm text-[var(--muted)]">
            Invite teammates, review pending access, and manage scoped service credentials.
          </p>
        </div>
        <span className="rounded-md bg-[var(--panel-soft)] px-3 py-2 text-sm font-medium">
          {members.length} members
        </span>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <div className="rounded-md border border-[var(--border)] bg-[var(--panel-soft)] p-3">
          <h4 className="text-sm font-semibold">Invite member</h4>
          <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_150px_auto]">
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm"
              aria-label="Invite email"
            />
            <select
              value={role}
              onChange={(event) => setRole(event.target.value as Role)}
              className="rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm"
              aria-label="Invite role"
            >
              {roles
                .filter((item) => item !== "super_admin" && item !== "api_service_account")
                .map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
            </select>
            <button
              type="button"
              onClick={inviteMember}
              disabled={loading !== null}
              className="rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {loading === "invite" ? "Inviting" : "Invite"}
            </button>
          </div>
        </div>

        <div className="rounded-md border border-[var(--border)] bg-[var(--panel-soft)] p-3">
          <h4 className="text-sm font-semibold">Create API key</h4>
          <div className="mt-3 grid gap-3">
            <input
              value={keyName}
              onChange={(event) => setKeyName(event.target.value)}
              className="rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm"
              aria-label="API key name"
            />
            <div className="flex flex-wrap gap-2">
              {permissions
                .filter((scope) => scope.includes("."))
                .slice(0, 10)
                .map((scope) => {
                  const checked = selectedScopes.includes(scope);
                  return (
                    <label
                      key={scope}
                      className={`rounded-md border px-3 py-2 text-xs ${
                        checked
                          ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-strong)]"
                          : "border-[var(--border)] bg-white text-[var(--muted)]"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(event) =>
                          setSelectedScopes((current) =>
                            event.target.checked
                              ? [...current, scope]
                              : current.filter((item) => item !== scope)
                          )
                        }
                        className="mr-2"
                      />
                      {scope}
                    </label>
                  );
                })}
            </div>
            <button
              type="button"
              onClick={createApiKey}
              disabled={loading !== null || selectedScopes.length === 0}
              className="w-fit rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {loading === "api-key" ? "Creating" : "Create key"}
            </button>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <div className="grid gap-3">
          <h4 className="text-sm font-semibold">Members</h4>
          {members.map((member) => (
            <article key={member.id} className="rounded-md border border-[var(--border)] p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{member.userId}</p>
                  <p className="text-xs text-[var(--muted)]">{member.role}</p>
                </div>
                <StatusBadge status={member.status} />
              </div>
            </article>
          ))}
        </div>

        <div className="grid gap-3">
          <h4 className="text-sm font-semibold">Invitations</h4>
          {invitations.map((invite) => (
            <article key={invite.id} className="rounded-md border border-[var(--border)] p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{invite.email}</p>
                  <p className="text-xs text-[var(--muted)]">
                    {invite.role} / expires {formatTime(invite.expiresAt)}
                  </p>
                </div>
                <StatusBadge status={invite.status} />
              </div>
            </article>
          ))}
        </div>

        <div className="grid gap-3">
          <h4 className="text-sm font-semibold">API keys</h4>
          {apiKeys.map((apiKey) => (
            <article key={apiKey.id} className="rounded-md border border-[var(--border)] p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{apiKey.name}</p>
                  <p className="text-xs text-[var(--muted)]">{apiKey.keyPrefix}</p>
                </div>
                <StatusBadge status={apiKey.status} />
              </div>
              <p className="mt-2 text-xs text-[var(--muted)]">{apiKey.scopes.join(", ")}</p>
              {apiKey.status === "active" ? (
                <button
                  type="button"
                  onClick={() => revokeApiKey(apiKey.id)}
                  disabled={loading !== null}
                  className="mt-3 rounded-md border border-[var(--border)] px-3 py-2 text-xs font-medium"
                >
                  {loading === apiKey.id ? "Revoking" : "Revoke"}
                </button>
              ) : null}
            </article>
          ))}
        </div>
      </div>

      {secret ? <p className="mt-4 break-all rounded-md bg-[var(--panel-soft)] p-3 text-sm">{secret}</p> : null}
      {message ? <p className="mt-3 rounded-md bg-[var(--panel-soft)] p-3 text-sm">{message}</p> : null}
    </section>
  );
}
