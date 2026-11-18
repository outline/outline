import { faker } from "@faker-js/faker";
import EmailUpdatedEmail from "@server/emails/templates/EmailUpdatedEmail";
import { buildUser } from "@server/test/factories";
import UserUpdatedProcessor from "./UserUpdatedProcessor";

const ip = "127.0.0.1";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("UserUpdatedProcessor", () => {
  it("should send a security notice to the previous email", async () => {
    const user = await buildUser();
    const email = faker.internet.email().toLowerCase();
    const spy = vi.spyOn(EmailUpdatedEmail.prototype, "schedule");

    const processor = new UserUpdatedProcessor();
    await processor.perform({
      name: "users.update",
      userId: user.id,
      teamId: user.teamId,
      actorId: user.id,
      ip,
      changes: {
        attributes: { email },
        previous: { email: user.email },
      },
    });

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.contexts[0]).toMatchObject({
      props: expect.objectContaining({ to: user.email, email }),
    });
  });

  it("should not send a security notice when the email did not change", async () => {
    const user = await buildUser();
    const spy = vi.spyOn(EmailUpdatedEmail.prototype, "schedule");

    const processor = new UserUpdatedProcessor();
    await processor.perform({
      name: "users.update",
      userId: user.id,
      teamId: user.teamId,
      actorId: user.id,
      ip,
      changes: {
        attributes: { name: "New name" },
        previous: { name: user.name },
      },
    });

    expect(spy).not.toHaveBeenCalled();
  });
});
