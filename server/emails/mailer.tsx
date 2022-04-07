import nodemailer, { Transporter } from "nodemailer";
import Oy from "oy-vey";
import * as React from "react";
import Logger from "@server/logging/logger";
import { baseStyles } from "./templates/components/EmailLayout";

const useTestEmailService =
  process.env.NODE_ENV === "development" && !process.env.SMTP_USERNAME;

type SendMailOptions = {
  to: string;
  subject: string;
  previewText?: string;
  text: string;
  component: React.ReactNode;
  headCSS?: string;
};

/**
 * Mailer class to send emails.
 */
export class Mailer {
  transporter: Transporter | undefined;

  constructor() {
    if (process.env.SMTP_HOST) {
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
        from: process.env.SMTP_FROM_EMAIL,
        replyTo: process.env.SMTP_REPLY_EMAIL || process.env.SMTP_FROM_EMAIL,
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
      host: process.env.SMTP_HOST || "",
      port: parseInt(process.env.SMTP_PORT || "", 10),
      secure:
        "SMTP_SECURE" in process.env
          ? process.env.SMTP_SECURE === "true"
          : process.env.NODE_ENV === "production",
      auth: process.env.SMTP_USERNAME
        ? {
            user: process.env.SMTP_USERNAME || "",
            pass: process.env.SMTP_PASSWORD,
          }
        : undefined,
      tls:
        "SMTP_TLS_CIPHERS" in process.env
          ? {
              ciphers: process.env.SMTP_TLS_CIPHERS,
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
