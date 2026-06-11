import "reflect-metadata";
import { Logger, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import helmet from "helmet";
import { AppModule } from "./app.module.js";
import { getEnv } from "./common/env.js";

async function bootstrap() {
  const env = getEnv();
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" }
    })
  );
  app.enableCors({
    origin: [env.WEB_BASE_URL],
    credentials: true,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["content-type", "authorization", "x-api-key", "x-request-id", "x-workspace-id"]
  });
  app.setGlobalPrefix("api");
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true
    })
  );

  const openApiConfig = new DocumentBuilder()
    .setTitle("AI Social Media Management Platform API")
    .setDescription("Enterprise SaaS API for AI-assisted social scheduling and analytics.")
    .setVersion("0.1.0")
    .addBearerAuth()
    .addTag("health")
    .addTag("dashboard")
    .addTag("workspaces")
    .addTag("members")
    .addTag("api-keys")
    .addTag("posts")
    .addTag("ai")
    .addTag("analytics")
    .addTag("social")
    .addTag("audit")
    .build();

  const document = SwaggerModule.createDocument(app, openApiConfig);
  SwaggerModule.setup("docs", app, document, {
    jsonDocumentUrl: "docs-json",
    swaggerOptions: { persistAuthorization: true }
  });

  await app.listen(env.API_PORT);
  Logger.log(`API listening on ${env.API_BASE_URL}`, "Bootstrap");
}

void bootstrap();
