import type { onConnectPayload } from "@hocuspocus/server";
import {
  DocumentReset,
  EditorUpdateError,
} from "@shared/collaboration/CloseEvents";
import { buildDocumentName } from "@shared/collaboration/documentName";
import { buildDocument } from "@server/test/factories";
import { StateGenerationExtension } from "./StateGenerationExtension";

describe("StateGenerationExtension", () => {
  const extension = new StateGenerationExtension();

  const connect = (documentName: string, editorVersion = "17.1.0") =>
    extension.onConnect({
      documentName,
      requestParameters: new URLSearchParams({ editorVersion }),
    } as unknown as onConnectPayload);

  it("allows connections to the current generation", async () => {
    const document = await buildDocument();
    await document.update({ stateGeneration: 2 });

    await expect(
      connect(buildDocumentName(document.id, 2))
    ).resolves.toBeUndefined();
  });

  it("resets connections to an earlier generation", async () => {
    const document = await buildDocument();
    await document.update({ stateGeneration: 1 });

    await expect(connect(buildDocumentName(document.id, 0))).rejects.toBe(
      DocumentReset
    );
  });

  it("asks clients that can not reset to update", async () => {
    const document = await buildDocument();
    await document.update({ stateGeneration: 1 });

    await expect(
      connect(buildDocumentName(document.id, 0), "17.0.0")
    ).rejects.toBe(EditorUpdateError);
  });

  it("ignores names that are not valid", async () => {
    await expect(connect("document.not-a-uuid")).resolves.toBeUndefined();
  });
});
