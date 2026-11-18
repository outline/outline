import { sequelize } from "./database";
import { afterCommit } from "./transaction";

describe("afterCommit", () => {
  it("should run the callback at once without a transaction", async () => {
    const callback = vi.fn();

    await afterCommit(undefined, callback);

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("should run the callback after the transaction commits", async () => {
    const callback = vi.fn();

    await sequelize.transaction(async (transaction) => {
      await afterCommit(transaction, callback);
      expect(callback).not.toHaveBeenCalled();
    });

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("should wait for the root transaction when nested in savepoints", async () => {
    const callback = vi.fn();

    await sequelize.transaction(async (transaction) => {
      await sequelize.transaction({ transaction }, async (savepoint) => {
        await sequelize.transaction(
          { transaction: savepoint },
          async (nested) => {
            await afterCommit(nested, callback);
          }
        );
      });
      expect(callback).not.toHaveBeenCalled();
    });

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("should not run the callback when the transaction rolls back", async () => {
    const callback = vi.fn();

    await expect(
      sequelize.transaction(async (transaction) => {
        await afterCommit(transaction, callback);
        throw new Error("rollback");
      })
    ).rejects.toThrow("rollback");

    expect(callback).not.toHaveBeenCalled();
  });
});
