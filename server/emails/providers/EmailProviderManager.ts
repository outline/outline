import env from "@server/env";
import { InternalError } from "@server/errors";
import { Hook, PluginManager } from "@server/utils/PluginManager";
import type { BaseEmailProvider } from "./BaseEmailProvider";

/** The id of the built-in SMTP provider, used when none is configured. */
export const DefaultEmailProvider = "smtp";

/**
 * Resolves the active email provider from the `EMAIL_PROVIDER` environment
 * variable. Resolution is cheap and the mailer memoizes the transporter built
 * from the result, so no caching happens here.
 */
export class EmailProviderManager {
  /**
   * Returns the active email provider, or undefined when the built-in SMTP
   * transport should be used. The provider is determined by matching
   * `EMAIL_PROVIDER` against registered `Hook.EmailProvider` plugins.
   *
   * @returns the active email provider, or undefined for SMTP.
   * @throws if the configured provider is not registered.
   */
  public static getProvider(): BaseEmailProvider | undefined {
    const providerId = env.EMAIL_PROVIDER;

    // SMTP is not a plugin – Nodemailer provides the transport directly, so
    // there is nothing to look up.
    if (providerId === DefaultEmailProvider) {
      return undefined;
    }

    const plugins = PluginManager.getHooks(Hook.EmailProvider);
    const provider = plugins.find(
      (plugin) => plugin.value.id === providerId
    )?.value;

    if (!provider) {
      throw InternalError(
        `Email provider "${providerId}" not found. Available providers: ${[
          DefaultEmailProvider,
          ...plugins.map((plugin) => plugin.value.id),
        ].join(", ")}`
      );
    }

    return provider;
  }

  /**
   * Validates the email provider configuration, failing fast on problems that
   * would otherwise only surface as per-email failures in the queue. Intended
   * to be called at startup, after plugins have loaded.
   *
   * @throws if EMAIL_PROVIDER names a provider that is not registered, or if
   * a provider is configured without the sender address it needs.
   */
  public static validate(): void {
    const provider = this.getProvider();

    // Every email is dropped in BaseEmail.schedule without a sender address,
    // so a provider configured without one cannot work.
    if (provider && !env.SMTP_FROM_EMAIL) {
      throw InternalError(
        `SMTP_FROM_EMAIL is required to send email with EMAIL_PROVIDER=${env.EMAIL_PROVIDER}`
      );
    }
  }
}
