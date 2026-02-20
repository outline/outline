import orderBy from "lodash/orderBy";
import filter from "lodash/filter";
import { action, computed } from "mobx";
import { invariant } from "mobx-utils";
import naturalSort from "@shared/utils/naturalSort";
import Template from "~/models/Template";
import { client } from "~/utils/ApiClient";
import type RootStore from "./RootStore";
import Store from "./base/Store";

export default class TemplatesStore extends Store<Template> {
  constructor(rootStore: RootStore) {
    super(rootStore, Template);
  }

  @computed
  get alphabetical(): Template[] {
    return naturalSort(Array.from(this.data.values()), "title");
  }

  @computed
  get all(): Template[] {
    return filter(this.orderedData, (d) => !d.deletedAt);
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

  @action
  templatize = async ({
    id,
    collectionId,
    publish,
  }: {
    id: string;
    collectionId: string | null;
    publish: boolean;
  }): Promise<Template | undefined> => {
    const res = await client.post("/documents.templatize", {
      id,
      collectionId,
      publish,
    });
    invariant(res?.data, "Data should be available");

    this.addPolicies(res.policies);
    this.add(res.data);
    return this.data.get(res.data.id);
  };

  get(id: string): Template | undefined {
    return id
      ? (this.data.get(id) ??
          this.orderedData.find((doc) => id.endsWith(doc.urlId)))
      : undefined;
  }

  @computed
  get active(): Template | undefined {
    return this.rootStore.ui.getActiveModels(Template)?.[0];
  }

  @computed
  get orderedData(): Template[] {
    return orderBy(Array.from(this.data.values()), "createdAt", "desc");
  }
}
