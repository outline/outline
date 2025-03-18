import naturalSort from "@shared/utils/naturalSort";
import find from "lodash/find";
import { computed } from "mobx";
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

  getByUrl = (url = ""): Template | undefined =>
    find(
      this.orderedData,
      (template) => url.endsWith(template.urlId) || url.endsWith(template.id)
    );
}
