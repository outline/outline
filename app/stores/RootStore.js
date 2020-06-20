// @flow
import ApiKeysStore from "./ApiKeysStore";
import AuthStore from "./AuthStore";
import CollectionsStore from "./CollectionsStore";
import DocumentsStore from "./DocumentsStore";
import EventsStore from "./EventsStore";
import GroupsStore from "./GroupsStore";
import GroupMembershipsStore from "./GroupMembershipsStore";
import IntegrationsStore from "./IntegrationsStore";
import MembershipsStore from "./MembershipsStore";
import NotificationSettingsStore from "./NotificationSettingsStore";
import DocumentPresenceStore from "./DocumentPresenceStore";
import PoliciesStore from "./PoliciesStore";
import RevisionsStore from "./RevisionsStore";
import SharesStore from "./SharesStore";
import UiStore from "./UiStore";
import UsersStore from "./UsersStore";
import ViewsStore from "./ViewsStore";
import CollectionGroupMembershipsStore from "./CollectionGroupMembershipsStore";

export default class RootStore {
  apiKeys: ApiKeysStore;
  auth: AuthStore;
  collections: CollectionsStore;
  collectionGroupMemberships: CollectionGroupMembershipsStore;
  documents: DocumentsStore;
  events: EventsStore;
  groups: GroupsStore;
  groupMemberships: GroupMembershipsStore;
  integrations: IntegrationsStore;
  memberships: MembershipsStore;
  notificationSettings: NotificationSettingsStore;
  presence: DocumentPresenceStore;
  policies: PoliciesStore;
  revisions: RevisionsStore;
  shares: SharesStore;
  ui: UiStore;
  users: UsersStore;
  views: ViewsStore;

  constructor() {
    this.apiKeys = new ApiKeysStore(this);
    this.auth = new AuthStore(this);
    this.collections = new CollectionsStore(this);
    this.collectionGroupMemberships = new CollectionGroupMembershipsStore(this);
    this.documents = new DocumentsStore(this);
    this.events = new EventsStore(this);
    this.groups = new GroupsStore(this);
    this.groupMemberships = new GroupMembershipsStore(this);
    this.integrations = new IntegrationsStore(this);
    this.memberships = new MembershipsStore(this);
    this.notificationSettings = new NotificationSettingsStore(this);
    this.presence = new DocumentPresenceStore();
    this.policies = new PoliciesStore(this);
    this.revisions = new RevisionsStore(this);
    this.shares = new SharesStore(this);
    this.ui = new UiStore();
    this.users = new UsersStore(this);
    this.views = new ViewsStore(this);
  }

  logout() {
    this.apiKeys.clear();
    // this.auth omitted for reasons...
    this.collections.clear();
    this.collectionGroupMemberships.clear();
    this.documents.clear();
    this.events.clear();
    this.groups.clear();
    this.groupMemberships.clear();
    this.integrations.clear();
    this.memberships.clear();
    this.notificationSettings.clear();
    this.presence.clear();
    this.policies.clear();
    this.revisions.clear();
    this.shares.clear();
    // this.ui omitted to keep ui settings between sessions
    this.users.clear();
    this.views.clear();
  }
}
