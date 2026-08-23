import invariant from "invariant";
import { action } from "mobx";
import type { SubscriptionType } from "@shared/types";
import Subscription from "~/models/Subscription";
import type { Properties } from "~/types";
import { client } from "~/utils/ApiClient";
import { AuthorizationError, NotFoundError } from "~/utils/errors";
import type RootStore from "./RootStore";
import Store, { RPCAction } from "./base/Store";
export default class SubscriptionsStore extends Store<Subscription> {
  actions = [RPCAction.List, RPCAction.Create, RPCAction.Delete];
  constructor(rootStore: RootStore) {
    super(rootStore, Subscription);
  }
  @action
  async create(params: Properties<Subscription>): Promise<Subscription> {
    const { notebookId, ...rest } = params;
    const wireParams = {
      ...rest,
      collectionId: notebookId,
    };
    return super.create(wireParams);
  }
  @action
  async fetchOne(
    options: {
      event: SubscriptionType;
    } & (
      | {
          noteId: string;
        }
      | {
          notebookId: string;
        }
    )
  ) {
    const subscription =
      "notebookId" in options
        ? this.getByNotebookId(options.notebookId)
        : this.getByNoteId(options.noteId);
    if (subscription) {
      return subscription;
    }
    this.isFetching = true;
    try {
      const wireOptions =
        "notebookId" in options
          ? (() => {
              const { notebookId, ...rest } = options;
              return {
                ...rest,
                collectionId: notebookId,
              };
            })()
          : options;
      const res = await client.post(`/${this.apiEndpoint}.info`, wireOptions);
      if (!res) {
        return;
      }
      invariant(res?.data, "Data should be available");
      return this.add(res.data);
    } catch (err) {
      if (err instanceof AuthorizationError || err instanceof NotFoundError) {
        return;
      }
      throw err;
    } finally {
      this.isFetching = false;
    }
  }
  getByNoteId = (noteId: string): Subscription | undefined =>
    this.find({ noteId });
  getByNotebookId = (notebookId: string): Subscription | undefined =>
    this.find({ notebookId });
}
