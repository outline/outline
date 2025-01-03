import { EmailAddress } from "addressparser";
import nodemailer, { Transporter } from "nodemailer";
import SMTPTransport from "nodemailer/lib/smtp-transport";
import Oy from "oy-vey";
import env from "@server/env";
import Logger from "@server/logging/Logger";
import { trace } from "@server/logging/tracing";
import { baseStyles } from "./templates/components/EmailLayout";

const useTestEmailService = env.isDevelopment && !env.SMTP_USERNAME;

type SendMailOptions = {
  to: string;
  from: EmailAddress;
  replyTo?: string;
  messageId?: string;
  references?: string[];
  subject: string;
  previewText?: string;
  text: string;
  component: JSX.Element;
  headCSS?: string;
  unsubscribeUrl?: string;
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
    if (env.SMTP_HOST) {
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
      throw new Error("`title` is a required option for `renderTemplate`");
    } else if (!bodyContent) {
      throw new Error(
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
    const { transporter } = this;

    if (!transporter) {
      Logger.info(
        "email",
        [
          `Attempted to send email but no transport configured.`,
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
      Logger.error(`Error sending email to ${data.to}`, err);
      throw err; // Re-throw for queue to re-try
    }
  };

  private getOptions(): SMTPTransport.Options {
    return {
      name: env.SMTP_NAME,
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE ?? env.isProduction,
      auth: env.SMTP_USERNAME
        ? {
            user: env.SMTP_USERNAME,
            pass: env.SMTP_PASSWORD,
          }
        : undefined,
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
    } catch (err) {
      return undefined;
    }
  }
}

export default new Mailer();
