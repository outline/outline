import { OAuthClient, OAuthAuthentication } from "@server/models";
import {
  buildOAuthAuthentication,
  buildTeam,
  buildUser,
} from "@server/test/factories";
import { getTestServer } from "@server/test/support";

const server = getTestServer();

describe("oauthAuthentications.list", () => {
  it("should require authentication", async () => {
    const res = await server.post("/api/oauthAuthentications.list");
    const body = await res.json();
    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });

  it("should return list of oauth authentications for user", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const oauthClient = await OAuthClient.create({
      teamId: team.id,
      createdById: user.id,
      name: "Test Client",
      redirectUris: ["https://example.com/callback"],
    });

    await buildOAuthAuthentication({
      oauthClientId: oauthClient.id,
      user,
      scope: ["read"],
    });

    const res = await server.post("/api/oauthAuthentications.list", {
      body: {
        token: user.getJwtToken(),
      },
    });

    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(1);
    expect(body.data[0].id).toBeDefined();
    expect(body.data[0].oauthClient.name).toEqual("Test Client");
    expect(body.policies).toBeDefined();
  });

  it("should only return authentications for requesting user", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const anotherUser = await buildUser({ teamId: team.id });
    const oauthClient = await OAuthClient.create({
      teamId: team.id,
      createdById: user.id,
      name: "Test Client",
      redirectUris: ["https://example.com/callback"],
    });

    await buildOAuthAuthentication({
      oauthClientId: oauthClient.id,
      user: anotherUser,
      scope: ["read"],
    });

    const res = await server.post("/api/oauthAuthentications.list", {
      body: {
        token: user.getJwtToken(),
      },
    });

    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(0);
  });
});

describe("oauthAuthentications.delete", () => {
  it("should require authentication", async () => {
    const res = await server.post("/api/oauthAuthentications.delete");
    const body = await res.json();
    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });

  it("should delete all authentications for a client without scope", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const oauthClient = await OAuthClient.create({
      teamId: team.id,
      createdById: user.id,
      name: "Test Client",
      redirectUris: ["https://example.com/callback"],
    });

    await buildOAuthAuthentication({
      oauthClientId: oauthClient.id,
      user,
      scope: ["read"],
    });

    const res = await server.post("/api/oauthAuthentications.delete", {
      body: {
        token: user.getJwtToken(),
        oauthClientId: oauthClient.id,
      },
    });

    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.success).toBe(true);

    const auths = await OAuthAuthentication.findAll({
      where: {
        userId: user.id,
        oauthClientId: oauthClient.id,
      },
    });
    expect(auths.length).toEqual(0);
  });

  it("should delete matching authentications for a client with scope", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const oauthClient = await OAuthClient.create({
      teamId: team.id,
      createdById: user.id,
      name: "Test Client",
      redirectUris: ["https://example.com/callback"],
    });

    await buildOAuthAuthentication({
      oauthClientId: oauthClient.id,
      user,
      scope: ["read"],
    });
    await buildOAuthAuthentication({
      oauthClientId: oauthClient.id,
      user,
      scope: ["write"],
    });

    const res = await server.post("/api/oauthAuthentications.delete", {
      body: {
        token: user.getJwtToken(),
        oauthClientId: oauthClient.id,
        scope: ["read"],
      },
    });

    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.success).toBe(true);

    const auths = await OAuthAuthentication.findAll({
      where: {
        userId: user.id,
        oauthClientId: oauthClient.id,
      },
    });
    expect(auths.length).toEqual(1);
    expect(auths[0].scope[0]).toEqual("write");
  });

  it("should only delete authentications for requesting user", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const anotherUser = await buildUser({ teamId: team.id });
    const oauthClient = await OAuthClient.create({
      teamId: team.id,
      createdById: user.id,
      name: "Test Client",
      redirectUris: ["https://example.com/callback"],
    });

    const otherAuth = await buildOAuthAuthentication({
      oauthClientId: oauthClient.id,
      user: anotherUser,
      scope: ["read"],
    });

    await server.post("/api/oauthAuthentications.delete", {
      body: {
        token: user.getJwtToken(),
        oauthClientId: oauthClient.id,
        scope: "read",
      },
    });

    // Verify other user's auth still exists
    const auth = await OAuthAuthentication.findByPk(otherAuth.id);
    expect(auth).not.toBeNull();
  });
});
