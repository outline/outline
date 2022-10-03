import { observable } from "mobx";
import BaseModel from "./BaseModel";
import Field from "./decorators/Field";

class WebhookSubscription extends BaseModel {
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
