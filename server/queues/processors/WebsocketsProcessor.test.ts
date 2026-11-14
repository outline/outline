import type { Server } from "socket.io";
import { DocumentPermission } from "@shared/types";
import { UserMembership } from "@server/models";
import {
  buildAdmin,
  buildCollection,
  buildDocument,
  buildUser,
} from "@server/test/factories";
import type { CollectionLinkEvent } from "@server/types";
import WebsocketsProcessor from "./WebsocketsProcessor";

describe("WebsocketsProcessor", () => {
  it("should send link events to members of the parent document", async () => {
    const admin = await buildAdmin();
    const collection = await buildCollection({
      teamId: admin.teamId,
      userId: admin.id,
      permission: null,
    });
    const document = await buildDocument({
      teamId: admin.teamId,
      userId: admin.id,
      collectionId: collection.id,
    });
    const member = await buildUser({ teamId: admin.teamId });
    await UserMembership.create({
      documentId: document.id,
      userId: member.id,
      createdById: admin.id,
      permission: DocumentPermission.Read,
    });

    const emit = vi.fn();
    const to = vi.fn().mockReturnValue({ emit });
    const event: CollectionLinkEvent = {
      name: "collections.add_link",
      collectionId: collection.id,
      modelId: "4d3e6f2a-8b1c-4e5d-9f0a-1b2c3d4e5f60",
      teamId: admin.teamId,
      actorId: admin.id,
      ip: "127.0.0.1",
      data: { parentDocumentIds: [document.id] },
    };

    await new WebsocketsProcessor().perform(event, { to } as unknown as Server);

    expect(to).toHaveBeenCalledWith(
      expect.arrayContaining([
        `collection-${collection.id}`,
        `user-${member.id}`,
      ])
    );
    expect(emit).toHaveBeenCalledWith(
      "entities",
      expect.objectContaining({ event: "collections.add_link" })
    );
  });
});
