import type { Extension, onConnectPayload } from "@hocuspocus/server";
import semver from "semver";
import isUUID from "validator/lib/isUUID";
import {
  DocumentReset,
  EditorUpdateError,
} from "@shared/collaboration/CloseEvents";
import { parseDocumentName } from "@shared/collaboration/documentName";
import { trace } from "@server/logging/tracing";
import Document from "@server/models/Document";

/** The first editor version that can handle the DocumentReset close event. */
const minimumResetVersion = "17.1.0";

@trace()
export class StateGenerationExtension implements Extension {
  /**
   * Refuses connections to a state generation that is not the current one.
   * The state of an earlier generation must not merge into the current state.
   *
   * @param data the connect payload.
   * @returns a promise that resolves to allow the connection.
   * @throws {DocumentReset} if the client must connect to the current generation.
   * @throws {EditorUpdateError} if the client is too old to change generation.
   */
  async onConnect({ documentName, requestParameters }: onConnectPayload) {
    const parts = parseDocumentName(documentName);

    // Invalid names are refused during authentication.
    if (!parts || !isUUID(parts.documentId)) {
      return;
    }

    const document = await Document.unscoped().findOne({
      attributes: ["stateGeneration"],
      where: { id: parts.documentId },
      paranoid: false,
    });

    if (!document || document.stateGeneration === parts.stateGeneration) {
      return;
    }

    const clientVersion = semver.valid(requestParameters.get("editorVersion"));
    throw clientVersion && semver.gte(clientVersion, minimumResetVersion)
      ? DocumentReset
      : EditorUpdateError;
  }
}
