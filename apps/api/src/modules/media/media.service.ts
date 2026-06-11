import { randomUUID } from "node:crypto";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import {
  demoMediaAssets,
  demoMediaProcessingJobs,
  type MediaProcessingJob,
  type MediaProcessingJobStatus
} from "@ssm/domain";
import type { Principal } from "../../common/principal.js";
import { AuditService } from "../audit/audit.service.js";
import { BillingService } from "../billing/billing.service.js";
import type { CompleteUploadDto, CreateUploadIntentDto } from "./dto.js";

type UploadIntent = {
  id: string;
  workspaceId: string;
  fileName: string;
  fileSize: number;
  storageKey: string;
  maxBytes: number;
  contentType: string;
  expiresAt: string;
  uploadUrl: string;
  requiredHeaders: Record<string, string>;
};

const pipeline: Array<{
  status: MediaProcessingJobStatus;
  currentStep: string;
  progress: number;
}> = [
  { status: "virus_scanning", currentStep: "virus_scan", progress: 15 },
  { status: "format_detecting", currentStep: "format_detection", progress: 30 },
  { status: "optimizing", currentStep: "optimization", progress: 45 },
  { status: "thumbnailing", currentStep: "thumbnail_generation", progress: 60 },
  { status: "ai_tagging", currentStep: "ai_tagging", progress: 75 },
  { status: "storing", currentStep: "storage_commit", progress: 88 },
  { status: "cdn_distributing", currentStep: "cdn_distribution", progress: 96 },
  { status: "completed", currentStep: "completed", progress: 100 }
];

@Injectable()
export class MediaService {
  private readonly uploadIntents = new Map<string, UploadIntent>();
  private readonly processingJobs: MediaProcessingJob[] = [...demoMediaProcessingJobs];

  constructor(
    private readonly auditService: AuditService,
    private readonly billingService: BillingService
  ) {}

  listAssets(workspaceId: string) {
    return demoMediaAssets.filter((asset) => asset.workspaceId === workspaceId);
  }

  createUploadIntent(input: CreateUploadIntentDto, user?: Principal) {
    this.billingService.assertAllowed(input.workspaceId, "mediaStorageGb", input.fileSize / 1024 / 1024 / 1024);
    const normalizedName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "-").toLowerCase();
    const storageKey = `workspaces/${input.workspaceId}/media/${randomUUID()}-${normalizedName}`;

    const intent = {
      id: randomUUID(),
      workspaceId: input.workspaceId,
      fileName: input.fileName,
      fileSize: input.fileSize,
      storageKey,
      maxBytes: 1024 * 1024 * 1024,
      contentType: input.fileType,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      uploadUrl: `https://uploads.example.com/${encodeURIComponent(storageKey)}`,
      requiredHeaders: {
        "content-type": input.fileType,
        "x-ssm-workspace-id": input.workspaceId
      }
    };
    this.uploadIntents.set(intent.id, intent);
    this.auditService.record({
      workspaceId: input.workspaceId,
      userId: user?.userId,
      action: "media.upload_intent_created",
      entityType: "media_upload_intent",
      entityId: intent.id,
      newValues: {
        fileName: input.fileName,
        fileType: input.fileType,
        fileSize: input.fileSize,
        expiresAt: intent.expiresAt
      }
    });
    return intent;
  }

  listProcessingJobs(workspaceId: string) {
    return this.processingJobs
      .filter((job) => job.workspaceId === workspaceId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  completeUpload(input: CompleteUploadDto, user?: Principal) {
    const intent = this.uploadIntents.get(input.uploadIntentId);
    if (!intent) {
      throw new NotFoundException("Upload intent not found or expired");
    }

    const existing = this.processingJobs.find((job) => job.uploadIntentId === input.uploadIntentId);
    if (existing) {
      return existing;
    }

    const now = new Date().toISOString();
    const job: MediaProcessingJob = {
      id: randomUUID(),
      workspaceId: intent.workspaceId,
      uploadIntentId: intent.id,
      fileName: intent.storageKey.split("/").at(-1) ?? "uploaded-file",
      fileType: intent.contentType,
      fileSize: intent.fileSize,
      storageKey: intent.storageKey,
      status: "queued",
      currentStep: "queued",
      progress: 0,
      checksumSha256: input.checksumSha256,
      virusScan: {
        status: "pending",
        engine: "clamav-demo"
      },
      createdAt: now,
      updatedAt: now
    };
    this.processingJobs.push(job);
    this.auditService.record({
      workspaceId: job.workspaceId,
      userId: user?.userId,
      action: "media.upload_completed",
      entityType: "media_processing_job",
      entityId: job.id,
      newValues: {
        uploadIntentId: input.uploadIntentId,
        checksumSha256: input.checksumSha256,
        status: job.status
      }
    });
    return job;
  }

  processNext(id: string, user?: Principal) {
    const job = this.findJob(id);
    if (job.status === "failed" || job.status === "completed") {
      return job;
    }

    const currentIndex = pipeline.findIndex((step) => step.status === job.status);
    const next = pipeline[Math.max(currentIndex + 1, 0)];
    if (!next) {
      throw new BadRequestException("No next media pipeline step available");
    }

    const previousStatus = job.status;
    job.status = next.status;
    job.currentStep = next.currentStep;
    job.progress = next.progress;
    job.updatedAt = new Date().toISOString();

    if (next.status === "virus_scanning") {
      job.virusScan = {
        status: "clean",
        engine: "clamav-demo",
        scannedAt: job.updatedAt
      };
    }

    if (next.status === "completed") {
      const normalizedName = job.fileName.replace(/^[0-9a-f-]+-/i, "");
      job.output = {
        cdnUrl: `https://cdn.example.com/${job.storageKey}`,
        thumbnailUrl: `https://cdn.example.com/${job.storageKey.replace(/media\//, "media/thumbs/")}.webp`,
        optimizedBytes: Math.max(Math.round(job.fileSize * 0.72), 1),
        tags: this.inferTags(normalizedName, job.fileType)
      };
    }

    this.auditService.record({
      workspaceId: job.workspaceId,
      userId: user?.userId,
      action: "media.processing_advanced",
      entityType: "media_processing_job",
      entityId: job.id,
      oldValues: { status: previousStatus },
      newValues: { status: job.status, currentStep: job.currentStep, progress: job.progress }
    });

    return job;
  }

  failJob(id: string, errorMessage: string, step = "unknown", user?: Principal) {
    const job = this.findJob(id);
    const previousStatus = job.status;
    job.status = "failed";
    job.currentStep = step;
    job.errorMessage = errorMessage;
    job.updatedAt = new Date().toISOString();
    this.auditService.record({
      workspaceId: job.workspaceId,
      userId: user?.userId,
      action: "media.processing_failed",
      entityType: "media_processing_job",
      entityId: job.id,
      oldValues: { status: previousStatus },
      newValues: { status: job.status, currentStep: step, errorMessage }
    });
    return job;
  }

  private findJob(id: string) {
    const job = this.processingJobs.find((item) => item.id === id);
    if (!job) {
      throw new NotFoundException("Media processing job not found");
    }
    return job;
  }

  private inferTags(fileName: string, fileType: string): string[] {
    const tags = new Set<string>();
    if (fileType.startsWith("image/")) {
      tags.add("image");
    }
    if (fileType.startsWith("video/")) {
      tags.add("video");
    }
    for (const part of fileName.split(/[^a-zA-Z0-9]+/)) {
      if (part.length >= 4) {
        tags.add(part.toLowerCase());
      }
    }
    return [...tags].slice(0, 8);
  }
}
