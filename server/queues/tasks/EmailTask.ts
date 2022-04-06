import { APM } from "@server/logging/tracing";
import mailer, { EmailSendOptions, EmailTypes } from "../../mailer";
import BaseTask from "./BaseTask";

type Props = {
  type: EmailTypes;
  options: EmailSendOptions;
};

@APM.trace()
export default class EmailTask extends BaseTask<Props> {
  public async perform(props: Props) {
    await mailer[props.type](props.options);
  }
}
