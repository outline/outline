import UserAuthentication from "@server/models/UserAuthentication";
import { buildUser } from "@server/test/factories";
import UserDeletedProcessor from "./UserDeletedProcessor";

const ip = "127.0.0.1";

describe("UserDeletedProcessor", () => {
  test("should remove relationships", async () => {
    const user = await buildUser();
    expect(
      await UserAuthentication.count({
        where: {
          userId: user.id,
        },
      })
    ).toBe(1);

    const processor = new UserDeletedProcessor();
    await processor.perform({
      name: "users.delete",
      userId: user.id,
      actorId: user.id,
      teamId: user.teamId,
      ip,
    });

    expect(
      await UserAuthentication.count({
        where: {
          userId: user.id,
        },
      })
    ).toBe(0);
  });
});
