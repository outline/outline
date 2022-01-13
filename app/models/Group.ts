import { observable } from "mobx";
import BaseModel from "./BaseModel";
import Field from "./decorators/Field";

class Group extends BaseModel {
  @Field
  @observable
  id: string;

  @Field
  @observable
  name: string;

  memberCount: number;

  updatedAt: string;
}

export default Group;
