import { addMinutes } from "date-fns";
import invariant from "invariant";
import { SaveOptions } from "sequelize";
import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Table,
  Unique,
} from "sequelize-typescript";
import Logger from "@server/logging/Logger";
import { AuthenticationError } from "../errors";
import AuthenticationProvider from "./AuthenticationProvider";
import User from "./User";
import BaseModel from "./base/BaseModel";
import Encrypted, {
  getEncryptedColumn,
  setEncryptedColumn,
} from "./decorators/Encrypted";
import Fix from "./decorators/Fix";

@Table({ tableName: "user_authentications", modelName: "user_authentication" })
@Fix
class UserAuthentication extends BaseModel {
  @Column(DataType.ARRAY(DataType.STRING))
  scopes: string[];

  @Column(DataType.BLOB)
  @Encrypted
  get accessToken() {
    return getEncryptedColumn(this, "accessToken");
  }

  set accessToken(value: string) {
    setEncryptedColumn(this, "accessToken", value);
  }

  @Column(DataType.BLOB)
  @Encrypted
  get refreshToken() {
    return getEncryptedColumn(this, "refreshToken");
  }

  set refreshToken(value: string) {
    setEncryptedColumn(this, "refreshToken", value);
  }

  @Column
  providerId: string;

  @Column(DataType.DATE)
  expiresAt: Date;

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

  // instance methods

  /**
   * Validates that the tokens within this authentication record are still
   * valid. Will update the record with a new access token if it is expired.
   *
   * @param options SaveOptions
   * @returns true if the accessToken or refreshToken is still valid
   */
  public async validateAccess(options: SaveOptions): Promise<boolean> {
    const authenticationProvider = await this.$get("authenticationProvider", {
      transaction: options.transaction,
    });
    invariant(
      authenticationProvider,
      "authenticationProvider must exist for user authentication"
    );

    await this.refreshAccessTokenIfNeeded(authenticationProvider, options);

    try {
      const client = authenticationProvider.oauthClient;
      if (client) {
        await client.userInfo(this.accessToken);
      }
      return true;
    } catch (error) {
      if (error instanceof AuthenticationError) {
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
    if (this.expiresAt > addMinutes(Date.now(), 5) || !this.refreshToken) {
      return false;
    }

    Logger.info("utils", "Refreshing expiring access token", {
      id: this.id,
      userId: this.userId,
    });

    const client = authenticationProvider.oauthClient;
    if (client) {
      const response = await client.rotateToken(this.refreshToken);

      // Not all OAuth providers return a new refreshToken so we need to guard
      // against setting to an empty value.
      if (response.refreshToken) {
        this.refreshToken = response.refreshToken;
      }
      this.accessToken = response.accessToken;
      this.expiresAt = response.expiresAt;
      this.save(options);
    }

    Logger.info("utils", "Successfully refreshed expired access token", {
      id: this.id,
      userId: this.userId,
    });

    return true;
  }
}

export default UserAuthentication;
