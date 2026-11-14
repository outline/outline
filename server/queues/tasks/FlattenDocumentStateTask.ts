import documentStateFlattener from "@server/commands/documentStateFlattener";
import { BaseTask } from "./base/BaseTask";

interface Props {
  /** The document ID to flatten. */
  documentId: string;
  /** The user that the notification to the collaboration server is from. */
  actorId: string;
}

/**
 * Flattens the collaborative state of a document after its last collaboration
 * session closes. See documentStateFlattener. One job is queued per document,
 * it checks the conditions at the time it runs.
 */
export default class FlattenDocumentStateTask extends BaseTask<Props> {
  public async perform({ documentId, actorId }: Props) {
    await documentStateFlattener({ documentId, actorId, since: new Date() });
  }

  protected jobId({ documentId }: Props) {
    return `flatten-document-state:${documentId}`;
  }
}
