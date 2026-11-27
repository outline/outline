import { Emoji, Attachment } from "@server/models";
import {
  buildAdmin,
  buildAttachment,
  buildDocument,
  buildEmoji,
  buildGuestUser,
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
      documentId: null,
    });

    const res = await server.post("/api/emojis.update", user, {
      body: {
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
      documentId: null,
    });

    const res = await server.post("/api/emojis.update", admin, {
      body: {
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
      documentId: null,
    });

    const res = await server.post("/api/emojis.update", user, {
      body: {
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
      documentId: null,
    });

    const res = await server.post("/api/emojis.update", user, {
      body: {
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
      documentId: null,
    });

    const res = await server.post("/api/emojis.update", user, {
      body: {
        id: "00000000-0000-0000-0000-000000000000",
        attachmentId: newAttachment.id,
      },
    });

    expect(res.status).toEqual(404);
  });

  it("should not allow using a document attachment", async () => {
    const user = await buildUser();
    const emoji = await buildEmoji({
      teamId: user.teamId,
      createdById: user.id,
    });
    const document = await buildDocument({
      teamId: user.teamId,
      userId: user.id,
    });
    const documentAttachment = await buildAttachment({
      teamId: user.teamId,
      userId: user.id,
      documentId: document.id,
    });

    const res = await server.post("/api/emojis.update", user, {
      body: {
        id: emoji.id,
        attachmentId: documentAttachment.id,
      },
    });

    expect(res.status).toEqual(400);
    expect(await Attachment.findByPk(emoji.attachmentId)).not.toBeNull();
  });

  it("should not allow using another emoji's attachment", async () => {
    const user = await buildUser();
    const emoji = await buildEmoji({
      teamId: user.teamId,
      createdById: user.id,
    });
    const other = await buildEmoji({
      teamId: user.teamId,
      createdById: user.id,
    });

    const res = await server.post("/api/emojis.update", user, {
      body: {
        id: emoji.id,
        attachmentId: other.attachmentId,
      },
    });

    expect(res.status).toEqual(400);
    expect(await Emoji.findByPk(other.id)).not.toBeNull();
    expect(await Attachment.findByPk(emoji.attachmentId)).not.toBeNull();
  });

  it("should return 404 for non-existent attachment", async () => {
    const user = await buildUser();
    const emoji = await buildEmoji({
      teamId: user.teamId,
      createdById: user.id,
    });

    const res = await server.post("/api/emojis.update", user, {
      body: {
        id: emoji.id,
        attachmentId: "00000000-0000-0000-0000-000000000000",
      },
    });

    expect(res.status).toEqual(404);
  });
});

describe("#emojis.create", () => {
  it("should not allow guests to create an emoji", async () => {
    const user = await buildGuestUser();
    const attachment = await buildAttachment({
      teamId: user.teamId,
      userId: user.id,
      documentId: null,
    });

    const res = await server.post("/api/emojis.create", user, {
      body: {
        name: "party",
        attachmentId: attachment.id,
      },
    });

    expect(res.status).toEqual(403);
    expect(await Emoji.count({ where: { teamId: user.teamId } })).toEqual(0);
  });

  it("should create an emoji", async () => {
    const user = await buildUser();
    const attachment = await buildAttachment({
      teamId: user.teamId,
      userId: user.id,
      documentId: null,
    });

    const res = await server.post("/api/emojis.create", user, {
      body: {
        name: "party",
        attachmentId: attachment.id,
      },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.name).toEqual("party");
  });

  it("should not allow using a document attachment", async () => {
    const user = await buildUser();
    const document = await buildDocument({
      teamId: user.teamId,
      userId: user.id,
    });
    const attachment = await buildAttachment({
      teamId: user.teamId,
      userId: user.id,
      documentId: document.id,
    });

    const res = await server.post("/api/emojis.create", user, {
      body: {
        name: "party",
        attachmentId: attachment.id,
      },
    });

    expect(res.status).toEqual(400);
    expect(await Emoji.count({ where: { teamId: user.teamId } })).toEqual(0);
  });
});

describe("#emojis.delete", () => {
  it("should delete the emoji and its attachment", async () => {
    const user = await buildUser();
    const emoji = await buildEmoji({
      teamId: user.teamId,
      createdById: user.id,
    });

    const res = await server.post("/api/emojis.delete", user, {
      body: { id: emoji.id },
    });

    expect(res.status).toEqual(200);
    expect(await Emoji.findByPk(emoji.id)).toBeNull();
    expect(await Attachment.findByPk(emoji.attachmentId)).toBeNull();
  });
});
