import { vi } from "vitest";
import {
  AuthenticationProvider,
  Group,
  GroupUser,
  UserAuthentication,
} from "@server/models";
import { buildUser } from "@server/test/factories";
import { mockTaskSchedule } from "@server/test/support";
import { PluginManager } from "@server/utils/PluginManager";
import SyncUserGroupsTask from "./SyncUserGroupsTask";

async function setup() {
  const user = await buildUser();
  const authenticationProvider = (await AuthenticationProvider.findOne({
    where: { teamId: user.teamId },
  }))!;
  await authenticationProvider.update({
    settings: { groupSyncEnabled: true },
  });

  const authentication = (await UserAuthentication.findOne({
    where: { userId: user.id },
  }))!;
  await authentication.update({ accessToken: "access-token" });

  const fetchUserGroups = vi
    .fn()
    .mockResolvedValue([{ id: "ext-1", name: "Engineering" }]);
  vi.spyOn(PluginManager, "getGroupSyncProvider").mockReturnValue({
    useGroupClaim: false,
    fetchUserGroups,
  });

  return { user, authentication, fetchUserGroups };
}

describe("SyncUserGroupsTask", () => {
  const schedule = mockTaskSchedule();

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should schedule with a job id unique to the user authentication", async () => {
    const { authentication } = await setup();

    await new SyncUserGroupsTask().schedule({
      userAuthenticationId: authentication.id,
    });

    expect(schedule).toHaveBeenCalledWith(
      { userAuthenticationId: authentication.id },
      { jobId: `sync-user-groups:${authentication.id}` }
    );
  });

  it("should sync groups using the stored access token", async () => {
    const { user, authentication, fetchUserGroups } = await setup();

    await new SyncUserGroupsTask().perform({
      userAuthenticationId: authentication.id,
    });

    expect(fetchUserGroups).toHaveBeenCalledWith("access-token", {
      groupSyncEnabled: true,
    });

    const group = await Group.findOne({
      where: { teamId: user.teamId, name: "Engineering" },
    });
    expect(group).not.toBeNull();

    const membership = await GroupUser.findOne({
      where: { groupId: group!.id, userId: user.id },
    });
    expect(membership).not.toBeNull();
  });

  it("should not sync groups for suspended users", async () => {
    const { user, authentication, fetchUserGroups } = await setup();
    await user.update({ suspendedAt: new Date() });

    await new SyncUserGroupsTask().perform({
      userAuthenticationId: authentication.id,
    });

    expect(fetchUserGroups).not.toHaveBeenCalled();
  });

  it("should not sync groups when group sync is disabled", async () => {
    const { user, authentication, fetchUserGroups } = await setup();
    const authenticationProvider = (await AuthenticationProvider.findOne({
      where: { teamId: user.teamId },
    }))!;
    await authenticationProvider.update({
      settings: { groupSyncEnabled: false },
    });

    await new SyncUserGroupsTask().perform({
      userAuthenticationId: authentication.id,
    });

    expect(fetchUserGroups).not.toHaveBeenCalled();
  });

  it("should throw when the provider fails so the task is retried", async () => {
    const { authentication, fetchUserGroups } = await setup();
    fetchUserGroups.mockRejectedValue(new Error("provider unavailable"));

    await expect(
      new SyncUserGroupsTask().perform({
        userAuthenticationId: authentication.id,
      })
    ).rejects.toThrow("provider unavailable");
  });
});
