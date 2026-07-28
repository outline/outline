import { isNil } from "es-toolkit/compat";
import type { InferAttributes, InferCreationAttributes } from "sequelize";
import {
  BelongsTo,
  Column,
  DataType,
  Default,
  ForeignKey,
  HasMany,
  IsIn,
  Length,
  Table,
} from "sequelize-typescript";
import { v4 as uuidv4 } from "uuid";
import type { DataView, Property } from "@shared/types";
import { DataViewType } from "@shared/types";
import {
  removeFilterReferences,
  validateDataSchema,
  validateDataViews,
} from "@shared/utils/properties";
import { DatabaseValidation } from "@shared/validations";
import Collection from "./Collection";
import Document from "./Document";
import Team from "./Team";
import User from "./User";
import ParanoidModel from "./base/ParanoidModel";

/**
 * A database is a set of documents that share a typed property schema, scoped
 * to a collection. A collection may hold any number of databases, and a
 * database can be moved between collections — its rows move with it.
 */
@Table({ tableName: "databases", modelName: "database" })
class Database extends ParanoidModel<
  InferAttributes<Database>,
  Partial<InferCreationAttributes<Database>>
> {
  /** The name of the database. */
  @Length({
    max: DatabaseValidation.maxNameLength,
    msg: `name must be ${DatabaseValidation.maxNameLength} characters or less`,
  })
  @Column(DataType.STRING)
  name: string;

  /** An icon (or emoji) to display alongside the database name. */
  @Length({ max: 50, msg: "icon must be 50 characters or less" })
  @Column(DataType.STRING)
  icon: string | null;

  /** The color of the database icon. */
  @IsIn([
    [
      "#4E5C6E",
      "#0366d6",
      "#EDB90D",
      "#FF825C",
      "#FF5C80",
      "#9E5CF7",
      "#3ad984",
      null,
    ],
  ])
  @Column(DataType.STRING)
  color: string | null;

  /** The typed property definitions that describe this database's columns. */
  @Default([])
  @Column({
    type: DataType.JSONB,
    validate: {
      isDataSchema(value: Property[]) {
        validateDataSchema(value);
      },
    },
  })
  dataSchema: Property[];

  /**
   * Saved views over this database's rows. Views store no data — they are
   * queries (filter + sorts) plus display configuration. A database may hold
   * several views of the same type, each with its own name.
   */
  @Default([])
  @Column({
    type: DataType.JSONB,
    validate: {
      isDataViews(value: DataView[]) {
        validateDataViews(value);
      },
    },
  })
  views: DataView[];

  // associations

  @BelongsTo(() => Collection, "collectionId")
  collection: Collection;

  @ForeignKey(() => Collection)
  @Column(DataType.UUID)
  collectionId: string;

  @BelongsTo(() => Team, "teamId")
  team: Team;

  @ForeignKey(() => Team)
  @Column(DataType.UUID)
  teamId: string;

  @BelongsTo(() => User, "createdById")
  createdBy: User;

  @ForeignKey(() => User)
  @Column(DataType.UUID)
  createdById: string;

  @HasMany(() => Document, "databaseId")
  documents: Document[];

  // instance methods

  /**
   * Returns the property definition with the given id.
   *
   * @param propertyId The property id to look up
   * @returns The property definition if found, else undefined.
   */
  getProperty = (propertyId: string): Property | undefined =>
    this.dataSchema.find((property) => property.id === propertyId);

  /**
   * Inserts or replaces a property definition, keyed by the property id.
   *
   * @param property The property definition to insert or replace
   * @returns The current data schema.
   */
  upsertProperty = (property: Property): Property[] => {
    const schema = [...this.dataSchema];
    const index = schema.findIndex((item) => item.id === property.id);
    if (index === -1) {
      schema.push(property);
    } else {
      schema[index] = property;
    }
    this.dataSchema = schema;
    return schema;
  };

  /**
   * Removes a property definition along with any references to it in saved
   * views.
   *
   * @param propertyId The id of the property to remove
   * @returns The current data schema.
   */
  removeProperty = (propertyId: string): Property[] => {
    this.dataSchema = this.dataSchema.filter(
      (property) => property.id !== propertyId
    );
    this.views = this.views.map((view) => ({
      ...view,
      columns: view.columns.filter(
        (column) => column.propertyId !== propertyId
      ),
      sorts: view.sorts.filter((sort) => sort.propertyId !== propertyId),
      filter: view.filter
        ? removeFilterReferences(view.filter, propertyId)
        : undefined,
      groupBy: view.groupBy === propertyId ? undefined : view.groupBy,
    }));
    return this.dataSchema;
  };

  /**
   * Returns the saved view with the given id.
   *
   * @param viewId The view id to look up
   * @returns The view if found, else undefined.
   */
  getView = (viewId: string): DataView | undefined =>
    this.views.find((view) => view.id === viewId);

  /**
   * Inserts or replaces a saved view, keyed by the view id.
   *
   * @param view The view to insert or replace
   * @returns The current views.
   */
  upsertView = (view: DataView): DataView[] => {
    const views = [...this.views];
    const index = views.findIndex((item) => item.id === view.id);
    if (index === -1) {
      views.push(view);
    } else {
      views[index] = view;
    }
    this.views = views;
    return views;
  };

  /**
   * Removes a saved view.
   *
   * @param viewId The id of the view to remove
   * @returns The current views.
   */
  removeView = (viewId: string): DataView[] => {
    this.views = this.views.filter((view) => view.id !== viewId);
    return this.views;
  };

  /**
   * Returns the view rows should be read through — the named view with the
   * given id, the first saved view, or a transient table view over every
   * property when the database has no saved views.
   *
   * @param viewId The preferred view id, if any
   * @returns The resolved view.
   */
  resolveView = (viewId?: string | null): DataView => {
    const named = isNil(viewId) ? undefined : this.getView(viewId);
    return named ?? this.views[0] ?? Database.buildDefaultView(this.dataSchema);
  };

  /**
   * Builds the table view a new database starts with, showing every property.
   *
   * @param schema The data schema the view displays
   * @param name The name of the view
   * @returns A table view.
   */
  static buildDefaultView = (
    schema: Property[] = [],
    name = "Table"
  ): DataView => ({
    id: uuidv4(),
    name,
    type: DataViewType.Table,
    columns: schema.map((property) => ({
      propertyId: property.id,
      visible: true,
    })),
    sorts: [],
  });
}

export default Database;
