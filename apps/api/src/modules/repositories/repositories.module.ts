import { Global, Module } from "@nestjs/common";
import { PostsRepository } from "./posts.repository.js";

@Global()
@Module({
  providers: [PostsRepository],
  exports: [PostsRepository]
})
export class RepositoriesModule {}
