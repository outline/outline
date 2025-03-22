import { Extension, onConnectPayload } from "@hocuspocus/server";
import semver from "semver";
import EDITOR_VERSION from "@shared/editor/version";
import Logger from "@server/logging/Logger";
import { trace } from "@server/logging/tracing";
import { EditorUpdateError } from "./CloseEvents";
import { withContext } from "./types";

@trace()
export class EditorVersionExtension implements Extension {
  /**
   * On connect hook
   *
   * @param data The connect payload
   * @returns Promise, resolving will allow the connection, rejecting will drop it
   */
  onConnect({ requestParameters }: withContext<onConnectPayload>) {
    const clientVersion = requestParameters.get("editorVersion");

    if (clientVersion) {
      const parsedClientVersion = semver.parse(clientVersion);
      const parsedServerVersion = semver.parse(EDITOR_VERSION);

      if (
        parsedClientVersion &&
        parsedServerVersion &&
        (parsedClientVersion.major < parsedServerVersion.major ||
          parsedClientVersion.minor < parsedServerVersion.minor)
      ) {
        Logger.debug(
          "multiplayer",
          `Dropping connection due to outdated editor version: ${clientVersion} < ${EDITOR_VERSION}`
        );
        return Promise.reject(EditorUpdateError);
      }
    }

    return Promise.resolve();
  }
}
