import nodemailer from "nodemailer";
import type MimeNode from "nodemailer/lib/mime-node";
import env from "@server/env";
import Logger from "@server/logging/Logger";
import { Hook, PluginManager } from "@server/utils/PluginManager";
import { Mailer } from "./mailer";
import {
  BaseEmailProvider,
  type EmailTags,
} from "./providers/BaseEmailProvider";
import EmailLayout from "./templates/components/EmailLayout";

/** A provider that records the message it was handed, rather than sending it. */
class CapturingEmailProvider extends BaseEmailProvider {
  id = "capturing";

  name = "Capturing";

  mime: string | undefined;

  failure: Error | undefined;

  public tagHeaders(tags: EmailTags): Record<string, string> {
    return { "X-Test-Tag": tags.template };
  }

  protected async sendMessage(message: MimeNode): Promise<void> {
    if (this.failure) {
      throw this.failure;
    }
    this.mime = (await this.getMimeMessage(message)).toString("utf-8");
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

const headStyles =
  "#__bodyTable__{font-family:-apple-system,BlinkMacSystemFont,Inter,'Segoe UI',Roboto,Oxygen,sans-serif;font-size:16px;line-height:1.5}@media (prefers-color-scheme:dark){.email-button{background:#fff!important;color:#000!important}}";

/**
 * Sends a message through a JSON transport, so the rendered HTML can be read
 * back without the MIME encoding a provider would see.
 */
const renderHtml = async (subject: string, lang?: string) => {
  env.EMAIL_PROVIDER = "capturing";
  const transporter = nodemailer.createTransport({ jsonTransport: true });
  const createTransport = vi
    .spyOn(nodemailer, "createTransport")
    .mockReturnValue(transporter);
  const spy = vi.spyOn(transporter, "sendMail");

  await new Mailer().sendMail({
    to: "user@example.com",
    from: { name: "Outline", address: "hello@example.com" },
    subject,
    lang,
    text: "Text",
    component: <EmailLayout previewText="Preview">Body</EmailLayout>,
  });

  createTransport.mockRestore();
  return String(spy.mock.calls[0][0].html);
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

  it("should inject the exact head styles", async () => {
    const html = await renderHtml("Subject");

    expect(html).toContain(
      `<style type="text/css">\n          ${headStyles}\n`
    );
  });

  it("should escape the subject and language in the document", async () => {
    const html = await renderHtml("<b>A&B</b>", `en"><script>`);

    expect(html).toContain("<title>&lt;b&gt;A&amp;B&lt;/b&gt;</title>");
    expect(html).toContain('lang="en&quot;&gt;&lt;script&gt;"');
  });

  it("should remove the default spacing from layout tables", async () => {
    const html = await renderHtml("Subject");

    expect(html).toContain(
      '<table role="presentation" border="0" cellSpacing="0" cellPadding="0" bgcolor="#FFFFFF" id="__bodyTable__"'
    );
  });
});
