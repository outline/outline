import { computed, observable } from "mobx";
import Model from "./base/Model";
import Field from "./decorators/Field";
import Relation from "./decorators/Relation";
import type { Searchable } from "./interfaces/Searchable";
import User from "./User";

class WebhookSubscription extends Model implements Searchable {
  static modelName = "WebhookSubscription";

  @Field
  @observable
  name: string;

  @Field
  @observable
  url: string;

  @Field
  @observable
  secret: string | null;

  @Field
  @observable
  enabled: boolean;

  @Field
  @observable
  events: string[];

  /** The user who created this webhook subscription. */
  @Relation(() => User)
  createdBy?: User;

  /** The user ID that created this webhook subscription. */
  createdById: string;

  @computed
  get searchContent(): string[] {
    return [this.name, this.url, ...(this.events ?? [])].filter(Boolean);
  }

  @computed
  get searchSuppressed(): boolean {
    return false;
  }
}

export default WebhookSubscription;
