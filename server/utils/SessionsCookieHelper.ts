import { addMonths } from "date-fns";
import type { Context } from "koa";
import { getCookieDomain, parseDomain } from "@shared/utils/domains";
import type { Sessions } from "@shared/utils/sessions";
import {
  getRememberedSessions,
  getSessionsCookieExpiry,
  parseSessionsCookie,
} from "@shared/utils/sessions";
import env from "@server/env";
import { Team } from "@server/models";

/** Manages workspace entries in the cloud sessions cookie. */
export class SessionsCookieHelper {
  /**
   * Reads remembered workspaces, removing entries unused for three months.
   *
   * @param ctx the Koa context.
   * @returns the valid session entries.
   */
  public static read(ctx: Context): Sessions {
    try {
      return getRememberedSessions(
        parseSessionsCookie(
          decodeURIComponent(ctx.cookies.get("sessions") || "{}")
        )
      );
    } catch (_err) {
      return {};
    }
  }

  /**
   * Writes remembered workspaces, including expired sessions, with a persistent expiry.
   *
   * @param ctx the Koa context.
   * @param sessions the session entries to write.
   */
  public static write(ctx: Context, sessions: Sessions): void {
    if (!this.canWrite(ctx)) {
      return;
    }

    const legacyExpiry = addMonths(new Date(), 3).toISOString();
    const remembered = Object.fromEntries(
      Object.entries(getRememberedSessions(sessions)).map(([id, session]) => [
        id,
        { ...session, expiresAt: session.expiresAt ?? legacyExpiry },
      ])
    );
    const expires = getSessionsCookieExpiry(remembered);
    const value = expires
      ? encodeURIComponent(JSON.stringify(remembered))
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
        lastUsedAt: new Date().toISOString(),
      },
    });
  }

  /**
   * Marks a workspace as logged out while retaining its login path.
   *
   * @param ctx the Koa context.
   * @param teamId the workspace ID to mark as logged out.
   */
  public static logout(ctx: Context, teamId: string): void {
    const sessions = this.read(ctx);
    if (!sessions[teamId]) {
      return;
    }

    sessions[teamId] = {
      ...sessions[teamId],
      expiresAt: new Date().toISOString(),
      lastUsedAt: new Date().toISOString(),
    };
    this.write(ctx, sessions);
  }

  /**
   * Removes unavailable workspaces and refreshes their details from the database.
   * Uses the authenticated token expiry for the current workspace and preserves
   * other entry expiry and last-use dates when workspace details change.
   *
   * @param ctx the Koa context.
   * @param currentTeam the authenticated workspace to include if missing.
   * @param currentTeamExpiresAt the authenticated token expiry, when available.
   * @returns the remembered workspaces in cookie order, including logged-out ones.
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
    const sessions = this.read(ctx);
    const teamIds = Object.keys(sessions);
    const teams = teamIds.length
      ? await Team.findAll({ where: { id: teamIds } })
      : [];
    const teamsById = new Map(teams.map((team) => [team.id, team]));
    if (currentTeam) {
      teamsById.set(currentTeam.id, currentTeam);
    }

    const reconciled: Sessions = {};
    const rememberedTeams: Team[] = [];
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
        lastUsedAt:
          id === currentTeam?.id
            ? new Date().toISOString()
            : (sessions[id]?.lastUsedAt ?? new Date().toISOString()),
      };
      rememberedTeams.push(team);
    }

    this.write(ctx, reconciled);
    return rememberedTeams;
  }

  private static canWrite(ctx: Context): boolean {
    return env.isCloudHosted && !parseDomain(ctx.request.hostname).custom;
  }
}
