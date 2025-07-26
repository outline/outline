import { buildAdmin, buildUser } from "@server/test/factories";
import userUnsuspender from "./userUnsuspender";
import { withAPIContext } from "@server/test/support";

describe("userUnsuspender", () => {
  it("should not allow unsuspending self", async () => {
    const user = await buildUser();
    let error;

    try {
      await withAPIContext(user, (ctx) =>
        userUnsuspender(ctx, {
          user,
        })
      );
    } catch (err) {
      error = err;
    }

    expect(error.message).toEqual("Unable to unsuspend the current user");
  });

  it("should unsuspend the user", async () => {
    const admin = await buildAdmin();
    const user = await buildUser({
      teamId: admin.teamId,
      suspendedAt: new Date(),
      suspendedById: admin.id,
    });
    await withAPIContext(admin, (ctx) =>
      userUnsuspender(ctx, {
        user,
      })
    );
    expect(user.suspendedAt).toEqual(null);
    expect(user.suspendedById).toEqual(null);
  });
});
