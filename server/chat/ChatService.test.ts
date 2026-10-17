import {
  AuthenticationType,
  IntegrationService,
  IntegrationType,
} from "@shared/types";
import { randomString } from "@shared/random";
import { createContext } from "@server/context";
import {
  Integration,
  IntegrationAuthentication,
  SearchQuery,
} from "@server/models";
import type { Team, User } from "@server/models";
import type { APIContext } from "@server/types";
import { SearchQuerySource } from "@server/models/SearchQuery";
import { TestChatProvider, type TestChatTarget } from "@server/test/ChatHelper";
import {
  buildCollection,
  buildDocument,
  buildTeam,
  buildUser,
} from "@server/test/factories";
import { getTestServer } from "@server/test/support";
import { Hook, PluginManager } from "@server/utils/PluginManager";
import type { ChatAnswerProvider } from "./ChatAnswerProvider";
import { ChatService } from "./ChatService";
import type { ChatEvent } from "./types";

// Starts the app, which loads translations.
getTestServer();

const mockAnswerProvider = (answerProvider: ChatAnswerProvider) => {
  const getHooks = PluginManager.getHooks.bind(PluginManager);
  vi.spyOn(PluginManager, "getHooks").mockImplementation(((type: Hook) =>
    type === Hook.ChatAnswerProvider
      ? [{ type, value: answerProvider }]
      : getHooks(type)) as typeof PluginManager.getHooks);
};

const ctx = createContext({ ip: "127.0.0.1" });

const actorOf = (team: Team, user: User) => {
  const serviceTeamId = team.authenticationProviders[0].providerId;
  return {
    installation: { serviceTeamId },
    actor: { serviceTeamId, serviceUserId: user.authentications[0].providerId },
    replyTarget: { id: randomString(8) },
  };
};

const commandEvent = async (text: string) => {
  const team = await buildTeam();
  const user = await buildUser({ teamId: team.id });
  const event: ChatEvent<TestChatTarget> = {
    type: "command",
    ...actorOf(team, user),
    text,
  };
  return { team, user, event };
};

/** Installs the app in a team, and returns the install token. */
const install = async (team: Team, user: User, serviceTeamId: string) => {
  const authentication = await IntegrationAuthentication.create({
    service: IntegrationService.Slack,
    userId: user.id,
    teamId: team.id,
    token: randomString(32),
  });
  await Integration.create<Integration<IntegrationType.Command>>({
    service: IntegrationService.Slack,
    type: IntegrationType.Command,
    userId: user.id,
    teamId: team.id,
    authenticationId: authentication.id,
    settings: { serviceTeamId },
  });
  return authentication.token;
};

/**
 * Creates two Outline teams that sign in with the same Slack workspace, and a
 * person with an account in each, linked to the same Slack user.
 */
