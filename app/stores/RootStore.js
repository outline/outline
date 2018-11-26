// @flow
import ApiKeysStore from './ApiKeysStore';
import AuthStore from './AuthStore';
import CollectionsStore from './CollectionsStore';
import DocumentsStore from './DocumentsStore';
import IntegrationsStore from './IntegrationsStore';
import NotificationSettingsStore from './NotificationSettingsStore';
import RevisionsStore from './RevisionsStore';
import SharesStore from './SharesStore';
import UiStore from './UiStore';
import UsersStore from './UsersStore';

export default class RootStore {
  apiKeys: ApiKeysStore;
  auth: AuthStore;
  collections: CollectionsStore;
  documents: DocumentsStore;
  integrations: IntegrationsStore;
  notificationSettings: NotificationSettingsStore;
  revisions: RevisionsStore;
  shares: SharesStore;
  ui: UiStore;
  users: UsersStore;

  constructor() {
    this.apiKeys = new ApiKeysStore(this);
    this.auth = new AuthStore(this);
    this.collections = new CollectionsStore(this);
    this.documents = new DocumentsStore(this);
    this.integrations = new IntegrationsStore(this);
    this.notificationSettings = new NotificationSettingsStore(this);
    this.revisions = new RevisionsStore(this);
    this.shares = new SharesStore(this);
    this.ui = new UiStore();
    this.users = new UsersStore(this);
  }

  logout() {
    this.apiKeys.clear();
    this.collections.clear();
    this.documents.clear();
    this.integrations.clear();
    this.notificationSettings.clear();
    this.revisions.clear();
    this.shares.clear();
    this.users.clear();
  }
}
