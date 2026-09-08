import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger
} from "@nestjs/common";
import { HttpAdapterHost } from "@nestjs/core";
import { ThrottlerException } from "@nestjs/throttler";
import type { Request, Response } from "express";
import { ZodError } from "zod";
import { getEnv } from "./env.js";

/**
 * The single shape every error response takes.
 *
 * Clients branch on `code` (stable) rather than `message` (human-facing, may be
 * reworded). `requestId` is the same value echoed in the `x-request-id` header,
 * so a user-reported failure can be found in the logs verbatim.
 */
export type ErrorEnvelope = {
  statusCode: number;
  code: string;
  message: string;
  requestId: string;
  timestamp: string;
  path: string;
  fieldErrors?: Record<string, string[]>;
  details?: unknown;
  retryAfterSeconds?: number;
};

const STATUS_CODES: Record<number, string> = {
  400: "bad_request",
  401: "unauthorized",
  403: "forbidden",
  404: "not_found",
  405: "method_not_allowed",
  409: "conflict",
  410: "gone",
  413: "payload_too_large",
  415: "unsupported_media_type",
  422: "unprocessable_entity",
  429: "rate_limited",
  500: "internal_error",
  502: "bad_gateway",
  503: "service_unavailable",
  504: "gateway_timeout"
};

const GENERIC_500_MESSAGE = "An unexpected error occurred. The incident has been logged.";

/**
 * Catch-all exception filter.
 *
 * Three jobs: give every failure one predictable JSON shape, guarantee that an
 * unhandled 500 never leaks an internal message or stack trace to the caller,
 * and make sure everything is logged with the request id attached.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger("ExceptionFilter");

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    if (host.getType() !== "http") {
      throw exception;
    }

    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const response = context.getResponse<Response>();
    const requestId =
      (response.getHeader("x-request-id") as string | undefined) ??
      request.header("x-request-id") ??
      "unknown";

    const envelope = this.toEnvelope(exception, request, requestId);
    this.log(exception, envelope, request);

    if (envelope.retryAfterSeconds !== undefined && !response.headersSent) {
      response.setHeader("Retry-After", String(envelope.retryAfterSeconds));
    }

    const adapter = this.httpAdapterHost.httpAdapter;
    adapter.reply(response, envelope, envelope.statusCode);
  }

  private toEnvelope(exception: unknown, request: Request, requestId: string): ErrorEnvelope {
    const base = {
      requestId,
      timestamp: new Date().toISOString(),
      path: request.originalUrl ?? request.url
    };

    if (exception instanceof ThrottlerException) {
      return {
        ...base,
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        code: "rate_limited",
        message: "Too many requests. Please slow down and try again shortly.",
        retryAfterSeconds: 60
      };
    }

    if (exception instanceof ZodError) {
      return {
        ...base,
        statusCode: HttpStatus.BAD_REQUEST,
        code: "validation_failed",
        message: "Request validation failed",
        fieldErrors: this.zodFieldErrors(exception)
      };
    }

    if (exception instanceof HttpException) {
      return { ...base, ...this.fromHttpException(exception) };
    }

    return {
      ...base,
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: "internal_error",
      message: GENERIC_500_MESSAGE
    };
  }

  private fromHttpException(
    exception: HttpException
  ): Pick<ErrorEnvelope, "statusCode" | "code" | "message" | "fieldErrors" | "details" | "retryAfterSeconds"> {
    const statusCode = exception.getStatus();
    const payload = exception.getResponse();
    const fallbackCode = STATUS_CODES[statusCode] ?? "error";

    if (typeof payload === "string") {
      return { statusCode, code: fallbackCode, message: payload };
    }

    const body = payload as Record<string, unknown>;
    const rawMessage = body.message;
    const message = Array.isArray(rawMessage)
      ? rawMessage.filter((entry): entry is string => typeof entry === "string").join(". ")
      : typeof rawMessage === "string"
        ? rawMessage
        : exception.message;

    return {
      statusCode,
      code: typeof body.code === "string" ? body.code : fallbackCode,
      // A 5xx raised as an HttpException still must not echo internals.
      message: statusCode >= 500 ? GENERIC_500_MESSAGE : message,
      fieldErrors: this.isFieldErrors(body.fieldErrors) ? body.fieldErrors : undefined,
      details: statusCode >= 500 ? undefined : body.details,
      retryAfterSeconds:
        typeof body.retryAfterSeconds === "number" ? body.retryAfterSeconds : undefined
    };
  }

  private isFieldErrors(value: unknown): value is Record<string, string[]> {
    return (
      typeof value === "object" &&
      value !== null &&
      Object.values(value).every(
        (entry) => Array.isArray(entry) && entry.every((item) => typeof item === "string")
      )
    );
  }

  private zodFieldErrors(error: ZodError): Record<string, string[]> {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of error.issues) {
      const key = issue.path.join(".") || "_";
      (fieldErrors[key] ??= []).push(issue.message);
    }
    return fieldErrors;
  }

  private log(exception: unknown, envelope: ErrorEnvelope, request: Request): void {
    const summary = `${request.method} ${envelope.path} -> ${envelope.statusCode} ${envelope.code} [${envelope.requestId}]`;

    if (envelope.statusCode >= 500) {
      const stack = exception instanceof Error ? exception.stack : String(exception);
      this.logger.error(summary, getEnv().NODE_ENV === "production" ? undefined : stack);
      return;
    }

    if (envelope.statusCode === HttpStatus.UNAUTHORIZED || envelope.statusCode === HttpStatus.FORBIDDEN) {
      this.logger.warn(summary);
      return;
    }

    this.logger.debug?.(summary);
  }
}
