// Inspired by https://github.com/reactjs/react-router/blob/master/examples/auth-flow/auth.js
import Constants from '../Constants';
import History from './History';

import { client } from './ApiClient';

export default {
  login(email, password) {
    return new Promise((resolve, reject) => {
      client.post('/authenticate', {
        email,
        password,
      })
      .then((data) => {
        localStorage.setItem(Constants.JWT_STORE_KEY, data.jwt_token);
        this.onChange(true);
        resolve(data);
      })
      .catch((error) => {
        reject(error);
      });
    });
  },

  getToken() {
    return localStorage.getItem(Constants.JWT_STORE_KEY);
  },

  logout() {
    localStorage.removeItem(Constants.JWT_STORE_KEY);
    History.push(Constants.LOGIN_PATH);
    this.onChange(false);
  },

  loggedIn() {
    return !!localStorage.getItem(Constants.JWT_STORE_KEY);
  },

  onChange() {
    // This is overriden with a callback function in `Views/App/App.js`
  },
};
