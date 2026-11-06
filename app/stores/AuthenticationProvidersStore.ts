import { orderBy } from "es-toolkit/compat";
import { action, observable, override, runInAction } from "mobx";
import AuthenticationProvider from "~/models/AuthenticationProvider";
import { client } from "~/utils/ApiClient";
import type RootStore from "./RootStore";
import Store, { RPCAction } from "./base/Store";

/** A type of authentication provider that can be added to the workspace. */
export interface AvailableAuthenticationProvider {
  /** The plugin id, eg "google". */
  id: string;
  /** The display name of the provider type. */
  name: string;
  /** Whether the provider is configured by an admin before connecting. */
  isConfigurable: boolean;
  /** The URL identity providers redirect back to, for configurable providers. */
  callbackUrl?: string;
}

/** The configuration an admin enters for a provider. */
export type AuthenticationProviderConfigInput = {
  displayName: string;
  issuerUrl?: string;
  authorizationUrl?: string;
  tokenUrl?: string;
  userInfoUrl?: string;
  logoutUrl?: string;
  clientId: string;
  clientSecret?: string;
  scopes?: string;
  usernameClaim?: string;
};

export default class AuthenticationProvidersStore extends Store<AuthenticationProvider> {
  actions = [RPCAction.List, RPCAction.Update, RPCAction.Delete];

  /** Provider types that can be added to the workspace. */
  @observable
  available: AvailableAuthenticationProvider[] = [];

  constructor(rootStore: RootStore) {
    super(rootStore, AuthenticationProvider);
  }

  @override
  get orderedData(): AuthenticationProvider[] {
    return orderBy(
      Array.from(this.data.values()),
      [(provider) => provider.isConnected, "createdAt"],
      ["desc", "asc"]
    );
  }

  /**
   * Fetches the provider types that can be added to the workspace.
   *
   * @returns the available provider types.
   */
  @action
  fetchAvailable = async (): Promise<AvailableAuthenticationProvider[]> => {
    const res = await client.post("/authenticationProviders.available");
    runInAction(() => {
      this.available = res.data;
    });
    return res.data;
  };

  /**
   * Creates a provider that is configured by an admin.
   *
   * @param name the provider type, eg "oidc-custom".
   * @param config the configuration of the provider.
   * @returns the created provider.
   */
  createConfigured = async (
    name: string,
    config: AuthenticationProviderConfigInput
  ): Promise<AuthenticationProvider> => {
    const res = await client.post("/authenticationProviders.create", {
      name,
      config,
    });
    return runInAction(() => {
      this.addPolicies(res.policies);
      return this.add(res.data);
    });
  };

  /**
   * Updates the configuration of a provider that is configured by an admin.
   *
   * @param provider the provider to update.
   * @param config the new configuration.
   * @returns the updated provider.
   */
  updateConfig = async (
    provider: AuthenticationProvider,
    config: AuthenticationProviderConfigInput
  ): Promise<AuthenticationProvider> => {
    const res = await client.post("/authenticationProviders.update", {
      id: provider.id,
      config,
    });
    return runInAction(() => {
      this.addPolicies(res.policies);
      return this.add(res.data);
    });
  };
}
