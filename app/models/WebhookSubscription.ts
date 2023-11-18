import { observable } from "mobx";
import Model from "./base/Model";
import Field from "./decorators/Field";

class WebhookSubscription extends Model {
  @Field
  @observable
  id: string;

  @Field
  @observable
  name: string;

  @Field
  @observable
  url: string;

  @Field
  @observable
  secret: string;

  @Field
  @observable
  enabled: boolean;

  @Field
  @observable
  events: string[];
}

export default WebhookSubscription;
