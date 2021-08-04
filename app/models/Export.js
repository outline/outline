// @flow
import BaseModal from "./BaseModel";

type UserData = {
  name: string,
  id: string,
  avatarUrl: string,
};

type CollectionData = {
  name: string,
  id: string,
  url: string,
};

class Export extends BaseModal {
  id: string;
  state: string;
  collection: ?CollectionData;
  key: ?string;
  url: ?string;
  size: number;
  user: UserData;
  createdAt: string;
}

export default Export;
