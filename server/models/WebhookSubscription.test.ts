import { buildTeam, buildWebhookSubscription } from "@server/test/factories";
import WebhookSubscription from "./WebhookSubscription";

describe("WebhookSubscription", () => {
  describe("matchEvent", () => {
    it("matches everything for a wildcard subscription", () => {
      expect(WebhookSubscription.matchEvent(["*"], "users.signin")).toBe(true);
    });

    it("matches an exact event name", () => {
      expect(
        WebhookSubscription.matchEvent(["users.signin"], "users.signin")
      ).toBe(true);
    });

    it("matches a namespace prefix", () => {
      expect(WebhookSubscription.matchEvent(["users"], "users.signin")).toBe(
        true
      );
    });

    it("does not match unrelated events", () => {
      expect(
        WebhookSubscription.matchEvent(["documents"], "users.signin")
      ).toBe(false);
    });
  });

  describe("findEnabledByTeamId", () => {
    it("returns only enabled subscriptions for the team", async () => {
      const subscription = await buildWebhookSubscription({
        events: ["users"],
      });
      const disabled = await buildWebhookSubscription({
        teamId: subscription.teamId,
        events: ["documents"],
      });
      await disabled.disable();

      const result = await WebhookSubscription.findEnabledByTeamId(
        subscription.teamId
      );

      expect(result).toHaveLength(1);
      expect(result[0].id).toEqual(subscription.id);
      expect(result[0].events).toEqual(["users"]);
    });

    it("returns an empty array when the team has no subscriptions", async () => {
      const team = await buildTeam();

      const result = await WebhookSubscription.findEnabledByTeamId(team.id);

      expect(result).toEqual([]);
    });

    it("reflects changes after a subscription is disabled", async () => {
      const subscription = await buildWebhookSubscription({
        events: ["users"],
      });

      // prime the cache
      const before = await WebhookSubscription.findEnabledByTeamId(
        subscription.teamId
      );
      expect(before).toHaveLength(1);

      await subscription.disable();

      const after = await WebhookSubscription.findEnabledByTeamId(
        subscription.teamId
      );
      expect(after).toHaveLength(0);
    });

    it("reflects changes after a subscription is destroyed", async () => {
      const subscription = await buildWebhookSubscription({
        events: ["users"],
      });

      const before = await WebhookSubscription.findEnabledByTeamId(
        subscription.teamId
      );
      expect(before).toHaveLength(1);

      await subscription.destroy();

      const after = await WebhookSubscription.findEnabledByTeamId(
        subscription.teamId
      );
      expect(after).toHaveLength(0);
    });
  });
});
