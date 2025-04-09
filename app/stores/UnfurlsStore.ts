import { action } from "mobx";
import { UnfurlResourceType } from "@shared/types";
import Unfurl from "~/models/Unfurl";
import { client } from "~/utils/ApiClient";
import Logger from "~/utils/Logger";
import RootStore from "./RootStore";
import Store from "./base/Store";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
class UnfurlsStore extends Store<Unfurl<any>> {
  actions = []; // no default actions allowed for unfurls.

  constructor(rootStore: RootStore) {
    super(rootStore, Unfurl);
  }

  @action
  fetchUnfurl = async <T extends UnfurlResourceType>({
    url,
    documentId,
  }: {
    url: string;
    documentId?: string;
  }): Promise<Unfurl<T> | undefined> => {
    const unfurl = this.get(url);

    if (unfurl) {
      return unfurl;
    }

    this.isFetching = true;

    try {
      const data = await client.post("/urls.unfurl", {
        url,
        documentId,
      });

      // unfurls can succeed with no data.
      if (!data) {
        return;
      }

      return this.add({ id: url, type: data.type, data } as Unfurl<T>);
    } catch (err) {
      Logger.error(`Failed to unfurl url ${url}`, err);
      return;
    } finally {
      this.isFetching = false;
    }
  };
}

export default UnfurlsStore;
