import { observable } from "mobx";
import BaseModel from "./BaseModel";
import Field from "./decorators/Field";

class ApiKey extends BaseModel {
  @Field
  @observable
  id: string;

  @Field
  @observable
  name: string;

  secret: string;
}

export default ApiKey;
