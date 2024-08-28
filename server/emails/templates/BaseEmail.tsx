import Bull from "bull";
import chunk from "lodash/chunk";
import * as React from "react";
import mailer from "@server/emails/mailer";
import Logger from "@server/logging/Logger";
import Metrics from "@server/logging/Metrics";
import Notification from "@server/models/Notification";
import { taskQueue } from "@server/queues";
import { TaskPriority } from "@server/queues/tasks/BaseTask";
import { NotificationMetadata } from "@server/types";

export interface EmailProps {
  to: string | null;
}

export default abstract class BaseEmail<
  T extends EmailProps,
  S extends Record<string, any> | void = void
> {
  private props: T;
  private metadata?: NotificationMetadata;
  // Gmail creates a new thread for every 100 messages.
  private maxMessagesInThread = 100;

  /**
   * Schedule this email type to be sent asyncronously by a worker.
   *
   * @param options Options to pass to the Bull queue
   * @returns A promise that resolves once the email is placed on the task queue
   */
  public schedule(options?: Bull.JobOptions) {
    const templateName = this.constructor.name;

    Metrics.increment("email.scheduled", {
      templateName,
    });

    // Ideally we'd use EmailTask.schedule here but importing creates a circular
    // dependency so we're pushing onto the task queue in the expected format
    return taskQueue.add(
      {
        name: "EmailTask",
        props: {
          templateName,
          ...this.metadata,
          props: this.props,
        },
      },
      {
        priority: TaskPriority.Normal,
        attempts: 5,
        backoff: {
          type: "exponential",
          delay: 60 * 1000,
        },
        ...options,
      }
    );
  }

  constructor(props: T, metadata?: NotificationMetadata) {
    this.props = props;
    this.metadata = metadata;
  }

  /**
   * Send this email now.
   *
   * @returns A promise that resolves once the email has been successfully sent.
   */
  public async send() {
    const templateName = this.constructor.name;
    const bsResponse = await this.beforeSend?.(this.props);

    if (bsResponse === false) {
      Logger.info(
        "email",
        `Email ${templateName} not sent due to beforeSend hook`,
        this.props
      );
      return;
    }

    if (!this.props.to) {
      Logger.info(
        "email",
        `Email ${templateName} not sent due to missing email address`,
        this.props
      );
      return;
    }

    const data = { ...this.props, ...(bsResponse ?? ({} as S)) };
    const notification = this.metadata?.notificationId
      ? await Notification.unscoped().findByPk(this.metadata?.notificationId)
      : undefined;

    if (notification?.viewedAt) {
      Logger.info(
        "email",
        `Email ${templateName} not sent as already viewed`,
        this.props
      );
      return;
    }

    let references: string[] | undefined;

    if (notification) {
      const prevNotifications = await Notification.unscoped().findAll({
        attributes: ["messageId"],
        where: {
          documentId: notification.documentId,
          userId: notification.userId,
        },
        order: [["createdAt", "ASC"]],
      });

      const notificationChunks = chunk(
        prevNotifications,
        this.maxMessagesInThread
      );
      const lastChunk = notificationChunks.at(-1);

      // Use the last created thread when the limit is not reached.
      // Otherwise, do not populate the references - This will start a new thread in Outlook / Thunderbird.
      //
      // This also ensures that we don't face header limit errors.
      if (lastChunk && lastChunk.length < this.maxMessagesInThread) {
        references = lastChunk
          .filter((notif) => notif.messageId !== null)
          .map((notif) => notif.messageId as string);
      }
    }

    let messageId: string | undefined;

    try {
      messageId = await mailer.sendMail({
        to: this.props.to,
        fromName: this.fromName?.(data),
        subject: this.subject(data),
        references,
        previewText: this.preview(data),
        component: (
          <>
            {this.render(data)}
            {notification ? this.pixel(notification) : null}
          </>
        ),
        text: this.renderAsText(data),
        headCSS: this.headCSS?.(data),
        unsubscribeUrl: this.unsubscribeUrl?.(data),
      });
      Metrics.increment("email.sent", {
        templateName,
      });
    } catch (err) {
      Metrics.increment("email.sending_failed", {
        templateName,
      });
      throw err;
    }

    if (notification) {
      try {
        notification.emailedAt = new Date();
        notification.messageId = messageId ?? null;
        await notification.save();
      } catch (err) {
        Logger.error(`Failed to update notification`, err, this.metadata);
      }
    }
  }

  private pixel(notification: Notification) {
    return <img src={notification.pixelUrl} width="1" height="1" />;
  }

  /**
   * Returns the subject of the email.
   *
   * @param props Props in email constructor
   * @returns The email subject as a string
   */
  protected abstract subject(props: S & T): string;

  /**
   * Returns the preview text of the email, this is the text that will be shown
   * in email client list views.
   *
   * @param props Props in email constructor
   * @returns The preview text as a string
   */
  protected abstract preview(props: S & T): string;

  /**
   * Returns a plain-text version of the email, this is the text that will be
   * shown if the email client does not support or want HTML.
   *
   * @param props Props in email constructor
   * @returns The plain text email as a string
   */
  protected abstract renderAsText(props: S & T): string;

  /**
   * Returns a React element that will be rendered on the server to produce the
   * HTML version of the email.
   *
   * @param props Props in email constructor
   * @returns A JSX element
   */
  protected abstract render(props: S & T): JSX.Element;

  /**
   * Returns the unsubscribe URL for the email.
   *
   * @param props Props in email constructor
   * @returns The unsubscribe URL as a string
   */
  protected unsubscribeUrl?(props: T): string;

  /**
   * Allows injecting additional CSS into the head of the email.
   *
   * @param props Props in email constructor
   * @returns A string of CSS
   */
  protected headCSS?(props: T): string | undefined;

  /**
   * beforeSend hook allows async loading additional data that was not passed
   * through the serialized worker props. If false is returned then the email
   * send is aborted.
   *
   * @param props Props in email constructor
   * @returns A promise resolving to additional data
   */
  protected beforeSend?(props: T): Promise<S | false>;

  /**
   * fromName hook allows overriding the "from" name of the email.
   */
  protected fromName?(props: T): string | undefined;
}
