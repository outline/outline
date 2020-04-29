// @flow
import { reduce, filter, find, orderBy } from 'lodash';
import BaseStore from './BaseStore';
import RootStore from './RootStore';
import View from 'models/View';

export default class ViewsStore extends BaseStore<View> {
  actions = ['list', 'create'];

  constructor(rootStore: RootStore) {
    super(rootStore, View);
  }

  inDocument(documentId: string): View[] {
    return orderBy(
      filter(this.orderedData, view => view.documentId === documentId),
      'lastViewedAt',
      'desc'
    );
  }

  countForDocument(documentId: string): number {
    const views = this.inDocument(documentId);
    return reduce(views, (memo, view) => memo + view.count, 0);
  }

  touch(documentId: string, userId: string) {
    const view = find(
      this.orderedData,
      view => view.documentId === documentId && view.user.id === userId
    );
    if (!view) return;
    view.touch();
  }
}
