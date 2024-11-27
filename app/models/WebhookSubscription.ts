import { observable } from "mobx";
import Model from "./base/Model";
import Field from "./decorators/Field";

class WebhookSubscription extends Model {
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
}

export default WebhookSubscription;
