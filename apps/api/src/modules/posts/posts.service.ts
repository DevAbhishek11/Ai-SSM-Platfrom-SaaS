import { randomUUID } from "node:crypto";
import { BadRequestException, Injectable } from "@nestjs/common";
import { supportedPlatformCapabilities, type Post } from "@ssm/domain";
import { PostsRepository } from "../repositories/posts.repository.js";
import type { CreatePostDto } from "./dto.js";

@Injectable()
export class PostsService {
  constructor(private readonly postsRepository: PostsRepository) {}

  list({ workspaceId }: { workspaceId: string }): Post[] {
    return this.postsRepository.listByWorkspace(workspaceId);
  }

  create(input: CreatePostDto): Post {
    for (const variant of input.content) {
      const capability = supportedPlatformCapabilities[variant.platform];
      if (variant.text.length > capability.maxCharacters) {
        throw new BadRequestException(
          `${variant.platform} content exceeds ${capability.maxCharacters} characters`
        );
      }
    }

    const now = new Date().toISOString();
    const post: Post = {
      id: randomUUID(),
      workspaceId: input.workspaceId,
      campaignId: input.campaignId,
      authorId: "77777777-7777-4777-8777-777777777777",
      status: input.status ?? (input.scheduledAt ? "scheduled" : "draft"),
      content: input.content.map((variant) => ({
        platform: variant.platform,
        text: variant.text,
        hashtags: variant.hashtags ?? [],
        firstComment: variant.firstComment,
        link: variant.link
      })),
      mediaIds: [],
      scheduledAt: input.scheduledAt,
      aiGenerated: input.aiGenerated ?? false,
      createdAt: now,
      updatedAt: now
    };

    return this.postsRepository.save(post);
  }
}
