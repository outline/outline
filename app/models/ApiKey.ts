import { isPast } from "date-fns";
import { computed, observable } from "mobx";
import Model from "./base/Model";
import Field from "./decorators/Field";

class ApiKey extends Model {
  static modelName = "ApiKey";

  @Field
  @observable
  id: string;

  /**
   * The user chosen name of the API key.
   */
  @Field
  @observable
  name: string;

  /**
   * An optional datetime that the API key expires.
   */
  @Field
  @observable
  expiresAt?: string;

  /**
   * An optional datetime that the API key was last used at.
   */
  @observable
  lastActiveAt?: string;

  secret: string;

  /**
   * Whether the API key has an expiry in the past.
   */
  @computed
  get isExpired() {
    return this.expiresAt ? isPast(new Date(this.expiresAt)) : false;
  }
}

export default ApiKey;
