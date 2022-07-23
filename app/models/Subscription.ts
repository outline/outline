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

  next(): Subscription | undefined {
    const index = this.store.orderedData.indexOf(this);
    return this.store.orderedData[index + 1];
  }

  previous(): Subscription | undefined {
    const index = this.store.orderedData.indexOf(this);
    return this.store.orderedData[index + 1];
  }
}

export default Subscription;
