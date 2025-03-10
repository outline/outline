import BaseTask from "@server/queues/tasks/BaseTask";

type Props = {
  /** id of the import_task */
  importTaskId: string;
};

export default class ImportNotionTaskV2 extends BaseTask<Props> {
  public perform({ importTaskId }: Props) {
    return new Promise((resolve) => resolve("abc"));
  }
}
