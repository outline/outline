import { computed, observable } from "mobx";
import type { NavigationNode, PublicTeam } from "@shared/types";
import type SharesStore from "~/stores/SharesStore";
import Notebook from "./Notebook";
import Note from "./Note";
import User from "./User";
import Model from "./base/Model";
import Field from "./decorators/Field";
import Relation from "./decorators/Relation";
import type { Searchable } from "./interfaces/Searchable";
class Share extends Model implements Searchable {
  static modelName = "Share";
  store: SharesStore;
  @Field
  @observable
  published: boolean;
  @Field
  @observable
  includeChildNotes: boolean;
  /** The note ID that is shared. */
  @Field
  @observable
  noteId: string;
  /** The note that is shared. */
  @Relation(() => Note, { onDelete: "cascade" })
  note: Note;
  /** The notebook ID that is shared. */
  @Field("collectionId")
  @observable
  notebookId: string;
  /** The notebook that is shared. */
  @Relation(() => Notebook, { onDelete: "cascade" })
  notebook: Notebook;
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
  noteTitle: string;
  @observable
  noteUrl: string;
  @observable
  lastAccessedAt: string | null | undefined;
  @observable
  url: string;
  @Field
  @observable
  allowIndexing: boolean;
  @Field
  @observable
  allowSubscriptions: boolean;
  @Field
  @observable
  showLastUpdated: boolean;
  @Field
  @observable
  showTOC: boolean;
  /** Custom branding title to display on the shared page, supersedes team name. */
  @Field
  @observable
  title: string | null;
  /** Custom branding icon URL to display on the shared page, supersedes team avatar. */
  @Field
  @observable
  iconUrl: string | null;
  @observable
  views: number;
  /** The user that shared the note. */
  @Relation(() => User, { onDelete: "null" })
  createdBy: User;
  @computed
  get sourcePathWithFallback(): string {
    return this.sourcePath ?? this.noteUrl;
  }
  @computed
  get searchContent(): string[] {
    return [this.sourceTitle ?? this.noteTitle];
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
