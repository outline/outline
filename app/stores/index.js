// @flow
import AuthStore from './AuthStore';
import UiStore from './UiStore';
import ErrorsStore from './ErrorsStore';
import DocumentsStore from './DocumentsStore';

const ui = new UiStore();
const errors = new ErrorsStore();
const stores = {
  user: null, // Including for Layout
  auth: new AuthStore(),
  ui,
  errors,
  documents: new DocumentsStore({ ui, errors }),
};

export default stores;
