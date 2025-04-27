import { Next } from "koa";
import { parseDomain } from "@shared/utils/domains";
import { Team } from "@server/models";
import { APIContext } from "@server/types";

/**
 * An authentication middleware that should be used on routes that return from external auth flows
 * to the apex domain. In these cases the user will be redirected to the correct subdomain where
 * they are authenticated.
 *
 * @param options Options for the middleware
 * @returns Koa middleware function
 */
export default function apexAuthRedirect<T>({
  getTeamId,
  getRedirectPath,
  getErrorPath,
}: {
  /** Get the team ID for the current request */
  getTeamId: (ctx: APIContext<T>) => string | null | undefined;
  /** Get the redirect URL for the given team ID */
  getRedirectPath: (ctx: APIContext<T>, team: Team) => string;
  /** Get the error URL for the current request */
  getErrorPath: (ctx: APIContext<T>) => string;
}) {
  return async function apexAuthRedirectMiddleware(
    ctx: APIContext<T>,
    next: Next
  ) {
    const { user } = ctx.state.auth;
    if (user) {
      return next();
    }

    const teamId = getTeamId(ctx);

    if (teamId) {
      try {
        const team = await Team.findByPk(teamId, {
          attributes: ["id", "subdomain"],
          rejectOnEmpty: true,
        });

        return parseDomain(ctx.host).teamSubdomain === team.subdomain
          ? ctx.redirect("/")
          : ctx.redirectOnClient(getRedirectPath(ctx, team));
      } catch (err) {
        return ctx.redirect(getErrorPath(ctx));
      }
    } else {
      return ctx.redirect(getErrorPath(ctx));
    }
  };
}
