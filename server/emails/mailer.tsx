import nodemailer, { Transporter } from "nodemailer";
import Oy from "oy-vey";
import * as React from "react";
import env from "@server/env";
import Logger from "@server/logging/Logger";
import { APM } from "@server/logging/tracing";
import { baseStyles } from "./templates/components/EmailLayout";

const useTestEmailService =
  env.ENVIRONMENT === "development" && !env.SMTP_USERNAME;

type SendMailOptions = {
  to: string;
  replyTo?: string;
  subject: string;
  previewText?: string;
  text: string;
  component: React.ReactNode;
  headCSS?: string;
};

/**
 * Mailer class to send emails.
 */
@APM.trace({
  spanName: "mailer",
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

      this.getTestTransportOptions().then((options) => {
        if (!options) {
          Logger.info(
            "email",
            "Couldn't generate a test account with ethereal.email at this time – emails will not be sent."
          );
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
      previewText: data.previewText,
    });

    try {
      Logger.info("email", `Sending email "${data.subject}" to ${data.to}`);
      const info = await transporter.sendMail({
        from: env.SMTP_FROM_EMAIL,
        replyTo: data.replyTo ?? env.SMTP_REPLY_EMAIL ?? env.SMTP_FROM_EMAIL,
        to: data.to,
        subject: data.subject,
        html,
        text: data.text,
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

  private getOptions() {
    return {
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE ?? env.ENVIRONMENT === "production",
      auth: env.SMTP_USERNAME
        ? {
            user: env.SMTP_USERNAME,
            pass: env.SMTP_PASSWORD,
          }
        : undefined,
      tls: env.SMTP_TLS_CIPHERS
        ? {
            ciphers: env.SMTP_TLS_CIPHERS,
          }
        : undefined,
    };
  }

  private async getTestTransportOptions() {
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

const mailer = new Mailer();

export default mailer;
