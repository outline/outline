import { randomString } from "@shared/random";
import { IntegrationService, IntegrationType } from "@shared/types";
import type { Document, User } from "@server/models";
import { IntegrationAuthentication, SearchQuery } from "@server/models";
import {
  buildCollection,
  buildDocument,
  buildIntegration,
  buildTeam,
  buildUser,
} from "@server/test/factories";
import { getTestServer } from "@server/test/support";
import env from "../env";
import * as Slack from "../slack";

const server = getTestServer();

beforeEach(() => {
  vi.spyOn(Slack, "post").mockResolvedValue({ ok: true });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("#hooks.unfurl", () => {
  const buildSlackIntegration = async (
    user: User,
    type: IntegrationType,
    scopes: string[],
    createdAt?: Date
  ) => {
    const authentication = await IntegrationAuthentication.create({
      service: IntegrationService.Slack,
      userId: user.id,
      teamId: user.teamId,
      token: randomString(32),
      scopes,
    });
    const integration = await buildIntegration({
      teamId: user.teamId,
      userId: user.id,
      type,
      authenticationId: authentication.id,
      createdAt,
    });
    return { integration, authentication };
  };

  const buildCommandIntegration = (user: User, createdAt?: Date) =>
    buildSlackIntegration(
      user,
      IntegrationType.Command,
      ["commands", "links:read", "links:write"],
      createdAt
    );

  const buildPostIntegration = (user: User) =>
    buildSlackIntegration(user, IntegrationType.Post, ["incoming-webhook"]);

  const unfurl = (user: User, document: Document) =>
    server.post("/api/hooks.unfurl", {
      body: {
        token: env.SLACK_VERIFICATION_TOKEN,
        team_id: user.team.authenticationProviders[0].providerId,
        api_app_id: `A${randomString(8)}`,
        event: {
          type: "link_shared",
          channel: `C${randomString(8)}`,
          user: user.authentications[0].providerId,
          message_ts: randomString(12),
          links: [
            {
              domain: "getoutline.com",
              url: document.url,
            },
          ],
        },
      },
    });

  it("should return documents with matching SSO user", async () => {
    const user = await buildUser();
    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });
    const { authentication } = await buildCommandIntegration(user);

    const res = await unfurl(user, document);
    expect(res.status).toEqual(200);
    expect(Slack.post).toHaveBeenCalledWith(
      "chat.unfurl",
      expect.objectContaining({
        token: authentication.token,
        unfurls: {
          [document.url]: expect.objectContaining({ title: document.title }),
        },
      })
    );
  });

  it("should use the command token when a post integration exists", async () => {
    const user = await buildUser();
    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });
    await buildPostIntegration(user);
    const { authentication } = await buildCommandIntegration(user);
    await buildPostIntegration(user);

    const res = await unfurl(user, document);
    expect(res.status).toEqual(200);
    expect(Slack.post).toHaveBeenCalledTimes(1);
    expect(Slack.post).toHaveBeenCalledWith(
      "chat.unfurl",
      expect.objectContaining({ token: authentication.token })
    );
  });

  it("should use the newest command integration", async () => {
    const user = await buildUser();
    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });
    const { authentication } = await buildCommandIntegration(
      user,
      new Date("2026-02-01T00:00:00Z")
    );
    await buildCommandIntegration(user, new Date("2026-01-01T00:00:00Z"));

    const res = await unfurl(user, document);
    expect(res.status).toEqual(200);
    expect(Slack.post).toHaveBeenCalledWith(
      "chat.unfurl",
      expect.objectContaining({ token: authentication.token })
    );
  });

  it("should not unfurl with only a post integration", async () => {
    const user = await buildUser();
    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });
    await buildPostIntegration(user);

    await unfurl(user, document);
    expect(Slack.post).not.toHaveBeenCalled();
  });

  it("should not unfurl when the command integration is deleted", async () => {
    const user = await buildUser();
    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });
    const { integration } = await buildCommandIntegration(user);
    await integration.destroy();

    await unfurl(user, document);
    expect(Slack.post).not.toHaveBeenCalled();
  });
});

