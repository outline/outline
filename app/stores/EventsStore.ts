import { sortBy, filter } from "lodash";
import { computed } from "mobx";
import Event from "models/Event";
import BaseStore from "./BaseStore";
import RootStore from "./RootStore";

export default class EventsStore extends BaseStore<Event> {
  // @ts-expect-error ts-migrate(2416) FIXME: Property 'actions' in type 'EventsStore' is not as... Remove this comment to see the full error message
  actions = ["list"];

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
