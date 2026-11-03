import { renderToStaticMarkup } from "react-dom/server";
import { addMinutes } from "date-fns";
import mailer from "@server/emails/mailer";
import env from "@server/env";
import { buildNotification, buildUser } from "@server/test/factories";
import type { EmailProps } from "./BaseEmail";
import BaseEmail, { EmailMessageCategory } from "./BaseEmail";
import Body from "./components/Body";

class TestEmail extends BaseEmail<EmailProps> {
  protected get category() {
    return EmailMessageCategory.Notification;
  }

  protected subject() {
    return "Test subject";
  }

  protected preview() {
    return "Test preview";
  }

  protected renderAsText() {
    return "Test text";
  }

  protected render() {
    return <Body>Test body</Body>;
  }

  // i18next is not initialized in tests, so return the key.
  protected t(key: string) {
    return key;
  }
}

describe("BaseEmail", () => {
  const smtpFromEmail = env.SMTP_FROM_EMAIL;

  beforeEach(() => {
    env.SMTP_FROM_EMAIL = "hello@example.com";
  });

  afterEach(() => {
    env.SMTP_FROM_EMAIL = smtpFromEmail;
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("should not annotate a notification that is sent on time", async () => {
    const spy = vi.spyOn(mailer, "sendMail").mockResolvedValue();
    const user = await buildUser();
    const notification = await buildNotification({
      actorId: user.id,
      userId: user.id,
      teamId: user.teamId,
    });

    await new TestEmail(
      { to: "user@example.com" },
      { notificationId: notification.id }
    ).send();

    const options = spy.mock.calls[0][0];
    expect(options.subject).toEqual("Test subject");
    expect(options.text).toEqual("Test text");
    expect(renderToStaticMarkup(options.component)).not.toContain(
      "This notification was delayed"
    );
  });

  it("should annotate the body of a delayed notification, not the subject", async () => {
    const spy = vi.spyOn(mailer, "sendMail").mockResolvedValue();
    const user = await buildUser();
    const notification = await buildNotification({
      actorId: user.id,
      userId: user.id,
      teamId: user.teamId,
    });
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(addMinutes(notification.createdAt, 60));

    await new TestEmail(
      { to: "user@example.com" },
      { notificationId: notification.id }
    ).send();

    const options = spy.mock.calls[0][0];
    expect(options.subject).toEqual("Test subject");
    expect(options.text).toContain("This notification was delayed");
    expect(options.text).toContain("Test text");
    expect(renderToStaticMarkup(options.component)).toContain(
      "This notification was delayed"
    );
  });
});
