// @flow
import AuthStore from './AuthStore';
import UiStore from './UiStore';
import DocumentsStore from './DocumentsStore';
import RevisionsStore from './RevisionsStore';
import SharesStore from './SharesStore';
import TagsStore from './TagsStore';

const ui = new UiStore();
const stores = {
  user: null, // Including for Layout
  auth: new AuthStore(),
  ui,
  documents: new DocumentsStore({ ui }),
  revisions: new RevisionsStore({ ui }),
  shares: new SharesStore(),
  tags: new TagsStore({ ui }),
};

export default stores;
