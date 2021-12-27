import { BelongsTo } from "sequelize-typescript";
import Document from "./Document";
import User from "./User";
import BaseModel from "./base/BaseModel";

class Star extends BaseModel {
  @BelongsTo(() => User, "userId")
  user: User;

  @BelongsTo(() => Document, "documentId")
  document: Document;
}

export default Star;
