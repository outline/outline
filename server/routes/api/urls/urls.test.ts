import { User } from "@server/models";
import { buildDocument, buildUser } from "@server/test/factories";
import { getTestServer } from "@server/test/support";

const server = getTestServer();

describe("#urls.unfurl", () => {
  let user: User;
  beforeEach(async () => {
    user = await buildUser();
  });

  it("should fail with status 400 bad request when url is invalid", async () => {
    const res = await server.post("/api/urls.unfurl", {
      body: {
        token: user.getJwtToken(),
        url: "/doc/foo-bar",
      },
    });

    const body = await res.json();
    expect(res.status).toEqual(400);
    expect(body.message).toEqual("url: Invalid url");
  });

  it("should fail with status 400 bad request when mention url is invalid", async () => {
    const res = await server.post("/api/urls.unfurl", {
      body: {
        token: user.getJwtToken(),
        url: "mention://1/foo/1",
      },
    });

    const body = await res.json();
    expect(res.status).toEqual(400);
    expect(body.message).toEqual("url: Must be a valid url");
  });

  it("should fail with status 400 bad request when mention url is supplied without documentId", async () => {
    const res = await server.post("/api/urls.unfurl", {
      body: {
        token: user.getJwtToken(),
        url: "mention://2767ba0e-ac5c-4533-b9cf-4f5fc456600e/user/34095ac1-c808-45c0-8c6e-6c554497de64",
      },
    });

    const body = await res.json();
    expect(res.status).toEqual(400);
    expect(body.message).toEqual("body: documentId required");
  });

  it("should fail with status 404 not found when mention user does not exist", async () => {
    const res = await server.post("/api/urls.unfurl", {
      body: {
        token: user.getJwtToken(),
        url: "mention://2767ba0e-ac5c-4533-b9cf-4f5fc456600e/user/34095ac1-c808-45c0-8c6e-6c554497de64",
        documentId: "2767ba0e-ac5c-4533-b9cf-4f5fc456600e",
      },
    });

    const body = await res.json();
    expect(res.status).toEqual(404);
    expect(body.message).toEqual("Mentioned user does not exist");
  });

  it("should fail with status 404 not found when document does not exist", async () => {
    const mentionedUser = await buildUser({
      teamId: user.teamId,
    });

    const res = await server.post("/api/urls.unfurl", {
      body: {
        token: user.getJwtToken(),
        url: `mention://2767ba0e-ac5c-4533-b9cf-4f5fc456600e/user/${mentionedUser.id}`,
        documentId: "2767ba0e-ac5c-4533-b9cf-4f5fc456600e",
      },
    });

    const body = await res.json();
    expect(res.status).toEqual(404);
    expect(body.message).toEqual("Document does not exist");
  });

  it("should fail with status 403 forbidden when user is not authorized to read mentioned user info", async () => {
    const mentionedUser = await buildUser();
    const document = await buildDocument({
      teamId: user.teamId,
    });

    const res = await server.post("/api/urls.unfurl", {
      body: {
        token: user.getJwtToken(),
        url: `mention://2767ba0e-ac5c-4533-b9cf-4f5fc456600e/user/${mentionedUser.id}`,
        documentId: document.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(403);
    expect(body.message).toEqual("Authorization error");
  });

  it("should succeed with status 200 ok when valid mention url is supplied", async () => {
    const mentionedUser = await buildUser({ teamId: user.teamId });
    const document = await buildDocument({
      teamId: user.teamId,
    });

    const res = await server.post("/api/urls.unfurl", {
      body: {
        token: user.getJwtToken(),
        url: `mention://2767ba0e-ac5c-4533-b9cf-4f5fc456600e/user/${mentionedUser.id}`,
        documentId: document.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.type).toEqual("mention");
    expect(body.title).toEqual(mentionedUser.name);
    expect(body.meta.id).toEqual(mentionedUser.id);
  });

  it("should succeed with status 200 ok when valid document url is supplied", async () => {
    const document = await buildDocument({
      teamId: user.teamId,
    });

    const res = await server.post("/api/urls.unfurl", {
      body: {
        token: user.getJwtToken(),
        url: `http://localhost:3000/${document.url}`,
        documentId: document.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.type).toEqual("document");
    expect(body.title).toEqual(document.titleWithDefault);
    expect(body.meta.id).toEqual(document.id);
  });
});
