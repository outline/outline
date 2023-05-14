import { TFunction } from "i18next";
import { observable } from "mobx";
import { NotificationEventType } from "@shared/types";
import {
  collectionPath,
  commentPath,
  documentPath,
} from "~/utils/routeHelpers";
import BaseModel from "./BaseModel";
import Comment from "./Comment";
import Document from "./Document";
import User from "./User";
import Field from "./decorators/Field";

class Notification extends BaseModel {
  @Field
  @observable
  id: string;

  @Field
  @observable
  viewedAt: string;

  @Field
  @observable
  archivedAt: string;

  actor: User;

  documentId?: string;

  collectionId?: string;

  document?: Document;

  comment?: Comment;

  event: NotificationEventType;

  get subject() {
    return this.document?.title;
  }

  eventText(t: TFunction): string {
    switch (this.event) {
      case "documents.publish":
        return t("published");
      case "documents.update":
      case "revisions.create":
        return t("edited");
      case "collections.create":
        return t("created the collection");
      case "documents.mentioned":
      case "comments.mentioned":
        return t("mentioned you in");
      case "comments.create":
        return t("left a comment on");
      default:
        return this.event;
    }
  }

  get path() {
    switch (this.event) {
      case "documents.publish":
      case "documents.update":
      case "revisions.create": {
        return this.document ? documentPath(this.document) : "";
      }
      case "collections.create": {
        const collection = this.store.rootStore.documents.get(
          this.collectionId
        );
        return collection ? collectionPath(collection.url) : "";
      }
      case "documents.mentioned":
      case "comments.mentioned":
      case "comments.create": {
        return this.document && this.comment
          ? commentPath(this.document, this.comment)
          : "";
      }
      default:
        return "";
    }
  }
}

export default Notification;
