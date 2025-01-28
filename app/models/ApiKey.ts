import { isPast } from "date-fns";
import { computed, observable } from "mobx";
import ParanoidModel from "./base/ParanoidModel";
import Field from "./decorators/Field";

class ApiKey extends ParanoidModel {
  static modelName = "ApiKey";

  /** The human-readable name of this API key */
  @Field
  @observable
  name: string;

  /** A list of scopes that this API key has access to. If empty, the key has full access. */
  @Field
  @observable
  scope?: string[];

  /** An optional datetime that the API key expires. */
  @Field
  @observable
  expiresAt?: string;

  /** Timestamp that the API key was last used. */
  @observable
  lastActiveAt?: string;

  /** The user ID that the API key belongs to. */
  userId: string;

  /** The plain text value of the API key, only available on creation. */
  value: string;

  /** A preview of the last 4 characters of the API key. */
  last4: string;

  /** Whether the API key has an expiry in the past. */
  @computed
  get isExpired() {
    return this.expiresAt ? isPast(new Date(this.expiresAt)) : false;
  }

  @computed
  get obfuscatedValue() {
    if (this.createdAt < new Date("2022-12-03").toISOString()) {
      return `...${this.last4}`;
    }
    return `ol...${this.last4}`;
  }
}

export default ApiKey;
