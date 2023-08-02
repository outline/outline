import { subDays } from "date-fns";
import InviteReminderEmail from "@server/emails/templates/InviteReminderEmail";
import { buildInvite } from "@server/test/factories";
import { setupTestDatabase } from "@server/test/support";
import InviteReminderTask from "./InviteReminderTask";

setupTestDatabase();

describe("InviteReminderTask", () => {
  it("should not destroy documents not deleted", async () => {
    const spy = jest.spyOn(InviteReminderEmail.prototype, "schedule");

    // too old
    await buildInvite({
      createdAt: subDays(new Date(), 3.5),
    });

    // too new
    await buildInvite({
      createdAt: new Date(),
    });

    // should send reminder
    await buildInvite({
      createdAt: subDays(new Date(), 2.5),
    });

    const task = new InviteReminderTask();
    await task.perform();

    // running twice to make sure the email is only sent once
    await task.perform();

    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });
});
