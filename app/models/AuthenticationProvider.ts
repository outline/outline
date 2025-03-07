import { computed, observable } from "mobx";
import Model from "./base/Model";
import Field from "./decorators/Field";

class AuthenticationProvider extends Model {
  static modelName = "AuthenticationProvider";

  displayName: string;

  name: string;

  @observable
  isConnected: boolean;

  @Field
  @observable
  isEnabled: boolean;

  @computed
  get isActive() {
    return this.isEnabled && this.isConnected;
  }
}

export default AuthenticationProvider;
