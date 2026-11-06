import { computed, observable } from "mobx";
import type {
  AuthenticationProviderSettings,
  PublicAuthenticationProviderConfig,
} from "@shared/types";
import Model from "./base/Model";
import Field from "./decorators/Field";

class AuthenticationProvider extends Model {
  static modelName = "AuthenticationProvider";

  constructor(fields: Record<string, unknown>, store: Model["store"]) {
    super(fields, store);
    this.initialize(fields);
  }

  @observable
  displayName: string;

  name: string;

  @observable
  providerId: string;

  groupSyncSupported: boolean;

  groupSyncUsesClaim: boolean;

  groupSyncRequiresSetup: boolean;

  @observable
  isConnected: boolean;

  @Field
  @observable
  isEnabled: boolean;

  @Field
  @observable
  settings: AuthenticationProviderSettings | undefined = undefined;

  /** Configuration of a provider that was set up by an admin. */
  @observable
  config: PublicAuthenticationProviderConfig | undefined = undefined;

  @computed
  get isActive() {
    return this.isEnabled && this.isConnected;
  }

  /** Whether this provider was set up by an admin rather than the server. */
  @computed
  get isConfigured() {
    return !!this.config;
  }
}

export default AuthenticationProvider;
