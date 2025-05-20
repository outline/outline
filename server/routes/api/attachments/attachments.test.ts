import {
  buildAttachment,
  buildDocument,
  buildUser,
} from "@server/test/factories";
import { getTestServer } from "@server/test/support";

const server = getTestServer();

describe("#attachments.list", () => {
  it("should return attachments for user", async () => {
    const user = await buildUser();
    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });
    const attachment = await buildAttachment({
      teamId: user.teamId,
      userId: user.id,
      documentId: document.id,
    });
    const attachment2 = await buildAttachment({
      teamId: user.teamId,
      userId: user.id,
    });

    const res = await server.post("/api/attachments.list", {
      body: {},
      user,
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(2);
    expect(body.data[0].id).toEqual(attachment2.id);
    expect(body.data[1].id).toEqual(attachment.id);
  });

  it("should filter by documentId", async () => {
    const user = await buildUser();
    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });
    const attachment = await buildAttachment({
      teamId: user.teamId,
      userId: user.id,
      documentId: document.id,
    });
    await buildAttachment({
      teamId: user.teamId,
      userId: user.id,
    });

    const res = await server.post("/api/attachments.list", {
      body: { documentId: document.id },
      user,
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(1);
    expect(body.data[0].id).toEqual(attachment.id);
  });

  it("should not return attachments created by other users", async () => {
    const user = await buildUser();
    const anotherUser = await buildUser({
      teamId: user.teamId,
    });
    await buildAttachment({
      teamId: user.teamId,
      userId: anotherUser.id,
    });

    const res = await server.post("/api/attachments.list", {
      body: {},
      user,
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(0);
  });

  it("should require authentication", async () => {
    const res = await server.post("/api/attachments.list");
    expect(res.status).toEqual(401);
  });
});
