/* eslint-disable flowtype/require-valid-file-annotation */
import TestServer from "fetch-test-server";
import app from "../app";
import { IntegrationAuthentication, SearchQuery } from "../models";
import * as Slack from "../slack";
import { buildDocument, buildIntegration } from "../test/factories";
import { flushdb, seed } from "../test/support";

const server = new TestServer(app.callback());

beforeEach(() => flushdb());
afterAll(() => server.close());

jest.mock("../slack", () => ({
  post: jest.fn(),
}));

describe("#hooks.unfurl", () => {
  it("should return documents", async () => {
    const { user, document } = await seed();
    await IntegrationAuthentication.create({
      service: "slack",
      userId: user.id,
      teamId: user.teamId,
      token: "",
    });

    const res = await server.post("/api/hooks.unfurl", {
      body: {
        token: process.env.SLACK_VERIFICATION_TOKEN,
        team_id: "TXXXXXXXX",
        api_app_id: "AXXXXXXXXX",
        event: {
          type: "link_shared",
          channel: "Cxxxxxx",
          user: user.authentications[0].providerId,
          message_ts: "123456789.9875",
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
    const { user, team } = await seed();

    const res = await server.post("/api/hooks.slack", {
      body: {
        token: process.env.SLACK_VERIFICATION_TOKEN,
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
    const { user, team } = await seed();
    const document = await buildDocument({
      title: "This title contains a search term",
      userId: user.id,
      teamId: user.teamId,
    });
    const res = await server.post("/api/hooks.slack", {
      body: {
        token: process.env.SLACK_VERIFICATION_TOKEN,
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
    const { user, team } = await seed();
    await buildDocument({
      title: "This title contains a search term",
      userId: user.id,
      teamId: user.teamId,
    });
    const res = await server.post("/api/hooks.slack", {
      body: {
        token: process.env.SLACK_VERIFICATION_TOKEN,
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
    const { user, team } = await seed();
    const document = await buildDocument({
      text: "This title contains a search term",
      userId: user.id,
      teamId: user.teamId,
    });
    const res = await server.post("/api/hooks.slack", {
      body: {
        token: process.env.SLACK_VERIFICATION_TOKEN,
        user_id: user.authentications[0].providerId,
        team_id: team.authenticationProviders[0].providerId,
        text: "contains",
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.attachments.length).toEqual(1);
    expect(body.attachments[0].title).toEqual(document.title);
    expect(body.attachments[0].text).toEqual(
      "This title *contains* a search term"
    );
  });

  it("should save search term, hits and source", async (done) => {
    const { user, team } = await seed();
    await server.post("/api/hooks.slack", {
      body: {
        token: process.env.SLACK_VERIFICATION_TOKEN,
        user_id: user.authentications[0].providerId,
        team_id: team.authenticationProviders[0].providerId,
        text: "contains",
      },
    });

    // setTimeout is needed here because SearchQuery is saved asynchronously
    // in order to not slow down the response time.
    setTimeout(async () => {
      const searchQuery = await SearchQuery.findAll({
        where: { query: "contains" },
      });
      expect(searchQuery.length).toBe(1);
      expect(searchQuery[0].results).toBe(0);
      expect(searchQuery[0].source).toBe("slack");
      done();
    }, 100);
  });

  it("should respond with help content for help keyword", async () => {
    const { user, team } = await seed();
    const res = await server.post("/api/hooks.slack", {
      body: {
        token: process.env.SLACK_VERIFICATION_TOKEN,
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
    const { user, team } = await seed();
    const res = await server.post("/api/hooks.slack", {
      body: {
        token: process.env.SLACK_VERIFICATION_TOKEN,
        user_id: user.authentications[0].providerId,
        team_id: team.authenticationProviders[0].providerId,
        text: "",
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.text.includes("How to use")).toEqual(true);
  });

  it("should return search results with snippet for unknown user", async () => {
    const { user, team } = await seed();

    // unpublished document will not be returned
    await buildDocument({
      text: "This title contains a search term",
      userId: user.id,
      teamId: user.teamId,
      publishedAt: null,
    });

    const document = await buildDocument({
      text: "This title contains a search term",
      userId: user.id,
      teamId: user.teamId,
    });
    const res = await server.post("/api/hooks.slack", {
      body: {
        token: process.env.SLACK_VERIFICATION_TOKEN,
        user_id: "unknown-slack-user-id",
        team_id: team.authenticationProviders[0].providerId,
        text: "contains",
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.text).toContain("you haven’t signed in to Outline yet");
    expect(body.attachments.length).toEqual(1);
    expect(body.attachments[0].title).toEqual(document.title);
    expect(body.attachments[0].text).toEqual(
      "This title *contains* a search term"
    );
  });

  it("should return search results with snippet for user through integration mapping", async () => {
    const { user } = await seed();
    const serviceTeamId = "slack_team_id";

    await buildIntegration({
      teamId: user.teamId,
      settings: {
        serviceTeamId,
      },
    });

    const document = await buildDocument({
      text: "This title contains a search term",
      userId: user.id,
      teamId: user.teamId,
    });
    const res = await server.post("/api/hooks.slack", {
      body: {
        token: process.env.SLACK_VERIFICATION_TOKEN,
        user_id: "unknown-slack-user-id",
        team_id: serviceTeamId,
        text: "contains",
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.text).toContain("you haven’t signed in to Outline yet");
    expect(body.attachments.length).toEqual(1);
    expect(body.attachments[0].title).toEqual(document.title);
    expect(body.attachments[0].text).toEqual(
      "This title *contains* a search term"
    );
  });

  it("should error if incorrect verification token", async () => {
    const { user, team } = await seed();

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
    const { user, team } = await seed();
    const document = await buildDocument({
      title: "This title contains a search term",
      userId: user.id,
      teamId: user.teamId,
    });

    const payload = JSON.stringify({
      token: process.env.SLACK_VERIFICATION_TOKEN,
      user: { id: user.authentications[0].providerId },
      team: { id: team.authenticationProviders[0].providerId },
      callback_id: document.id,
    });
    const res = await server.post("/api/hooks.interactive", {
      body: { payload },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.response_type).toEqual("in_channel");
    expect(body.attachments.length).toEqual(1);
    expect(body.attachments[0].title).toEqual(document.title);
  });

  it("should respond with replacement message if unknown user", async () => {
    const { user, team } = await seed();
    const document = await buildDocument({
      title: "This title contains a search term",
      userId: user.id,
      teamId: user.teamId,
    });

    const payload = JSON.stringify({
      token: process.env.SLACK_VERIFICATION_TOKEN,
      user: { id: "unknown-slack-user-id" },
      team: { id: team.authenticationProviders[0].providerId },
      callback_id: document.id,
    });
    const res = await server.post("/api/hooks.interactive", {
      body: { payload },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.response_type).toEqual("in_channel");
    expect(body.attachments.length).toEqual(1);
    expect(body.attachments[0].title).toEqual(document.title);
  });

  it("should error if incorrect verification token", async () => {
    const { user } = await seed();
    const payload = JSON.stringify({
      token: "wrong-verification-token",
      user: { id: user.authentications[0].providerId, name: user.name },
      callback_id: "doesnt-matter",
    });
    const res = await server.post("/api/hooks.interactive", {
      body: { payload },
    });
    expect(res.status).toEqual(401);
  });
});
