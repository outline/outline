import { CollectionPermission } from "@shared/types";
import AuthenticationExtension from "@server/collaboration/AuthenticationExtension";
import { buildDocument } from "@server/test/factories";
import type { CollectionUserEvent } from "@server/types";
import CollaborationAuthorizationProcessor from "./CollaborationAuthorizationProcessor";

describe("CollaborationAuthorizationProcessor", () => {
  const processor = new CollaborationAuthorizationProcessor();

  const buildAddUserEvent = (
    overrides: Partial<CollectionUserEvent> = {}
  ): CollectionUserEvent => ({
    name: "collections.add_user",
    teamId: "team-id",
    actorId: "actor-id",
    ip: null,
    userId: "user-id",
    modelId: "membership-id",
    collectionId: "collection-id",
    data: { isNew: true },
    ...overrides,
  });

  const invalidate = () =>
    vi.spyOn(AuthenticationExtension, "invalidate").mockResolvedValue();

  afterEach(() => vi.restoreAllMocks());

  it("should invalidate when a membership is created", async () => {
    const spy = invalidate();

    await processor.perform(buildAddUserEvent());

    expect(spy).toHaveBeenCalledWith({
      userIds: ["user-id"],
      collectionId: "collection-id",
    });
  });

  it("should invalidate when a membership permission changed", async () => {
    const spy = invalidate();

    await processor.perform(
      buildAddUserEvent({
        data: { isNew: false },
        changes: {
          attributes: { permission: CollectionPermission.Read },
          previous: { permission: CollectionPermission.ReadWrite },
        },
      })
    );

    expect(spy).toHaveBeenCalled();
  });

  it("should not invalidate when a membership index changed", async () => {
    const spy = invalidate();

    await processor.perform(
      buildAddUserEvent({
        data: { isNew: false },
        changes: {
          attributes: { index: "P" },
          previous: { index: "O" },
        },
      })
    );

    expect(spy).not.toHaveBeenCalled();
  });

  it("should invalidate when a membership is removed", async () => {
    const spy = invalidate();

    // Removal events carry no data at all.
    await processor.perform(
      buildAddUserEvent({ name: "collections.remove_user", data: undefined })
    );

    expect(spy).toHaveBeenCalledWith({
      userIds: ["user-id"],
      collectionId: "collection-id",
    });
  });

  it("should not scope a document membership to the document, as it is inherited", async () => {
    const spy = invalidate();

    await processor.perform({
      name: "documents.remove_user",
      teamId: "team-id",
      actorId: "actor-id",
      ip: null,
      userId: "user-id",
      modelId: "membership-id",
      documentId: "document-id",
    });

    expect(spy).toHaveBeenCalledWith({ userIds: ["user-id"] });
  });

  it("should not scope a document group membership to the document", async () => {
    const spy = invalidate();

    await processor.perform({
      name: "documents.remove_group",
      teamId: "team-id",
      actorId: "actor-id",
      ip: null,
      modelId: "group-id",
      documentId: "document-id",
      data: { membershipId: "membership-id" },
    });

    expect(spy).toHaveBeenCalledWith({ groupId: "group-id" });
  });

  it.each([
    "documents.archive",
    "documents.unarchive",
    "documents.delete",
  ] as const)("should invalidate the document tree on %s", async (name) => {
    const spy = invalidate();
    const document = await buildDocument();
    const child = await buildDocument({
      teamId: document.teamId,
      collectionId: document.collectionId,
      parentDocumentId: document.id,
    });
    const grandchild = await buildDocument({
      teamId: document.teamId,
      collectionId: document.collectionId,
      parentDocumentId: child.id,
    });
    // Descendants are already in their new state when the event is processed.
    await grandchild.destroy();

    await processor.perform({
      name,
      teamId: document.teamId,
      actorId: document.createdById,
      ip: null,
      documentId: document.id,
      collectionId: document.collectionId!,
    });

    expect(spy).toHaveBeenCalledWith({
      documentIds: [document.id, child.id, grandchild.id],
    });
  });

  it("should invalidate the document on documents.permanent_delete", async () => {
    const spy = invalidate();

    await processor.perform({
      name: "documents.permanent_delete",
      teamId: "team-id",
      actorId: "actor-id",
      ip: null,
      documentId: "document-id",
      collectionId: "collection-id",
    });

    expect(spy).toHaveBeenCalledWith({ documentIds: ["document-id"] });
  });
});
