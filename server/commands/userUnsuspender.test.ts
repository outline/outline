import { buildAdmin, buildUser } from "@server/test/factories";
import { getTestDatabase } from "@server/test/support";
import userUnsuspender from "./userUnsuspender";

const db = getTestDatabase();

afterAll(db.disconnect);

beforeEach(db.flush);

describe("userUnsuspender", () => {
  const ip = "127.0.0.1";

  it("should not allow unsuspending self", async () => {
    const user = await buildUser();
    let error;

    try {
      await userUnsuspender({
        actorId: user.id,
        user,
        ip,
      });
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
    await userUnsuspender({
      actorId: admin.id,
      user,
      ip,
    });
    expect(user.suspendedAt).toEqual(null);
    expect(user.suspendedById).toEqual(null);
  });
});
