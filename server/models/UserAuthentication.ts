import { addMinutes, subMinutes } from "date-fns";
import invariant from "invariant";
import {
  InferAttributes,
  InferCreationAttributes,
  SaveOptions,
} from "sequelize";
import {
  BeforeCreate,
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Table,
  Unique,
} from "sequelize-typescript";
import Logger from "@server/logging/Logger";
import AuthenticationProvider from "./AuthenticationProvider";
import User from "./User";
import IdModel from "./base/IdModel";
import Encrypted from "./decorators/Encrypted";
import Fix from "./decorators/Fix";

@Table({ tableName: "user_authentications", modelName: "user_authentication" })
@Fix
class UserAuthentication extends IdModel<
  InferAttributes<UserAuthentication>,
  Partial<InferCreationAttributes<UserAuthentication>>
> {
  @Column(DataType.ARRAY(DataType.STRING))
  scopes: string[];

  @Column(DataType.BLOB)
  @Encrypted
  accessToken: string;

  @Column(DataType.BLOB)
  @Encrypted
  refreshToken: string;

  @Column
  providerId: string;

  @Column(DataType.DATE)
  expiresAt: Date;

  @Column(DataType.DATE)
  lastValidatedAt: Date;

  // associations

  @BelongsTo(() => User, "userId")
  user: User;

  @ForeignKey(() => User)
  @Column(DataType.UUID)
  userId: string;

  @BelongsTo(() => AuthenticationProvider, "authenticationProviderId")
  authenticationProvider: AuthenticationProvider;

  @ForeignKey(() => AuthenticationProvider)
  @Unique
  @Column(DataType.UUID)
  authenticationProviderId: string;

  @BeforeCreate
  static setValidated(model: UserAuthentication) {
    model.lastValidatedAt = new Date();
  }

  // instance methods

  /**
   * Validates that the tokens within this authentication record are still
   * valid. Will update the record with a new access token if it is expired.
   *
   * @param options SaveOptions
   * @param force Force validation to occur with third party provider
   * @returns true if the accessToken or refreshToken is still valid
   */
  public async validateAccess(
    options: SaveOptions,
    force = false
  ): Promise<boolean> {
    // Check a maximum of once every 5 minutes
    if (this.lastValidatedAt > subMinutes(Date.now(), 5) && !force) {
      Logger.debug(
        "authentication",
        "Recently validated, skipping access token validation"
      );
      return true;
    }

    const authenticationProvider = await this.$get("authenticationProvider", {
      transaction: options.transaction,
    });
    invariant(
      authenticationProvider,
      "authenticationProvider must exist for user authentication"
    );

    try {
      await this.refreshAccessTokenIfNeeded(authenticationProvider, options);

      const client = authenticationProvider.oauthClient;
      if (client) {
        await client.userInfo(this.accessToken);
      }

      // write to db when we last checked
      this.lastValidatedAt = new Date();
      await this.save({
        transaction: options.transaction,
      });

      return true;
    } catch (error) {
      if (error.id === "authentication_required") {
        return false;
      }

      // Throw unknown errors to trigger a retry of the task.
      throw error;
    }
  }

  /**
   * Updates the accessToken and refreshToken in the database if expiring. If the
   * accessToken is still valid or the AuthenticationProvider does not support
   * refreshTokens then no work is done.
   *
   * @param options SaveOptions
   * @returns true if the tokens were updated
   */
  private async refreshAccessTokenIfNeeded(
    authenticationProvider: AuthenticationProvider,
    options: SaveOptions
  ): Promise<boolean> {
    if (this.expiresAt > addMinutes(Date.now(), 5)) {
      Logger.debug(
        "authentication",
        "Existing token is still valid, skipping refresh"
      );
      return false;
    }

    if (!this.refreshToken) {
      Logger.debug(
        "authentication",
        "No refresh token found, skipping refresh"
      );
      return false;
    }

    // Some providers send no expiry depending on setup, in this case we can't
    // refresh and assume the session is valid until logged out.
    if (!this.expiresAt) {
      Logger.debug("authentication", "No expiry found, skipping refresh");
      return false;
    }

    Logger.info("authentication", "Refreshing expiring access token", {
      id: this.id,
      userId: this.userId,
    });

    const client = authenticationProvider.oauthClient;
    if (client) {
      const response = await client.rotateToken(
        this.accessToken,
        this.refreshToken
      );

      // Not all OAuth providers return a new refreshToken so we need to guard
      // against setting to an empty value.
      if (response.refreshToken) {
        this.refreshToken = response.refreshToken;
      }
      this.accessToken = response.accessToken;
      this.expiresAt = response.expiresAt;
      await this.save(options);
    }

    Logger.info(
      "authentication",
      "Successfully refreshed expired access token",
      {
        id: this.id,
        userId: this.userId,
      }
    );

    return true;
  }
}

export default UserAuthentication;
