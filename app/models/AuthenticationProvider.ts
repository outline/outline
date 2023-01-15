import { computed, observable } from "mobx";
import BaseModel from "./BaseModel";
import Field from "./decorators/Field";

class AuthenticationProvider extends BaseModel {
  id: string;

  displayName: string;

  name: string;

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
