import {
  buildCollection,
  buildComment,
  buildDocument,
  buildTeam,
  buildUser,
} from "@server/test/factories";
import { getTestServer } from "@server/test/support";

const server = getTestServer();

describe("#comments.list", () => {
  it("should require authentication", async () => {
    const res = await server.post("/api/comments.list");
    const body = await res.json();
    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });
  it("should return all comments for a document", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });
    const comment = await buildComment({
      userId: user.id,
      teamId: team.id,
      documentId: document.id,
    });
    const res = await server.post("/api/comments.list", {
      body: {
        token: user.getJwtToken(),
        documentId: document.id,
      },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(1);
    expect(body.data[0].id).toEqual(comment.id);
    expect(body.policies.length).toEqual(1);
    expect(body.policies[0].abilities.read).toEqual(true);
  });
  it("should return all comments for a collection", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const collection = await buildCollection({
      userId: user.id,
      teamId: team.id,
    });
    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
      collectionId: collection.id,
    });
    const comment = await buildComment({
      userId: user.id,
      teamId: team.id,
      documentId: document.id,
    });
    const res = await server.post("/api/comments.list", {
      body: {
        token: user.getJwtToken(),
        collectionId: collection.id,
      },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(1);
    expect(body.data[0].id).toEqual(comment.id);
    expect(body.policies.length).toEqual(1);
    expect(body.policies[0].abilities.read).toEqual(true);
  });
  it("should return all comments", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const collection1 = await buildCollection({
      userId: user.id,
      teamId: team.id,
    });
    const collection2 = await buildCollection({
      userId: user.id,
      teamId: team.id,
    });
    const document1 = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
      collectionId: collection1.id,
    });
    const document2 = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
      collectionId: collection2.id,
    });
    const comment1 = await buildComment({
      userId: user.id,
      teamId: team.id,
      documentId: document1.id,
    });
    const comment2 = await buildComment({
      userId: user.id,
      teamId: team.id,
      documentId: document2.id,
    });
    const res = await server.post("/api/comments.list", {
      body: {
        token: user.getJwtToken(),
      },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(2);
    expect([body.data[0].id, body.data[1].id].sort()).toEqual(
      [comment1.id, comment2.id].sort()
    );
    expect(body.policies.length).toEqual(2);
    expect(body.policies[0].abilities.read).toEqual(true);
    expect(body.policies[1].abilities.read).toEqual(true);
  });
});
