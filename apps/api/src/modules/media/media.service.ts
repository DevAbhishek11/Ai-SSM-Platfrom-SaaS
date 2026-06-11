import { randomUUID } from "node:crypto";
import { Injectable } from "@nestjs/common";
import { demoMediaAssets } from "@ssm/domain";
import type { CreateUploadIntentDto } from "./dto.js";

@Injectable()
export class MediaService {
  listAssets(workspaceId: string) {
    return demoMediaAssets.filter((asset) => asset.workspaceId === workspaceId);
  }

  createUploadIntent(input: CreateUploadIntentDto) {
    const normalizedName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "-").toLowerCase();
    const storageKey = `workspaces/${input.workspaceId}/media/${randomUUID()}-${normalizedName}`;

    return {
      id: randomUUID(),
      workspaceId: input.workspaceId,
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
  }
}
