import {
  buildNotification,
  buildTeam,
  buildUser,
} from "@server/test/factories";
import { serialize } from "./index";

describe("policies/notification", () => {
  it("should allow the recipient to read and update", async () => {
    const user = await buildUser();
    const notification = await buildNotification({
      teamId: user.teamId,
      userId: user.id,
    });
    const abilities = serialize(user, notification);
    expect(abilities.read).toBeTruthy();
    expect(abilities.update).toBeTruthy();
  });

  it("should not allow a recipient from another team to read or update", async () => {
    const user = await buildUser();
    const team = await buildTeam();
    const notification = await buildNotification({
      teamId: team.id,
      userId: user.id,
    });
    const abilities = serialize(user, notification);
    expect(abilities.read).toEqual(false);
    expect(abilities.update).toEqual(false);
  });
});
