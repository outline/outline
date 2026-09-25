import { subMinutes } from "date-fns";
import { UserAuthentication } from "@server/models";
import { buildUser } from "@server/test/factories";
import { mockTaskSchedule } from "@server/test/support";
import SyncUserGroupsTask from "./SyncUserGroupsTask";
import ValidateSSOAccessTask from "./ValidateSSOAccessTask";

async function setup({ lastValidatedAt }: { lastValidatedAt: Date }) {
  const user = await buildUser();
  const authentication = (await UserAuthentication.findOne({
    where: { userId: user.id },
  }))!;
  await UserAuthentication.update(
    { lastValidatedAt },
    { where: { id: authentication.id }, hooks: false }
  );

  return { user, authentication };
}

describe("ValidateSSOAccessTask", () => {
  const schedule = mockTaskSchedule();

  it("should schedule a group sync after a fresh validation", async () => {
    const { user, authentication } = await setup({
      lastValidatedAt: subMinutes(new Date(), 10),
    });

    await new ValidateSSOAccessTask().perform({ userId: user.id });

    expect(schedule).toHaveBeenCalledTimes(1);
    expect(schedule.mock.instances[0]).toBeInstanceOf(SyncUserGroupsTask);
    expect(schedule).toHaveBeenCalledWith(
      { userAuthenticationId: authentication.id },
      { jobId: `sync-user-groups:${authentication.id}` }
    );
  });

  it("should not schedule a group sync when validation was skipped as recent", async () => {
    const { user } = await setup({ lastValidatedAt: new Date() });

    await new ValidateSSOAccessTask().perform({ userId: user.id });

    expect(schedule).not.toHaveBeenCalled();
  });
});
