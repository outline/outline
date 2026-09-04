import { orderBy } from "es-toolkit/compat";
import View from "~/models/View";
import type RootStore from "./RootStore";
import Store, { RPCAction } from "./base/Store";

export default class ViewsStore extends Store<View> {
  actions = [RPCAction.List, RPCAction.Create];

  constructor(rootStore: RootStore) {
    super(rootStore, View);
  }

  inDocument(documentId: string): View[] {
    return orderBy(
      this.orderedData.filter((view) => view.documentId === documentId),
      "lastViewedAt",
      "desc"
    );
  }

  countForDocument(documentId: string): number {
    const views = this.inDocument(documentId);
    return views.reduce((memo, view) => memo + view.count, 0);
  }

  touch(documentId: string, userId: string) {
    const view = this.orderedData.find(
      (view) => view.documentId === documentId && view.userId === userId
    );
    if (!view) {
      return;
    }

    view.touch();
  }
}
