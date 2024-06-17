import { observable } from "mobx";
import Model from "./base/Model";
import Field from "./decorators/Field";

class ApiKey extends Model {
  static modelName = "ApiKey";

  @Field
  @observable
  id: string;

  @Field
  @observable
  name: string;

  @Field
  @observable
  expiryAt?: string;

  secret: string;
}

export default ApiKey;
