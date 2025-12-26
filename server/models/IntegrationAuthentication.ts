import type {
  InferAttributes,
  InferCreationAttributes,
  Transaction,
} from "sequelize";
import {
  DataType,
  Table,
  ForeignKey,
  BelongsTo,
  Column,
} from "sequelize-typescript";
import type { IntegrationService } from "@shared/types";
import Logger from "../logging/Logger";
import Team from "./Team";
import User from "./User";
import IdModel from "./base/IdModel";
import Encrypted from "./decorators/Encrypted";
import Fix from "./decorators/Fix";
import { Minute } from "@shared/utils/time";
import { addSeconds } from "date-fns";

export interface TokenRefreshResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}

export type TokenRefreshCallback = (
  refreshToken: string
) => Promise<TokenRefreshResponse>;

@Table({ tableName: "authentications", modelName: "authentication" })
@Fix
class IntegrationAuthentication extends IdModel<
  InferAttributes<IntegrationAuthentication>,
  Partial<InferCreationAttributes<IntegrationAuthentication>>
> {
  @Column(DataType.STRING)
  service: IntegrationService;

  @Column(DataType.ARRAY(DataType.STRING))
  scopes: string[];

  @Column(DataType.BLOB)
  @Encrypted
  token: string;

  @Column(DataType.BLOB)
  @Encrypted
  refreshToken: string;

  @Column(DataType.DATE)
  expiresAt: Date | null;

  // associations

  @BelongsTo(() => User, "userId")
  user: User;

  @ForeignKey(() => User)
  @Column(DataType.UUID)
  userId: string;

  @BelongsTo(() => Team, "teamId")
  team: Team;

  @ForeignKey(() => Team)
  @Column(DataType.UUID)
  teamId: string;

  /**
   * Check if the access token will expire soon (within the specified threshold)
   *
   * @param thresholdMs Number of milliseconds before expiration to consider "expiring soon" (default: 5 minutes)
   * @returns true if the token will expire within the threshold, false otherwise
   */
  isExpiringSoon(thresholdMs: number = 5 * Minute.ms): boolean {
    if (!this.expiresAt) {
      return false;
    }

    const now = new Date();
    const thresholdTime = new Date(now.getTime() + thresholdMs);

    return this.expiresAt <= thresholdTime;
  }

  /**
   * Refresh the access token if it's expiring soon using provider-specific callback
   *
   * @param refreshCallback Provider-specific function to refresh the token
   * @param thresholdMs Number of milliseconds before expiration to consider "expiring soon" (default: 5 minutes)
   * @returns The current access token (refreshed if needed)
   */
  async refreshTokenIfNeeded(
    refreshCallback: TokenRefreshCallback,
    thresholdMs: number = 5 * Minute.ms
  ): Promise<string> {
    // Quick check without locking first
    if (!this.isExpiringSoon(thresholdMs) || !this.refreshToken) {
      return this.token;
    }

    try {
      // Use transaction with row-level locking to prevent race conditions
      let refreshedToken = this.token;

      await this.sequelize.transaction(async (transaction: Transaction) => {
        const lockedAuth = await (
          this.constructor as typeof IntegrationAuthentication
        ).findByPk(this.id, {
          transaction,
          lock: transaction.LOCK.UPDATE,
          rejectOnEmpty: true,
        });

        // Check again if token still needs refresh (another process might have refreshed it)
        if (lockedAuth.isExpiringSoon(thresholdMs) && lockedAuth.refreshToken) {
          Logger.info("plugins", `Refreshing ${this.service} access token`);

          const tokenResponse = await refreshCallback(lockedAuth.refreshToken);

          // Update the authentication record with new tokens
          await lockedAuth.update(
            {
              token: tokenResponse.access_token,
              refreshToken:
                tokenResponse.refresh_token || lockedAuth.refreshToken,
              expiresAt: addSeconds(Date.now(), tokenResponse.expires_in),
            },
            { transaction }
          );

          refreshedToken = tokenResponse.access_token;
          Logger.info(
            "plugins",
            `Successfully refreshed ${this.service} access token`
          );
        } else {
          // Token was already refreshed by another process, use the current token
          refreshedToken = lockedAuth.token;
        }

        // Update this instance with the latest values
        this.token = refreshedToken;
        if (lockedAuth.refreshToken) {
          this.refreshToken = lockedAuth.refreshToken;
        }
        if (lockedAuth.expiresAt) {
          this.expiresAt = lockedAuth.expiresAt;
        }
      });

      return refreshedToken;
    } catch (err) {
      Logger.warn(`Failed to refresh ${this.service} access token`, err);
      // Continue with existing token - it might still work
      return this.token;
    }
  }
}

export default IntegrationAuthentication;
