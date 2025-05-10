import invariant from "invariant";
import lowerFirst from "lodash/lowerFirst";
import pluralize from "pluralize";
import ApiKeysStore from "./ApiKeysStore";
import AuthStore from "./AuthStore";
import AuthenticationProvidersStore from "./AuthenticationProvidersStore";
import CollectionsStore from "./CollectionsStore";
import CommentsStore from "./CommentsStore";
import DialogsStore from "./DialogsStore";
import DocumentPresenceStore from "./DocumentPresenceStore";
import DocumentsStore from "./DocumentsStore";
import EventsStore from "./EventsStore";
import FileOperationsStore from "./FileOperationsStore";
import GroupMembershipsStore from "./GroupMembershipsStore";
import GroupUsersStore from "./GroupUsersStore";
import GroupsStore from "./GroupsStore";
import ImportsStore from "./ImportsStore";
import IntegrationsStore from "./IntegrationsStore";
import MembershipsStore from "./MembershipsStore";
import NotificationsStore from "./NotificationsStore";
import OAuthAuthenticationsStore from "./OAuthAuthenticationsStore";
import OAuthClientsStore from "./OAuthClientsStore";
import PinsStore from "./PinsStore";
import PoliciesStore from "./PoliciesStore";
import RevisionsStore from "./RevisionsStore";
import SearchesStore from "./SearchesStore";
import SharesStore from "./SharesStore";
import StarsStore from "./StarsStore";
import SubscriptionsStore from "./SubscriptionsStore";
import UiStore from "./UiStore";
import UnfurlsStore from "./UnfurlsStore";
import UserMembershipsStore from "./UserMembershipsStore";
import UsersStore from "./UsersStore";
import ViewsStore from "./ViewsStore";
import WebhookSubscriptionsStore from "./WebhookSubscriptionStore";
import Store from "./base/Store";

export default class RootStore {
  apiKeys: ApiKeysStore;
  auth: AuthStore;
  authenticationProviders: AuthenticationProvidersStore;
  collections: CollectionsStore;
  groupMemberships: GroupMembershipsStore;
  comments: CommentsStore;
  dialogs: DialogsStore;
  documents: DocumentsStore;
  events: EventsStore;
  groups: GroupsStore;
  groupUsers: GroupUsersStore;
  imports: ImportsStore;
  integrations: IntegrationsStore;
  memberships: MembershipsStore;
  notifications: NotificationsStore;
  oauthAuthentications: OAuthAuthenticationsStore;
  oauthClients: OAuthClientsStore;
  presence: DocumentPresenceStore;
  pins: PinsStore;
  policies: PoliciesStore;
  revisions: RevisionsStore;
  searches: SearchesStore;
  shares: SharesStore;
  ui: UiStore;
  unfurls: UnfurlsStore;
  stars: StarsStore;
  subscriptions: SubscriptionsStore;
  users: UsersStore;
  views: ViewsStore;
  fileOperations: FileOperationsStore;
  webhookSubscriptions: WebhookSubscriptionsStore;
  userMemberships: UserMembershipsStore;

  constructor() {
    // Models
    this.registerStore(ApiKeysStore);
    this.registerStore(AuthenticationProvidersStore);
    this.registerStore(CollectionsStore);
    this.registerStore(GroupMembershipsStore);
    this.registerStore(CommentsStore);
    this.registerStore(DocumentsStore);
    this.registerStore(EventsStore);
    this.registerStore(GroupsStore);
    this.registerStore(GroupUsersStore);
    this.registerStore(ImportsStore);
    this.registerStore(IntegrationsStore);
    this.registerStore(MembershipsStore);
    this.registerStore(NotificationsStore);
    this.registerStore(OAuthAuthenticationsStore, "oauthAuthentications");
    this.registerStore(OAuthClientsStore, "oauthClients");
    this.registerStore(PinsStore);
    this.registerStore(PoliciesStore);
    this.registerStore(RevisionsStore);
    this.registerStore(SearchesStore);
    this.registerStore(SharesStore);
    this.registerStore(StarsStore);
    this.registerStore(SubscriptionsStore);
    this.registerStore(UnfurlsStore);
    this.registerStore(UsersStore);
    this.registerStore(ViewsStore);
    this.registerStore(FileOperationsStore);
    this.registerStore(WebhookSubscriptionsStore);
    this.registerStore(UserMembershipsStore);

    // Non-models
    this.registerStore(DocumentPresenceStore, "presence");
    this.registerStore(DialogsStore, "dialogs");
    this.registerStore(UiStore, "ui");

    // AuthStore must be initialized last as it makes use of the other stores.
    this.registerStore(AuthStore, "auth");
  }

  /**
   * Get a store by model name.
   *
   * @param modelName
   */
  public getStoreForModelName<K extends keyof RootStore>(modelName: string) {
    const storeName = this.getStoreNameForModelName(modelName);
    invariant(storeName, `No store found for model name "${modelName}"`);

    const store = this[storeName];
    return store as RootStore[K];
  }

  /**
   * Clear all data from the stores except for auth and ui.
   */
  public clear() {
    Object.getOwnPropertyNames(this)
      .filter((key) => ["auth", "ui"].includes(key) === false)
      .forEach((key: keyof RootStore) => {
        // @ts-expect-error clear exists on all stores
        "clear" in this[key] && this[key].clear();
      });
  }

  /**
   * Register a store with the root store.
   *
   * @param StoreClass
   */
  private registerStore<T = typeof Store>(
    StoreClass: T,
    name?: keyof RootStore
  ) {
    // @ts-expect-error TS thinks we are instantiating an abstract class.
    const store = new StoreClass(this);
    const storeName = name ?? this.getStoreNameForModelName(store.modelName);
    invariant(storeName, `No store found for model name "${store.modelName}"`);

    this[storeName] = store;
  }

  private getStoreNameForModelName(modelName: string) {
    for (const key of Object.keys(this)) {
      const store = this[key as keyof RootStore];
      if (store && "modelName" in store && store.modelName === modelName) {
        return key as keyof RootStore;
      }
    }

    const storeName = pluralize(lowerFirst(modelName)) as keyof RootStore;
    if (storeName) {
      return storeName;
    }

    return undefined;
  }
}
