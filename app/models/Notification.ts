import { observable } from "mobx";
import BaseModel from "./BaseModel";
import Field from "./decorators/Field";

class Notification extends BaseModel {
  @Field
  @observable
  id: string;

  @Field
  @observable
  viewedAt: string;
}

export default Notification;
