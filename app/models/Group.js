// @flow
import BaseModel from './BaseModel';

class Group extends BaseModel {
  id: string;
  name: string;
  memberCount: number;

  toJS = () => {
    return {
      name: this.name,
    };
  };
}

export default Group;
