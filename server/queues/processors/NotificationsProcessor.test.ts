import { buildGroup, buildUser } from "@server/test/factories";
import GroupUserNotificationsTask from "../tasks/GroupUserNotificationsTask";
import NotificationsProcessor from "./NotificationsProcessor";

const ip = "127.0.0.1";

describe("NotificationsProcessor", () => {
  describe("group membership", () => {
    let schedule: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      schedule = vi.spyOn(GroupUserNotificationsTask.prototype, "schedule");
    });

    afterEach(() => {
      schedule.mockRestore();
    });

    it("should schedule a notification when another user changes membership", async () => {
      const actor = await buildUser();
      const user = await buildUser({ teamId: actor.teamId });
      const group = await buildGroup({ teamId: actor.teamId });

      await new NotificationsProcessor().perform({
        name: "groups.add_user",
        userId: user.id,
        modelId: group.id,
        teamId: actor.teamId,
        actorId: actor.id,
        ip,
      });

      expect(schedule).toHaveBeenCalledTimes(1);
    });

    it("should not schedule a notification when the user changes their own membership", async () => {
      const user = await buildUser();
      const group = await buildGroup({ teamId: user.teamId });

      await new NotificationsProcessor().perform({
        name: "groups.add_user",
        userId: user.id,
        modelId: group.id,
        teamId: user.teamId,
        actorId: user.id,
        ip,
      });

      expect(schedule).not.toHaveBeenCalled();
    });
  });
});
