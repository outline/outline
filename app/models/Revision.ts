import BaseModel from "./BaseModel";
import User from "./User";

class Revision extends BaseModel {
  id: string;

  documentId: string;

  /** The document title when the revision was created */
  title: string;

  /** Markdown string of the content when revision was created */
  text: string;

  /** HTML string representing the revision as a diff from the previous version */
  html: string;

  createdAt: string;

  createdBy: User;
}

export default Revision;
