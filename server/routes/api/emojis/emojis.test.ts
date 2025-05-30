import { v4 } from "uuid";
import { Emoji } from "@server/models";
import {
  buildAdmin,
  buildEmoji,
  buildTeam,
  buildUser,
} from "@server/test/factories";
import { getTestServer } from "@server/test/support";

const server = getTestServer();

describe("#emojis.info", () => {
  it("should return emoji info by name", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const emoji = await buildEmoji({
      teamId: team.id,
      createdById: user.id,
      name: "testemoji",
    });

    const res = await server.post("/api/emojis.info", {
      body: {
        token: user.getJwtToken(),
        name: emoji.name,
      },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.id).toEqual(emoji.id);
    expect(body.data.name).toEqual(emoji.name);
    expect(body.data.url).toEqual(emoji.url);
  });

  it("should require authentication", async () => {
    const res = await server.post("/api/emojis.info");
    const body = await res.json();
    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });

  it("should return emoji info", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const emoji = await buildEmoji({
      teamId: team.id,
      createdById: user.id,
    });

    const res = await server.post("/api/emojis.info", {
      body: {
        token: user.getJwtToken(),
        id: emoji.id,
      },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.id).toEqual(emoji.id);
    expect(body.data.name).toEqual(emoji.name);
    expect(body.data.url).toEqual(emoji.url);
  });

  it("should not return emoji from another team", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const otherTeam = await buildTeam();
    const otherUser = await buildUser({ teamId: otherTeam.id });
    const emoji = await buildEmoji({
      teamId: otherTeam.id,
      createdById: otherUser.id,
    });

    const res = await server.post("/api/emojis.info", {
      body: {
        token: user.getJwtToken(),
        id: emoji.id,
      },
    });

    expect(res.status).toEqual(403);
  });
});

describe("#emojis.list", () => {
  it("should require authentication", async () => {
    const res = await server.post("/api/emojis.list");
    const body = await res.json();
    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });

  it("should return team emojis", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    await buildEmoji({
      teamId: team.id,
      createdById: user.id,
      name: "awesome",
    });
    await buildEmoji({
      teamId: team.id,
      createdById: user.id,
      name: "cool",
    });

    // Create emoji in another team that should not be returned
    const otherTeam = await buildTeam();
    const otherUser = await buildUser({ teamId: otherTeam.id });
    await buildEmoji({
      teamId: otherTeam.id,
      createdById: otherUser.id,
      name: "hidden",
    });

    const res = await server.post("/api/emojis.list", {
      body: {
        token: user.getJwtToken(),
      },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data).toHaveLength(2);
    expect(body.data.map((e: Emoji) => e.name).sort()).toEqual([
      "awesome",
      "cool",
    ]);
    expect(body.data[0].createdBy).toBeDefined();
    expect(body.policies).toBeDefined();
  });

  it("should support pagination", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });

    // Create multiple emojis
    for (let i = 0; i < 15; i++) {
      await buildEmoji({
        teamId: team.id,
        createdById: user.id,
        name: `emoji${i}`,
      });
    }

    const res = await server.post("/api/emojis.list", {
      body: {
        token: user.getJwtToken(),
        limit: 10,
      },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data).toHaveLength(10);
    expect(body.pagination.total).toEqual(15);
  });
});

