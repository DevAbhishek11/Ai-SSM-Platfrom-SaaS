import "reflect-metadata";
import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import helmet from "helmet";
import { AppModule } from "./app.module.js";
import { getEnv } from "./common/env.js";

async function bootstrap() {
  const env = getEnv();
  const isProduction = env.NODE_ENV === "production";
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });

  // Trust the first hop so `req.ip` (used for rate limiting and audit records)
  // reflects the client rather than the load balancer.
  app.set("trust proxy", 1);
  app.disable("x-powered-by");

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
      referrerPolicy: { policy: "strict-origin-when-cross-origin" },
      frameguard: { action: "deny" },
      // The API returns JSON, never markup: lock the CSP down to nothing so an
      // accidentally reflected payload has no execution context.
      contentSecurityPolicy: {
        directives: {
          "default-src": ["'none'"],
          "frame-ancestors": ["'none'"],
          "base-uri": ["'none'"],
          "form-action": ["'none'"]
        }
      },
      hsts: isProduction ? { maxAge: 31_536_000, includeSubDomains: true, preload: true } : false
    })
  );

  // Bounded bodies: an unbounded parser is a trivial memory-exhaustion vector.
  app.useBodyParser("json", { limit: env.REQUEST_BODY_LIMIT });
  app.useBodyParser("urlencoded", { limit: env.REQUEST_BODY_LIMIT, extended: true });
  const corsOrigins = env.CORS_ALLOWED_ORIGINS
    ? env.CORS_ALLOWED_ORIGINS.split(",")
        .map((origin) => origin.trim())
        .filter(Boolean)
    : [env.WEB_BASE_URL];

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["content-type", "authorization", "x-api-key", "x-request-id", "x-workspace-id"]
  });
  app.setGlobalPrefix("api");
  // Validation, error shaping and request timeouts are registered as global
  // providers in AppModule so tests exercise the same behaviour as production.
  app.enableShutdownHooks();

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
    .addTag("content")
    .addTag("ai")
    .addTag("analytics")
    .addTag("reports")
    .addTag("identity")
    .addTag("scheduling")
    .addTag("onboarding")
    .addTag("localization")
    .addTag("listening")
    .addTag("safety")
    .addTag("social")
    .addTag("brand-voices")
    .addTag("audit")
    .build();

  const document = SwaggerModule.createDocument(app, openApiConfig);
  SwaggerModule.setup("docs", app, document, {
    jsonDocumentUrl: "docs-json",
    swaggerOptions: { persistAuthorization: true }
  });

  await app.listen(env.API_PORT, env.API_HOST);
  Logger.log(`API listening on ${env.API_BASE_URL}`, "Bootstrap");

  for (const signal of ["SIGTERM", "SIGINT"] as const) {
    process.once(signal, () => {
      Logger.log(`Received ${signal}, draining connections`, "Bootstrap");
      void app.close().then(() => process.exit(0));
    });
  }
}

// A rejected bootstrap must not leave a half-initialised process listening.
void bootstrap().catch((error: unknown) => {
  Logger.error("Failed to start API", error instanceof Error ? error.stack : String(error), "Bootstrap");
  process.exit(1);
});
