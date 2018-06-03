// @flow
import AuthStore from './AuthStore';
import UiStore from './UiStore';
import DocumentsStore from './DocumentsStore';
import SharesStore from './SharesStore';

const ui = new UiStore();
const stores = {
  user: null, // Including for Layout
  auth: new AuthStore(),
  ui,
  documents: new DocumentsStore({ ui }),
  shares: new SharesStore(),
};

export default stores;
