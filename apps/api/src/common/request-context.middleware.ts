import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { Injectable, NestMiddleware } from "@nestjs/common";

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(request: Request, response: Response, next: NextFunction): void {
    const requestId = request.header("x-request-id") ?? randomUUID();
    response.setHeader("x-request-id", requestId);
    next();
  }
}
