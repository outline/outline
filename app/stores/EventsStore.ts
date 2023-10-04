import filter from "lodash/filter";
import sortBy from "lodash/sortBy";
import { computed } from "mobx";
import Event from "~/models/Event";
import RootStore from "./RootStore";
import Store, { RPCAction } from "./base/Store";

export default class EventsStore extends Store<Event> {
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
