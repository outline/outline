import { GroupPermission } from "@shared/types";
import { Group, GroupUser } from "@server/models";
import {
  buildAdmin,
  buildGroup,
  buildTeam,
  buildUser,
} from "@server/test/factories";
import { serialize } from "./index";

const loadGroup = (id: string, userId: string) =>
  Group.findByPk(id, {
    include: [
      {
        model: GroupUser,
        as: "groupUsers",
        required: false,
        where: { userId },
      },
    ],
  });

describe("policies/group", () => {
  it("should allow a group admin to update", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({ teamId: team.id });
    const user = await buildUser({ teamId: team.id });
    const group = await buildGroup({ teamId: team.id });
    await GroupUser.create({
      groupId: group.id,
      userId: user.id,
      createdById: admin.id,
      permission: GroupPermission.Admin,
    });
    const reloaded = await loadGroup(group.id, user.id);
    expect(serialize(user, reloaded).update).toBeTruthy();
  });

  it("should not allow a group admin from another team to update", async () => {
    const user = await buildUser();
    const group = await buildGroup();
    await GroupUser.create({
      groupId: group.id,
      userId: user.id,
      createdById: user.id,
      permission: GroupPermission.Admin,
    });
    const reloaded = await loadGroup(group.id, user.id);
    expect(serialize(user, reloaded).update).toEqual(false);
  });
});
