import { ImportState, IntegrationService } from "@shared/types";
import { ImportTask } from "@server/models";
import { buildImport } from "@server/test/factories";
import JSONImportsProcessor from "./JSONImportsProcessor";

describe("JSONImportsProcessor", () => {
  it("should error an import with no input", async () => {
    const importModel = await buildImport({
      service: IntegrationService.JSON,
      input: [],
    });

    await new JSONImportsProcessor().perform({
      name: "imports.create",
      modelId: importModel.id,
      teamId: importModel.teamId,
      actorId: importModel.createdById,
      ip: "127.0.0.1",
    });

    await importModel.reload();
    expect(importModel.state).toEqual(ImportState.Errored);
    expect(importModel.error).toEqual("Nothing to import");
    expect(
      await ImportTask.count({ where: { importId: importModel.id } })
    ).toEqual(0);
  });
});
