// @flow
import BaseModal from "./BaseModel";
import Collection from "./Collection";
import User from "./User";

class Export extends BaseModal {
  id: string;
  state: string;
  collection: ?Collection;
  key: ?string;
  url: ?string;
  size: number;
  user: User;
  createdAt: string;
}

export default Export;
