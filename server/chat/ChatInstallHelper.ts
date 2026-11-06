import type { Transaction } from "sequelize";
import { IntegrationType } from "@shared/types";
import type { ChatOAuthState } from "@shared/utils/ChatUtils";
import { ChatUtils } from "@shared/utils/ChatUtils";
import { ValidationError } from "@server/errors";
import {
  Collection,
  Integration,
  IntegrationAuthentication,
} from "@server/models";
import { authorize } from "@server/policies";
import { createContext } from "@server/context";
import { sequelize } from "@server/storage/database";
import type { APIContext } from "@server/types";
import type { BaseChatProvider } from "./BaseChatProvider";

/**
 * Creates integrations when a chat platform is connected.
 */
export class ChatInstallHelper {
  /**
   * Completes an install flow and creates the matching integration. The
   * code is exchanged before the transaction starts, so that no transaction
   * stays open during the request to the platform.
   *
   * @param ctx the context of the user that started the install.
   * @param provider the chat provider.
   * @param state the parsed OAuth state.
   * @param code the OAuth code from the platform.
   * @throws {AuthorizationError} if the user cannot create the integration.
   * @throws {ValidationError} if the state or the install result is not valid.
   */
  public static async install(
    ctx: APIContext,
    provider: BaseChatProvider,
    state: ChatOAuthState,
    code: string
  ): Promise<void> {
    const { user } = ctx.context.auth;
    const redirectUri = ChatUtils.connectUrl(provider.service);

    switch (state.type) {
      case IntegrationType.Post: {
        if (!state.collectionId) {
          throw ValidationError("collectionId is required");
        }
        const collection = await Collection.findByPk(state.collectionId, {
          userId: user.id,
        });
        authorize(user, "read", collection);
        authorize(user, "update", user.team);

        const install = await provider.exchangeCode(code, redirectUri);
        const { channel } = install;
        if (!channel) {
          throw ValidationError("No channel was selected");
        }

        await this.transaction(ctx, async (txCtx, transaction) => {
          const authentication = await IntegrationAuthentication.create(
            {
              service: provider.service,
              userId: user.id,
              teamId: user.teamId,
              token: install.token,
              scopes: install.scopes,
            },
            { transaction }
          );
          await Integration.createWithCtx<Integration<IntegrationType.Post>>(
            txCtx,
            {
              service: provider.service,
              type: IntegrationType.Post,
              userId: user.id,
              teamId: user.teamId,
              authenticationId: authentication.id,
              collectionId: collection.id,
              events: ["documents.update", "documents.publish"],
              settings: {
                url: channel.webhookUrl,
                channel: channel.name,
                channelId: channel.id,
              },
            }
          );
        });
        return;
      }

      case IntegrationType.Command: {
        authorize(user, "update", user.team);

        const install = await provider.exchangeCode(code, redirectUri);

        await this.transaction(ctx, async (txCtx, transaction) => {
          const authentication = await IntegrationAuthentication.create(
            {
              service: provider.service,
              userId: user.id,
              teamId: user.teamId,
              token: install.token,
              scopes: install.scopes,
            },
            { transaction }
          );
          await Integration.createWithCtx<Integration<IntegrationType.Command>>(
            txCtx,
            {
              service: provider.service,
              type: IntegrationType.Command,
              userId: user.id,
              teamId: user.teamId,
              authenticationId: authentication.id,
              settings: {
                serviceTeamId: install.serviceTeamId,
              },
            }
          );
        });
        return;
      }

      case IntegrationType.LinkedAccount: {
        const install = await provider.exchangeCode(code, redirectUri);

        await this.transaction(ctx, (txCtx) =>
          Integration.createWithCtx<Integration<IntegrationType.LinkedAccount>>(
            txCtx,
            {
              service: provider.service,
              type: IntegrationType.LinkedAccount,
              userId: user.id,
              teamId: user.teamId,
              settings: {
                [provider.service]: {
                  serviceUserId: install.serviceUserId,
                  serviceTeamId: install.serviceTeamId,
                },
              },
            }
          )
        );
        return;
      }

      default:
        throw ValidationError("Invalid integration type");
    }
  }

  /**
   * Runs a callback in a transaction, with a copy of the context that holds
   * the transaction.
   *
   * @param ctx the context of the request.
   * @param callback the callback to run.
   * @returns the result of the callback.
   */
  private static transaction<T>(
    ctx: APIContext,
    callback: (txCtx: APIContext, transaction: Transaction) => Promise<T>
  ): Promise<T> {
    return sequelize.transaction((transaction) =>
      callback(
        createContext({
          user: ctx.context.auth.user,
          authType: ctx.context.auth.type,
          ip: ctx.context.ip,
          transaction,
        }),
        transaction
      )
    );
  }
}
