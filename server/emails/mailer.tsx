import type { EmailAddress } from "addressparser";
import type { Transporter } from "nodemailer";
import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";
import Oy from "oy-vey";
import { toError } from "@shared/utils/error";
import env from "@server/env";
import { InternalError } from "@server/errors";
import Logger from "@server/logging/Logger";
import { trace } from "@server/logging/tracing";
import { baseStyles } from "./templates/components/EmailLayout";

const useTestEmailService = env.isDevelopment && !env.SMTP_USERNAME;

type SendMailOptions = {
  /** The email address being sent to. */
  to: string;
  /** The address the email is sent from. */
  from: EmailAddress;
  /** An address to set as the reply-to for the email. */
  replyTo?: string;
  /** A unique identifier for the message, used for threading. */
  messageId?: string;
  /** Message IDs this email is a reply to, used for threading. */
  references?: string[];
  /** The subject line of the email. */
  subject: string;
  /** Preview text shown in email client list views. */
  previewText?: string;
  /** The plain-text version of the email body. */
  text: string;
  /** The React element rendered to produce the HTML body. */
  component: JSX.Element;
  /** Additional CSS to inject into the head of the email. */
  headCSS?: string;
  /** The URL used to unsubscribe from these emails. */
  unsubscribeUrl?: string;
  /** Tags used for reporting, where supported by the email provider. */
  tags?: EmailTags;
};

type EmailTags = {
  /** The broad category of the email, e.g. "notification". */
  category: string;
  /** The specific template name, e.g. "InviteEmail". */
  template: string;
};

/**
 * Mailer class to send emails.
 */
@trace({
  serviceName: "mailer",
})
export class Mailer {
  transporter: Transporter | undefined;

  constructor() {
    if (env.SMTP_HOST || env.SMTP_SERVICE) {
      this.transporter = nodemailer.createTransport(this.getOptions());
    }
    if (useTestEmailService) {
      Logger.info(
        "email",
        "SMTP_USERNAME not provided, generating test account…"
      );

      void this.getTestTransportOptions().then((options) => {
        if (!options) {
          Logger.info(
            "email",
            "Couldn't generate a test account with ethereal.email at this time – emails will not be sent."
          );
          return;
        }

        this.transporter = nodemailer.createTransport(options);
      });
    }
  }

  template = ({
    title,
    bodyContent,
    headCSS = "",
    bgColor = "#FFFFFF",
    lang,
    dir = "ltr" /* https://www.w3.org/TR/html4/struct/dirlang.html#blocklevel-bidi */,
  }: Oy.CustomTemplateRenderOptions) => {
    if (!title) {
      throw InternalError("`title` is a required option for `renderTemplate`");
    }
    if (!bodyContent) {
      throw InternalError(
        "`bodyContent` is a required option for `renderTemplate`"
      );
    }

    // the template below is a slightly modified form of https://github.com/revivek/oy/blob/master/src/utils/HTML4.js
    return `
    <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">
    <html
      ${lang ? 'lang="' + lang + '"' : ""}
      dir="${dir}"
      xmlns="http://www.w3.org/1999/xhtml"
      xmlns:v="urn:schemas-microsoft-com:vml"
      xmlns:o="urn:schemas-microsoft-com:office:office">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
        <meta http-equiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width"/>

        <title>${title}</title>

        <style type="text/css">
          ${headCSS}

          #__bodyTable__ {
            margin: 0;
            padding: 0;
            width: 100% !important;
          }
        </style>

        <!--[if gte mso 9]>
          <xml>
            <o:OfficeDocumentSettings>
              <o:AllowPNG/>
              <o:PixelsPerInch>96</o:PixelsPerInch>
            </o:OfficeDocumentSettings>
          </xml>
        <![endif]-->
      </head>
      <body bgcolor="${bgColor}" width="100%" style="-webkit-font-smoothing: antialiased; width:100% !important; background:${bgColor};-webkit-text-size-adjust:none; margin:0; padding:0; min-width:100%; direction: ${dir};">
        ${bodyContent}
      </body>
    </html>
  `;
  };

