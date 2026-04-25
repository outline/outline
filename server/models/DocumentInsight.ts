import type { InferAttributes, InferCreationAttributes } from "sequelize";
import {
  BelongsTo,
  Column,
  DataType,
  Default,
  ForeignKey,
  Table,
} from "sequelize-typescript";
import Document from "./Document";
import Team from "./Team";
import IdModel from "./base/IdModel";
import { SkipChangeset } from "./decorators/Changeset";
import Fix from "./decorators/Fix";

@Table({ tableName: "document_insights", modelName: "documentInsight" })
@Fix
class DocumentInsight extends IdModel<
  InferAttributes<DocumentInsight>,
  Partial<InferCreationAttributes<DocumentInsight>>
> {
  @Column(DataType.DATEONLY)
  date: string;

  @Default(0)
  @Column(DataType.INTEGER)
  @SkipChangeset
  viewCount: number;

  @Default(0)
  @Column(DataType.INTEGER)
  @SkipChangeset
  viewerCount: number;

  @Default(0)
  @Column(DataType.INTEGER)
  @SkipChangeset
  commentCount: number;

  @Default(0)
  @Column(DataType.INTEGER)
  @SkipChangeset
  reactionCount: number;

  @Default(0)
  @Column(DataType.INTEGER)
  @SkipChangeset
  revisionCount: number;

  @Default(0)
  @Column(DataType.INTEGER)
  @SkipChangeset
  editorCount: number;

  // associations

  @BelongsTo(() => Document, "documentId")
  document: Document;

  @ForeignKey(() => Document)
  @Column(DataType.UUID)
  documentId: string;

  @BelongsTo(() => Team, "teamId")
  team: Team;

  @ForeignKey(() => Team)
  @Column(DataType.UUID)
  teamId: string;
}

export default DocumentInsight;
