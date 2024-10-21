import emails from "@server/emails/templates";
import BaseTask from "./BaseTask";

type Props = {
  templateName: string;
  props: Record<string, any>;
};

export default class EmailTask extends BaseTask<Props> {
  public async perform({ templateName, props, ...metadata }: Props) {
    const EmailClass = emails[templateName];
    if (!EmailClass) {
      throw new Error(
        `Email task "${templateName}" template does not exist. Check the file name matches the class name.`
      );
    }

    // @ts-expect-error We won't instantiate an abstract class
    const email = new EmailClass(props, metadata);
    return email.send();
  }
}
