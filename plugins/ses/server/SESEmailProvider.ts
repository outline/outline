import type * as AwsSES from "@aws-sdk/client-sesv2";
import type { SESv2Client } from "@aws-sdk/client-sesv2";
import type MailMessage from "nodemailer/lib/mailer/mail-message";
import {
  BaseEmailProvider,
  type EmailTags,
  type SentMessageInfo,
  sesTagHeaders,
} from "@server/emails/providers/BaseEmailProvider";
import env from "./env";

/**
 * Delivers email through the Amazon SES API.
 *
 * SES also offers an SMTP interface, which needs a dedicated set of long-lived
 * credentials. Sending over the API instead means the standard AWS credential
 * chain applies, so an instance role or IRSA can be used and there is no SMTP
 * password to store or rotate.
 *
 * @see https://docs.aws.amazon.com/ses/latest/dg/send-email-raw.html
 */
export class SESEmailProvider extends BaseEmailProvider {
  id = "ses";

  name = "Amazon SES";

  /**
   * Builds the header SES reads message tags from when a message is supplied
   * as raw MIME. SES removes the header before the message is delivered.
   *
   * @param tags The tags to apply to the message.
   * @returns A map of headers to set on the message.
   */
  public tagHeaders(tags: EmailTags): Record<string, string> {
    return sesTagHeaders(tags);
  }

  protected async sendMessage(
    mail: MailMessage<SentMessageInfo>
  ): Promise<void> {
    const envelope = mail.message.getEnvelope();
    const message = await this.getMimeMessage(mail);
    const { sdk, client } = await this.getSES();

    await client.send(
      new sdk.SendEmailCommand({
        Content: { Raw: { Data: message } },
        // Supplied explicitly so that the envelope, rather than the message
        // headers, decides who the message is actually delivered to.
        FromEmailAddress: envelope.from || undefined,
        Destination: { ToAddresses: envelope.to },
        ConfigurationSetName: env.AWS_SES_CONFIGURATION_SET,
      })
    );
  }

  /**
   * Loads the SES client on first use, so that the AWS SDK is not imported at
   * startup for installations that do not send email through SES.
   */
  private getSES(): Promise<{ sdk: typeof AwsSES; client: SESv2Client }> {
    this.sesPromise ??= (async () => {
      const sdk = await import("@aws-sdk/client-sesv2");
      const client = new sdk.SESv2Client({ region: env.AWS_SES_REGION });
      return { sdk, client };
    })();
    return this.sesPromise;
  }

  private sesPromise?: Promise<{ sdk: typeof AwsSES; client: SESv2Client }>;
}
