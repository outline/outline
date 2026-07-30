import { computed, observable } from "mobx";
import type { DataView, DataViewType, Property } from "@shared/types";
import type DatabasesStore from "~/stores/DatabasesStore";
import ParanoidModel from "~/models/base/ParanoidModel";
import Field from "./decorators/Field";

/**
 * A set of documents sharing a typed property schema, scoped to a collection.
 * A collection may hold any number of databases, and a database can be moved
 * between collections — its rows move with it.
 */
export default class Database extends ParanoidModel {
  static modelName = "Database";

  store: DatabasesStore;

  /** The name of the database. */
  @Field
  @observable
  name: string;

  /** An icon (or emoji) displayed alongside the database name. */
  @Field
  @observable
  icon: string | null;

  /** The color of the database icon. */
  @Field
  @observable
  color: string | null;

  /** Whether the database's page ignores the usual reading width. */
  @Field
  @observable
  fullWidth: boolean;

  /** The collection this database belongs to. */
  @Field
  @observable
  collectionId: string;

  /** The typed property definitions describing this database's columns. */
  @Field
  @observable.shallow
  dataSchema: Property[];

  /** Saved views over this database's rows. */
  @Field
  @observable.shallow
  views: DataView[];

  @computed
  get searchContent(): string {
    return this.name;
  }

  /** The path to this database within the app. */
  @computed
  get path(): string {
    return `/database/${this.id}`;
  }

  /** The collection this database belongs to, if it is loaded. */
  @computed
  get collection() {
    return this.store.rootStore.collections.get(this.collectionId);
  }

  /**
   * Returns the property definition with the given id.
   *
   * @param propertyId The property id to look up
   * @returns The property definition if found, else undefined.
   */
  getProperty(propertyId: string): Property | undefined {
    return this.dataSchema?.find((property) => property.id === propertyId);
  }

  /**
   * Returns the saved view with the given id.
   *
   * @param viewId The view id to look up
   * @returns The view if found, else undefined.
   */
  getView(viewId: string): DataView | undefined {
    return this.views?.find((view) => view.id === viewId);
  }

  /**
   * Resolves the view rows should be read through — the named view with the
   * given id, or the first saved view when that id is unknown.
   *
   * @param viewId The preferred view id, if any
   * @returns The resolved view, or undefined when the database has none.
   */
  resolveView(viewId?: string | null): DataView | undefined {
    return (viewId ? this.getView(viewId) : undefined) ?? this.views?.[0];
  }

  /**
   * Builds a new view over this database's schema, showing every property.
   *
   * @param type The layout of the new view
   * @param name The name of the new view
   * @param id The stable id of the new view
   * @returns The new view.
   */
  buildView(type: DataViewType, name: string, id: string): DataView {
    return {
      id,
      name,
      type,
      columns: (this.dataSchema ?? []).map((property) => ({
        propertyId: property.id,
        visible: true,
      })),
      sorts: [],
    };
  }
}
