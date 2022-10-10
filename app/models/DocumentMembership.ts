import { computed } from "mobx";
import { DocumentPermission } from "@shared/types";
import BaseModel from "./BaseModel";

class DocumentMembership extends BaseModel {
  id: string;

  userId: string;

  documentId: string;

  permission: DocumentPermission;

  @computed
  get isEditor(): boolean {
    return this.permission === DocumentPermission.ReadWrite;
  }
}

export default DocumentMembership;
