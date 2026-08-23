import { filter, find, orderBy, reduce } from "es-toolkit/compat";
import View from "~/models/View";
import type RootStore from "./RootStore";
import Store, { RPCAction } from "./base/Store";
export default class ViewsStore extends Store<View> {
  actions = [RPCAction.List, RPCAction.Create];
  constructor(rootStore: RootStore) {
    super(rootStore, View);
  }
  inNote(noteId: string): View[] {
    return orderBy(
      filter(this.orderedData, (view) => view.noteId === noteId),
      "lastViewedAt",
      "desc"
    );
  }
  countForNote(noteId: string): number {
    const views = this.inNote(noteId);
    return reduce(views, (memo, view) => memo + view.count, 0);
  }
  touch(noteId: string, userId: string) {
    const view = find(
      this.orderedData,
      (view) => view.noteId === noteId && view.userId === userId
    );
    if (!view) {
      return;
    }
    view.touch();
  }
}
