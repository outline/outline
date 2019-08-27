// @flow
import ApiKeysStore from './ApiKeysStore';
import AuthStore from './AuthStore';
import CollectionsStore from './CollectionsStore';
import DocumentsStore from './DocumentsStore';
import EventsStore from './EventsStore';
import IntegrationsStore from './IntegrationsStore';
import MembershipsStore from './MembershipsStore';
import NotificationSettingsStore from './NotificationSettingsStore';
import PoliciesStore from './PoliciesStore';
import RevisionsStore from './RevisionsStore';
import SharesStore from './SharesStore';
import UiStore from './UiStore';
import UsersStore from './UsersStore';
import ViewsStore from './ViewsStore';

export default class RootStore {
  apiKeys: ApiKeysStore;
  auth: AuthStore;
  collections: CollectionsStore;
  documents: DocumentsStore;
  events: EventsStore;
  integrations: IntegrationsStore;
  membershipsStore: MembershipsStore;
  notificationSettings: NotificationSettingsStore;
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
    this.documents = new DocumentsStore(this);
    this.events = new EventsStore(this);
    this.integrations = new IntegrationsStore(this);
    this.membershipsStore = new MembershipsStore(this);
    this.notificationSettings = new NotificationSettingsStore(this);
    this.policies = new PoliciesStore(this);
    this.revisions = new RevisionsStore(this);
    this.shares = new SharesStore(this);
    this.ui = new UiStore();
    this.users = new UsersStore(this);
    this.views = new ViewsStore(this);
  }

  logout() {
    this.apiKeys.clear();
    this.collections.clear();
    this.documents.clear();
    this.events.clear();
    this.integrations.clear();
    this.membershipsStore.clear();
    this.notificationSettings.clear();
    this.policies.clear();
    this.revisions.clear();
    this.shares.clear();
    this.users.clear();
    this.views.clear();
  }
}
