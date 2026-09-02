import type { Transport } from "nodemailer";
import type MailMessage from "nodemailer/lib/mailer/mail-message";
import type MimeNode from "nodemailer/lib/mime-node";
import { toError } from "@shared/utils/error";
import { InternalError } from "@server/errors";

/** Tags used for reporting, where supported by the email provider. */
export interface EmailTags {
  /** The broad category of the email, e.g. "notification". */
  category: string;
  /** The specific template name, e.g. "InviteEmail". */
  template: string;
}

/**
 * The result of a send, returned to Nodemailer and surfaced as the resolved
 * value of `transporter.sendMail`.
 */
export interface SentMessageInfo {
  /** The envelope the message was sent with. */
  envelope: MimeNode.Envelope;
  /** The Message-ID header of the message. */
  messageId: string;
  /** The id of the provider that handled the message. */
  provider: string;
}

/**
 * Formats tags in the header format Amazon SES reads, as comma-separated
 * name=value pairs in X-SES-MESSAGE-TAGS. Shared between the SES email
 * provider and the mailer's legacy SES-over-SMTP detection so the two cannot
 * drift apart.
 *
 * @param tags The tags to apply to the message.
 * @returns A map of headers to set on the message.
 * @see https://docs.aws.amazon.com/ses/latest/dg/event-publishing-send-email.html
 */
export function sesTagHeaders(tags: EmailTags): Record<string, string> {
  return {
    "X-SES-MESSAGE-TAGS": Object.entries(tags)
      .map(([name, value]) => `${name}=${value}`)
      .join(", "),
  };
}

/**
 * Abstract base class for email providers.
 *
 * A provider is responsible for one thing: taking a message that Nodemailer has
 * already assembled and handing it to a delivery service. Rendering, MIME
 * assembly, threading headers, attachments and unsubscribe headers all happen
 * upstream, so implementations only deal with transport and authentication.
 *
 * Most non-SMTP services accept a complete RFC 5322 message, which is available
 * from `getMimeMessage`. Preferring that over a service's own JSON message
 * schema keeps providers at parity with SMTP – there is no per-provider field
 * mapping to fall out of date as email templates change.
 *
 * Implementations satisfy Nodemailer's `Transport` interface so they can be
 * passed to `nodemailer.createTransport`, and are registered under
 * `Hook.EmailProvider` to become selectable with the `EMAIL_PROVIDER` env var.
 */
export abstract class BaseEmailProvider implements Transport<SentMessageInfo> {
  /** Unique identifier for this provider, matched against `EMAIL_PROVIDER`. */
  abstract id: string;

  /** Human readable name of the provider, used in logs. */
  abstract name: string;

  /** Version reported to Nodemailer, which includes it in the X-Mailer header. */
  version = "1.0.0";

  /**
   * Nodemailer transport entry point, which adapts the callback interface to
   * the promise returned by a provider's `sendMessage`.
   *
   * @param mail The message to send.
   * @param callback Called with the result of the send, or an error on failure.
   */
  public send(
    mail: MailMessage<SentMessageInfo>,
    callback: (err: Error | null, info: SentMessageInfo) => void
  ): void {
    mail.message.keepBcc = this.keepBcc;

    this.sendMessage(mail).then(
      () => callback(null, this.getSentMessageInfo(mail)),
      (err: unknown) => callback(toError(err), this.getSentMessageInfo(mail))
    );
  }

  /**
   * Builds the provider-specific headers used to tag a message for reporting.
   * Providers that do not support tagging need not implement this.
   *
   * @param _tags The tags to apply to the message.
   * @returns A map of headers to set on the message, or undefined.
   */
  public tagHeaders(
    _tags: EmailTags
  ): Record<string, string | string[]> | undefined {
    return undefined;
  }

  /**
   * Whether the Bcc header is retained in the generated message. Submission
   * endpoints that carry no envelope (Microsoft Graph, Gmail) resolve Bcc
   * recipients from the headers and strip them before delivery, so they need
   * the header kept. Providers that carry recipients separately from the
   * message (SES) must leave it stripped, or every recipient would see the
   * Bcc list.
   */
  protected keepBcc = false;

  /**
   * Deliver an assembled message. Implementations throw on failure, and the
   * error is passed back to the caller so the email queue can retry.
   *
   * @param mail The message to send.
   */
  protected abstract sendMessage(
    mail: MailMessage<SentMessageInfo>
  ): Promise<void>;

  /**
   * Throws a descriptive error when a provider API response indicates
   * failure, including the response body for diagnosis.
   *
   * @param response The response to check.
   * @param message Context describing the request that failed.
   * @throws if the response has a non-2xx status.
   */
  protected async assertOk(
    response: { ok: boolean; status: number; text(): Promise<string> },
    message: string
  ): Promise<void> {
    if (!response.ok) {
      throw InternalError(
        `${message} (${response.status}): ${await response.text()}`
      );
    }
  }

  /**
   * Serializes a message to a complete RFC 5322 MIME document.
   *
   * @param mail The message to serialize.
   * @returns The encoded message.
   */
  protected getMimeMessage(
    mail: MailMessage<SentMessageInfo>
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const stream = mail.message.createReadStream();

      stream.on("data", (chunk: Buffer | string) =>
        chunks.push(Buffer.from(chunk))
      );
      stream.once("error", reject);
      stream.once("end", () => resolve(Buffer.concat(chunks)));
    });
  }

  private getSentMessageInfo(
    mail: MailMessage<SentMessageInfo>
  ): SentMessageInfo {
    return {
      envelope: mail.message.getEnvelope(),
      messageId: mail.message.messageId(),
      provider: this.id,
    };
  }
}
