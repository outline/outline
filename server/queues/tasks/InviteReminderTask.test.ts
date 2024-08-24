import { subHours } from "date-fns";
import InviteReminderEmail from "@server/emails/templates/InviteReminderEmail";
import { buildInvite } from "@server/test/factories";
import InviteReminderTask from "./InviteReminderTask";

describe("InviteReminderTask", () => {
  it("should send reminder emails", async () => {
    const spy = jest.spyOn(InviteReminderEmail.prototype, "schedule");

    // too old
    await buildInvite({
      createdAt: subHours(new Date(), 84),
    });

    // too new
    await buildInvite({
      createdAt: new Date(),
    });

    // should send reminder
    await buildInvite({
      createdAt: subHours(new Date(), 60),
    });

    const task = new InviteReminderTask();
    await task.perform();

    // running twice to make sure the email is only sent once
    await task.perform();

    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });
});
