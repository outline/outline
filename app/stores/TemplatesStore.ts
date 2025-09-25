import find from "lodash/find";
import orderBy from "lodash/orderBy";
import { action, computed } from "mobx";
import { invariant } from "mobx-utils";
import naturalSort from "@shared/utils/naturalSort";
import Template from "~/models/Template";
import { client } from "~/utils/ApiClient";
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

  @action
  duplicate = async (
    template: Template,
    options?: {
      title?: string;
      publish?: boolean;
    }
  ) => {
    const res = await client.post("/templates.duplicate", {
      id: template.id,
      ...options,
    });
    invariant(res?.data, "Data should be available");

    this.addPolicies(res.policies);
    this.add(res.data);
  };

  getByUrl = (url = ""): Template | undefined =>
    find(
      this.orderedData,
      (template) => url.endsWith(template.urlId) || url.endsWith(template.id)
    );

  @computed
  get active(): Template | undefined {
    return this.rootStore.ui.activeDocumentId
      ? this.data.get(this.rootStore.ui.activeDocumentId)
      : undefined;
  }

  @computed
  get orderedData(): Template[] {
    return orderBy(Array.from(this.data.values()), "createdAt", "desc");
  }
}
