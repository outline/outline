import { computed, observable } from "mobx";
import type { AuthenticationProviderSettings } from "@shared/types";
import Model from "./base/Model";
import Field from "./decorators/Field";
import { AfterDelete } from "./decorators/Lifecycle";
import type AuthenticationProvidersStore from "~/stores/AuthenticationProvidersStore";

class AuthenticationProvider extends Model {
  static modelName = "AuthenticationProvider";

  constructor(fields: Record<string, unknown>, store: Model["store"]) {
    super(fields, store);
    this.initialize(fields);
  }

  displayName: string;

  name: string;

  providerId: string;

  groupSyncSupported: boolean;

  groupSyncUsesClaim: boolean;

  @observable
  isConnected: boolean;

  @Field
  @observable
  isEnabled: boolean;

  @Field
  @observable
  settings: AuthenticationProviderSettings | undefined = undefined;

  @computed
  get isActive() {
    return this.isEnabled && this.isConnected;
  }

  @AfterDelete
  static afterDelete(model: AuthenticationProvider) {
    // Restore a placeholder record to allow re-connection
    return (model.store as AuthenticationProvidersStore).add(
      Object.assign({}, model, {
        isEnabled: false,
        isConnected: false,
      })
    );
  }
}

export default AuthenticationProvider;
