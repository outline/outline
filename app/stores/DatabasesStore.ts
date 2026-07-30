import invariant from "invariant";
import { action, computed, runInAction } from "mobx";
import type { DataView } from "@shared/types";
import Database from "~/models/Database";
import type Document from "~/models/Document";
import { client } from "~/utils/ApiClient";
import type RootStore from "./RootStore";
import Store from "./base/Store";

export default class DatabasesStore extends Store<Database> {
  constructor(rootStore: RootStore) {
    super(rootStore, Database);
  }

  /**
   * Loads every database the user can reach, optionally limited to one
   * collection.
   *
   * @param params the collection to limit results to, if any.
   * @returns the loaded databases.
   */
  @action
  fetchAll = async (params?: {
    collectionId?: string;
  }): Promise<Database[]> => {
    this.isFetching = true;

    try {
      const res = await client.post("/databases.list", params);
      invariant(res?.data, "Data not available");

      let models: Database[] = [];
      runInAction("DatabasesStore#fetchAll", () => {
        models = res.data.map(this.add);
        this.addPolicies(res.policies);
        if (!params?.collectionId) {
          this.isLoaded = true;
        }
      });
      return models;
    } finally {
      this.isFetching = false;
    }
  };

  /**
   * Returns the databases belonging to a collection, in creation order.
   *
   * @param collectionId the collection to filter by.
   * @returns the collection's databases.
   */
  inCollection = (collectionId: string): Database[] =>
    this.orderedData.filter(
      (database) => database.collectionId === collectionId
    );

  /**
   * Persists a change to one of a database's saved views, leaving the other
   * views untouched.
   *
   * @param database the database the view belongs to.
   * @param viewId the id of the view to change.
   * @param attrs the view attributes to merge in.
   */
  @action
  updateView = async (
    database: Database,
    viewId: string,
    attrs: Partial<DataView>
  ): Promise<void> => {
    const views = (database.views ?? []).map((view) =>
      view.id === viewId ? { ...view, ...attrs } : view
    );
    await database.save({ views });
  };

  /**
   * Moves a row to a new position in its database's manual order, applying the
   * new index locally straight away and rolling it back if the request fails.
   *
   * @param database the database the row belongs to.
   * @param document the row to move.
   * @param index the fractional index to move the row to.
   * @throws if the row could not be moved.
   */
  @action
  moveRow = async (
    database: Database,
    document: Document,
    index: string
  ): Promise<void> => {
    const previousIndex = document.databaseIndex;
    document.databaseIndex = index;

    try {
      await client.post("/databases.move_row", {
        id: database.id,
        documentId: document.id,
        index,
      });
    } catch (error) {
      runInAction("DatabasesStore#moveRow", () => {
        document.databaseIndex = previousIndex;
      });
      throw error;
    }
  };

  @computed
  get orderedData(): Database[] {
    return Array.from(this.data.values()).sort((a, b) =>
      a.createdAt && b.createdAt
        ? Date.parse(a.createdAt) - Date.parse(b.createdAt)
        : a.name.localeCompare(b.name)
    );
  }
}
