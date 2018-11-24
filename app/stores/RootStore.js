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
  apiKeysStore: ApiKeysStore;
  authStore: AuthStore;
  collectionsStore: CollectionsStore;
  documentsStore: DocumentsStore;
  integrationsStore: IntegrationsStore;
  notificationSettingsStore: NotificationSettingsStore;
  revisionsStore: RevisionsStore;
  sharesStore: SharesStore;
  uiStore: UiStore;
  usersStore: UsersStore;
  stores: Object;

  constructor() {
    this.apiKeysStore = new ApiKeysStore(this);
    this.authStore = new AuthStore(this);
    this.collectionsStore = new CollectionsStore(this);
    this.documentsStore = new DocumentsStore(this);
    this.integrationsStore = new IntegrationsStore(this);
    this.notificationSettingsStore = new NotificationSettingsStore(this);
    this.revisionsStore = new RevisionsStore(this);
    this.sharesStore = new SharesStore(this);
    this.uiStore = new UiStore();
    this.usersStore = new UsersStore(this);
  }

  logout() {
    this.apiKeysStore.clear();
    this.collectionsStore.clear();
    this.documentsStore.clear();
    this.integrationsStore.clear();
    this.notificationSettingsStore.clear();
    this.revisionsStore.clear();
    this.sharesStore.clear();
    this.usersStore.clear();
  }
}
