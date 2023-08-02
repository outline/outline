import addressparser from "addressparser";
import invariant from "invariant";
import nodemailer, { Transporter } from "nodemailer";
import SMTPTransport from "nodemailer/lib/smtp-transport";
import Oy from "oy-vey";
import env from "@server/env";
import Logger from "@server/logging/Logger";
import { trace } from "@server/logging/tracing";
import { baseStyles } from "./templates/components/EmailLayout";

const useTestEmailService =
  env.ENVIRONMENT === "development" && !env.SMTP_USERNAME;

type SendMailOptions = {
  to: string;
  fromName?: string;
  replyTo?: string;
  subject: string;
  previewText?: string;
  text: string;
  component: JSX.Element;
  headCSS?: string;
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

  sendMail = async (data: SendMailOptions): Promise<void> => {
    const { transporter } = this;

    if (!transporter) {
      Logger.info(
        "email",
        `Attempted to send email "${data.subject}" to ${data.to} but no transport configured.`
      );
      return;
    }

    const html = Oy.renderTemplate(data.component, {
      title: data.subject,
      headCSS: [baseStyles, data.headCSS].join(" "),
      previewText: data.previewText ?? "",
    });

    try {
      Logger.info("email", `Sending email "${data.subject}" to ${data.to}`);

      invariant(
        env.SMTP_FROM_EMAIL,
        "SMTP_FROM_EMAIL is required to send emails"
      );

      const from = addressparser(env.SMTP_FROM_EMAIL)[0];

      const info = await transporter.sendMail({
        from: data.fromName
          ? {
              name: data.fromName,
              address: from.address,
            }
          : env.SMTP_FROM_EMAIL,
        replyTo: data.replyTo ?? env.SMTP_REPLY_EMAIL ?? env.SMTP_FROM_EMAIL,
        to: data.to,
        subject: data.subject,
        html,
        text: data.text,
        attachments: env.isCloudHosted()
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
      secure: env.SMTP_SECURE ?? env.ENVIRONMENT === "production",
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
