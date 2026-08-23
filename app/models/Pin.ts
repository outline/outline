import { observable } from "mobx";
import type PinsStore from "~/stores/PinsStore";
import { setPersistedState } from "~/hooks/usePersistedState";
import { pinsCacheKey } from "~/hooks/usePinnedNotes";
import Notebook from "./Notebook";
import Note from "./Note";
import Model from "./base/Model";
import Field, { WireAlias } from "./decorators/Field";
import { AfterCreate, AfterDelete, AfterRemove } from "./decorators/Lifecycle";
import Relation from "./decorators/Relation";
class Pin extends Model {
  static modelName = "Pin";
  store: PinsStore;
  /** The notebook ID that the note is pinned to. If empty the note is pinned to home. */
  @WireAlias("collectionId")
  notebookId: string | null;
  /** The notebook that the note is pinned to. If empty the note is pinned to home. */
  @Relation(() => Notebook, { onDelete: "cascade" })
  notebook?: Notebook;
  /** The note ID that is pinned. */
  @WireAlias("documentId")
  noteId: string;
  /** The note that is pinned. */
  @Relation(() => Note, { onDelete: "cascade" })
  note: Note;
  /** The sort order of the pin on screen. */
  @observable
  @Field
  index: string;
  @AfterCreate
  @AfterDelete
  @AfterRemove
  static updateCache(model: Pin) {
    const pins = model.store;
    // Pinned to home
    if (!model.notebookId) {
      setPersistedState(pinsCacheKey("home"), pins.home.length);
      return;
    }
    // Pinned to notebook
    const notebook = pins.rootStore.notebooks.get(model.notebookId);
    if (!notebook) {
      return;
    }
    setPersistedState(
      pinsCacheKey(notebook.urlId),
      pins.inNotebook(notebook.id).length
    );
  }
}
export default Pin;
