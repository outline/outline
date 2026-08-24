import type { Transaction } from "sequelize";
import { sleep } from "@shared/utils/timers";
import { PinValidation } from "@shared/validations";
import { sequelize } from "@server/storage/database";
import { buildDocument, buildPin, buildUser } from "@server/test/factories";
import Pin from "./Pin";

describe("Pin", () => {
  describe("checkLimit", () => {
    it("should not allow the limit to be exceeded by concurrent transactions", async () => {
      const user = await buildUser();
      for (let i = 0; i < PinValidation.max - 1; i++) {
        await buildPin({ teamId: user.teamId, createdById: user.id });
      }
      const [first, second] = await Promise.all([
        buildDocument({ userId: user.id, teamId: user.teamId }),
        buildDocument({ userId: user.id, teamId: user.teamId }),
      ]);

      const create = (documentId: string, transaction: Transaction) =>
        Pin.create(
          {
            documentId,
            createdById: user.id,
            teamId: user.teamId,
            index: "P",
          },
          { transaction }
        );

      let inserted: () => void = () => undefined;
      const created = new Promise<void>((resolve) => {
        inserted = resolve;
      });
      let commit: () => void = () => undefined;
      const held = new Promise<void>((resolve) => {
        commit = resolve;
      });

      // The first transaction takes the last remaining slot, then stays open.
      const one = sequelize.transaction(async (transaction) => {
        await create(first.id, transaction);
        inserted();
        await held;
      });
      await created;

      // The second cannot see the uncommitted pin, so it must wait for the
      // first to complete before its own count can be trusted.
      const two = sequelize.transaction((transaction) =>
        create(second.id, transaction)
      );
      await sleep(250);
      commit();
      await one;

      await expect(two).rejects.toThrow(
        `You cannot pin more than ${PinValidation.max} documents`
      );
      expect(await Pin.count({ where: { teamId: user.teamId } })).toEqual(
        PinValidation.max
      );
    });

    it("should count each destination separately", async () => {
      const user = await buildUser();
      const document = await buildDocument({
        userId: user.id,
        teamId: user.teamId,
      });
      for (let i = 0; i < PinValidation.max; i++) {
        await buildPin({ teamId: user.teamId, createdById: user.id });
      }

      const pin = await buildPin({
        teamId: user.teamId,
        createdById: user.id,
        documentId: document.id,
        collectionId: document.collectionId,
      });

      expect(pin.collectionId).toEqual(document.collectionId);
    });
  });
});
