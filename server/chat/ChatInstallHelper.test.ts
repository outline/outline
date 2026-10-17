import { AuthenticationType, IntegrationType } from "@shared/types";
import { createContext } from "@server/context";
import { Event, Integration } from "@server/models";
import { TestChatProvider } from "@server/test/ChatHelper";
import { buildAdmin, buildCollection, buildUser } from "@server/test/factories";
import { ChatInstallHelper } from "./ChatInstallHelper";

describe("ChatInstallHelper", () => {
  it("should create a post integration and record the event with the actor", async () => {
    const user = await buildAdmin();
    const collection = await buildCollection({
      teamId: user.teamId,
      userId: user.id,
    });
    const ctx = createContext({ user, ip: "10.0.0.1" });

    await ChatInstallHelper.install(
      ctx,
      new TestChatProvider(),
      {
        type: IntegrationType.Post,
        teamId: user.teamId,
        nonce: "nonce",
        collectionId: collection.id,
      },
      "code"
    );

    const integration = await Integration.scope("withAuthentication").findOne({
      where: { collectionId: collection.id, type: IntegrationType.Post },
      rejectOnEmpty: true,
    });
    expect(integration.settings).toEqual({
      url: "https://a.com/hook",
      channel: "general",
      channelId: "C1",
    });
    expect(integration.authentication.token).toEqual("token");

    const event = await Event.findOne({
      where: { name: "integrations.create", modelId: integration.id },
      rejectOnEmpty: true,
    });
    expect(event.actorId).toEqual(user.id);
    expect(event.ip).toEqual("10.0.0.1");
    expect(event.authType).toEqual(AuthenticationType.APP);
  });

  it("should not create a command integration for a member", async () => {
    const user = await buildUser();
    const ctx = createContext({ user });

    await expect(
      ChatInstallHelper.install(
        ctx,
        new TestChatProvider(),
        { type: IntegrationType.Command, teamId: user.teamId, nonce: "nonce" },
        "code"
      )
    ).rejects.toThrow();
    expect(
      await Integration.count({
        where: { teamId: user.teamId, type: IntegrationType.Command },
      })
    ).toEqual(0);
  });
});