describe("#hooks.slack", () => {
  it("should return no matches", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const res = await server.post("/api/hooks.slack", {
      body: {
        token: env.SLACK_VERIFICATION_TOKEN,
        user_id: user.authentications[0].providerId,
        team_id: team.authenticationProviders[0].providerId,
        text: "dsfkndfskndsfkn",
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.attachments).toEqual(undefined);
  });

  it("should return search results with summary if query is in title", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const document = await buildDocument({
      title: "This title contains a search term",
      userId: user.id,
      teamId: user.teamId,
    });
    const res = await server.post("/api/hooks.slack", {
      body: {
        token: env.SLACK_VERIFICATION_TOKEN,
        user_id: user.authentications[0].providerId,
        team_id: team.authenticationProviders[0].providerId,
        text: "contains",
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.attachments.length).toEqual(1);
    expect(body.attachments[0].title).toEqual(document.title);
    expect(body.attachments[0].text).toEqual(document.getSummary());
  });

  it("should return search results if query is regex-like", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    await buildDocument({
      title: "This title contains a search term",
      userId: user.id,
      teamId: user.teamId,
    });
    const res = await server.post("/api/hooks.slack", {
      body: {
        token: env.SLACK_VERIFICATION_TOKEN,
        user_id: user.authentications[0].providerId,
        team_id: team.authenticationProviders[0].providerId,
        text: "*contains",
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.attachments.length).toEqual(1);
  });

  it("should return search results with snippet if query is in text", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const document = await buildDocument({
      text: "This title contains a search term",
      userId: user.id,
      teamId: user.teamId,
    });
    const res = await server.post("/api/hooks.slack", {
      body: {
        token: env.SLACK_VERIFICATION_TOKEN,
        user_id: user.authentications[0].providerId,
        team_id: team.authenticationProviders[0].providerId,
        text: "contains",
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.attachments.length).toEqual(1);
    expect(body.attachments[0].title).toEqual(document.title);
    expect(body.attachments[0].text).toContain(
      "This title *contains* a search"
    );
  });

  it("should save search term, hits and source", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    await server.post("/api/hooks.slack", {
      body: {
        token: env.SLACK_VERIFICATION_TOKEN,
        user_id: user.authentications[0].providerId,
        team_id: team.authenticationProviders[0].providerId,
        text: "contains",
      },
    });

    const searchQuery = await SearchQuery.findAll({
      where: {
        teamId: team.id,
        query: "contains",
      },
    });
    expect(searchQuery.length).toBe(1);
    expect(searchQuery[0].results).toBe(0);
    expect(searchQuery[0].source).toBe("slack");
  });

  it("should respond with help content for help keyword", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const res = await server.post("/api/hooks.slack", {
      body: {
        token: env.SLACK_VERIFICATION_TOKEN,
        user_id: user.authentications[0].providerId,
        team_id: team.authenticationProviders[0].providerId,
        text: "help",
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.text.includes("How to use")).toEqual(true);
  });

  it("should respond with help content for no keyword", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const res = await server.post("/api/hooks.slack", {
      body: {
        token: env.SLACK_VERIFICATION_TOKEN,
        user_id: user.authentications[0].providerId,
        team_id: team.authenticationProviders[0].providerId,
        text: "",
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.text.includes("How to use")).toEqual(true);
  });

  it("should return message for unknown user", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    // unpublished document will not be returned
    await buildDocument({
      text: "This title contains a search term",
      userId: user.id,
      teamId: user.teamId,
      publishedAt: null,
    });
    const res = await server.post("/api/hooks.slack", {
      body: {
        token: env.SLACK_VERIFICATION_TOKEN,
        user_id: "unknown-slack-user-id",
        team_id: team.authenticationProviders[0].providerId,
        text: "contains",
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);

    expect(body.response_type).toEqual("ephemeral");
    expect(body.blocks.length).toEqual(1);
    expect(body.blocks[0].text.text).toContain(
      "It looks like you haven’t linked your Outline account to Slack yet"
    );
  });

  it("should error if incorrect verification token", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const res = await server.post("/api/hooks.slack", {
      body: {
        token: "wrong-verification-token",
        user_id: user.authentications[0].providerId,
        team_id: team.authenticationProviders[0].providerId,
        text: "Welcome",
      },
    });
    expect(res.status).toEqual(401);
  });
});

describe("#hooks.interactive", () => {
  it("should respond with replacement message", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const document = await buildDocument({
      title: "This title contains a search term",
      userId: user.id,
      teamId: user.teamId,
    });
    const payload = JSON.stringify({
      type: "message_action",
      token: env.SLACK_VERIFICATION_TOKEN,
      user: {
        id: user.authentications[0].providerId,
      },
      team: {
        id: team.authenticationProviders[0].providerId,
      },
      callback_id: document.id,
    });
    const res = await server.post("/api/hooks.interactive", {
      body: {
        payload,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.response_type).toEqual("in_channel");
    expect(body.attachments.length).toEqual(1);
    expect(body.attachments[0].title).toEqual(document.title);
  });

  it("should respond with replacement message if unknown user", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const document = await buildDocument({
      title: "This title contains a search term",
      userId: user.id,
      teamId: user.teamId,
    });
    const payload = JSON.stringify({
      type: "message_action",
      token: env.SLACK_VERIFICATION_TOKEN,
      user: {
        id: "unknown-slack-user-id",
      },
      team: {
        id: team.authenticationProviders[0].providerId,
      },
      callback_id: document.id,
    });
    const res = await server.post("/api/hooks.interactive", {
      body: {
        payload,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.response_type).toEqual("ephemeral");
    expect(body.blocks.length).toBeGreaterThan(0);
    expect(body.attachments).toBeUndefined();
    expect(JSON.stringify(body)).not.toContain(document.title);
  });

  it("should not post a document from another team", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const document = await buildDocument({
      title: "Secret document from another team",
    });
    const payload = JSON.stringify({
      type: "message_action",
      token: env.SLACK_VERIFICATION_TOKEN,
      user: {
        id: user.authentications[0].providerId,
      },
      team: {
        id: team.authenticationProviders[0].providerId,
      },
      callback_id: document.id,
    });
    const res = await server.post("/api/hooks.interactive", {
      body: {
        payload,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.response_type).toEqual("ephemeral");
    expect(body.replace_original).toEqual(false);
    expect(body.attachments).toBeUndefined();
    expect(JSON.stringify(body)).not.toContain(document.title);
  });

  it("should not post a document in a collection the user cannot access", async () => {
    const team = await buildTeam();
    const owner = await buildUser({ teamId: team.id });
    const user = await buildUser({ teamId: team.id });
    const collection = await buildCollection({
      teamId: team.id,
      userId: owner.id,
      permission: null,
    });
    const document = await buildDocument({
      title: "Secret document in a private collection",
      userId: owner.id,
      teamId: team.id,
      collectionId: collection.id,
    });
    const payload = JSON.stringify({
      type: "message_action",
      token: env.SLACK_VERIFICATION_TOKEN,
      user: {
        id: user.authentications[0].providerId,
      },
      team: {
        id: team.authenticationProviders[0].providerId,
      },
      callback_id: document.id,
    });
    const res = await server.post("/api/hooks.interactive", {
      body: {
        payload,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.response_type).toEqual("ephemeral");
    expect(body.replace_original).toEqual(false);
    expect(body.attachments).toBeUndefined();
    expect(JSON.stringify(body)).not.toContain(document.title);
  });

  it("should error if payload has no user or team", async () => {
    const document = await buildDocument();
    const payload = JSON.stringify({
      type: "message_action",
      token: env.SLACK_VERIFICATION_TOKEN,
      callback_id: document.id,
    });
    const res = await server.post("/api/hooks.interactive", {
      body: {
        payload,
      },
    });
    expect(res.status).toEqual(400);
  });

  it("should error if incorrect verification token", async () => {
    const user = await buildUser();
    const payload = JSON.stringify({
      type: "message_action",
      token: "wrong-verification-token",
      user: {
        id: user.authentications[0].providerId,
        name: user.name,
      },
      callback_id: "doesnt-matter",
    });
    const res = await server.post("/api/hooks.interactive", {
      body: {
        payload,
      },
    });
    expect(res.status).toEqual(401);
  });
});
