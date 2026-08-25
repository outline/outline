import type MailMessage from "nodemailer/lib/mailer/mail-message";
import env from "@server/env";
import { Hook, PluginManager } from "@server/utils/PluginManager";
import { BaseEmailProvider, type SentMessageInfo } from "./BaseEmailProvider";
import { EmailProviderManager } from "./EmailProviderManager";

class TestEmailProvider extends BaseEmailProvider {
  id = "test-provider";

  name = "Test Provider";

  protected sendMessage(_mail: MailMessage<SentMessageInfo>): Promise<void> {
    return Promise.resolve();
  }
}

describe("EmailProviderManager", () => {
  const original = env.EMAIL_PROVIDER;
  const provider = new TestEmailProvider();

  beforeAll(() => {
    PluginManager.add({ type: Hook.EmailProvider, value: provider });
  });

  afterEach(() => {
    env.EMAIL_PROVIDER = original;
  });

  it("should return no provider for the default SMTP configuration", () => {
    env.EMAIL_PROVIDER = "smtp";
    expect(EmailProviderManager.getProvider()).toBeUndefined();
  });

  it("should return a registered provider matching EMAIL_PROVIDER", () => {
    env.EMAIL_PROVIDER = "test-provider";
    expect(EmailProviderManager.getProvider()).toBe(provider);
  });

  it("should re-resolve when EMAIL_PROVIDER changes", () => {
    env.EMAIL_PROVIDER = "test-provider";
    expect(EmailProviderManager.getProvider()).toBe(provider);

    env.EMAIL_PROVIDER = "smtp";
    expect(EmailProviderManager.getProvider()).toBeUndefined();
  });

  it("should validate a correctly configured provider", () => {
    const originalFrom = env.SMTP_FROM_EMAIL;
    env.SMTP_FROM_EMAIL = "hello@example.com";
    env.EMAIL_PROVIDER = "test-provider";

    expect(() => EmailProviderManager.validate()).not.toThrow();
    env.SMTP_FROM_EMAIL = originalFrom;
  });

  it("should pass validation for the default SMTP configuration", () => {
    env.EMAIL_PROVIDER = "smtp";
    expect(() => EmailProviderManager.validate()).not.toThrow();
  });

  it("should fail validation when a provider is configured without a sender", () => {
    const originalFrom = env.SMTP_FROM_EMAIL;
    env.SMTP_FROM_EMAIL = undefined;
    env.EMAIL_PROVIDER = "test-provider";

    expect(() => EmailProviderManager.validate()).toThrow(
      /SMTP_FROM_EMAIL is required/
    );
    env.SMTP_FROM_EMAIL = originalFrom;
  });

  it("should fail validation for an unregistered provider", () => {
    env.EMAIL_PROVIDER = "carrier-pigeon";
    expect(() => EmailProviderManager.validate()).toThrow(/not found/);
  });

  it("should throw listing available providers when none matches", () => {
    env.EMAIL_PROVIDER = "carrier-pigeon";

    expect(() => EmailProviderManager.getProvider()).toThrow(
      /Email provider "carrier-pigeon" not found. Available providers: smtp/
    );
  });
});
