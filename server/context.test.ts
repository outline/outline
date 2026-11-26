import { sequelize } from "@server/storage/database";
import { buildUser } from "@server/test/factories";
import { AuthenticationType } from "@server/types";
import { createContext, withTransaction, withUser } from "./context";

describe("withUser", () => {
  it("should act as the given user and keep the other fields", async () => {
    const original = await buildUser();
    const user = await buildUser();
    const ctx = createContext({
      user: original,
      authType: AuthenticationType.API,
      ip: "127.0.0.1",
    });

    const derived = withUser(ctx, user);
    expect(derived.auth.user).toBe(user);
    expect(derived.auth.type).toEqual(AuthenticationType.API);
    expect(derived.ip).toEqual("127.0.0.1");
    expect(ctx.auth.user).toBe(original);
  });
});

describe("withTransaction", () => {
  it("should run in the given transaction and keep the other fields", async () => {
    const user = await buildUser();
    const ctx = createContext({ user, ip: "127.0.0.1" });

    await sequelize.transaction(async (transaction) => {
      const derived = withTransaction(ctx, transaction);
      expect(derived.transaction).toBe(transaction);
      expect(derived.auth).toBe(ctx.auth);
      expect(derived.ip).toEqual("127.0.0.1");
      expect(ctx.transaction).toBeUndefined();
    });
  });
});
