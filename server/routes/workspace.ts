import type { Context } from "koa";
import { TeamPreference } from "@shared/types";
import { parseDomain } from "@shared/utils/domains";
import env from "@server/env";
import { Integration, type Team } from "@server/models";
import { getSessionRedirectUrl } from "@server/utils/authentication";
import { SessionsCookieHelper } from "@server/utils/SessionsCookieHelper";
import type { AppRenderOptions } from "./app";

/**
 * Returns the URL to redirect an app request to when the request did not
 * arrive on the canonical host of a usable workspace. When no workspace is
 * found, the sessions cookie is reconciled.
 *
 * @param ctx the request context.
 * @param team the workspace for the request host, if any.
 * @returns the URL to redirect to, or undefined to render the app.
 */
export async function getWorkspaceRedirectUrl(
  ctx: Context,
  team: Team | null | undefined
): Promise<string | undefined> {
  if (!env.isCloudHosted) {
    return;
  }

  if (team && !team.isSuspended) {
    if (team.isTeamUrl(ctx.href)) {
      return;
    }

    const url = new URL(team.url);
    url.pathname = ctx.path;
    url.search = ctx.search;
    return url.toString();
  }

  if (env.isProduction && ctx.hostname !== parseDomain(env.URL).host) {
    return env.URL;
  }

  if (team) {
    return;
  }

  const teams = await SessionsCookieHelper.reconcile(ctx);

  // Links to app paths on the root domain, such as those in emails, are sent
  // on to the workspace the browser is signed in to.
  if (isPublicAppPath(ctx.path)) {
    return;
  }

  return getSessionRedirectUrl(ctx, teams);
}

/**
 * Returns the options used to render the app shell for a workspace.
 *
 * @param team the workspace for the request host, if any.
 * @returns the render options.
 */
export async function getWorkspaceRenderOptions(
  team: Team | null | undefined
): Promise<AppRenderOptions> {
  const analytics = await Integration.findAnalyticsIntegrationsForTeam(
    team?.id
  );

  if (!team?.getPreference(TeamPreference.PublicBranding)) {
    return { analytics };
  }

  return {
    analytics,
    title: team.name || undefined,
    description: team.description || undefined,
    shortcutIcon: team.avatarUrl
      ? ((await team.publicAvatarUrl()) ?? undefined)
      : undefined,
  };
}

// Client routes that render without an authenticated session.
const publicAppPaths = [
  "/",
  "/create",
  "/logout",
  "/desktop-redirect",
  "/oauth/authorize",
];

function isPublicAppPath(pathname: string) {
  return publicAppPaths.includes(pathname.replace(/\/+$/, "") || "/");
}
