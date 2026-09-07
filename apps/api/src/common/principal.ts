import type { Permission, Role } from "@ssm/domain";

export type PrincipalKind = "user" | "service_account" | "development";

export type Principal = {
  userId: string;
  email: string;
  role: Role;
  workspaceId: string;
  permissions: Permission[];
  /** Refresh-session id backing this access token, when the caller is a user. */
  sessionId?: string;
  kind?: PrincipalKind;
};