  /**
   *
   * @param data Email headers and body
   * @returns Message ID header from SMTP server
   */
  sendMail = async (data: SendMailOptions): Promise<void> => {
    const transporter = this.transporter;

    if (env.isDevelopment) {
      Logger.debug(
        "email",
        [
          `Sending email:`,
          ``,
          `--------------`,
          `From:      ${data.from.address}`,
          `To:        ${data.to}`,
          `Subject:   ${data.subject}`,
          `Preview:   ${data.previewText}`,
          `--------------`,
          ``,
          data.text,
        ].join("\n")
      );
    }
    if (!transporter) {
      Logger.warn("No mail transport available");
      return;
    }

    const html = Oy.renderTemplate(
      data.component,
      {
        title: data.subject,
        headCSS: [baseStyles, data.headCSS].join(" "),
      } as Oy.RenderOptions,
      this.template
    );

    try {
      Logger.info("email", `Sending email "${data.subject}" to ${data.to}`);

      const info = await transporter.sendMail({
        from: data.from,
        replyTo: data.replyTo ?? env.SMTP_REPLY_EMAIL ?? env.SMTP_FROM_EMAIL,
        to: data.to,
        messageId: data.messageId,
        references: data.references,
        inReplyTo: data.references?.at(-1),
        subject: data.subject,
        headers: this.tagHeaders(data.tags),
        html,
        text: data.text,
        list: data.unsubscribeUrl
          ? {
              unsubscribe: {
                url: data.unsubscribeUrl,
                comment: "Unsubscribe from these emails",
              },
            }
          : undefined,
        attachments: env.isCloudHosted
          ? undefined
          : [
              {
                filename: "header-logo.png",
                path: process.cwd() + "/public/email/header-logo.png",
                cid: "header-image",
              },
            ],
      });

      if (useTestEmailService) {
        Logger.info(
          "email",
          `Preview Url: ${nodemailer.getTestMessageUrl(info)}`
        );
      }
    } catch (err) {
      Logger.error(`Error sending email to ${data.to}`, toError(err));
      throw err; // Re-throw for queue to re-try
    }
  };

  /**
   * Builds the provider-specific headers used to tag a message for reporting.
   * Each supported provider expects a different header name and format; for
   * providers that do not support tagging, or when no tags are given, no
   * headers are returned.
   *
   * @param tags The tags to apply to the message.
   * @returns A map of headers to set on the message, or undefined.
   */
  private tagHeaders(
    tags?: EmailTags
  ): Record<string, string | string[]> | undefined {
    if (!tags) {
      return undefined;
    }

    // Mailgun: up to three tags via repeated X-Mailgun-Tag headers.
    // https://documentation.mailgun.com/docs/mailgun/user-manual/tracking-messages/#tagging
    if (this.isMailgun) {
      return { "X-Mailgun-Tag": Object.values(tags).slice(0, 3) };
    }

    // SES: comma-separated name=value pairs via X-SES-MESSAGE-TAGS.
    // https://docs.aws.amazon.com/ses/latest/dg/event-publishing-send-email.html
    if (this.isSES) {
      return {
        "X-SES-MESSAGE-TAGS": Object.entries(tags)
          .map(([name, value]) => `${name}=${value}`)
          .join(", "),
      };
    }

    // Postmark: a single tag per message via X-PM-Tag.
    // https://postmarkapp.com/support/article/1117-add-link-tracking-to-a-message
    if (this.isPostmark) {
      return { "X-PM-Tag": tags.template };
    }

    return undefined;
  }

  /** The configured SMTP host and service name, for provider detection. */
  private get provider(): string {
    return `${env.SMTP_HOST ?? ""} ${env.SMTP_SERVICE ?? ""}`;
  }

  /** Whether the configured SMTP provider is Mailgun. */
  private get isMailgun(): boolean {
    return /mailgun/i.test(this.provider);
  }

  /** Whether the configured SMTP provider is Amazon SES. */
  private get isSES(): boolean {
    // Detected by the SES SMTP host (email-smtp.<region>.amazonaws.com) or a
    // well-known Nodemailer service key (SES, SES-US-EAST-1, etc.).
    return /amazonaws|(?:^|\s)ses\b/i.test(this.provider);
  }

  /** Whether the configured SMTP provider is Postmark. */
  private get isPostmark(): boolean {
    return /postmark/i.test(this.provider);
  }

  private getOptions(): SMTPTransport.Options {
    // nodemailer will use the service config to determine host/port
    if (env.SMTP_SERVICE) {
      return {
        service: env.SMTP_SERVICE,
        auth: {
          user: env.SMTP_USERNAME,
          pass: env.SMTP_PASSWORD,
        },
      };
    }

    return {
      name: env.SMTP_NAME,
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      // If not explicitly configured we default to using TLS in production
      secure: env.SMTP_SECURE ?? env.isProduction,
      // Allow connections with no authentication if no username is provided
      auth: env.SMTP_USERNAME
        ? {
            user: env.SMTP_USERNAME,
            pass: env.SMTP_PASSWORD,
          }
        : undefined,
      // Disable STARTTLS entirely when SMTP_DISABLE_STARTTLS is set to true
      ignoreTLS: env.SMTP_DISABLE_STARTTLS,
      tls: env.SMTP_SECURE
        ? env.SMTP_TLS_CIPHERS
          ? {
              ciphers: env.SMTP_TLS_CIPHERS,
            }
          : undefined
        : {
            rejectUnauthorized: false,
          },
    };
  }

  private async getTestTransportOptions(): Promise<
    SMTPTransport.Options | undefined
  > {
    try {
      const testAccount = await nodemailer.createTestAccount();
      return {
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      };
    } catch (_err) {
      return undefined;
    }
  }
}

export default new Mailer();
