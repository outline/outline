import { addMonths } from "date-fns";
import type { Context } from "koa";
import { getCookieDomain, parseDomain } from "@shared/utils/domains";
import type { Sessions } from "@shared/utils/sessions";
import {
  getActiveSessions,
  getSessionsCookieExpiry,
  parseSessionsCookie,
} from "@shared/utils/sessions";
import env from "@server/env";
import { Team } from "@server/models";

/** Manages workspace entries in the cloud sessions cookie. */
export class SessionsCookieHelper {
  /**
   * Reads the sessions cookie without changing its entries.
   *
   * @param ctx the Koa context.
   * @returns the valid session entries.
   */
  public static read(ctx: Context): Sessions {
    try {
      return parseSessionsCookie(
        decodeURIComponent(ctx.cookies.get("sessions") || "{}")
      );
    } catch (_err) {
      return {};
    }
  }

  /**
   * Writes active sessions with a consistent domain, path, and expiry.
   *
   * @param ctx the Koa context.
   * @param sessions the session entries to write.
   */
  public static write(ctx: Context, sessions: Sessions): void {
    if (!this.canWrite(ctx)) {
      return;
    }

    const active = getActiveSessions(sessions, addMonths(new Date(), 3));
    const expires = getSessionsCookieExpiry(active);
    const value = expires
      ? encodeURIComponent(JSON.stringify(active))
      : undefined;
    const existing = ctx.cookies.get("sessions");
    if (value === existing) {
      return;
    }

    ctx.cookies.set("sessions", value, {
      domain: getCookieDomain(ctx.request.hostname, env.isCloudHosted),
      path: "/",
      httpOnly: false,
      expires,
    });
  }

  /**
   * Adds or replaces the workspace entry when a user signs in.
   *
   * @param ctx the Koa context.
   * @param team the signed-in workspace.
   * @param expires the session token expiry.
   */
  public static add(ctx: Context, team: Team, expires: Date): void {
    this.write(ctx, {
      ...this.read(ctx),
      [team.id]: {
        name: team.name,
        logoUrl: team.avatarUrl,
        url: team.url,
        expiresAt: expires.toISOString(),
      },
    });
  }

  /**
   * Removes a workspace entry from the sessions cookie.
   *
   * @param ctx the Koa context.
   * @param teamId the workspace ID to remove.
   */
  public static remove(ctx: Context, teamId: string): void {
    const sessions = this.read(ctx);
    delete sessions[teamId];
    this.write(ctx, sessions);
  }

  /**
   * Removes unavailable workspaces and refreshes their details from the database.
   * Uses the authenticated token expiry for the current workspace and preserves
   * other entry expiry dates when workspace details change.
   *
   * @param ctx the Koa context.
   * @param currentTeam the authenticated workspace to include if missing.
   * @param currentTeamExpiresAt the authenticated token expiry, when available.
   * @returns the active workspaces in cookie order.
   */
  public static async reconcile(
    ctx: Context,
    currentTeam?: Team,
    currentTeamExpiresAt?: Date
  ): Promise<Team[]> {
    if (!this.canWrite(ctx)) {
      return [];
    }

    const expires = addMonths(new Date(), 3);
    const sessions = getActiveSessions(this.read(ctx), expires);
    const teamIds = Object.keys(sessions);
    const teams = teamIds.length
      ? await Team.findAll({ where: { id: teamIds } })
      : [];
    const teamsById = new Map(teams.map((team) => [team.id, team]));
    if (currentTeam) {
      teamsById.set(currentTeam.id, currentTeam);
    }

    const reconciled: Sessions = {};
    const activeTeams: Team[] = [];
    const ids = new Set([...teamIds, ...(currentTeam ? [currentTeam.id] : [])]);
    for (const id of ids) {
      const team = teamsById.get(id);
      if (!team || team.isSuspended) {
        continue;
      }

      reconciled[id] = {
        name: team.name,
        logoUrl: team.avatarUrl,
        url: team.url,
        expiresAt:
          (id === currentTeam?.id
            ? currentTeamExpiresAt?.toISOString()
            : undefined) ??
          sessions[id]?.expiresAt ??
          expires.toISOString(),
      };
      activeTeams.push(team);
    }

    this.write(ctx, reconciled);
    return activeTeams;
  }

  private static canWrite(ctx: Context): boolean {
    return env.isCloudHosted && !parseDomain(ctx.request.hostname).custom;
  }
}
