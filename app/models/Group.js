// @flow
import BaseModel from './BaseModel';

class Group extends BaseModel {
  id: string;
  name: string;

  toJS = () => {
    return {
      name: this.name,
    };
  };
}

export default Group;
