import { createHash, randomBytes, randomUUID } from "node:crypto";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import {
  demoTeamMembers,
  demoWorkspaceInvitations,
  type Role,
  type TeamMember,
  type WorkspaceInvitation
} from "@ssm/domain";
import type { Principal } from "../../common/principal.js";
import { AuditService } from "../audit/audit.service.js";
import { BillingService } from "../billing/billing.service.js";
import type { InviteMemberDto } from "./dto.js";

@Injectable()
export class MembersService {
  private readonly members: TeamMember[] = demoTeamMembers.map((member) => ({ ...member }));
  private readonly invitations: WorkspaceInvitation[] = demoWorkspaceInvitations.map((invite) => ({
    ...invite
  }));

  constructor(
    private readonly auditService: AuditService,
    private readonly billingService: BillingService
  ) {}

  listMembers(workspaceId: string) {
    return this.members
      .filter((member) => member.workspaceId === workspaceId)
      .sort((a, b) => a.role.localeCompare(b.role));
  }

  listInvitations(workspaceId: string) {
    return this.invitations
      .filter((invite) => invite.workspaceId === workspaceId)
      .sort((a, b) => b.invitedAt.localeCompare(a.invitedAt));
  }

  invite(input: InviteMemberDto, user: Principal) {
    this.billingService.assertAllowed(input.workspaceId, "teamMembers", 1);
    const normalizedEmail = input.email.trim().toLowerCase();
    const existingPending = this.invitations.find(
      (invite) =>
        invite.workspaceId === input.workspaceId &&
        invite.email === normalizedEmail &&
        invite.status === "pending"
    );
    if (existingPending) {
      throw new BadRequestException("A pending invitation already exists for this email");
    }

    const token = randomBytes(32).toString("base64url");
    const now = new Date().toISOString();
    const expiresAt = new Date(
      Date.now() + (input.expiresInDays ?? 7) * 24 * 60 * 60 * 1000
    ).toISOString();
    const invitation: WorkspaceInvitation = {
      id: randomUUID(),
      workspaceId: input.workspaceId,
      email: normalizedEmail,
      role: input.role,
      status: "pending",
      tokenHash: this.hashSecret(token),
      invitedBy: user.userId,
      invitedAt: now,
      expiresAt
    };

    this.invitations.unshift(invitation);
    this.auditService.record({
      workspaceId: input.workspaceId,
      userId: user.userId,
      action: "members.invitation_created",
      entityType: "workspace_invitation",
      entityId: invitation.id,
      newValues: { email: normalizedEmail, role: input.role, expiresAt }
    });

    return {
      invitation,
      acceptUrl: `https://app.example.com/invitations/accept?token=${token}`
    };
  }

  resendInvitation(id: string, user: Principal) {
    const invitation = this.findInvitation(id);
    if (invitation.status !== "pending") {
      throw new BadRequestException("Only pending invitations can be resent");
    }

    const previousExpiresAt = invitation.expiresAt;
    const token = randomBytes(32).toString("base64url");
    invitation.tokenHash = this.hashSecret(token);
    invitation.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    this.auditService.record({
      workspaceId: invitation.workspaceId,
      userId: user.userId,
      action: "members.invitation_resent",
      entityType: "workspace_invitation",
      entityId: invitation.id,
      oldValues: { expiresAt: previousExpiresAt },
      newValues: { expiresAt: invitation.expiresAt }
    });

    return {
      invitation,
      acceptUrl: `https://app.example.com/invitations/accept?token=${token}`
    };
  }

  revokeInvitation(id: string, user: Principal) {
    const invitation = this.findInvitation(id);
    if (invitation.status !== "pending") {
      throw new BadRequestException("Only pending invitations can be revoked");
    }

    invitation.status = "revoked";
    invitation.revokedAt = new Date().toISOString();
    this.auditService.record({
      workspaceId: invitation.workspaceId,
      userId: user.userId,
      action: "members.invitation_revoked",
      entityType: "workspace_invitation",
      entityId: invitation.id,
      oldValues: { status: "pending" },
      newValues: { status: invitation.status, revokedAt: invitation.revokedAt }
    });
    return invitation;
  }

  updateRole(memberId: string, role: Role, user: Principal) {
    const member = this.findMember(memberId);
    const previousRole = member.role;
    member.role = role;

    this.auditService.record({
      workspaceId: member.workspaceId,
      userId: user.userId,
      action: "members.role_updated",
      entityType: "team_member",
      entityId: member.id,
      oldValues: { role: previousRole },
      newValues: { role }
    });
    return member;
  }

  suspend(memberId: string, user: Principal) {
    const member = this.findMember(memberId);
    if (member.userId === user.userId) {
      throw new BadRequestException("Admins cannot suspend their own active membership");
    }

    const previousStatus = member.status;
    member.status = "suspended";
    this.auditService.record({
      workspaceId: member.workspaceId,
      userId: user.userId,
      action: "members.suspended",
      entityType: "team_member",
      entityId: member.id,
      oldValues: { status: previousStatus },
      newValues: { status: member.status }
    });
    return member;
  }

  private findInvitation(id: string): WorkspaceInvitation {
    const invitation = this.invitations.find((item) => item.id === id);
    if (!invitation) {
      throw new NotFoundException("Invitation not found");
    }
    return invitation;
  }

  private findMember(id: string): TeamMember {
    const member = this.members.find((item) => item.id === id);
    if (!member) {
      throw new NotFoundException("Team member not found");
    }
    return member;
  }

  private hashSecret(secret: string) {
    return `sha256:${createHash("sha256").update(secret).digest("hex")}`;
  }
}
