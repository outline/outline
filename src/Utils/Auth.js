import constants from '../constants';

export default {
  setToken(token) {
    localStorage.setItem(constants.JWT_STORE_KEY, token);
  },

  getToken() {
    return localStorage.getItem(constants.JWT_STORE_KEY);
  },

  logout() {
    localStorage.removeItem(constants.JWT_STORE_KEY);
  },

  loggedIn() {
    return !!localStorage.getItem(constants.JWT_STORE_KEY);
  },
};
