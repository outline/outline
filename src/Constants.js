import keyMirror from 'fbjs/lib/keyMirror';

// Get application version from package.json 😅
import { name, version } from '../package.json';

// Constant KEYS 🔑
const keys = keyMirror({
  JWT_STORE_KEY: null, // localStorage key for JWT
});

// Constant values
const constants = {
  API_USER_AGENT: `${name}/${version}`,
  API_BASE_URL: 'http://localhost:3000/api',
  LOGIN_PATH: '/login',
  LOGIN_SUCCESS_PATH: '/dashboard',
};

export default Object.assign(keys, constants);
