import nodemailer from "nodemailer";
// @ts-expect-error ts-migrate(7016) FIXME: Could not find a declaration file for module 'oy-v... Remove this comment to see the full error message
import Oy from "oy-vey";
import * as React from "react";
import {
  Props as CollectionNotificationEmailT,
  CollectionNotificationEmail,
  collectionNotificationEmailText,
} from "./emails/CollectionNotificationEmail";
import {
  Props as DocumentNotificationEmailT,
  DocumentNotificationEmail,
  documentNotificationEmailText,
} from "./emails/DocumentNotificationEmail";
import {
  ExportFailureEmail,
  exportEmailFailureText,
} from "./emails/ExportFailureEmail";
import {
  ExportSuccessEmail,
  exportEmailSuccessText,
} from "./emails/ExportSuccessEmail";
import {
  Props as InviteEmailT,
  InviteEmail,
  inviteEmailText,
} from "./emails/InviteEmail";
import { SigninEmail, signinEmailText } from "./emails/SigninEmail";
import { WelcomeEmail, welcomeEmailText } from "./emails/WelcomeEmail";
import { baseStyles } from "./emails/components/EmailLayout";
import Logger from "./logging/logger";
import { emailsQueue } from "./queues";

const useTestEmailService =
  process.env.NODE_ENV === "development" && !process.env.SMTP_USERNAME;

export type EmailTypes =
  | "welcome"
  | "export"
  | "invite"
  | "signin"
  | "exportFailure"
  | "exportSuccess";

export type EmailSendOptions = {
  to: string;
  properties?: any;
  title: string;
  previewText?: string;
  text: string;
  html: React.ReactNode;
  headCSS?: string;
};

/**
 * Mailer
 *
 * Mailer class to contruct and send emails.
 *
 * To preview emails, add a new preview to `emails/index.js` if they
 * require additional data (properties). Otherwise preview will work automatically.
 *
 * HTML: http://localhost:3000/email/:email_type/html
 * TEXT: http://localhost:3000/email/:email_type/text
 */
export class Mailer {
  transporter: any | null | undefined;

  constructor() {
    this.loadTransport();
  }

  async loadTransport() {
    if (process.env.SMTP_HOST) {
      const smtpConfig = {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure:
          "SMTP_SECURE" in process.env
            ? process.env.SMTP_SECURE === "true"
            : process.env.NODE_ENV === "production",
        auth: undefined,
        tls:
          "SMTP_TLS_CIPHERS" in process.env
            ? {
                ciphers: process.env.SMTP_TLS_CIPHERS,
              }
            : undefined,
      };

      if (process.env.SMTP_USERNAME) {
        // @ts-expect-error ts-migrate(2322) FIXME: Type '{ user: string; pass: string | undefined; }'... Remove this comment to see the full error message
        smtpConfig.auth = {
          user: process.env.SMTP_USERNAME,
          pass: process.env.SMTP_PASSWORD,
        };
      }

      // @ts-expect-error config
      this.transporter = nodemailer.createTransport(smtpConfig);
      return;
    }

    if (useTestEmailService) {
      Logger.info(
        "email",
        "SMTP_USERNAME not provided, generating test account…"
      );

      try {
        const testAccount = await nodemailer.createTestAccount();
        const smtpConfig = {
          host: "smtp.ethereal.email",
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass,
          },
        };
        this.transporter = nodemailer.createTransport(smtpConfig);
      } catch (err) {
        Logger.error(
          "Couldn't generate a test account with ethereal.email",
          err
        );
      }
    }
  }

  sendMail = async (
    data: EmailSendOptions
    // @ts-expect-error ts-migrate(1064) FIXME: The return type of an async function or method mus... Remove this comment to see the full error message
  ): Promise<any> | null | undefined => {
    const { transporter } = this;

    if (transporter) {
      const html = Oy.renderTemplate(data.html, {
        title: data.title,
        headCSS: [baseStyles, data.headCSS].join(" "),
        previewText: data.previewText,
      });

      try {
        Logger.info("email", `Sending email "${data.title}" to ${data.to}`);
        const info = await transporter.sendMail({
          from: process.env.SMTP_FROM_EMAIL,
          replyTo: process.env.SMTP_REPLY_EMAIL || process.env.SMTP_FROM_EMAIL,
          to: data.to,
          subject: data.title,
          html: html,
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
    }
  };

  welcome = async (opts: { to: string; teamUrl: string }) => {
    this.sendMail({
      to: opts.to,
      title: "Welcome to Outline",
      previewText:
        "Outline is a place for your team to build and share knowledge.",
      html: <WelcomeEmail {...opts} />,
      text: welcomeEmailText(opts),
    });
  };

  exportSuccess = async (opts: { to: string; id: string; teamUrl: string }) => {
    this.sendMail({
      to: opts.to,
      title: "Your requested export",
      previewText: "Here's your request data export from Outline",
      html: <ExportSuccessEmail id={opts.id} teamUrl={opts.teamUrl} />,
      text: exportEmailSuccessText,
    });
  };

  exportFailure = async (opts: { to: string; teamUrl: string }) => {
    this.sendMail({
      to: opts.to,
      title: "Your requested export",
      previewText: "Sorry, your requested data export has failed",
      html: <ExportFailureEmail teamUrl={opts.teamUrl} />,
      text: exportEmailFailureText,
    });
  };

  invite = async (
    opts: {
      to: string;
    } & InviteEmailT
  ) => {
    this.sendMail({
      to: opts.to,
      title: `${opts.actorName} invited you to join ${opts.teamName}’s knowledge base`,
      previewText:
        "Outline is a place for your team to build and share knowledge.",
      html: <InviteEmail {...opts} />,
      text: inviteEmailText(opts),
    });
  };

  signin = async (opts: { to: string; token: string; teamUrl: string }) => {
    const signInLink = signinEmailText(opts);

    if (process.env.NODE_ENV === "development") {
      Logger.debug("email", `Sign-In link: ${signInLink}`);
    }

    this.sendMail({
      to: opts.to,
      title: "Magic signin link",
      previewText: "Here’s your link to signin to Outline.",
      html: <SigninEmail {...opts} />,
      text: signInLink,
    });
  };

  documentNotification = async (
    opts: {
      to: string;
    } & DocumentNotificationEmailT
  ) => {
    this.sendMail({
      to: opts.to,
      title: `“${opts.document.title}” ${opts.eventName}`,
      previewText: `${opts.actor.name} ${opts.eventName} a new document`,
      html: <DocumentNotificationEmail {...opts} />,
      text: documentNotificationEmailText(opts),
    });
  };

  collectionNotification = async (
    opts: {
      to: string;
    } & CollectionNotificationEmailT
  ) => {
    this.sendMail({
      to: opts.to,
      title: `“${opts.collection.name}” ${opts.eventName}`,
      previewText: `${opts.actor.name} ${opts.eventName} a collection`,
      html: <CollectionNotificationEmail {...opts} />,
      text: collectionNotificationEmailText(opts),
    });
  };

  sendTemplate = async (type: EmailTypes, opts: Record<string, any> = {}) => {
    await emailsQueue.add(
      {
        type,
        opts,
      },
      {
        attempts: 5,
        backoff: {
          type: "exponential",
          delay: 60 * 1000,
        },
      }
    );
  };
}

const mailer = new Mailer();

export default mailer;
