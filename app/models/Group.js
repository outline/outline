// @flow
import BaseModel from "./BaseModel";

class Group extends BaseModel {
  id: string;
  name: string;
  isPrivate: boolean;
  memberCount: number;
  updatedAt: string;

  toJS = () => {
    return {
      name: this.name,
      isPrivate: this.isPrivate,
    };
  };
}

export default Group;
