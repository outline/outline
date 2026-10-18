import { subMinutes } from "date-fns";
import { action, makeObservable } from "mobx";
import { errToString } from "@shared/utils/error";
import type { UnfurlResourceType } from "@shared/types";
import Unfurl from "~/models/Unfurl";
import { client } from "~/utils/ApiClient";
import Logger from "~/utils/Logger";
import type RootStore from "./RootStore";
import Store from "./base/Store";

// oxlint-disable-next-line @typescript-eslint/no-explicit-any
class UnfurlsStore extends Store<Unfurl<any>> {
  actions = []; // no default actions allowed for unfurls.

  constructor(rootStore: RootStore) {
    super(rootStore, Unfurl);
    makeObservable(this);
  }

  fetchUnfurl = async <UnfurlType extends UnfurlResourceType>({
    url,
    documentId,
  }: {
    url: string;
    documentId?: string;
  }): Promise<Unfurl<UnfurlType> | undefined> => {
    try {
      const protocol = new URL(url).protocol;
      if (
        protocol !== "http:" &&
        protocol !== "https:" &&
        protocol !== "mention:"
      ) {
        return;
      }
    } catch (_err) {
      return;
    }

    const unfurl = this.get(url);

    if (unfurl) {
      this.refetch({ unfurl: unfurl as Unfurl<UnfurlType>, documentId });
      return unfurl;
    }

    return this.request<UnfurlType>({ url, documentId });
  };

  /** Time that a url last returned no unfurl data, keyed by url. */
  private emptyFetchedAt = new Map<string, number>();

  /** Unfurl requests that are in progress, keyed by url. */
  private inflight = new Map<
    string,
    Promise<Unfurl<UnfurlResourceType> | undefined>
  >();

  private refetch = <UnfurlType extends UnfurlResourceType>({
    unfurl,
    documentId,
  }: {
    unfurl: Unfurl<UnfurlType>;
    documentId?: string;
  }) => {
    const fiveMinutesAgo = subMinutes(new Date(), 5);

    if (new Date(unfurl.fetchedAt) < fiveMinutesAgo) {
      void this.request({ url: unfurl.id, documentId });
    }
  };

  /**
   * Requests an unfurl, skipping urls that recently returned no data and
   * sharing a request that is already in progress for the same url.
   */
  private request = async <UnfurlType extends UnfurlResourceType>({
    url,
    documentId,
  }: {
    url: string;
    documentId?: string;
  }): Promise<Unfurl<UnfurlType> | undefined> => {
    const emptyAt = this.emptyFetchedAt.get(url);
    if (emptyAt && emptyAt > subMinutes(new Date(), 5).getTime()) {
      return;
    }

    const existing = this.inflight.get(url);
    if (existing) {
      return existing as Promise<Unfurl<UnfurlType> | undefined>;
    }

    const promise = this.unfurl<UnfurlType>({ url, documentId });
    this.inflight.set(url, promise);
    try {
      return await promise;
    } finally {
      this.inflight.delete(url);
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
        this.emptyFetchedAt.set(url, Date.now());
        return;
      }

      this.emptyFetchedAt.delete(url);

      return this.add({
        id: url,
        type: data.type,
        fetchedAt: new Date().toISOString(),
        data,
      } as Unfurl<UnfurlType>);
    } catch (err) {
      Logger.warn("Failed to unfurl url", {
        url,
        message: errToString(err),
      });
      return;
    } finally {
      this.isFetching = false;
    }
  };
}

export default UnfurlsStore;
