import GroupUser from "@server/models/GroupUser";
import { buildGroup, buildAdmin, buildUser } from "@server/test/factories";
import userSuspender from "./userSuspender";
import { withAPIContext } from "@server/test/support";

describe("userSuspender", () => {
  it("should not suspend self", async () => {
    const user = await buildUser();
    let error;

    try {
      await withAPIContext(user, (ctx) =>
        userSuspender(ctx, {
          user,
        })
      );
    } catch (err) {
      error = err;
    }

    expect(error.message).toEqual("Unable to suspend the current user");
  });

  it("should suspend the user", async () => {
    const admin = await buildAdmin();
    const user = await buildUser({
      teamId: admin.teamId,
    });
    await withAPIContext(admin, (ctx) =>
      userSuspender(ctx, {
        user,
      })
    );
    expect(user.suspendedAt).toBeTruthy();
    expect(user.suspendedById).toEqual(admin.id);
  });

  it("should remove group memberships", async () => {
    const admin = await buildAdmin();
    const user = await buildUser({
      teamId: admin.teamId,
    });
    const group = await buildGroup({
      teamId: user.teamId,
    });
    await group.$add("user", user, {
      through: {
        createdById: user.id,
      },
    });
    await withAPIContext(admin, (ctx) =>
      userSuspender(ctx, {
        user,
      })
    );
    expect(user.suspendedAt).toBeTruthy();
    expect(user.suspendedById).toEqual(admin.id);
    expect(
      await GroupUser.count({
        where: {
          userId: user.id,
        },
      })
    ).toEqual(0);
  });
});
