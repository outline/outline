import { Next } from "koa";
import { TeamPreference } from "@shared/types";
import { ValidationError } from "@server/errors";
import { APIContext } from "@server/types";

/**
 * Middleware to check if a feature is enabled for the team.
 *
 * @param preference The preference to check
 * @returns The middleware function
 */
export function feature(preference: TeamPreference) {
  return async function featureEnabledMiddleware(ctx: APIContext, next: Next) {
    if (!ctx.state.auth.user.team.getPreference(preference)) {
      throw ValidationError(`${preference} is currently disabled`);
    }
    return next();
  };
}
