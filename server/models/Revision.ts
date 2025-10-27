import { InferAttributes, InferCreationAttributes, Op } from "sequelize";
import {
  DataType,
  BelongsTo,
  Column,
  DefaultScope,
  ForeignKey,
  Table,
  IsNumeric,
  Length as SimpleLength,
  BeforeDestroy,
} from "sequelize-typescript";
import type { ProsemirrorData } from "@shared/types";
import { DocumentValidation, RevisionValidation } from "@shared/validations";
import { APIContext } from "@server/types";
import Document from "./Document";
import User from "./User";
import ParanoidModel from "./base/ParanoidModel";
import Fix from "./decorators/Fix";
import IsHexColor from "./validators/IsHexColor";
import Length from "./validators/Length";
import { SkipChangeset } from "./decorators/Changeset";

@DefaultScope(() => ({
  include: [
    {
      model: User,
      as: "user",
      paranoid: false,
    },
  ],
}))
@Table({ tableName: "revisions", modelName: "revision" })
@Fix
class Revision extends ParanoidModel<
  InferAttributes<Revision>,
  Partial<InferCreationAttributes<Revision>>
> {
  @IsNumeric
  @Column(DataType.SMALLINT)
  @SkipChangeset
  version?: number | null;

  /** The editor version at the time of the revision */
  @SimpleLength({
    max: 255,
    msg: `editorVersion must be 255 characters or less`,
  })
  @Column
  @SkipChangeset
  editorVersion: string | null;

  /** The document title at the time of the revision */
  @Length({
    max: DocumentValidation.maxTitleLength,
    msg: `Revision title must be ${DocumentValidation.maxTitleLength} characters or less`,
  })
  @Column
  @SkipChangeset
  title: string;

  /** An optional name for the revision */
  @Length({
    max: RevisionValidation.maxNameLength,
    msg: `Revision name must be ${RevisionValidation.maxNameLength} characters or less`,
  })
  @Column
  @SkipChangeset
  name: string | null;

  /**
   * The content of the revision as Markdown.
   *
   * @deprecated Use `content` instead, or `DocumentHelper.toMarkdown` if
   * exporting lossy markdown. This column will be removed in a future migration
   * and is no longer being written.
   */
  @Column(DataType.TEXT)
  @SkipChangeset
  text: string | null;

  /** The content of the revision as JSON. */
  @Column(DataType.JSONB)
  @SkipChangeset
  content: ProsemirrorData | null;

  /** The icon at the time of the revision. */
  @Length({
    max: 50,
    msg: `icon must be 50 characters or less`,
  })
  @Column
  @SkipChangeset
  icon: string | null;

  /** The color at the time of the revision. */
  @IsHexColor
  @Column
  @SkipChangeset
  color: string | null;

  // associations

  @BelongsTo(() => Document, "documentId")
  document: Document;

  @ForeignKey(() => Document)
  @Column(DataType.UUID)
  documentId: string;

  @BelongsTo(() => User, "userId")
  user: User;

  @ForeignKey(() => User)
  @Column(DataType.UUID)
  userId: string;

  /** Array of user IDs who collaborated on this revision */
  @Column(DataType.ARRAY(DataType.UUID))
  @SkipChangeset
  collaboratorIds: string[] = [];

  /**
   * Get the collaborators for this revision.
   */
  get collaborators() {
    const otherCollaboratorIds = (this.collaboratorIds ?? []).filter(
      (id) => id !== this.userId
    );

    if (otherCollaboratorIds.length === 0) {
      return [this.user];
    }

    return User.findAll({
      where: {
        id: {
          [Op.in]: otherCollaboratorIds,
        },
      },
      paranoid: false,
    }).then((others) => [this.user, ...others]);
  }

  // hooks

  @BeforeDestroy
  static async clearData(model: Revision) {
    model.content = null;
    model.text = null;
    model.title = "";
  }

  // static methods

  /**
   * Find the latest revision for a given document
   *
   * @param documentId The document id to find the latest revision for
   * @returns A Promise that resolves to a Revision model
   */
  static findLatest(documentId: string) {
    return this.findOne({
      where: {
        documentId,
      },
      order: [["createdAt", "DESC"]],
    });
  }

  /**
   * Build a Revision model from a Document model
   *
   * @param document The document to build from
   * @returns A Revision model
   */
  static buildFromDocument(document: Document) {
    return this.build({
      title: document.title,
      icon: document.icon,
      color: document.color,
      content: document.content,
      userId: document.lastModifiedById,
      editorVersion: document.editorVersion,
      version: document.version,
      documentId: document.id,
      // revision time is set to the last time document was touched as this
      // handler can be debounced in the case of an update
      createdAt: document.updatedAt,
    });
  }

  /**
   * Create a Revision model from a Document model and save it to the database
   *
   * @param ctx context to use for DB operations
   * @param document The document to create from
   * @param collaboratorIds Optional array of user IDs who authored this revision
   * @returns A Promise that resolves when saved
   */
  static createFromDocument(
    ctx: APIContext,
    document: Document,
    collaboratorIds?: string[]
  ) {
    const revision = this.buildFromDocument(document);

    if (collaboratorIds) {
      revision.collaboratorIds = collaboratorIds;
    }

    return revision.saveWithCtx(ctx);
  }

  // instance methods

  /**
   * Find the revision for the document before this one.
   *
   * @returns A Promise that resolves to a Revision, or null if this is the first revision.
   */
  before(): Promise<Revision | null> {
    return (this.constructor as typeof Revision).findOne({
      where: {
        documentId: this.documentId,
        createdAt: {
          [Op.lt]: this.createdAt,
        },
      },
      order: [["createdAt", "DESC"]],
    });
  }
}

export default Revision;
