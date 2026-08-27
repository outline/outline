import { sleep } from "@shared/utils/timers";
import { sequelize } from "./database";
import { LockHelper } from "./LockHelper";

describe("LockHelper", () => {
  describe("acquire", () => {
    it("should block another transaction holding the same lock", async () => {
      const events: string[] = [];
      let release: () => void = () => undefined;
      const held = new Promise<void>((resolve) => {
        release = resolve;
      });

      const first = sequelize.transaction(async (transaction) => {
        await LockHelper.acquire(sequelize, "limit:one", transaction);
        events.push("first");
        await held;
      });

      while (!events.length) {
        await sleep(10);
      }

      const second = sequelize.transaction(async (transaction) => {
        await LockHelper.acquire(sequelize, "limit:one", transaction);
        events.push("second");
      });

      await sleep(250);
      expect(events).toEqual(["first"]);

      release();
      await Promise.all([first, second]);
      expect(events).toEqual(["first", "second"]);
    });

    it("should not block a transaction holding a different lock", async () => {
      let release: () => void = () => undefined;
      const held = new Promise<void>((resolve) => {
        release = resolve;
      });

      const first = sequelize.transaction(async (transaction) => {
        await LockHelper.acquire(sequelize, "limit:two", transaction);
        await held;
      });

      await sequelize.transaction(async (transaction) => {
        await LockHelper.acquire(sequelize, "limit:three", transaction);
      });

      release();
      await first;
    });

    it("should not throw without a transaction", async () => {
      await expect(
        LockHelper.acquire(sequelize, "limit:four")
      ).resolves.toBeUndefined();
    });
  });
});
