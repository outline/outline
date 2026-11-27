import type { Next } from "koa";
import { CommentingAccess, TeamPreference } from "@shared/types";
import { ValidationError } from "@server/errors";
import type { Context } from "@server/types";

/**
 * Middleware to check if a feature is enabled for the team.
 *
 * @param preference The preference to check
 * @returns The middleware function
 */
export function feature(preference: TeamPreference) {
  return async function featureEnabledMiddleware(ctx: Context, next: Next) {
    if (!ctx.auth.user.team.getPreference(preference)) {
      throw ValidationError(`${preference} is currently disabled`);
    }
    return next();
  };
}

/**
 * Middleware to check that commenting is enabled for the team.
 *
 * @returns The middleware function
 */
export function commentingEnabled() {
  return async function commentingEnabledMiddleware(ctx: Context, next: Next) {
    const commenting = ctx.auth.user.team.getPreference(
      TeamPreference.Commenting
    );
    // A legacy boolean `false` (team not yet migrated) means disabled.
    if (commenting === CommentingAccess.None || commenting === false) {
      throw ValidationError("Commenting is currently disabled");
    }
    return next();
  };
}
