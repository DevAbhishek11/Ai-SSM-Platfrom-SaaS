"use client";

import { useMemo, useState } from "react";
import { platforms, type Platform, type SocialAccount, type SocialOAuthState } from "@ssm/domain";
import { StatusBadge } from "./status-badge";

type OAuthAuthorizeResponse = SocialOAuthState & {
  expiresInSeconds: number;
};

type OAuthCallbackResponse = {
  account: SocialAccount;
  oauthState: SocialOAuthState;
};

type ScopeValidationResponse = {
  accountId: string;
  platform: Platform;
  valid: boolean;
  requiredScopes: string[];
  missingScopes: string[];
  checkedAt: string;
};

const scopeOptions = ["publish", "insights", "comments", "boards"];

export function SocialConnectorPanel({
  workspaceId,
  accounts
}: {
  workspaceId: string;
  accounts: SocialAccount[];
}) {
  const [platform, setPlatform] = useState<Platform>("threads");
  const [selectedScopes, setSelectedScopes] = useState(["publish", "insights", "comments"]);
  const [oauthState, setOauthState] = useState<OAuthAuthorizeResponse | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  const selectedPlatformAccount = useMemo(
    () => accounts.find((account) => account.platform === platform),
    [accounts, platform]
  );

  async function requestJson<T>(path: string, body?: unknown): Promise<T> {
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
      throw new Error(errorBody?.message ?? "Connector action failed");
    }

    return (await response.json()) as T;
  }

  async function startOAuth() {
    setLoading("authorize");
    setMessage(null);
    try {
      const body = await requestJson<OAuthAuthorizeResponse>("/social/oauth/authorize", {
        workspaceId,
        platform,
        scopes: selectedScopes
      });
      setOauthState(body);
      setMessage(`Authorization state created for ${platform}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not start OAuth");
    } finally {
      setLoading(null);
    }
  }

  async function completeOAuth() {
    if (!oauthState) {
      return;
    }

    setLoading("callback");
    setMessage(null);
    try {
      const body = await requestJson<OAuthCallbackResponse>("/social/oauth/callback", {
        state: oauthState.state,
        code: `demo-code-${platform}`,
        username: `${platform}-growth`,
        displayName: `${platform} Growth Channel`
      });
      setMessage(`Connected @${body.account.username} with ${body.oauthState.scopes.length} scope(s).`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not complete OAuth");
    } finally {
      setLoading(null);
    }
  }

  async function refreshToken(accountId: string) {
    setLoading(accountId);
    setMessage(null);
    try {
      const account = await requestJson<SocialAccount>(`/social/accounts/${accountId}/refresh-token`);
      setMessage(`Refreshed ${account.platform} token for @${account.username}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not refresh token");
    } finally {
      setLoading(null);
    }
  }

  async function validateScopes(accountId: string) {
    setLoading(`${accountId}:scopes`);
    setMessage(null);
    try {
      const result = await requestJson<ScopeValidationResponse>(
        `/social/accounts/${accountId}/validate-scopes`,
        { requiredScopes: ["publish", "insights"] }
      );
      setMessage(
        result.valid
          ? `${result.platform} has the required scopes.`
          : `${result.platform} is missing ${result.missingScopes.join(", ")}.`
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not validate scopes");
    } finally {
      setLoading(null);
    }
  }

  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">Connector lifecycle</h3>
          <p className="text-sm text-[var(--muted)]">
            Start OAuth, simulate callback exchange, validate scopes, and refresh tokens.
          </p>
        </div>
        {selectedPlatformAccount ? <StatusBadge status={selectedPlatformAccount.status} /> : null}
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[180px_1fr_auto]">
        <label className="grid gap-1 text-sm font-medium">
          Platform
          <select
            value={platform}
            onChange={(event) => setPlatform(event.target.value as Platform)}
            className="rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm"
          >
            {platforms.map((item) => (
              <option key={item} value={item}>
                {item === "x" ? "X" : item}
              </option>
            ))}
          </select>
        </label>

        <div className="grid gap-2 rounded-md border border-[var(--border)] bg-[var(--panel-soft)] p-3">
          <p className="text-sm font-medium">Requested scopes</p>
          <div className="flex flex-wrap gap-2">
            {scopeOptions.map((scope) => {
              const checked = selectedScopes.includes(scope);
              return (
                <label
                  key={scope}
                  className={`rounded-md border px-3 py-2 text-sm ${
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
        </div>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={startOAuth}
            disabled={loading !== null || selectedScopes.length === 0}
            className="rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {loading === "authorize" ? "Starting" : "Start OAuth"}
          </button>
          <button
            type="button"
            onClick={completeOAuth}
            disabled={loading !== null || !oauthState}
            className="rounded-md border border-[var(--border)] px-3 py-2 text-sm font-medium disabled:opacity-60"
          >
            {loading === "callback" ? "Connecting" : "Simulate callback"}
          </button>
        </div>
      </div>

      {oauthState ? (
        <div className="mt-4 rounded-md border border-[var(--border)] bg-[var(--panel-soft)] p-3 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-medium">OAuth state</span>
            <StatusBadge status={oauthState.status} />
          </div>
          <p className="mt-2 break-all text-[var(--muted)]">{oauthState.state}</p>
          <a className="mt-2 block break-all font-medium text-[var(--accent)]" href={oauthState.authorizationUrl}>
            {oauthState.authorizationUrl}
          </a>
        </div>
      ) : null}

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {accounts.map((account) => (
          <article key={account.id} className="rounded-md border border-[var(--border)] p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold capitalize">{account.platform}</p>
                <p className="truncate text-sm text-[var(--muted)]">@{account.username}</p>
              </div>
              <StatusBadge status={account.status} />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => refreshToken(account.id)}
                disabled={loading !== null}
                className="rounded-md border border-[var(--border)] px-3 py-2 text-xs font-medium"
              >
                {loading === account.id ? "Refreshing" : "Refresh token"}
              </button>
              <button
                type="button"
                onClick={() => validateScopes(account.id)}
                disabled={loading !== null}
                className="rounded-md border border-[var(--border)] px-3 py-2 text-xs font-medium"
              >
                {loading === `${account.id}:scopes` ? "Checking" : "Validate scopes"}
              </button>
            </div>
          </article>
        ))}
      </div>

      {message ? <p className="mt-4 rounded-md bg-[var(--panel-soft)] p-3 text-sm">{message}</p> : null}
    </section>
  );
}
