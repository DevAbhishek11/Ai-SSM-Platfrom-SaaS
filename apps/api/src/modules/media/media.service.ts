import { randomUUID } from "node:crypto";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import {
  demoMediaAssets,
  demoMediaProcessingJobs,
  type MediaProcessingJob,
  type MediaProcessingJobStatus
} from "@ssm/domain";
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

  listAssets(workspaceId: string) {
    return demoMediaAssets.filter((asset) => asset.workspaceId === workspaceId);
  }

  createUploadIntent(input: CreateUploadIntentDto) {
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
    return intent;
  }

  listProcessingJobs(workspaceId: string) {
    return this.processingJobs
      .filter((job) => job.workspaceId === workspaceId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  completeUpload(input: CompleteUploadDto) {
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
    return job;
  }

  processNext(id: string) {
    const job = this.findJob(id);
    if (job.status === "failed" || job.status === "completed") {
      return job;
    }

    const currentIndex = pipeline.findIndex((step) => step.status === job.status);
    const next = pipeline[Math.max(currentIndex + 1, 0)];
    if (!next) {
      throw new BadRequestException("No next media pipeline step available");
    }

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

    return job;
  }

  failJob(id: string, errorMessage: string, step = "unknown") {
    const job = this.findJob(id);
    job.status = "failed";
    job.currentStep = step;
    job.errorMessage = errorMessage;
    job.updatedAt = new Date().toISOString();
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
