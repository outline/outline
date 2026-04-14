import type { Next } from "koa";
import type { FeatureFlag } from "@shared/types";
import { ValidationError } from "@server/errors";
import { FeatureFlag as FeatureFlagModel } from "@server/models";
import type { APIContext } from "@server/types";

/**
 * Middleware to check if a feature flag is enabled for the team.
 *
 * @param flag The feature flag to check.
 * @returns The middleware function.
 */
export function featureFlag(flag: FeatureFlag) {
  return async function featureFlagMiddleware(ctx: APIContext, next: Next) {
    const { user } = ctx.state.auth;
    const enabled = await FeatureFlagModel.isEnabled(flag, user.teamId);
    if (!enabled) {
      throw ValidationError("This feature is not currently available");
    }
    return next();
  };
}
