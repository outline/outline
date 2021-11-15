import type { EmailSendOptions, EmailTypes } from "../../mailer";
import mailer from "../../mailer";
type EmailEvent = {
  type: EmailTypes;
  opts: EmailSendOptions;
};
export default class EmailsProcessor {
  async on(event: EmailEvent) {
    // $FlowIssue flow rightly doesn't like dynaic values
    await mailer[event.type](event.opts);
  }
}
