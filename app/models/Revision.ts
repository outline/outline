import { computed } from "mobx";
import { ProsemirrorData } from "@shared/types";
import { isRTL } from "@shared/utils/rtl";
import Document from "./Document";
import User from "./User";
import Model from "./base/Model";
import Field from "./decorators/Field";
import Relation from "./decorators/Relation";

class Revision extends Model {
  static modelName = "Revision";

  /** The document ID that the revision is related to */
  documentId: string;

  /** The document that the revision is related to */
  @Relation(() => Document, { onDelete: "cascade" })
  document: Document;

  /** The document title when the revision was created */
  title: string;

  /** An optional name for the revision */
  @Field
  name: string | null;

  /** Prosemirror data of the content when revision was created */
  data: ProsemirrorData;

  /** The icon (or) emoji of the document when the revision was created */
  icon: string | null;

  /** The color of the document icon when the revision was created */
  color: string | null;

  /** HTML string representing the revision as a diff from the previous version */
  html: string;

  @Relation(() => User)
  createdBy: User;

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
}

export default Revision;
