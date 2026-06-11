import { Module } from "@nestjs/common";
import { RepositoriesModule } from "../repositories/repositories.module.js";
import { PostsController } from "./posts.controller.js";
import { PostsService } from "./posts.service.js";

@Module({
  imports: [RepositoriesModule],
  controllers: [PostsController],
  providers: [PostsService],
  exports: [PostsService]
})
export class PostsModule {}
