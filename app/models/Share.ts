import { computed, observable } from "mobx";
import { NavigationNode, PublicTeam } from "@shared/types";
import SharesStore from "~/stores/SharesStore";
import env from "~/env";
import Collection from "./Collection";
import Document from "./Document";
import User from "./User";
import Model from "./base/Model";
import Field from "./decorators/Field";
import Relation from "./decorators/Relation";
import { Searchable } from "./interfaces/Searchable";

class Share extends Model implements Searchable {
  static modelName = "Share";

  store: SharesStore;

  @Field
  @observable
  published: boolean;

  @Field
  @observable
  includeChildDocuments: boolean;

  /** The document ID that is shared. */
  @Field
  @observable
  documentId: string;

  /** The document that is shared. */
  @Relation(() => Document, { onDelete: "cascade" })
  document: Document;

  /** The collection ID that is shared. */
  @Field
  @observable
  collectionId: string;

  /** The collection that is shared. */
  @Relation(() => Collection, { onDelete: "cascade" })
  collection: Collection;

  @Field
  @observable
  urlId: string;

  @Field
  @observable
  domain: string;

  @observable
  sourceTitle: string;

  @observable
  sourcePath: string;

  @observable
  documentTitle: string;

  @observable
  documentUrl: string;

  @observable
  lastAccessedAt: string | null | undefined;

  @observable
  url: string;

  @Field
  @observable
  allowIndexing: boolean;

  @Field
  @observable
  showLastUpdated: boolean;

  @Field
  @observable
  showTOC: boolean;

  @observable
  views: number;

  /** The user that shared the document. */
  @Relation(() => User, { onDelete: "null" })
  createdBy: User;

  static sitemapUrl(shareId: string) {
    return `${env.URL}/api/shares.sitemap?shareId=${shareId}`;
  }

  @computed
  get title(): string {
    return this.sourceTitle ?? this.documentTitle;
  }

  @computed
  get sourcePathWithFallback(): string {
    return this.sourcePath ?? this.documentUrl;
  }

  @computed
  get searchContent(): string[] {
    return [this.title];
  }

  @computed
  get searchSuppressed(): boolean {
    return false;
  }

  @computed
  get sharedCache() {
    return (
      this.store.sharedCache.get(this.id) ??
      this.store.sharedCache.get(this.urlId)
    );
  }

  @computed
  get team(): PublicTeam | undefined {
    return this.sharedCache?.team;
  }

  @computed
  get tree(): NavigationNode | undefined {
    return this.sharedCache?.sharedTree ?? undefined;
  }
}

export default Share;
