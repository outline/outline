// @flow
import BaseModal from "./BaseModel";

class Export extends BaseModal {
  id: string;
  state: string;
  collectionId: ?string;
  key: ?string;
  url: ?string;
  size: number;
}

export default Export;
