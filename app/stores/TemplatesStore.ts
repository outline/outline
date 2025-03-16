import { computed } from "mobx";
import naturalSort from "@shared/utils/naturalSort";
import Template from "~/models/Template";
import RootStore from "./RootStore";
import Store from "./base/Store";

export default class TemplatesStore extends Store<Template> {
  constructor(rootStore: RootStore) {
    super(rootStore, Template);
  }

  @computed
  get alphabetical(): Template[] {
    return naturalSort(Array.from(this.data.values()), "title");
  }
}
