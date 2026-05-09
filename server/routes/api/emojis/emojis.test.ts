import { Emoji, Attachment } from "@server/models";
import {
  buildAdmin,
  buildAttachment,
  buildEmoji,
  buildUser,
} from "@server/test/factories";
import { getTestServer } from "@server/test/support";

const server = getTestServer();

describe("#emojis.update", () => {
  it("should require authentication", async () => {
    const res = await server.post("/api/emojis.update", {
      body: {
        id: "00000000-0000-0000-0000-000000000000",
        attachmentId: "00000000-0000-0000-0000-000000000000",
      },
    });
    expect(res.status).toEqual(401);
  });

  it("should replace the emoji attachment", async () => {
    const user = await buildUser();
    const emoji = await buildEmoji({
      teamId: user.teamId,
      createdById: user.id,
    });
    const oldAttachmentId = emoji.attachmentId;

    const newAttachment = await buildAttachment({
      teamId: user.teamId,
      userId: user.id,
    });

    const res = await server.post("/api/emojis.update", {
      body: {
        token: user.getJwtToken(),
        id: emoji.id,
        attachmentId: newAttachment.id,
      },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.id).toEqual(emoji.id);
    expect(body.data.name).toEqual(emoji.name);

    // Verify the emoji now points to the new attachment and user
    const updated = await Emoji.findByPk(emoji.id);
    expect(updated!.attachmentId).toEqual(newAttachment.id);
    expect(updated!.createdById).toEqual(user.id);

    // Verify old attachment was cleaned up
    const oldAttachment = await Attachment.findByPk(oldAttachmentId);
    expect(oldAttachment).toBeNull();
  });

  it("should allow a team admin to replace another user's emoji", async () => {
    const admin = await buildAdmin();
    const user = await buildUser({ teamId: admin.teamId });
    const emoji = await buildEmoji({
      teamId: admin.teamId,
      createdById: user.id,
    });

    const newAttachment = await buildAttachment({
      teamId: admin.teamId,
      userId: admin.id,
    });

    const res = await server.post("/api/emojis.update", {
      body: {
        token: admin.getJwtToken(),
        id: emoji.id,
        attachmentId: newAttachment.id,
      },
    });

    expect(res.status).toEqual(200);

    // Verify createdById is updated to the admin who replaced it
    const updated = await Emoji.findByPk(emoji.id);
    expect(updated!.createdById).toEqual(admin.id);
  });

  it("should not allow a non-owner to replace another user's emoji", async () => {
    const user = await buildUser();
    const otherUser = await buildUser({ teamId: user.teamId });
    const emoji = await buildEmoji({
      teamId: user.teamId,
      createdById: otherUser.id,
    });

    const newAttachment = await buildAttachment({
      teamId: user.teamId,
      userId: user.id,
    });

    const res = await server.post("/api/emojis.update", {
      body: {
        token: user.getJwtToken(),
        id: emoji.id,
        attachmentId: newAttachment.id,
      },
    });

    expect(res.status).toEqual(403);
  });

  it("should not allow updating an emoji from another team", async () => {
    const user = await buildUser();
    const otherUser = await buildUser();
    const emoji = await buildEmoji({
      teamId: otherUser.teamId,
      createdById: otherUser.id,
    });

    const newAttachment = await buildAttachment({
      teamId: user.teamId,
      userId: user.id,
    });

    const res = await server.post("/api/emojis.update", {
      body: {
        token: user.getJwtToken(),
        id: emoji.id,
        attachmentId: newAttachment.id,
      },
    });

    expect(res.status).toEqual(403);
  });

  it("should return 404 for non-existent emoji", async () => {
    const user = await buildUser();
    const newAttachment = await buildAttachment({
      teamId: user.teamId,
      userId: user.id,
    });

    const res = await server.post("/api/emojis.update", {
      body: {
        token: user.getJwtToken(),
        id: "00000000-0000-0000-0000-000000000000",
        attachmentId: newAttachment.id,
      },
    });

    expect(res.status).toEqual(404);
  });

  it("should return 404 for non-existent attachment", async () => {
    const user = await buildUser();
    const emoji = await buildEmoji({
      teamId: user.teamId,
      createdById: user.id,
    });

    const res = await server.post("/api/emojis.update", {
      body: {
        token: user.getJwtToken(),
        id: emoji.id,
        attachmentId: "00000000-0000-0000-0000-000000000000",
      },
    });

    expect(res.status).toEqual(404);
  });
});
