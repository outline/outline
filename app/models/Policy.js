// @flow
import BaseModel from './BaseModel';

class Policy extends BaseModel {
  id: string;
  abilities: {
    [key: string]: boolean,
  };
}

export default Policy;
