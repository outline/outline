import invariant from "invariant";
import { action } from "mobx";
import Subscription from "~/models/Subscription";
import { client } from "~/utils/ApiClient";
import BaseStore, { RPCAction } from "./BaseStore";
import RootStore from "./RootStore";

export type Props = {
  documentId?: string;
  event: string;
};

export default class SubscriptionsStore extends BaseStore<Subscription> {
  actions = [
    RPCAction.Info,
    RPCAction.Create,
    RPCAction.Delete,
    RPCAction.Update,
  ];

  constructor(rootStore: RootStore) {
    super(rootStore, Subscription);
  }

  @action
  fetchSubscriptions = async ({ documentId, event }: Props): Promise<void> => {
    if (!this.actions.includes(RPCAction.Info)) {
      throw new Error(`Cannot fetch ${this.modelName}`);
    }

    this.isFetching = true;

    if (!documentId) {
      return;
    }

    try {
      const res = await client.post(`/${this.apiEndpoint}.info`, {
        documentId,
        event,
      });

      invariant(res?.data, "Data should be available");

      this.addPolicies(res.policies);

      res.data.map(this.add);
    } finally {
      this.isFetching = false;
    }
  };
}
