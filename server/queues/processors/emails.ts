import type { EmailSendOptions, EmailTypes } from "../../mailer";
import mailer from "../../mailer";

type EmailEvent = {
  type: EmailTypes;
  opts: EmailSendOptions;
};
export default class EmailsProcessor {
  async on(event: EmailEvent) {
    await mailer[event.type](event.opts);
  }
}
