import { OAuthAuthentication } from "@server/models";
import { OAuthClientEvent, Event as TEvent } from "@server/types";
import BaseProcessor from "./BaseProcessor";

export default class OAuthClientDeletedProcessor extends BaseProcessor {
  static applicableEvents: TEvent["name"][] = ["oauthClients.delete"];

  async perform(event: OAuthClientEvent) {
    await OAuthAuthentication.destroy({
      where: {
        oauthClientId: event.modelId,
      },
    });
  }
}
