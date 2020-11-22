/* eslint-disable flowtype/require-valid-file-annotation */
import { buildUser } from "../test/factories";
import { flushdb } from "../test/support";
import userSuspender from "./userSuspender";

beforeEach(() => flushdb());

describe("userSuspender", () => {
  const ip = "127.0.0.1";

  it("should not suspend self", async () => {
    const user = await buildUser();
    let error;

    try {
      await userSuspender({
        actorId: user.id,
        user,
        ip,
      });
    } catch (err) {
      error = err;
    }

    expect(error.message).toEqual("Unable to suspend the current user");
  });

  it("should suspend the user", async () => {
    const admin = await buildUser({ isAdmin: true });
    const user = await buildUser({ teamId: admin.teamId });
    await userSuspender({
      actorId: admin.id,
      user,
      ip,
    });
    expect(user.suspendedAt).toBeTruthy();
    expect(user.suspendedById).toEqual(admin.id);
  });
});
