import WelcomeEmail from "@server/emails/templates/WelcomeEmail";
import { buildInvite, buildUser } from "@server/test/factories";
import type { UserEvent } from "@server/types";
import UserCreatedProcessor from "./UserCreatedProcessor";

describe("UserCreatedProcessor", () => {
  const ip = "127.0.0.1";

  it("should send a welcome email when an invite is accepted", async () => {
    const spy = vi.spyOn(WelcomeEmail.prototype, "schedule");
    const user = await buildUser();

    await new UserCreatedProcessor().perform({
      name: "users.invite_accepted",
      userId: user.id,
      actorId: user.id,
      teamId: user.teamId,
      ip,
    } as UserEvent);

    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  it("should not send a welcome email when an invite is created", async () => {
    const spy = vi.spyOn(WelcomeEmail.prototype, "schedule");
    const invite = await buildInvite();

    await new UserCreatedProcessor().perform({
      name: "users.create",
      userId: invite.id,
      actorId: invite.id,
      teamId: invite.teamId,
      ip,
    } as UserEvent);

    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
