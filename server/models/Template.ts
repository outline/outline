import { isUUID } from "class-validator";
import type {
  Identifier,
  InferAttributes,
  InferCreationAttributes,
  NonNullFindOptions,
  FindOptions,
} from "sequelize";
import { EmptyResultError } from "sequelize";
import {
  Column,
  DataType,
  BelongsTo,
  ForeignKey,
  Table,
  Length as SimpleLength,
  DefaultScope,
  Default,
  HasMany,
  Unique,
  Scopes,
  BeforeValidate,
  IsDate,
} from "sequelize-typescript";
import slugify from "slugify";
import type { ProsemirrorData } from "@shared/types";
import { UrlHelper } from "@shared/utils/UrlHelper";
import { DocumentValidation } from "@shared/validations";
import { generateUrlId } from "@server/utils/url";
import Collection from "./Collection";
import Revision from "./Revision";
import Team from "./Team";
import User from "./User";
import ParanoidModel from "./base/ParanoidModel";
import Fix from "./decorators/Fix";
import IsHexColor from "./validators/IsHexColor";
import Length from "./validators/Length";

type AdditionalFindOptions = {
  userId?: string;
  includeState?: boolean;
  rejectOnEmpty?: boolean | Error;
};

@DefaultScope(() => ({
  include: [
    {
      association: "createdBy",
      paranoid: false,
    },
    {
      association: "updatedBy",
      paranoid: false,
    },
  ],
  where: {
    template: true,
  },
  attributes: {
    exclude: ["state"],
  },
}))
@Scopes(() => ({
  withMembership: (userId: string, paranoid = true) => ({
    include: [
      {
        model: userId
          ? Collection.scope([
              "defaultScope",
              {
                method: ["withMembership", userId],
              },
            ])
          : Collection,
        as: "collection",
        paranoid,
      },
    ],
  }),
  withCollection: {
    include: [
      {
        model: Collection,
        as: "collection",
      },
    ],
  },
}))
@Table({ tableName: "documents", modelName: "template" })
@Fix
class Template extends ParanoidModel<
  InferAttributes<Template>,
  Partial<InferCreationAttributes<Template>>
> {
  /** The namespace to use for events. */
  static eventNamespace = "templates";

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

  @Default(true)
  @Column
  template: boolean;

  /** The version of the editor last used to edit this template. */
  @SimpleLength({
    max: 255,
    msg: `editorVersion must be 255 characters or less`,
  })
  @Column
  editorVersion: string | null;

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

  /** The likely language of the template, in ISO 639-1 format. */
  @Column
  language: string | null;

  /**
   * The content of the template as JSON, this is a snapshot at the last time the state was saved.
   */
  @Column(DataType.JSONB)
  content: ProsemirrorData | null;

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

  /** Whether the template is published, and if so when. */
  @IsDate
  @Column
  publishedAt: Date | null;

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

  @BeforeValidate
  static createUrlId(model: Template) {
    return (model.urlId = model.urlId || generateUrlId());
  }

  /**
   * Overrides the standard findByPk behavior to allow also querying by urlId
   *
   * @param id uuid or urlId
   * @param options FindOptions
   * @returns A promise resolving to a template instance or null
   */
  static async findByPk(
    id: Identifier,
    options?: NonNullFindOptions<Template> & AdditionalFindOptions
  ): Promise<Template>;

  static async findByPk(
    id: Identifier,
    options?: FindOptions<Template> & AdditionalFindOptions
  ): Promise<Template | null>;

  static async findByPk(
    id: Identifier,
    options: (NonNullFindOptions<Template> | FindOptions<Template>) &
      AdditionalFindOptions = {}
  ): Promise<Template | null> {
    if (typeof id !== "string") {
      return null;
    }

    const { includeState, userId, ...rest } = options;

    // allow default preloading of collection membership if `userId` is passed in find options
    // almost every endpoint needs the collection membership to determine policy permissions.
    const scope = this.scope([
      "defaultScope",
      {
        method: ["withMembership", userId, rest.paranoid],
      },
    ]);

    if (isUUID(id)) {
      const template = await scope.findOne({
        where: {
          id,
        },
        ...rest,
        rejectOnEmpty: false,
      });

      if (!template && rest.rejectOnEmpty) {
        throw new EmptyResultError(`Template doesn't exist with id: ${id}`);
      }

      return template;
    }

    const match = id.match(UrlHelper.SLUG_URL_REGEX);
    if (match) {
      const template = await scope.findOne({
        where: {
          urlId: match[1],
        },
        ...rest,
        rejectOnEmpty: false,
      });

      if (!template && rest.rejectOnEmpty) {
        throw new EmptyResultError(`Template doesn't exist with id: ${id}`);
      }

      return template;
    }

    return null;
  }
}

export default Template;
