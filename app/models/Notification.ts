import { observable } from "mobx";
import { NotificationEventType } from "@shared/types";
import BaseModel from "./BaseModel";
import Field from "./decorators/Field";

class Notification extends BaseModel {
  @Field
  @observable
  id: string;

  @Field
  @observable
  viewedAt: string;

  event: NotificationEventType;
}

export default Notification;
