import { CollectionPermission } from "@shared/types";
import AuthenticationExtension from "@server/collaboration/AuthenticationExtension";
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
});
