import type { Platform, PublishingJob } from "@ssm/domain";

export type PublishResult = {
  platformPostId: string;
  platformPostUrl: string;
};

export interface SocialPlatformConnector {
  platform: Platform;
  publish(job: PublishingJob): Promise<PublishResult>;
}

class DeterministicConnector implements SocialPlatformConnector {
  constructor(readonly platform: Platform) {}

  async publish(job: PublishingJob): Promise<PublishResult> {
    const platformPostId = `${this.platform}-${job.id.slice(0, 8)}-${job.attempts + 1}`;
    return {
      platformPostId,
      platformPostUrl: `https://social.example.com/${this.platform}/posts/${platformPostId}`
    };
  }
}

export const deterministicConnectors: Record<Platform, SocialPlatformConnector> = {
  x: new DeterministicConnector("x"),
  instagram: new DeterministicConnector("instagram"),
  facebook: new DeterministicConnector("facebook"),
  linkedin: new DeterministicConnector("linkedin"),
  youtube: new DeterministicConnector("youtube"),
  tiktok: new DeterministicConnector("tiktok"),
  reddit: new DeterministicConnector("reddit"),
  pinterest: new DeterministicConnector("pinterest"),
  threads: new DeterministicConnector("threads"),
  mastodon: new DeterministicConnector("mastodon"),
  bluesky: new DeterministicConnector("bluesky")
};
