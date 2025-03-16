import { InferAttributes, InferCreationAttributes, Op } from "sequelize";
import {
  Column,
  DataType,
  BelongsTo,
  ForeignKey,
  IsDate,
  Table,
  Length as SimpleLength,
  DefaultScope,
  Default,
  HasMany,
  Unique,
} from "sequelize-typescript";
import slugify from "slugify";
import { ProsemirrorData } from "@shared/types";
import { DocumentValidation } from "@shared/validations";
import Collection from "./Collection";
import Revision from "./Revision";
import Team from "./Team";
import User from "./User";
import IdModel from "./base/IdModel";
import Fix from "./decorators/Fix";
import IsHexColor from "./validators/IsHexColor";
import Length from "./validators/Length";

@DefaultScope(() => ({
  include: [
    {
      model: User,
      as: "createdBy",
      paranoid: false,
    },
    {
      model: User,
      as: "updatedBy",
      paranoid: false,
    },
  ],
  where: {
    publishedAt: {
      [Op.ne]: null,
    },
    template: true,
  },
  attributes: {
    exclude: ["state"],
  },
}))
@Table({ tableName: "documents", modelName: "template" })
@Fix
class Template extends IdModel<
  InferAttributes<Template>,
  Partial<InferCreationAttributes<Template>>
> {
  @SimpleLength({
    min: 10,
    max: 10,
    msg: `urlId must be 10 characters`,
  })
  @Unique
  @Column
  urlId: string;

  @Length({
    max: DocumentValidation.maxTitleLength,
    msg: `Template title must be ${DocumentValidation.maxTitleLength} characters or less`,
  })
  @Column
  title: string;

  @Default(false)
  @Column
  fullWidth: boolean;

  /** The version of the editor last used to edit this document. */
  @SimpleLength({
    max: 255,
    msg: `editorVersion must be 255 characters or less`,
  })
  @Column
  editorVersion: string;

  /** An icon to use as the template icon. */
  @Length({
    max: 50,
    msg: `icon must be 50 characters or less`,
  })
  @Column
  icon: string | null;

  /** The color of the icon. */
  @IsHexColor
  @Column
  color: string | null;

  /**
   * The content of the template as JSON, this is a snapshot at the last time the state was saved.
   */
  @Column(DataType.JSONB)
  content: ProsemirrorData | null;

  /** Whether the document is published, and if so when. */
  @IsDate
  @Column
  publishedAt: Date | null;

  // associations

  @BelongsTo(() => User, "lastModifiedById")
  updatedBy: User;

  @ForeignKey(() => User)
  @Column(DataType.UUID)
  lastModifiedById: string;

  @BelongsTo(() => User, "createdById")
  createdBy: User;

  @ForeignKey(() => User)
  @Column(DataType.UUID)
  createdById: string;

  @BelongsTo(() => Team, "teamId")
  team: Team;

  @ForeignKey(() => Team)
  @Column(DataType.UUID)
  teamId: string;

  @BelongsTo(() => Collection, "collectionId")
  collection: Collection | null;

  @ForeignKey(() => Collection)
  @Column(DataType.UUID)
  collectionId?: string | null;

  @HasMany(() => Revision, "documentId")
  revisions: Revision[];

  @Default(true)
  @Column
  template: boolean;

  // getters

  /** The frontend path to this template. */
  get path() {
    if (!this.title) {
      return `/settings/templates/untitled-${this.urlId}`;
    }
    const slugifiedTitle = slugify(this.title);
    return `/settings/templates/${slugifiedTitle}-${this.urlId}`;
  }

  /**
   * Returns whether this is a workspace template.
   *
   * @returns boolean
   */
  get isWorkspaceTemplate() {
    return !this.collectionId;
  }

  /**
   * Convenience method that returns whether this template is a draft.
   *
   * @returns boolean
   */
  get isDraft(): boolean {
    return !this.publishedAt;
  }

  /**
   * Convenience method that returns whether this template is deleted.
   *
   * @returns boolean
   */
  get isDeleted(): boolean {
    return !this.deletedAt;
  }
}

export default Template;
