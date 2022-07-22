import { observable } from "mobx";
import BaseModel from "./BaseModel";
import Field from "./decorators/Field";

class WebhookDelivery extends BaseModel {
  @Field
  @observable
  id: string;

  @Field
  @observable
  status: string;
}

export default WebhookDelivery;
