import { subMinutes } from "date-fns";
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

  fetchUnfurl = async <UnfurlType extends UnfurlResourceType>({
    url,
    documentId,
  }: {
    url: string;
    documentId?: string;
  }): Promise<Unfurl<UnfurlType> | undefined> => {
    const unfurl = this.get(url);

    if (unfurl) {
      this.refetch({ unfurl: unfurl as Unfurl<UnfurlType>, documentId });
      return unfurl;
    }

    return this.unfurl<UnfurlType>({ url, documentId });
  };

  private refetch = <UnfurlType extends UnfurlResourceType>({
    unfurl,
    documentId,
  }: {
    unfurl: Unfurl<UnfurlType>;
    documentId?: string;
  }) => {
    const fiveMinutesAgo = subMinutes(new Date(), 5);

    if (new Date(unfurl.fetchedAt) < fiveMinutesAgo) {
      void this.unfurl({ url: unfurl.id, documentId });
    }
  };

  @action
  private unfurl = async <UnfurlType extends UnfurlResourceType>({
    url,
    documentId,
  }: {
    url: string;
    documentId?: string;
  }): Promise<Unfurl<UnfurlType> | undefined> => {
    try {
      this.isFetching = true;

      const data = await client.post("/urls.unfurl", {
        url,
        documentId,
      });

      // unfurls can succeed with no data.
      if (!data) {
        return;
      }

      return this.add({
        id: url,
        type: data.type,
        fetchedAt: new Date().toISOString(),
        data,
      } as Unfurl<UnfurlType>);
    } catch (err) {
      Logger.error(`Failed to unfurl url ${url}`, err);
      return;
    } finally {
      this.isFetching = false;
    }
  };
}

export default UnfurlsStore;
