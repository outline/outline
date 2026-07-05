import { User } from "@server/models";
import type { APIContext } from "@server/types";
import { buildUser } from "@server/test/factories";
import { loaders } from "./loaders";

describe("loaders", () => {
  const contextOne = {} as APIContext;
  const contextTwo = {} as APIContext;

  it("should return the same instance for the same context", () => {
    expect(loaders(contextOne)).toBe(loaders(contextOne));
  });

  it("should return different instances for different contexts", () => {
    expect(loaders(contextOne)).not.toBe(loaders(contextTwo));
  });

  it("should return a shared instance when no context is available", () => {
    expect(loaders()).toBe(loaders());
    expect(loaders()).not.toBe(loaders(contextOne));
  });

  describe("users", () => {
    it("should batch concurrent loads into a single query", async () => {
      const [userOne, userTwo] = await Promise.all([buildUser(), buildUser()]);
      const findAll = vi.spyOn(User, "findAll");

      const ctx = {} as APIContext;
      const [loadedOne, loadedTwo] = await Promise.all([
        loaders(ctx).users.load(userOne.id),
        loaders(ctx).users.load(userTwo.id),
      ]);

      expect(findAll).toHaveBeenCalledTimes(1);
      expect(loadedOne?.id).toEqual(userOne.id);
      expect(loadedTwo?.id).toEqual(userTwo.id);
      findAll.mockRestore();
    });

    it("should memoize loads within the same context", async () => {
      const user = await buildUser();
      const findAll = vi.spyOn(User, "findAll");

      const ctx = {} as APIContext;
      await loaders(ctx).users.load(user.id);
      await loaders(ctx).users.load(user.id);

      expect(findAll).toHaveBeenCalledTimes(1);
      findAll.mockRestore();
    });

    it("should load deleted users", async () => {
      const teammate = await buildUser();
      const user = await buildUser({ teamId: teammate.teamId });
      await user.destroy();

      const ctx = {} as APIContext;
      const loaded = await loaders(ctx).users.load(user.id);
      expect(loaded?.id).toEqual(user.id);
      expect(loaded?.deletedAt).toBeTruthy();
    });

    it("should return null for unknown IDs", async () => {
      const ctx = {} as APIContext;
      const loaded = await loaders(ctx).users.load(
        "00000000-0000-0000-0000-000000000000"
      );
      expect(loaded).toBeNull();
    });
  });
});
