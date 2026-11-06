import { ImportState, IntegrationService } from "@shared/types";
import type { Import } from "@server/models";
import {
  buildAdmin,
  buildAttachment,
  buildImport,
  buildUser,
} from "@server/test/factories";
import { getTestServer } from "@server/test/support";

const server = getTestServer();

describe("#imports.create", () => {
  it("should create an import from an uploaded file", async () => {
    const admin = await buildAdmin();
    const attachment = await buildAttachment({
      teamId: admin.teamId,
      userId: admin.id,
    });

    const res = await server.post("/api/imports.create", admin, {
      body: {
        attachmentId: attachment.id,
        service: IntegrationService.Markdown,
      },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.state).toEqual(ImportState.Created);
    expect(body.data.service).toEqual(IntegrationService.Markdown);
  });

  it("should reject an unknown service", async () => {
    const admin = await buildAdmin();
    const attachment = await buildAttachment({
      teamId: admin.teamId,
      userId: admin.id,
    });

    const res = await server.post("/api/imports.create", admin, {
      body: {
        attachmentId: attachment.id,
        service: "unknown",
      },
    });

    expect(res.status).toEqual(400);
  });

  it("should require authentication", async () => {
    const res = await server.post("/api/imports.create");

    expect(res.status).toEqual(401);
  });

  it("should require user to be admin", async () => {
    const user = await buildUser();

    const res = await server.post("/api/imports.create", user);

    expect(res.status).toEqual(403);
  });
});

describe("#imports.list", () => {
  it("should list all imports", async () => {
    const admin = await buildAdmin();
    const [importOne, importTwo] = await Promise.all([
      buildImport({
        createdById: admin.id,
        teamId: admin.teamId,
      }),
      buildImport({
        createdById: admin.id,
        teamId: admin.teamId,
      }),
    ]);

    const res = await server.post("/api/imports.list", admin, {
      body: {
        service: IntegrationService.Notion,
      },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(2);

    const importIds = body.data.map(
      // oxlint-disable-next-line @typescript-eslint/no-explicit-any
      (importModel: Import<any>) => importModel.id
    );
    expect(importIds).toContain(importOne.id);
    expect(importIds).toContain(importTwo.id);
  });

  it("should require authentication", async () => {
    const res = await server.post("/api/imports.list");

    expect(res.status).toEqual(401);
  });

  it("should require user to be admin", async () => {
    const user = await buildUser();

    const res = await server.post("/api/imports.list", user);

    expect(res.status).toEqual(403);
  });
});

describe("#imports.info", () => {
  it("should return the import", async () => {
    const admin = await buildAdmin();
    const importModel = await buildImport({
      createdById: admin.id,
      teamId: admin.teamId,
    });

    const res = await server.post("/api/imports.info", admin, {
      body: {
        id: importModel.id,
      },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.id).toEqual(importModel.id);
  });

  it("should require authentication", async () => {
    const res = await server.post("/api/imports.info");

    expect(res.status).toEqual(401);
  });

  it("should require user to be admin", async () => {
    const user = await buildUser();

    const res = await server.post("/api/imports.info", user);

    expect(res.status).toEqual(403);
  });
});

describe("#imports.delete", () => {
  it.each([ImportState.Completed, ImportState.Errored, ImportState.Canceled])(
    "should delete the import when in %s state",
    async (state) => {
      const admin = await buildAdmin();
      const importModel = await buildImport({
        state,
        createdById: admin.id,
        teamId: admin.teamId,
      });

      const res = await server.post("/api/imports.delete", admin, {
        body: {
          id: importModel.id,
        },
      });
      const body = await res.json();

      expect(res.status).toEqual(200);
      expect(body.success).toEqual(true);
    }
  );

  it("should throw error when import is not in deletable state", async () => {
    const admin = await buildAdmin();
    const importModel = await buildImport({
      state: ImportState.InProgress,
      createdById: admin.id,
      teamId: admin.teamId,
    });

    const res = await server.post("/api/imports.delete", admin, {
      body: {
        id: importModel.id,
      },
    });

    expect(res.status).toEqual(403);
  });

  it("should require authentication", async () => {
    const res = await server.post("/api/imports.delete");

    expect(res.status).toEqual(401);
  });

  it("should require user to be admin", async () => {
    const user = await buildUser();

    const res = await server.post("/api/imports.delete", user);

    expect(res.status).toEqual(403);
  });
});

describe("#imports.cancel", () => {
  it("should cancel the import", async () => {
    const admin = await buildAdmin();
    const importModel = await buildImport({
      createdById: admin.id,
      teamId: admin.teamId,
    });

    const res = await server.post("/api/imports.cancel", admin, {
      body: {
        id: importModel.id,
      },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.id).toEqual(importModel.id);
    expect(body.data.state).toEqual(ImportState.Canceled);
  });

  it("should throw error when import is not in cancelable state", async () => {
    const admin = await buildAdmin();
    const importModel = await buildImport({
      state: ImportState.Completed,
      createdById: admin.id,
      teamId: admin.teamId,
    });

    const res = await server.post("/api/imports.cancel", admin, {
      body: {
        id: importModel.id,
      },
    });

    expect(res.status).toEqual(403);
  });

  it("should require authentication", async () => {
    const res = await server.post("/api/imports.cancel");

    expect(res.status).toEqual(401);
  });

  it("should require user to be admin", async () => {
    const user = await buildUser();

    const res = await server.post("/api/imports.cancel", user);

    expect(res.status).toEqual(403);
  });
});
