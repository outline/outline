// @flow
import BaseModel from './BaseModel';

class Membership extends BaseModel {
  id: string;
  userId: string;
  collectionId: string;
  permission: string;
}

export default Membership;
