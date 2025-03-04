import { observable } from "mobx";
import PinsStore from "~/stores/PinsStore";
import { setPersistedState } from "~/hooks/usePersistedState";
import { pinsCacheKey } from "~/hooks/usePinnedDocuments";
import Collection from "./Collection";
import Document from "./Document";
import Model from "./base/Model";
import Field from "./decorators/Field";
import { AfterCreate, AfterDelete, AfterRemove } from "./decorators/Lifecycle";
import Relation from "./decorators/Relation";

class Pin extends Model {
  static modelName = "Pin";

  store: PinsStore;

  /** The collection ID that the document is pinned to. If empty the document is pinned to home. */
  collectionId: string | null;

  /** The collection that the document is pinned to. If empty the document is pinned to home. */
  @Relation(() => Collection, { onDelete: "cascade" })
  collection?: Collection;

  /** The document ID that is pinned. */
  documentId: string;

  /** The document that is pinned. */
  @Relation(() => Document, { onDelete: "cascade" })
  document: Document;

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
    if (!model.collectionId) {
      setPersistedState(pinsCacheKey("home"), pins.home.length);
      return;
    }

    // Pinned to collection
    const collection = pins.rootStore.collections.get(model.collectionId);
    if (!collection) {
      return;
    }

    setPersistedState(
      pinsCacheKey(collection.urlId),
      pins.inCollection(collection.id).length
    );
  }
}

export default Pin;