const twoTeamsOneWorkspace = async () => {
  const serviceTeamId = randomString(16);
  const serviceUserId = randomString(16);
  const teams = [
    await buildTeam({
      authenticationProviders: [{ name: "slack", providerId: serviceTeamId }],
    }),
    await buildTeam({
      authenticationProviders: [{ name: "slack", providerId: serviceTeamId }],
    }),
  ];
  const users = [];
  for (const team of teams) {
    const user = await buildUser({ teamId: team.id });
    await Integration.create<Integration<IntegrationType.LinkedAccount>>({
      service: IntegrationService.Slack,
      type: IntegrationType.LinkedAccount,
      userId: user.id,
      teamId: team.id,
      settings: { slack: { serviceTeamId, serviceUserId } },
    });
    users.push(user);
  }
  const ref = {
    installation: { serviceTeamId },
    actor: { serviceTeamId, serviceUserId },
    replyTarget: { id: randomString(8) },
  };
  return { teams, users, ref, serviceTeamId };
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ChatService", () => {
  describe("command", () => {
    it("should reply later with an answer when the answer provider can answer", async () => {
      const provider = new TestChatProvider();
      const { user, event } = await commandEvent("what is this?");
      const document = await buildDocument({
        userId: user.id,
        teamId: user.teamId,
      });
      const answer = vi.fn(async (_ctx: APIContext, _question: string) => ({
        answer: "**It is**",
        documents: [document],
      }));
      mockAnswerProvider({ canAnswer: () => true, answer });

      const result = await ChatService.handle(ctx, provider, event);
      expect(result.type).toEqual("deferred");

      const [answerCtx, question] = answer.mock.calls[0];
      expect(question).toEqual("what is this?");
      expect(answerCtx.context.auth.user.id).toEqual(user.id);
      expect(answerCtx.context.auth.type).toEqual(AuthenticationType.CHAT);

      await vi.waitFor(() => expect(provider.replies).toHaveLength(1));
      const [reply] = provider.replies;
      expect(reply.text).toEqual("**It is**");
      expect(reply.cards[0].title).toEqual(document.displayTitle);

      const searchQuery = await SearchQuery.findOne({
        where: { userId: user.id },
        rejectOnEmpty: true,
      });
      expect(searchQuery.answer).toEqual("**It is**");
      expect(reply.actions).toEqual([
        expect.objectContaining({ id: "postAnswer", value: searchQuery.id }),
      ]);
    });

    it.each([
      ["there is no answer", async () => ({ answer: "", documents: [] })],
      [
        "the answer fails",
        async () => {
          throw new Error("Timed out");
        },
      ],
    ])(
      "should reply later with search results when %s",
      async (_name, answer) => {
        const provider = new TestChatProvider();
        const { event } = await commandEvent("what is this?");
        mockAnswerProvider({ canAnswer: () => true, answer });

        const result = await ChatService.handle(ctx, provider, event);
        expect(result.type).toEqual("deferred");

        await vi.waitFor(() => expect(provider.replies).toHaveLength(1));
        expect(provider.replies[0].text).toContain("No results for");
      }
    );
  });

  describe("action", () => {
    it("should not post the answer of another user", async () => {
      const provider = new TestChatProvider();
      const { team, user } = await commandEvent("");
      const other = await buildUser({ teamId: team.id });
      const searchQuery = await SearchQuery.create({
        userId: user.id,
        teamId: team.id,
        source: SearchQuerySource.Slack,
        query: "what is this?",
        answer: "It is",
        results: 1,
      });

      await expect(
        ChatService.handle(ctx, provider, {
          type: "action",
          action: "postAnswer",
          value: searchQuery.id,
          ...actorOf(team, other),
        })
      ).rejects.toThrow("Invalid search query");
    });

    it("should not post a document that the actor cannot read", async () => {
      const provider = new TestChatProvider();
      const { team, user } = await commandEvent("");
      const owner = await buildUser({ teamId: team.id });
      const collection = await buildCollection({
        teamId: team.id,
        userId: owner.id,
        permission: null,
      });
      const document = await buildDocument({
        teamId: team.id,
        userId: owner.id,
        collectionId: collection.id,
      });

      const result = await ChatService.handle(ctx, provider, {
        type: "action",
        action: "postDocument",
        value: document.id,
        ...actorOf(team, user),
      });

      expect(result).toMatchObject({
        type: "message",
        message: { visibility: "ephemeral", cards: [] },
      });
      if (result.type === "message") {
        expect(result.message.text).toContain("do not have access");
      }
    });
  });

  describe("several teams on one workspace", () => {
    it("should search every team that the actor is linked in", async () => {
      const provider = new TestChatProvider();
      const { teams, users, ref } = await twoTeamsOneWorkspace();
      for (const [index, team] of teams.entries()) {
        await buildDocument({
          title: `Roadmap ${index}`,
          teamId: team.id,
          userId: users[index].id,
        });
      }

      const result = await ChatService.handle(ctx, provider, {
        type: "command",
        ...ref,
        text: "roadmap",
      });

      expect(result.type).toEqual("message");
      if (result.type === "message") {
        const footers = result.message.cards.map((card) => card.footer);
        expect(result.message.cards).toHaveLength(2);
        expect(footers[0]).toContain(teams[0].name);
        expect(footers[1]).toContain(teams[1].name);
      }
      expect(
        await SearchQuery.count({
          where: { query: "roadmap", teamId: teams.map((team) => team.id) },
        })
      ).toBe(2);
    });

    it("should search, not answer, when the actor is linked in several teams", async () => {
      const provider = new TestChatProvider();
      const { ref } = await twoTeamsOneWorkspace();
      mockAnswerProvider({
        canAnswer: () => true,
        answer: async () => ({ answer: "unused", documents: [] }),
      });

      const result = await ChatService.handle(ctx, provider, {
        type: "command",
        ...ref,
        text: "what is this?",
      });

      expect(result.type).toEqual("message");
    });

    it("should preview links with the account and token of the document's team", async () => {
      const provider = new TestChatProvider();
      const { teams, users, ref, serviceTeamId } = await twoTeamsOneWorkspace();
      await install(teams[0], users[0], serviceTeamId);
      const token = await install(teams[1], users[1], serviceTeamId);
      const document = await buildDocument({
        teamId: teams[1].id,
        userId: users[1].id,
      });
      const otherTeamDocument = await buildDocument();

      const result = await ChatService.handle(ctx, provider, {
        type: "linksShared",
        ...ref,
        conversation: { channelId: "C1" },
        messageId: "1",
        urls: [document.url, otherTeamDocument.url],
      });

      expect(result.type).toEqual("linkPreviews");
      if (result.type === "linkPreviews") {
        expect(Array.from(result.cards.keys())).toEqual([document.url]);
        expect(result.authentication.token).toEqual(token);
      }
    });

    it("should list a link for each team when the actor is not linked", async () => {
      const provider = new TestChatProvider();
      const { teams, ref } = await twoTeamsOneWorkspace();

      const result = await ChatService.handle(ctx, provider, {
        type: "command",
        ...ref,
        actor: { ...ref.actor, serviceUserId: "unknown" },
        text: "roadmap",
      });

      expect(result.type).toEqual("message");
      if (result.type === "message") {
        expect(result.message.text).toContain(teams[0].url);
        expect(result.message.text).toContain(teams[1].url);
      }
    });
  });
});
