import Bull from "bull";
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

    try {
      await mailer.sendMail({
        to: this.props.to,
        fromName: this.fromName?.(data),
        subject: this.subject(data),
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
