import { computed } from "mobx";
import { DocumentPermission } from "@shared/types";
import BaseModel from "./BaseModel";

class DocumentGroupMembership extends BaseModel {
  id: string;

  groupId: string;

  documentId: string;

  permission: DocumentPermission;

  @computed
  get isEditor(): boolean {
    return this.permission === DocumentPermission.ReadWrite;
  }
}

export default DocumentGroupMembership;
