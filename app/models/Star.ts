import { observable } from "mobx";
import BaseModel from "./BaseModel";
import Field from "./decorators/Field";

class Star extends BaseModel {
  id: string;

  @Field
  @observable
  index: string;

  documentId: string;

  createdAt: string;
  updatedAt: string;
}

export default Star;
