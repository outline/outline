// @flow
import BaseModel from "models/BaseModel";

export default class Follow extends BaseModel {
  id: string;
  userId: string;
  requestedDocId: string;
  createdAt: ?string;
  updatedAt: ?string;
}