describe("#emojis.create", () => {
  it("should require authentication", async () => {
    const res = await server.post("/api/emojis.create");
    const body = await res.json();
    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });

  it("should create emoji", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });

    const res = await server.post("/api/emojis.create", {
      body: {
        token: user.getJwtToken(),
        name: "awesome",
        url: "https://example.com/awesome.png",
      },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.name).toEqual("awesome");
    expect(body.data.url).toEqual("https://example.com/awesome.png");
    expect(body.data.createdBy.id).toEqual(user.id);
    expect(body.policies).toBeDefined();

    // Verify emoji was created in database
    const emoji = await Emoji.findByPk(body.data.id);
    expect(emoji).toBeTruthy();
    expect(emoji!.teamId).toEqual(team.id);
    expect(emoji!.createdById).toEqual(user.id);
  });

  it("should not allow duplicate emoji names in same team", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    await buildEmoji({
      teamId: team.id,
      createdById: user.id,
      name: "awesome",
    });

    const res = await server.post("/api/emojis.create", {
      body: {
        token: user.getJwtToken(),
        name: "awesome",
        url: "https://example.com/awesome2.png",
      },
    });

    expect(res.status).toEqual(400);
    const body = await res.json();
    expect(body.message).toContain("already exists");
  });

  it("should allow same emoji name in different teams", async () => {
    const team1 = await buildTeam();
    const user1 = await buildUser({ teamId: team1.id });
    const team2 = await buildTeam();
    const user2 = await buildUser({ teamId: team2.id });

    await buildEmoji({
      teamId: team1.id,
      createdById: user1.id,
      name: "awesome",
    });

    const res = await server.post("/api/emojis.create", {
      body: {
        token: user2.getJwtToken(),
        name: "awesome",
        url: "https://example.com/awesome2.png",
      },
    });

    expect(res.status).toEqual(200);
    const body = await res.json();
    expect(body).toMatchObject({
      data: expect.objectContaining({
        name: "awesome",
      }),
    });
  });

  it("should validate emoji name length", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });

    const res = await server.post("/api/emojis.create", {
      body: {
        token: user.getJwtToken(),
        name: "a".repeat(51), // Exceeds max length of 50
        url: "https://example.com/awesome.png",
      },
    });

    expect(res.status).toEqual(400);
  });

  it("should validate emoji URL length", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });

    const res = await server.post("/api/emojis.create", {
      body: {
        token: user.getJwtToken(),
        name: "awesome",
        url: "https://example.com/" + "a".repeat(500), // Exceeds max length of 500
      },
    });

    expect(res.status).toEqual(400);
  });

  it("should validate URL format", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });

    const res = await server.post("/api/emojis.create", {
      body: {
        token: user.getJwtToken(),
        name: "awesome",
        url: "not-a-valid-url",
      },
    });

    expect(res.status).toEqual(400);
  });
});

describe("#emojis.delete", () => {
  it("should require authentication", async () => {
    const res = await server.post("/api/emojis.delete");
    const body = await res.json();
    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });

  it("should allow emoji creator to delete", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const emoji = await buildEmoji({
      teamId: team.id,
      createdById: user.id,
    });

    const res = await server.post("/api/emojis.delete", {
      body: {
        token: user.getJwtToken(),
        id: emoji.id,
      },
    });

    expect(res.status).toEqual(200);
    const deleteBody = await res.json();
    expect(deleteBody).toMatchObject({
      success: true,
    });

    // Verify emoji was deleted
    const deletedEmoji = await Emoji.findByPk(emoji.id);
    expect(deletedEmoji).toBeNull();
  });

  it("should allow team admin to delete any emoji", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({ teamId: team.id });
    const user = await buildUser({ teamId: team.id });
    const emoji = await buildEmoji({
      teamId: team.id,
      createdById: user.id,
    });

    const res = await server.post("/api/emojis.delete", {
      body: {
        token: admin.getJwtToken(),
        id: emoji.id,
      },
    });

    expect(res.status).toEqual(200);
    const adminDeleteBody = await res.json();
    expect(adminDeleteBody).toMatchObject({
      success: true,
    });

    // Verify emoji was deleted
    const deletedEmoji = await Emoji.findByPk(emoji.id);
    expect(deletedEmoji).toBeNull();
  });

  it("should not allow non-creator non-admin to delete", async () => {
    const team = await buildTeam();
    const creator = await buildUser({ teamId: team.id });
    const otherUser = await buildUser({ teamId: team.id });
    const emoji = await buildEmoji({
      teamId: team.id,
      createdById: creator.id,
    });

    const res = await server.post("/api/emojis.delete", {
      body: {
        token: otherUser.getJwtToken(),
        id: emoji.id,
      },
    });

    expect(res.status).toEqual(403);

    // Verify emoji was not deleted
    const stillExists = await Emoji.findByPk(emoji.id);
    expect(stillExists).toBeTruthy();
  });

  it("should not allow deleting emoji from another team", async () => {
    const team1 = await buildTeam();
    const user1 = await buildUser({ teamId: team1.id });
    const team2 = await buildTeam();
    const user2 = await buildUser({ teamId: team2.id });
    const emoji = await buildEmoji({
      teamId: team2.id,
      createdById: user2.id,
    });

    const res = await server.post("/api/emojis.delete", {
      body: {
        token: user1.getJwtToken(),
        id: emoji.id,
      },
    });

    expect(res.status).toEqual(403);

    // Verify emoji was not deleted
    const stillExists = await Emoji.findByPk(emoji.id);
    expect(stillExists).toBeTruthy();
  });

  it("should return 404 for non-existent emoji", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });

    const res = await server.post("/api/emojis.delete", {
      body: {
        token: user.getJwtToken(),
        id: v4(), // Non-existent UUID
      },
    });

    expect(res.status).toEqual(404);
  });
});
