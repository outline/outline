import { TFunction } from "i18next";
import { observable } from "mobx";
import { NotificationEventType } from "@shared/types";
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

  actor: User;

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
        return t("edited");
      case "collections.create":
        return t("created the collection");
      case "documents.mentioned":
      case "comments.mentioned":
        return t("mentioned you in");
      case "comments.create":
        return t("commented in");
      default:
        return this.event;
    }
  }
}

export default Notification;
