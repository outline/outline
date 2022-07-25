import { observable } from "mobx";
import BaseModel from "./BaseModel";
import Field from "./decorators/Field";

class Subscription extends BaseModel {
  @Field
  @observable
  id: string;

  userId: string;

  documentId: string;

  @Field
  @observable
  event: string;

  createdAt: string;

  updatedAt: string;

}

export default Subscription;
