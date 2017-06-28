// @flow
import AuthStore from './AuthStore';
import UiStore from './UiStore';
import ErrorsStore from './ErrorsStore';

const stores = {
  user: null, // Including for Layout
  auth: new AuthStore(),
  ui: new UiStore(),
  errors: new ErrorsStore(),
};
window.stores = stores;

export default stores;
