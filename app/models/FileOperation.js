// @flow
import BaseModal from "./BaseModel";
import Collection from "./Collection";
import User from "./User";

class FileOperation extends BaseModal {
  id: string;
  state: string;
  collection: ?Collection;
  key: ?string;
  url: ?string;
  size: number;
  type: string;
  user: User;
  createdAt: string;
}

export default FileOperation;
