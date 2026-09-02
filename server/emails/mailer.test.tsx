import type MailMessage from "nodemailer/lib/mailer/mail-message";
import env from "@server/env";
import Logger from "@server/logging/Logger";
import { Hook, PluginManager } from "@server/utils/PluginManager";
import { Mailer } from "./mailer";
import {
  BaseEmailProvider,
  type EmailTags,
  type SentMessageInfo,
} from "./providers/BaseEmailProvider";

/** A provider that records the message it was handed, rather than sending it. */
class CapturingEmailProvider extends BaseEmailProvider {
  id = "capturing";

  name = "Capturing";

  mime: string | undefined;

  failure: Error | undefined;

  public tagHeaders(tags: EmailTags): Record<string, string> {
    return { "X-Test-Tag": tags.template };
  }

  protected async sendMessage(
    mail: MailMessage<SentMessageInfo>
  ): Promise<void> {
    if (this.failure) {
      throw this.failure;
    }
    this.mime = (await this.getMimeMessage(mail)).toString("utf-8");
  }
}

const provider = new CapturingEmailProvider();

const message = {
  to: "user@example.com",
  from: { name: "Outline", address: "outline@example.com" },
  subject: "Welcome to Outline",
  text: "Hello there",
  component: <div>Hello there</div>,
};

describe("Mailer", () => {
  const original = {
    EMAIL_PROVIDER: env.EMAIL_PROVIDER,
    SMTP_HOST: env.SMTP_HOST,
    SMTP_SERVICE: env.SMTP_SERVICE,
    URL: env.URL,
  };

  beforeAll(() => {
    PluginManager.add({ type: Hook.EmailProvider, value: provider });
  });

  beforeEach(() => {
    provider.mime = undefined;
    provider.failure = undefined;
  });

  afterEach(() => {
    Object.assign(env, original);
  });

  it("should skip sending when no SMTP server is configured", async () => {
    env.EMAIL_PROVIDER = "smtp";
    env.SMTP_HOST = undefined;
    env.SMTP_SERVICE = undefined;
    const warn = vi.spyOn(Logger, "warn").mockImplementation(() => undefined);

    await new Mailer().sendMail(message);

    expect(warn).toHaveBeenCalledWith("No mail transport available");
    expect(provider.mime).toBeUndefined();
    warn.mockRestore();
  });

  it("should hand the assembled message to the configured provider", async () => {
    env.EMAIL_PROVIDER = "capturing";

    await new Mailer().sendMail(message);

    expect(provider.mime).toContain("Subject: Welcome to Outline");
    expect(provider.mime).toContain("To: user@example.com");
    expect(provider.mime).toContain("From: Outline <outline@example.com>");
    // Both the rendered HTML and the plain text alternative.
    expect(provider.mime).toContain("Hello there");
    expect(provider.mime).toContain("text/html");
  });

  it("should keep the inline logo attachment on the provider path", async () => {
    env.EMAIL_PROVIDER = "capturing";
    // The logo is only attached for self hosted installations.
    env.URL = "https://wiki.example.com";

    await new Mailer().sendMail(message);

    expect(provider.mime).toContain("filename=header-logo.png");
    expect(provider.mime).toContain("Content-ID: <header-image>");
  });

  it("should keep threading and unsubscribe headers on the provider path", async () => {
    env.EMAIL_PROVIDER = "capturing";

    await new Mailer().sendMail({
      ...message,
      messageId: "<abc@outline>",
      references: ["<one@outline>", "<two@outline>"],
      unsubscribeUrl: "https://example.com/unsubscribe",
    });

    expect(provider.mime).toContain("Message-ID: <abc@outline>");
    expect(provider.mime).toContain("In-Reply-To: <two@outline>");
    expect(provider.mime).toContain("<one@outline>");
    expect(provider.mime).toContain(
      "List-Unsubscribe: <https://example.com/unsubscribe>"
    );
  });

  it("should ask the provider how to tag a message", async () => {
    env.EMAIL_PROVIDER = "capturing";

    await new Mailer().sendMail({
      ...message,
      tags: { category: "notification", template: "InviteEmail" },
    });

    expect(provider.mime).toContain("X-Test-Tag: InviteEmail");
    // The SMTP provider detection must not also apply.
    expect(provider.mime).not.toContain("X-SES-MESSAGE-TAGS");
  });

  it("should not cache a failed transporter creation", async () => {
    env.EMAIL_PROVIDER = "does-not-exist";
    const error = vi.spyOn(Logger, "error").mockImplementation(() => undefined);
    const mailer = new Mailer();

    await expect(mailer.sendMail(message)).rejects.toThrow(/not found/);

    // Fixing the configuration takes effect without a process restart.
    env.EMAIL_PROVIDER = "capturing";
    await mailer.sendMail(message);

    expect(provider.mime).toContain("Subject: Welcome to Outline");
    error.mockRestore();
  });

  it("should rethrow provider failures so the queue can retry", async () => {
    env.EMAIL_PROVIDER = "capturing";
    provider.failure = new Error("provider is down");
    const error = vi.spyOn(Logger, "error").mockImplementation(() => undefined);

    await expect(new Mailer().sendMail(message)).rejects.toThrow(
      "provider is down"
    );

    error.mockRestore();
  });
});
