import {
  CallHandler,
  ExecutionContext,
  GatewayTimeoutException,
  Injectable,
  NestInterceptor
} from "@nestjs/common";
import { throwError, TimeoutError, type Observable } from "rxjs";
import { catchError, timeout } from "rxjs/operators";
import { getEnv } from "./env.js";

/**
 * Upper bound on how long any single request may occupy a worker.
 *
 * Without it a hung upstream (a model provider that never answers, a wedged
 * socket) pins a connection until the client gives up, and enough of those
 * exhaust the pool. Callers get a clean 504 instead.
 */
@Injectable()
export class RequestTimeoutInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      timeout(getEnv().REQUEST_TIMEOUT_MS),
      catchError((error: unknown) =>
        throwError(() =>
          error instanceof TimeoutError
            ? new GatewayTimeoutException({
                statusCode: 504,
                error: "Gateway Timeout",
                code: "request_timeout",
                message: "The request took too long to complete. Please retry."
              })
            : error
        )
      )
    );
  }
}
