import mailer from "@server/emails/mailer";
import { taskQueue } from "@server/queues";
import { TaskPriority } from "@server/queues/tasks/BaseTask";

interface EmailProps {
  to: string;
}

export default abstract class BaseEmail<T extends EmailProps> {
  private props: T;

  public static schedule<T>(props: T) {
    // Ideally we'd use EmailTask.schedule here but importing creates a circular
    // dependency so we're pushing onto the task queue in the expected format
    return taskQueue.add(
      {
        name: "EmailTask",
        props: {
          templateName: this.name,
          props,
        },
      },
      {
        priority: TaskPriority.Normal,
        attempts: 5,
        backoff: {
          type: "exponential",
          delay: 60 * 1000,
        },
      }
    );
  }

  constructor(props: T) {
    this.props = props;
  }

  public async send() {
    const bsResponse = this.beforeSend ? await this.beforeSend(this.props) : {};
    const data = { ...this.props, bsResponse };

    return mailer.sendMail({
      to: this.props.to,
      subject: this.subject(data),
      previewText: this.preview(data),
      html: this.render(data),
      text: this.renderAsText(data),
    });
  }

  protected abstract subject(props: T): string;
  protected abstract preview(props: T): string;
  protected abstract renderAsText(props: T): string;
  protected abstract render(props: T): JSX.Element;
  protected beforeSend?(props: T): Promise<Record<string, any>>;
}
