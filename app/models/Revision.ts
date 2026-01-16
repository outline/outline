import { computed, observable } from "mobx";
import { type ExportContentType, type ProsemirrorData } from "@shared/types";
import { isRTL } from "@shared/utils/rtl";
import Document from "./Document";
import User from "./User";
import ParanoidModel from "./base/ParanoidModel";
import Field from "./decorators/Field";
import Relation from "./decorators/Relation";
import type RevisionsStore from "~/stores/RevisionsStore";
import { ChangesetHelper } from "@shared/editor/lib/ChangesetHelper";
import { client } from "~/utils/ApiClient";

class Revision extends ParanoidModel {
  static modelName = "Revision";

  /** The document ID that the revision is related to */
  documentId: string;

  /** The document that the revision is related to */
  @Relation(() => Document, { onDelete: "cascade" })
  document: Document;

  /** The document title when the revision was created */
  @observable
  title: string;

  /** An optional name for the revision */
  @Field
  @observable
  name: string | null;

  /** Prosemirror data of the content when revision was created */
  @observable.shallow
  data: ProsemirrorData;

  /** The icon (or) emoji of the document when the revision was created */
  @observable
  icon: string | null;

  /** The color of the document icon when the revision was created */
  @observable
  color: string | null;

  /** HTML string representing the revision as a diff from the previous version */
  @observable
  html: string;

  /** @deprecated The ID of the user who created the revision */
  createdById: string;

  /** @deprecated Use collaborators instead*/
  @Relation(() => User)
  createdBy: User;

  /** Array of user IDs who collaborated on this revision */
  collaboratorIds: string[];

  /** The user IDs who authored this revision */
  @Relation(() => User, { multiple: true, onDelete: "ignore" })
  collaborators: User[];

  /**
   * Returns the direction of the revision text, either "rtl" or "ltr"
   */
  @computed
  get dir(): "rtl" | "ltr" {
    return this.rtl ? "rtl" : "ltr";
  }

  /**
   * Returns true if the revision text is right-to-left
   */
  @computed
  get rtl() {
    return isRTL(this.title);
  }

  /**
   * Returns the previous revision (chronologically earlier) for comparison.
   *
   * Revisions are sorted by creation date (newest first), so the "previous" revision
   * is the one that comes after the current revision in the sorted list.
   *
   * @returns The previous revision or null if this is the first revision.
   */
  @computed
  get before(): Revision | null {
    const allRevisions = (this.store as RevisionsStore).getByDocumentId(
      this.documentId
    );

    const currentIndex = allRevisions.findIndex(
      (r: Revision) => r.id === this.id
    );
    return currentIndex >= 0 && currentIndex < allRevisions.length - 1
      ? allRevisions[currentIndex + 1]
      : null;
  }

  @computed
  get changeset() {
    return ChangesetHelper.getChangeset(this.data, this.before?.data);
  }

  /**
   * Triggers a download of the revision in the specified format.
   *
   * @param contentType The format to download the revision in.
   * @returns A promise that resolves when the download is triggered.
   */
  download = (contentType: ExportContentType) =>
    client.post(
      `/revisions.export`,
      {
        id: this.id,
      },
      {
        download: true,
        headers: {
          accept: contentType,
        },
      }
    );
}

export default Revision;
