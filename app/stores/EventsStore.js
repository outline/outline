// @flow
import { sortBy } from "lodash";
import { computed } from "mobx";
import BaseStore from "./BaseStore";
import RootStore from "./RootStore";
import Event from "models/Event";

export default class EventsStore extends BaseStore<Event> {
  actions = ["list"];

  constructor(rootStore: RootStore) {
    super(rootStore, Event);
  }

  @computed
  get orderedData(): Event[] {
    return sortBy(Array.from(this.data.values()), "createdAt").reverse();
  }
}
