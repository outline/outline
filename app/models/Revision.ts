import { computed } from "mobx";
import { ProsemirrorData } from "@shared/types";
import { isRTL } from "@shared/utils/rtl";
import BaseModel from "./BaseModel";
import User from "./User";

class Revision extends BaseModel {
  id: string;

  documentId: string;

  /** The document title when the revision was created */
  title: string;

  /** Prosemirror data of the content when revision was created */
  data: ProsemirrorData;

  /** HTML string representing the revision as a diff from the previous version */
  html: string;

  createdAt: string;

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
