import randomstring from "randomstring";
import { IntegrationService } from "@shared/types";
import { IntegrationAuthentication, SearchQuery } from "@server/models";
import { buildDocument, buildTeam, buildUser } from "@server/test/factories";
import { getTestServer } from "@server/test/support";
import env from "../env";
import * as Slack from "../slack";

jest.mock("../slack", () => ({
  post: jest.fn(),
}));

const server = getTestServer();

describe("#hooks.unfurl", () => {
  it("should return documents with matching SSO user", async () => {
    const user = await buildUser();
    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });

    await IntegrationAuthentication.create({
      service: IntegrationService.Slack,
      userId: user.id,
      teamId: user.teamId,
      token: randomstring.generate(32),
    });

    const res = await server.post("/api/hooks.unfurl", {
      body: {
        token: env.SLACK_VERIFICATION_TOKEN,
        team_id: `T${randomstring.generate(8)}`,
        api_app_id: `A${randomstring.generate(8)}`,
        event: {
          type: "link_shared",
          channel: `C${randomstring.generate(8)}`,
          user: user.authentications[0].providerId,
          message_ts: randomstring.generate(12),
          links: [
            {
              domain: "getoutline.com",
              url: document.url,
            },
          ],
        },
      },
    });
    expect(res.status).toEqual(200);
    expect(Slack.post).toHaveBeenCalled();
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
    expect(body.response_type).toEqual("in_channel");
    expect(body.attachments.length).toEqual(1);
    expect(body.attachments[0].title).toEqual(document.title);
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
