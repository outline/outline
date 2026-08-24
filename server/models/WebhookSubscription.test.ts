import type { Transaction } from "sequelize";
import { sleep } from "@shared/utils/timers";
import { WebhookSubscriptionValidation } from "@shared/validations";
import { sequelize } from "@server/storage/database";
import {
  buildTeam,
  buildUser,
  buildWebhookSubscription,
} from "@server/test/factories";
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

  describe("checkLimit", () => {
    it("should not allow the limit to be exceeded by concurrent transactions", async () => {
      const team = await buildTeam();
      const user = await buildUser({ teamId: team.id });

      for (
        let i = 0;
        i < WebhookSubscriptionValidation.maxSubscriptions - 1;
        i++
      ) {
        await buildWebhookSubscription({
          teamId: team.id,
          createdById: user.id,
        });
      }

      const create = (name: string, transaction: Transaction) =>
        WebhookSubscription.create(
          {
            name,
            url: "https://www.example.com/webhook",
            events: ["*"],
            enabled: true,
            createdById: user.id,
            teamId: team.id,
          },
          { transaction }
        );

      let inserted: () => void = () => undefined;
      const first = new Promise<void>((resolve) => {
        inserted = resolve;
      });
      let commit: () => void = () => undefined;
      const held = new Promise<void>((resolve) => {
        commit = resolve;
      });

      // The first transaction takes the last remaining slot, then stays open.
      const one = sequelize.transaction(async (transaction) => {
        await create("one", transaction);
        inserted();
        await held;
      });
      await first;

      // The second cannot see the uncommitted row, so it must wait for the
      // first to complete before its own count can be trusted.
      const two = sequelize.transaction((transaction) =>
        create("two", transaction)
      );
      await sleep(250);
      commit();
      await one;

      await expect(two).rejects.toThrow(
        `You have reached the limit of ${WebhookSubscriptionValidation.maxSubscriptions} webhooks`
      );
      expect(
        await WebhookSubscription.count({ where: { teamId: team.id } })
      ).toEqual(WebhookSubscriptionValidation.maxSubscriptions);
    });
  });
});
