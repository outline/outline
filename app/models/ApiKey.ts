import { observable } from "mobx";
import Model from "./base/Model";
import Field from "./decorators/Field";

class ApiKey extends Model {
  @Field
  @observable
  id: string;

  @Field
  @observable
  name: string;

  secret: string;
}

export default ApiKey;
