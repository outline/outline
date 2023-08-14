import filter from "lodash/filter";
import sortBy from "lodash/sortBy";
import { computed } from "mobx";
import Event from "~/models/Event";
import BaseStore, { RPCAction } from "./BaseStore";
import RootStore from "./RootStore";

export default class EventsStore extends BaseStore<Event> {
  actions = [RPCAction.List];

  constructor(rootStore: RootStore) {
    super(rootStore, Event);
  }

  @computed
  get orderedData(): Event[] {
    return sortBy(Array.from(this.data.values()), "createdAt").reverse();
  }

  inDocument(documentId: string): Event[] {
    return filter(this.orderedData, (event) => event.documentId === documentId);
  }
}
