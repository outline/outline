import {
  CollectionPermission,
  ImportState,
  IntegrationService,
} from "@shared/types";
import type { Import } from "@server/models";
import {
  buildAdmin,
  buildAttachment,
  buildCollection,
  buildDocument,
  buildDraftDocument,
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

  describe("destination", () => {
    it("persists collectionId when importing into an existing collection", async () => {
      const admin = await buildAdmin();
      const attachment = await buildAttachment({
        teamId: admin.teamId,
        userId: admin.id,
      });
      const collection = await buildCollection({
        teamId: admin.teamId,
        userId: admin.id,
        permission: CollectionPermission.ReadWrite,
      });

      const res = await server.post("/api/imports.create", admin, {
        body: {
          service: IntegrationService.JSON,
          attachmentId: attachment.id,
          collectionId: collection.id,
        },
      });
      const body = await res.json();

      expect(res.status).toEqual(200);
      expect(body.data.collectionId).toEqual(collection.id);
      expect(body.data.documentId).toBeNull();
    });

    it("persists documentId when importing into an existing document", async () => {
      const admin = await buildAdmin();
      const attachment = await buildAttachment({
        teamId: admin.teamId,
        userId: admin.id,
      });
      const collection = await buildCollection({
        teamId: admin.teamId,
        userId: admin.id,
        permission: CollectionPermission.ReadWrite,
      });
      const document = await buildDocument({
        teamId: admin.teamId,
        userId: admin.id,
        collectionId: collection.id,
      });

      const res = await server.post("/api/imports.create", admin, {
        body: {
          service: IntegrationService.JSON,
          attachmentId: attachment.id,
          documentId: document.id,
        },
      });
      const body = await res.json();

      expect(res.status).toEqual(200);
      expect(body.data.documentId).toEqual(document.id);
      expect(body.data.collectionId).toBeNull();
    });

    it("rejects when both collectionId and documentId are set", async () => {
      const admin = await buildAdmin();
      const attachment = await buildAttachment({
        teamId: admin.teamId,
        userId: admin.id,
      });
      const collection = await buildCollection({
        teamId: admin.teamId,
        userId: admin.id,
        permission: CollectionPermission.ReadWrite,
      });
      const document = await buildDocument({
        teamId: admin.teamId,
        userId: admin.id,
        collectionId: collection.id,
      });

      const res = await server.post("/api/imports.create", admin, {
        body: {
          service: IntegrationService.JSON,
          attachmentId: attachment.id,
          collectionId: collection.id,
          documentId: document.id,
        },
      });

      expect(res.status).toEqual(400);
    });

    it("rejects permission together with a destination", async () => {
      const admin = await buildAdmin();
      const attachment = await buildAttachment({
        teamId: admin.teamId,
        userId: admin.id,
      });
      const collection = await buildCollection({
        teamId: admin.teamId,
        userId: admin.id,
        permission: CollectionPermission.ReadWrite,
      });

      const res = await server.post("/api/imports.create", admin, {
        body: {
          service: IntegrationService.JSON,
          attachmentId: attachment.id,
          collectionId: collection.id,
          permission: CollectionPermission.Read,
        },
      });

      expect(res.status).toEqual(400);
    });

    it("rejects a collection the user cannot create documents in", async () => {
      const admin = await buildAdmin();
      const attachment = await buildAttachment({
        teamId: admin.teamId,
        userId: admin.id,
      });
      // A private collection (no ReadWrite permission) the admin has no
      // membership in — createDocument is denied.
      const other = await buildUser({ teamId: admin.teamId });
      const collection = await buildCollection({
        teamId: admin.teamId,
        userId: other.id,
        permission: null,
      });

      const res = await server.post("/api/imports.create", admin, {
        body: {
          service: IntegrationService.JSON,
          attachmentId: attachment.id,
          collectionId: collection.id,
        },
      });

      expect(res.status).toEqual(403);
    });

    it("rejects an archived document destination", async () => {
      const admin = await buildAdmin();
      const attachment = await buildAttachment({
        teamId: admin.teamId,
        userId: admin.id,
      });
      const document = await buildDocument({
        teamId: admin.teamId,
        userId: admin.id,
        archivedAt: new Date(),
      });

      const res = await server.post("/api/imports.create", admin, {
        body: {
          service: IntegrationService.Markdown,
          attachmentId: attachment.id,
          documentId: document.id,
        },
      });

      expect(res.status).toEqual(403);
    });

    it("rejects a template document destination", async () => {
      const admin = await buildAdmin();
      const attachment = await buildAttachment({
        teamId: admin.teamId,
        userId: admin.id,
      });
      const document = await buildDocument({
        teamId: admin.teamId,
        userId: admin.id,
        template: true,
      });

      const res = await server.post("/api/imports.create", admin, {
        body: {
          service: IntegrationService.Markdown,
          attachmentId: attachment.id,
          documentId: document.id,
        },
      });

      expect(res.status).toEqual(404);
    });

    it("rejects a document destination in another team", async () => {
      const admin = await buildAdmin();
      const attachment = await buildAttachment({
        teamId: admin.teamId,
        userId: admin.id,
      });
      const document = await buildDocument();

      const res = await server.post("/api/imports.create", admin, {
        body: {
          service: IntegrationService.Markdown,
          attachmentId: attachment.id,
          documentId: document.id,
        },
      });

      expect(res.status).toEqual(403);
    });

    it("rejects a draft document destination", async () => {
      const admin = await buildAdmin();
      const attachment = await buildAttachment({
        teamId: admin.teamId,
        userId: admin.id,
      });
      const draft = await buildDraftDocument({
        teamId: admin.teamId,
        userId: admin.id,
      });

      const res = await server.post("/api/imports.create", admin, {
        body: {
          service: IntegrationService.JSON,
          attachmentId: attachment.id,
          documentId: draft.id,
        },
      });

      expect(res.status).toEqual(403);
    });
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
