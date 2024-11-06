import { buildUser, buildAdmin } from "@server/test/factories";
import { withAPIContext } from "@server/test/support";
import userDestroyer from "./userDestroyer";

describe("userDestroyer", () => {
  it("should prevent last user from deleting account", async () => {
    const user = await buildUser();
    let error;

    try {
      await withAPIContext(user, async (ctx) => {
        await userDestroyer(ctx, {
          user,
        });
      });
    } catch (err) {
      error = err;
    }

    expect(error && error.message).toContain("Cannot delete last user");
  });

  it("should prevent last admin from deleting account", async () => {
    const user = await buildAdmin();
    await buildUser({
      teamId: user.teamId,
    });
    let error;

    try {
      await withAPIContext(user, async (ctx) => {
        await userDestroyer(ctx, {
          user,
        });
      });
    } catch (err) {
      error = err;
    }

    expect(error && error.message).toContain("Cannot delete account");
  });

  it("should not prevent multiple admin from deleting account", async () => {
    const actor = await buildAdmin();
    const user = await buildAdmin({
      teamId: actor.teamId,
    });
    let error;

    try {
      await withAPIContext(actor, async (ctx) => {
        await userDestroyer(ctx, {
          user,
        });
      });
    } catch (err) {
      error = err;
    }

    expect(error).toBeFalsy();
    expect(user.deletedAt).toBeTruthy();
  });

  it("should not prevent last non-admin from deleting account", async () => {
    const user = await buildUser();
    await buildUser({
      teamId: user.teamId,
    });
    let error;

    try {
      await withAPIContext(user, async (ctx) => {
        await userDestroyer(ctx, {
          user,
        });
      });
    } catch (err) {
      error = err;
    }

    expect(error).toBeFalsy();
    expect(user.deletedAt).toBeTruthy();
  });
});
