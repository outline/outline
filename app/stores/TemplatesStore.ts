import { filter, orderBy } from "es-toolkit/compat";
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

  /**
   * Templates that are not nested under another template.
   */
  @computed
  get rootTemplates(): Template[] {
    return filter(this.all, (d) => !d.parentDocumentId);
  }

  /**
   * Root templates sorted alphabetically by title.
   */
  @computed
  get alphabeticalRoots(): Template[] {
    return naturalSort(this.rootTemplates, "title");
  }

  /**
   * Returns the loaded templates nested directly under the given template,
   * in creation order.
   *
   * @param parentDocumentId the id of the parent template.
   * @returns a list of templates.
   */
  childTemplatesOf(parentDocumentId: string): Template[] {
    return orderBy(
      filter(this.all, (d) => d.parentDocumentId === parentDocumentId),
      ["createdAt", "id"],
      ["asc", "asc"]
    );
  }

  /**
   * Fetches the templates nested directly under the given template from
   * the server.
   *
   * @param parentDocumentId the id of the parent template.
   * @returns a promise that resolves to a list of templates.
   */
  fetchChildTemplates(parentDocumentId: string) {
    return this.fetchPage({
      parentDocumentId,
      limit: 100,
    });
  }

  /**
   * Ensures the chain of ancestors of the given template is loaded so that
   * breadcrumbs and depth can be calculated.
   *
   * @param template the template to load ancestors for.
   */
  fetchAncestors = async (template: Template): Promise<void> => {
    const seen = new Set<string>([template.id]);
    let parentDocumentId = template.parentDocumentId;

    while (parentDocumentId && !seen.has(parentDocumentId)) {
      seen.add(parentDocumentId);
      const parent =
        this.data.get(parentDocumentId) ?? (await this.fetch(parentDocumentId));
      parentDocumentId = parent?.parentDocumentId;
    }
  };

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
    recursive,
  }: {
    id: string;
    collectionId: string | null;
    publish: boolean;
    recursive?: boolean;
  }): Promise<Template | undefined> => {
    const res = await client.post("/documents.templatize", {
      id,
      collectionId,
      publish,
      recursive,
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
