import { observable } from "mobx";
import BaseModel from "./BaseModel";
import Field from "./decorators/Field";

class NotificationSetting extends BaseModel {
  @Field
  @observable
  id: string;

  @Field
  @observable
  event: string;
}

export default NotificationSetting;
