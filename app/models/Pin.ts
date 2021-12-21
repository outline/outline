import BaseModel from "./BaseModel";

class Pin extends BaseModel {
  id: string;
  collectionId: string;
  documentId: string;
}

export default Pin;
