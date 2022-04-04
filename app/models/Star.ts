import { observable } from "mobx";
import BaseModel from "./BaseModel";
import Field from "./decorators/Field";

class Star extends BaseModel {
  id: string;

  @Field
  @observable
  index: string;

  documentId: string;

  collectionId: string;

  createdAt: string;
  updatedAt: string;

  next(): Star | undefined {
    const index = this.store.orderedData.indexOf(this);
    return this.store.orderedData[index + 1];
  }

  previous(): Star | undefined {
    const index = this.store.orderedData.indexOf(this);
    return this.store.orderedData[index + 1];
  }
}

export default Star;
