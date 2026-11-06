import env from "../env";
import type { ChatIntegrationService, IntegrationType } from "../types";
import { integrationSettingsPath } from "./routeHelpers";

/** The state passed through the OAuth flow when a chat integration is installed. */
export interface ChatOAuthState {
  /** The ID of the Outline team. */
  teamId: string;
  /** The type of integration to create. */
  type: IntegrationType;
  /** A one-time value that is compared with a cookie on callback. */
  nonce: string;
  /** The collection to connect, for post integrations. */
  collectionId?: string;
}

/**
 * Helpers for the install flow of chat integrations, shared by client and server.
 */
export class ChatUtils {
  /**
   * Returns the name of the cookie that holds the OAuth nonce for a service.
   *
   * @param service the chat service.
   * @returns the cookie name.
   */
  public static nonceCookie(service: ChatIntegrationService) {
    return `${service}OAuthNonce`;
  }

  /**
   * Creates a state string for use in OAuth flows.
   *
   * @param teamId the ID of the Outline team.
   * @param type the integration type.
   * @param data additional data to include in the state.
   * @returns a state string.
   */
  public static createState(
    teamId: string,
    type: IntegrationType,
    data?: { nonce?: string; collectionId?: string }
  ) {
    return JSON.stringify({ type, teamId, ...data });
  }

  /**
   * Parses a state string from an OAuth flow.
   *
   * @param state the state string.
   * @returns the parsed state, or undefined if the state is not valid JSON.
   */
  public static parseState(state: string): ChatOAuthState | undefined {
    try {
      return JSON.parse(state);
    } catch {
      return undefined;
    }
  }

  /**
   * Returns the URL that the chat platform redirects to after install.
   *
   * @param service the chat service.
   * @param options the base URL and optional query string.
   * @returns the install callback URL.
   */
  public static connectUrl(
    service: ChatIntegrationService,
    { baseUrl, params }: { baseUrl: string; params?: string } = {
      baseUrl: env.URL,
      params: undefined,
    }
  ) {
    return params
      ? `${baseUrl}/auth/${service}.post?${params}`
      : `${baseUrl}/auth/${service}.post`;
  }

  /**
   * Returns the settings path for a service.
   *
   * @param service the chat service.
   * @returns the settings path.
   */
  public static settingsPath(service: ChatIntegrationService) {
    return integrationSettingsPath(service);
  }

  /**
   * Returns the settings path for a service with an error code.
   *
   * @param service the chat service.
   * @param error the error code.
   * @returns the settings path.
   */
  public static errorPath(service: ChatIntegrationService, error: string) {
    return integrationSettingsPath(`${service}?error=${error}`);
  }
}
