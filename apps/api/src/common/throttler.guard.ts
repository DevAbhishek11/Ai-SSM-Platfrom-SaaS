import { Injectable, type ExecutionContext } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";
import { getEnv } from "./env.js";

/**
 * Rate limiting with a single, explicit off switch.
 *
 * Test suites that intentionally replay the same endpoint dozens of times set
 * `THROTTLE_DISABLED=true`; everything else - including the rate-limit spec -
 * runs with the real budgets.
 */
@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
    if (getEnv().THROTTLE_DISABLED) {
      return true;
    }

    return super.shouldSkip(context);
  }
}
