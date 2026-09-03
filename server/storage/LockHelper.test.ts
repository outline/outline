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

  describe("tryAcquire", () => {
    it("should return false rather than block when the lock is held", async () => {
      let release: () => void = () => undefined;
      const held = new Promise<void>((resolve) => {
        release = resolve;
      });
      let acquired = false;

      const first = sequelize.transaction(async (transaction) => {
        await LockHelper.acquire(sequelize, "try:one", transaction);
        acquired = true;
        await held;
      });

      while (!acquired) {
        await sleep(10);
      }

      await expect(
        sequelize.transaction((transaction) =>
          LockHelper.tryAcquire(sequelize, "try:one", transaction)
        )
      ).resolves.toBe(false);

      release();
      await first;
    });

    it("should return true when the lock is free", async () => {
      await expect(
        sequelize.transaction((transaction) =>
          LockHelper.tryAcquire(sequelize, "try:two", transaction)
        )
      ).resolves.toBe(true);
    });

    it("should release the lock when the transaction ends", async () => {
      await sequelize.transaction((transaction) =>
        LockHelper.tryAcquire(sequelize, "try:three", transaction)
      );

      await expect(
        sequelize.transaction((transaction) =>
          LockHelper.tryAcquire(sequelize, "try:three", transaction)
        )
      ).resolves.toBe(true);
    });

    it("should allow the caller to proceed without a transaction", async () => {
      await expect(LockHelper.tryAcquire(sequelize, "try:four")).resolves.toBe(
        true
      );
    });
  });
});
