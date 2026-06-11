import { Injectable } from "@nestjs/common";
import { demoPosts, type Post } from "@ssm/domain";

@Injectable()
export class PostsRepository {
  private readonly posts: Post[] = [...demoPosts];

  listByWorkspace(workspaceId: string): Post[] {
    return this.posts
      .filter((post) => post.workspaceId === workspaceId)
      .sort((a, b) => (a.scheduledAt ?? a.createdAt).localeCompare(b.scheduledAt ?? b.createdAt));
  }

  findById(id: string): Post | undefined {
    return this.posts.find((post) => post.id === id);
  }

  save(post: Post): Post {
    const index = this.posts.findIndex((item) => item.id === post.id);
    if (index >= 0) {
      this.posts[index] = post;
    } else {
      this.posts.push(post);
    }

    return post;
  }
}
