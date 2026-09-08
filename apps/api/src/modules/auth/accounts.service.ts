import { randomBytes, randomUUID, createHash, timingSafeEqual } from "node:crypto";
import { BadRequestException, Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { hash, verify } from "@node-rs/argon2";
import { demoUser, demoWorkspace, rolePermissions, type Role, type User } from "@ssm/domain";
import { getEnv } from "../../common/env.js";

export type Membership = {
  workspaceId: string;
  workspaceName: string;
  workspaceSlug: string;
  role: Role;
};

export type Account = {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  avatarUrl?: string;
  timezone: string;
  language: string;
  status: "active" | "suspended" | "deleted";
  memberships: Membership[];
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
};

export type PublicAccount = User & {
  memberships: Membership[];
  lastLoginAt?: string;
};

const MIN_PASSWORD_LENGTH = 10;
const MAX_PASSWORD_LENGTH = 200;

/**
 * A short deny-list is not a substitute for a breach corpus, but it stops the
 * handful of passwords that show up in every credential-stuffing run.
 */
const BANNED_PASSWORDS = new Set([
  "password",
  "password1",
  "password123",
  "letmein123",
  "qwerty12345",
  "111111111111",
  "administrator",
  "changeme123"
]);

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "workspace";

/**
 * Account directory for password-based sign-in.
 *
 * Storage is in-process for this scaffold; every mutation funnels through this
 * service so swapping in the Drizzle `users` / `workspace_members` tables is a
 * single-file change rather than a refactor of the auth surface.
 */
@Injectable()
export class AccountsService {
  private readonly logger = new Logger(AccountsService.name);
  private readonly accounts = new Map<string, Account>();
  private readonly emailIndex = new Map<string, string>();
  private seeded = false;

  /** Argon2id parameters: OWASP "second recommended" profile (19 MiB, t=2, p=1). */
  private readonly hashOptions = { memoryCost: 19_456, timeCost: 2, parallelism: 1 } as const;

  async findByEmail(email: string): Promise<Account | undefined> {
    await this.ensureSeeded();
    const id = this.emailIndex.get(this.normalizeEmail(email));
    return id ? this.accounts.get(id) : undefined;
  }

  async findById(id: string): Promise<Account | undefined> {
    await this.ensureSeeded();
    return this.accounts.get(id);
  }

  async register(input: {
    email: string;
    password: string;
    name: string;
    workspaceName?: string;
    timezone?: string;
  }): Promise<Account> {
    await this.ensureSeeded();

    const email = this.normalizeEmail(input.email);
    if (this.emailIndex.has(email)) {
      // Deliberately explicit: signup is a public form, so an ambiguous error
      // would only frustrate legitimate users. Login stays generic instead.
      throw new BadRequestException("An account with that email already exists");
    }

    this.assertPasswordStrength(input.password, { email, name: input.name });

    const now = new Date().toISOString();
    const workspaceName = input.workspaceName?.trim() || `${input.name.trim().split(" ")[0]}'s workspace`;
    const account: Account = {
      id: randomUUID(),
      email,
      name: input.name.trim(),
      passwordHash: await hash(input.password, this.hashOptions),
      timezone: input.timezone?.trim() || "UTC",
      language: "en",
      status: "active",
      memberships: [
        {
          workspaceId: randomUUID(),
          workspaceName,
          workspaceSlug: `${slugify(workspaceName)}-${randomBytes(2).toString("hex")}`,
          role: "owner"
        }
      ],
      createdAt: now,
      updatedAt: now
    };

    this.accounts.set(account.id, account);
    this.emailIndex.set(email, account.id);
    return account;
  }

  async verifyPassword(account: Account, password: string): Promise<boolean> {
    try {
      return await verify(account.passwordHash, password);
    } catch {
      return false;
    }
  }

  /**
   * Runs an Argon2 verification against a throwaway hash so that "unknown email"
   * and "wrong password" cost the same wall-clock time.
   */
  async burnTiming(password: string): Promise<void> {
    const decoy = await this.decoyHash();
    try {
      await verify(decoy, password);
    } catch {
      /* ignored - the point is the work, not the answer */
    }
  }

  async changePassword(accountId: string, currentPassword: string, nextPassword: string): Promise<Account> {
    const account = await this.findById(accountId);
    if (!account) {
      throw new UnauthorizedException("Account not found");
    }

    if (!(await this.verifyPassword(account, currentPassword))) {
      throw new UnauthorizedException("Current password is incorrect");
    }

    if (await this.verifyPassword(account, nextPassword)) {
      throw new BadRequestException("New password must be different from the current password");
    }

    this.assertPasswordStrength(nextPassword, { email: account.email, name: account.name });
    account.passwordHash = await hash(nextPassword, this.hashOptions);
    account.updatedAt = new Date().toISOString();
    return account;
  }

  async updateProfile(
    accountId: string,
    patch: { name?: string; timezone?: string; language?: string; avatarUrl?: string }
  ): Promise<Account> {
    const account = await this.findById(accountId);
    if (!account) {
      throw new UnauthorizedException("Account not found");
    }

    if (patch.name !== undefined) account.name = patch.name.trim();
    if (patch.timezone !== undefined) account.timezone = patch.timezone.trim();
    if (patch.language !== undefined) account.language = patch.language.trim();
    if (patch.avatarUrl !== undefined) account.avatarUrl = patch.avatarUrl;
    account.updatedAt = new Date().toISOString();
    return account;
  }

  markLogin(account: Account): void {
    account.lastLoginAt = new Date().toISOString();
  }

  membershipFor(account: Account, workspaceId?: string): Membership {
    if (!workspaceId) {
      const [first] = account.memberships;
      if (!first) {
        throw new UnauthorizedException("Account has no workspace membership");
      }
      return first;
    }

    const membership = account.memberships.find((entry) => entry.workspaceId === workspaceId);
    if (!membership) {
      throw new UnauthorizedException("Account is not a member of that workspace");
    }

    return membership;
  }

  present(account: Account): PublicAccount {
    return {
      id: account.id,
      email: account.email,
      name: account.name,
      avatarUrl: account.avatarUrl,
      timezone: account.timezone,
      language: account.language,
      status: account.status,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
      lastLoginAt: account.lastLoginAt,
      memberships: account.memberships.map((membership) => ({ ...membership }))
    };
  }

  permissionsFor(role: Role) {
    return [...rolePermissions[role]];
  }

  assertPasswordStrength(password: string, context: { email?: string; name?: string } = {}): void {
    const problems: string[] = [];

    if (password.length < MIN_PASSWORD_LENGTH) {
      problems.push(`must be at least ${MIN_PASSWORD_LENGTH} characters`);
    }
    if (password.length > MAX_PASSWORD_LENGTH) {
      problems.push(`must be at most ${MAX_PASSWORD_LENGTH} characters`);
    }
    if (!/[a-zA-Z]/.test(password)) {
      problems.push("must contain a letter");
    }
    if (!/[0-9]/.test(password) && !/[^a-zA-Z0-9]/.test(password)) {
      problems.push("must contain a number or symbol");
    }
    if (BANNED_PASSWORDS.has(password.toLowerCase())) {
      problems.push("is too common");
    }

    const localPart = context.email?.split("@")[0]?.toLowerCase();
    if (localPart && localPart.length > 2 && password.toLowerCase().includes(localPart)) {
      problems.push("must not contain your email address");
    }

    if (problems.length > 0) {
      throw new BadRequestException(`Password ${problems.join(", ")}`);
    }
  }

  /** Deterministic, non-reversible fingerprint used for audit trails. */
  fingerprint(value: string): string {
    return createHash("sha256").update(value).digest("hex").slice(0, 16);
  }

  constantTimeEquals(a: string, b: string): boolean {
    const left = Buffer.from(a);
    const right = Buffer.from(b);
    return left.length === right.length && timingSafeEqual(left, right);
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private decoyHashValue: string | undefined;

  private async decoyHash(): Promise<string> {
    this.decoyHashValue ??= await hash(randomBytes(24).toString("hex"), this.hashOptions);
    return this.decoyHashValue;
  }

  /**
   * Seeds the demo owner so the fixture-driven dashboard has a matching login.
   * Real deployments disable this by setting DEMO_USER_PASSWORD to an empty value.
   */
  private async ensureSeeded(): Promise<void> {
    if (this.seeded) {
      return;
    }
    this.seeded = true;

    const env = getEnv();
    const now = new Date().toISOString();
    const account: Account = {
      id: demoUser.id,
      email: demoUser.email,
      name: demoUser.name,
      passwordHash: await hash(env.DEMO_USER_PASSWORD, this.hashOptions),
      timezone: demoUser.timezone,
      language: demoUser.language,
      status: "active",
      memberships: [
        {
          workspaceId: demoWorkspace.id,
          workspaceName: demoWorkspace.name,
          workspaceSlug: demoWorkspace.slug,
          role: "owner"
        }
      ],
      createdAt: demoUser.createdAt,
      updatedAt: now
    };

    this.accounts.set(account.id, account);
    this.emailIndex.set(account.email, account.id);

    if (env.NODE_ENV === "production") {
      this.logger.warn(
        "Demo account seeding is enabled in production. Set DEMO_USER_PASSWORD to a strong secret or disable seeding."
      );
    }
  }
}
