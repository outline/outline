import { computed, observable } from "mobx";
import Model from "./base/Model";
import Field from "./decorators/Field";
import { AfterDelete } from "./decorators/Lifecycle";
import type AuthenticationProvidersStore from "~/stores/AuthenticationProvidersStore";

class AuthenticationProvider extends Model {
  static modelName = "AuthenticationProvider";

  displayName: string;

  name: string;

  providerId: string;

  @observable
  isConnected: boolean;

  @Field
  @observable
  isEnabled: boolean;

  @computed
  get isActive() {
    return this.isEnabled && this.isConnected;
  }

  @AfterDelete
  static afterDelete(model: AuthenticationProvider) {
    // Restore a placeholder record to allow re-connection
    return (model.store as AuthenticationProvidersStore).add({
      ...model,
      isEnabled: false,
      isConnected: false,
    });
  }
}

export default AuthenticationProvider;
