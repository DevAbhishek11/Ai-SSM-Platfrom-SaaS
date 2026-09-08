import { SetMetadata } from "@nestjs/common";

export const IS_PUBLIC_KEY = "auth:public";

/**
 * Marks a route as reachable without an authenticated principal.
 * Everything else is denied by `AuthenticationGuard`.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
