import { randomUUID } from "node:crypto";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import {
  demoContentTemplates,
  demoUser,
  demoWorkspace,
  type ContentTemplate,
  type ContentTemplateStatus
} from "@ssm/domain";
import type { Principal } from "../../common/principal.js";
import { AuditService } from "../audit/audit.service.js";
import { PostsService } from "../posts/posts.service.js";
import type { CreateContentTemplateDto, UseContentTemplateDto } from "./dto.js";

@Injectable()
export class ContentTemplatesService {
  private readonly templates: ContentTemplate[] = demoContentTemplates.map((template) => ({
    ...template,
    platforms: [...template.platforms],
    variables: [...template.variables],
    defaultHashtags: [...template.defaultHashtags],
    guidance: { ...template.guidance }
  }));

  constructor(
    private readonly auditService: AuditService,
    private readonly postsService: PostsService
  ) {}

  list(workspaceId = demoWorkspace.id, status?: ContentTemplateStatus) {
    return this.templates
      .filter((template) => template.workspaceId === workspaceId)
      .filter((template) => !status || template.status === status)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  create(input: CreateContentTemplateDto, actor?: Principal) {
    const normalizedName = input.name.trim();
    const existing = this.templates.find(
      (template) =>
        template.workspaceId === input.workspaceId &&
        template.name.toLowerCase() === normalizedName.toLowerCase() &&
        template.status !== "archived"
    );
    if (existing) {
      throw new BadRequestException("An active content template already exists with this name");
    }

    const now = new Date().toISOString();
    const template: ContentTemplate = {
      id: randomUUID(),
      workspaceId: input.workspaceId,
      name: normalizedName,
      category: input.category,
      status: input.status ?? "active",
      platforms: [...new Set(input.platforms)],
      bodyTemplate: input.bodyTemplate.trim(),
      variables: input.variables ?? this.extractVariables(input.bodyTemplate),
      defaultHashtags: input.defaultHashtags ?? [],
      guidance: input.guidance ?? {},
      usageCount: 0,
      createdBy: actor?.userId ?? demoUser.id,
      createdAt: now,
      updatedAt: now
    };

    this.templates.unshift(template);
    this.auditService.record({
      workspaceId: template.workspaceId,
      userId: actor?.userId,
      action: "content.template_created",
      entityType: "content_template",
      entityId: template.id,
      newValues: {
        name: template.name,
        category: template.category,
        platforms: template.platforms
      }
    });
    return template;
  }

  useTemplate(id: string, input: UseContentTemplateDto, actor?: Principal) {
    const template = this.findTemplate(id);
    if (template.status !== "active") {
      throw new BadRequestException("Only active content templates can be used");
    }

    const variables = input.variables ?? {};
    const rendered = this.render(template.bodyTemplate, variables);
    const post = this.postsService.create({
      workspaceId: template.workspaceId,
      campaignId: input.campaignId,
      status: input.status,
      scheduledAt: input.scheduledAt,
      aiGenerated: false,
      content: template.platforms.map((platform) => ({
        platform,
        text: rendered,
        hashtags: [...template.defaultHashtags]
      }))
    });

    const now = new Date().toISOString();
    template.usageCount += 1;
    template.lastUsedAt = now;
    template.updatedAt = now;

    this.auditService.record({
      workspaceId: template.workspaceId,
      userId: actor?.userId,
      action: "content.template_used",
      entityType: "content_template",
      entityId: template.id,
      newValues: {
        postId: post.id,
        usageCount: template.usageCount,
        variables
      }
    });

    return {
      template,
      post,
      variablesUsed: variables
    };
  }

  private findTemplate(id: string) {
    const template = this.templates.find((item) => item.id === id);
    if (!template) {
      throw new NotFoundException("Content template not found");
    }
    return template;
  }

  private extractVariables(bodyTemplate: string) {
    const matches = bodyTemplate.matchAll(/\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g);
    return [...new Set([...matches].map((match) => match[1] ?? "").filter(Boolean))];
  }

  private render(bodyTemplate: string, variables: Record<string, string>) {
    return bodyTemplate.replace(/\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g, (_match, key: string) => {
      const value = variables[key];
      return typeof value === "string" && value.trim() ? value.trim() : `[${key}]`;
    });
  }
}
