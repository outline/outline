import invariant from "invariant";
import { action } from "mobx";
import Subscription from "~/models/Subscription";
import { client } from "~/utils/ApiClient";
import { AuthorizationError, NotFoundError } from "~/utils/errors";
import RootStore from "./RootStore";
import Store, { RPCAction } from "./base/Store";

export default class SubscriptionsStore extends Store<Subscription> {
  actions = [RPCAction.List, RPCAction.Create, RPCAction.Delete];

  constructor(rootStore: RootStore) {
    super(rootStore, Subscription);
  }

  @action
  async fetchOne({ documentId, event }: { documentId: string; event: string }) {
    const subscription = this.getByDocumentId(documentId);

    if (subscription) {
      return subscription;
    }

    this.isFetching = true;

    try {
      const res = await client.post(`/${this.apiEndpoint}.info`, {
        documentId,
        event,
      });
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

  getByDocumentId = (documentId: string): Subscription | undefined =>
    this.find({ documentId });
}
