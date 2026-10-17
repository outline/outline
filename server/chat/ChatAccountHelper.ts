import { AuthenticationType, IntegrationType } from "@shared/types";
import { createContext } from "@server/context";
import {
  AuthenticationProvider,
  Integration,
  Team,
  User,
  UserAuthentication,
} from "@server/models";
import type { APIContext } from "@server/types";
import type { BaseChatProvider } from "./BaseChatProvider";
import type { ChatInstallationRef, ChatUserRef } from "./types";

/** The Outline teams connected to an installation, and the actor's contexts. */
export interface ChatAccounts {
  /** All teams connected to the installation, oldest first. */
  teams: Team[];
  /** A context for each team in which the actor has an account. */
  contexts: APIContext[];
}

/**
 * Finds the Outline teams and users that match chat platform accounts. One
 * chat workspace can be connected to several Outline teams, so every user
 * lookup is scoped to one team.
 */
export class ChatAccountHelper {
  /**
   * Finds the teams connected to an installation, and creates a context for
   * each team in which the actor has an account. Each context holds the user
   * and, if installed, the command integration of that team.
   *
   * @param ctx the context of the inbound request.
   * @param provider the chat provider.
   * @param installation the installation that received the event.
   * @param actor the user on the chat platform.
   * @returns the connected teams and the actor's contexts.
   */
  public static async findAccounts(
    ctx: APIContext,
    provider: BaseChatProvider,
    installation: ChatInstallationRef,
    actor: ChatUserRef
  ): Promise<ChatAccounts> {
    const [teams, integrations] = await Promise.all([
      this.findTeams(provider, installation),
      Integration.scope("withAuthentication").findAll({
        where: {
          service: provider.service,
          type: IntegrationType.Command,
          settings: { serviceTeamId: installation.serviceTeamId },
        },
        order: [["createdAt", "DESC"]],
      }),
    ]);

    const contexts: APIContext[] = [];
    for (const team of teams) {
      const user = await this.findUser(provider, installation, actor, team);
      if (!user) {
        continue;
      }

      contexts.push(
        createContext({
          user,
          authType: AuthenticationType.CHAT,
          ip: ctx.context.ip,
          integration: integrations.find((i) => i.teamId === team.id),
        })
      );
    }

    return { teams, contexts };
  }

  /**
   * Finds all Outline teams connected to an installation: teams that
   * installed the app, sign in with the workspace, or have linked accounts.
   *
   * @param provider the chat provider.
   * @param installation the installation that received the event.
   * @returns the teams, oldest first.
   */
  private static async findTeams(
    provider: BaseChatProvider,
    installation: ChatInstallationRef
  ): Promise<Team[]> {
    const { serviceTeamId } = installation;
    const [installs, linkedAccounts, authenticationProviders] =
      await Promise.all([
        Integration.findAll({
          attributes: ["teamId"],
          where: {
            service: provider.service,
            type: IntegrationType.Command,
            settings: { serviceTeamId },
          },
        }),
        Integration.findAll({
          attributes: ["teamId"],
          where: {
            service: provider.service,
            type: IntegrationType.LinkedAccount,
            settings: { [provider.service]: { serviceTeamId } },
          },
        }),
        provider.authProviderName
          ? AuthenticationProvider.findAll({
              attributes: ["teamId"],
              where: {
                name: provider.authProviderName,
                providerId: serviceTeamId,
              },
            })
          : [],
      ]);

    const teamIds = new Set(
      [...installs, ...linkedAccounts, ...authenticationProviders].map(
        (model) => model.teamId
      )
    );
    if (!teamIds.size) {
      return [];
    }

    return Team.findAll({
      where: { id: Array.from(teamIds) },
      order: [["createdAt", "ASC"]],
    });
  }

  /**
   * Finds the actor's user in one team. A linked account is used first, then
   * a sign in with the workspace of the installation.
   *
   * @param provider the chat provider.
   * @param installation the installation that received the event.
   * @param actor the user on the chat platform.
   * @param team the team to search in.
   * @returns the user with the team loaded, if found.
   */
  private static async findUser(
    provider: BaseChatProvider,
    installation: ChatInstallationRef,
    actor: ChatUserRef,
    team: Team
  ): Promise<User | undefined> {
    const integration = await Integration.findOne({
      where: {
        service: provider.service,
        type: IntegrationType.LinkedAccount,
        teamId: team.id,
        settings: {
          [provider.service]: {
            serviceTeamId: actor.serviceTeamId,
            serviceUserId: actor.serviceUserId,
          },
        },
      },
      include: [
        {
          model: User,
          as: "user",
          required: true,
          where: { teamId: team.id },
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    let user = integration?.user;

    if (!user && provider.authProviderName) {
      const authentication = await UserAuthentication.findOne({
        where: {
          providerId: actor.serviceUserId,
        },
        order: [["createdAt", "DESC"]],
        include: [
          {
            model: AuthenticationProvider,
            as: "authenticationProvider",
            required: true,
            where: {
              name: provider.authProviderName,
              providerId: installation.serviceTeamId,
              teamId: team.id,
            },
          },
          {
            model: User,
            as: "user",
            required: true,
            where: { teamId: team.id },
          },
        ],
      });
      user = authentication?.user;
    }

    if (user) {
      user.team = team;
    }
    return user ?? undefined;
  }
}
