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
import env from "@server/env";
import Logger from "@server/logging/Logger";
import GoogleClient from "@server/utils/google";
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

  public async validateAccess(options: SaveOptions): Promise<boolean> {
    const authenticationProvider = await this.$get("authenticationProvider", {
      transaction: options.transaction,
    });
    invariant(
      authenticationProvider,
      "authenticationProvider must exist for user authentication"
    );

    await this.refreshAccessTokenIfNeeded(authenticationProvider, options);

    switch (authenticationProvider.name) {
      case "slack": {
        // Token rotation not yet enabled
        return true;
      }
      case "google": {
        const client = new GoogleClient(
          env.GOOGLE_CLIENT_ID || "",
          env.GOOGLE_CLIENT_SECRET || ""
        );

        try {
          await client.userInfo(this.accessToken);
          return true;
        } catch (error) {
          return false;
        }
      }
      case "azure":
        // TODO: refresh token
        return true;
      default:
        return true;
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
      return false;
    }

    Logger.info("utils", "Refreshing expiring access token", {
      id: this.id,
      userId: this.userId,
    });

    switch (authenticationProvider.name) {
      case "slack": {
        // Token rotation not yet enabled
        return false;
      }
      case "google": {
        const client = new GoogleClient(
          env.GOOGLE_CLIENT_ID || "",
          env.GOOGLE_CLIENT_SECRET || ""
        );
        const response = await client.rotateToken(this.refreshToken);
        this.accessToken = response.accessToken;
        this.expiresAt = response.expiresAt;
        break;
      }
      case "azure":
        // TODO: refresh token
        return false;
      default:
        return false;
    }

    this.save(options);
    return true;
  }
}

export default UserAuthentication;
