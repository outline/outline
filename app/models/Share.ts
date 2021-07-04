import BaseModel from "./BaseModel";
import User from "./User";

class Share extends BaseModel {
  id: string;
  url: string;
  published: boolean;
  documentId: string;
  documentTitle: string;
  documentUrl: string;
  lastAccessedAt: string | undefined | null;
  includeChildDocuments: boolean;
  createdBy: User;
  createdAt: string;
  updatedAt: string;
}

export default Share;
