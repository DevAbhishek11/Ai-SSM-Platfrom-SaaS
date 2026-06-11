import type { Permission, Role } from "@ssm/domain";

export type Principal = {
  userId: string;
  email: string;
  role: Role;
  workspaceId: string;
  permissions: Permission[];
};
